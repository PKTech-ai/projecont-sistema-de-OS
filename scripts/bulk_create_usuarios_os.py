#!/usr/bin/env python3
"""
Cria utilizadores em massa no Sistema de OS a partir de um .xlsx e gera CSV com
senhas provisórias para o gestor distribuir (tratar como confidencial).

Pré-requisitos: pip install openpyxl bcrypt psycopg2-binary

Planilha (1.ª linha = cabeçalho, dados a partir da 2.ª), colunas aceites:
  nome | nome_completo
  email | e-mail
  setor_tipo | setor  →  CONTABIL, FISCAL, DP, IA, CLIENTES, SOCIETARIO
  role | perfil  →  ANALISTA, GESTOR, SAC, TV (SUPERADMIN só manual)

Uso:
  export DATABASE_URL="postgresql://..."
  python3 scripts/bulk_create_usuarios_os.py --xlsx ./usuarios.xlsx --out ./senhas_para_gestor.csv
  python3 scripts/bulk_create_usuarios_os.py --xlsx ./usuarios.xlsx --dry-run
"""
from __future__ import annotations

import argparse
import csv
import os
import random
import re
import string
from pathlib import Path

import bcrypt
import openpyxl
import psycopg2

ALLOWED_SETORES = (
    "CONTABIL",
    "FISCAL",
    "DP",
    "IA",
    "CLIENTES",
    "SOCIETARIO",
)
ALLOWED_ROLES = ("ANALISTA", "GESTOR", "SAC", "TV")


def pick(row: dict, keys: tuple[str, ...]) -> str:
    for k in keys:
        v = row.get(k)
        if v is not None and str(v).strip():
            return str(v).strip()
    return ""


def normalize_header(h: str) -> str:
    return (
        str(h or "")
        .strip()
        .lower()
        .replace(" ", "_")
        .replace("-", "_")
    )


def read_rows(path: Path) -> list[dict[str, str]]:
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    raw = list(ws.iter_rows(min_row=1, values_only=True))
    if not raw:
        return []
    headers = [normalize_header(h) for h in raw[0]]
    rows: list[dict[str, str]] = []
    for line in raw[1:]:
        d: dict[str, str] = {}
        for i, h in enumerate(headers):
            if not h:
                continue
            val = line[i] if i < len(line) else None
            d[h] = "" if val is None else str(val).strip()
        if not any(v for v in d.values()):
            continue
        rows.append(d)
    return rows


def gerar_senha(n: int = 10) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(random.SystemRandom().choice(alphabet) for _ in range(n))


def main() -> None:
    parser = argparse.ArgumentParser(description="Bulk create OS users from xlsx")
    parser.add_argument("--xlsx", required=True, help="Caminho do .xlsx")
    parser.add_argument(
        "--out",
        default="senhas_para_gestor.csv",
        help="CSV de saída: email,senha,nome,setor (guardar em local seguro)",
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL"),
        help="Default: env DATABASE_URL",
    )
    args = parser.parse_args()

    if not args.database_url:
        raise SystemExit("Defina DATABASE_URL ou use --database-url")

    xlsx = Path(args.xlsx)
    if not xlsx.exists():
        raise SystemExit(f"Arquivo não encontrado: {xlsx}")

    data = read_rows(xlsx)
    if not data:
        raise SystemExit("Planilha sem linhas úteis")

    conn = psycopg2.connect(args.database_url)
    conn.autocommit = False
    cur = conn.cursor()

    criados = 0
    pulados = 0
    erros: list[str] = []
    out_rows: list[tuple[str, str, str, str]] = []

    for i, row in enumerate(data, start=2):
        nome = pick(row, ("nome", "nome_completo", "name"))
        email = pick(row, ("email", "e_mail", "e-mail", "mail")).lower()
        tipo_raw = pick(row, ("setor_tipo", "setor", "tipo_setor")).upper()
        role_raw = pick(row, ("role", "perfil", "papel")).upper() or "ANALISTA"

        if not nome or not email:
            pulados += 1
            erros.append(f"Linha Excel ~{i}: nome ou email vazio")
            continue
        if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
            pulados += 1
            erros.append(f"Linha ~{i}: email inválido ({email})")
            continue
        if tipo_raw not in ALLOWED_SETORES:
            pulados += 1
            erros.append(
                f"Linha ~{i}: setor_tipo '{tipo_raw}' inválido. Use: {', '.join(ALLOWED_SETORES)}"
            )
            continue
        if role_raw not in ALLOWED_ROLES:
            pulados += 1
            erros.append(
                f"Linha ~{i}: role '{role_raw}' inválido. Use: {', '.join(ALLOWED_ROLES)}"
            )
            continue

        cur.execute(
            'SELECT id FROM "Setor" WHERE tipo = %s LIMIT 1',
            (tipo_raw,),
        )
        setor = cur.fetchone()
        if not setor:
            pulados += 1
            erros.append(
                f"Linha ~{i}: setor '{tipo_raw}' não existe na tabela Setor — crie o setor antes."
            )
            continue

        cur.execute('SELECT id FROM "Usuario" WHERE lower(email) = %s', (email,))
        if cur.fetchone():
            pulados += 1
            erros.append(f"Linha ~{i}: email já cadastrado ({email})")
            continue

        senha_plana = gerar_senha()
        senha_hash = bcrypt.hashpw(senha_plana.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode(
            "utf-8"
        )
        uid = __import__("uuid").uuid4().hex

        if not args.dry_run:
            cur.execute(
                """
                INSERT INTO "Usuario" (
                  id, nome, email, senha, role, "setorId", ativo, "origemContabilPro"
                )
                VALUES (%s, %s, %s, %s, %s::"Role", %s, true, false)
                """,
                (uid, nome, email, senha_hash, role_raw, setor[0]),
            )
        criados += 1
        out_rows.append((email, senha_plana, nome, tipo_raw))

    if args.dry_run:
        conn.rollback()
    else:
        conn.commit()

    cur.close()
    conn.close()

    out_path = Path(args.out)
    if not args.dry_run and out_rows:
        with out_path.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["email", "senha_provisoria", "nome", "setor_tipo"])
            w.writerows(out_rows)

    print("=== bulk_create_usuarios_os ===")
    print(f"Planilha: {xlsx}")
    print(f"Linhas processadas: {len(data)}")
    print(f"Criados: {criados}  |  Ignorados: {pulados}  |  dry_run={args.dry_run}")
    if not args.dry_run and out_rows:
        print(f"Senhas (confidencial): {out_path.resolve()}")
    if erros:
        print("--- Avisos / erros (até 40) ---")
        for e in erros[:40]:
            print("-", e)


if __name__ == "__main__":
    main()
