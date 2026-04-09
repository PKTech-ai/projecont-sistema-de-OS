#!/usr/bin/env python3
"""
Cria utilizadores fiscais no Sistema de OS a partir da planilha preenchida.

Formato da planilha: CNPJ | EMPRESA | RESPONSÁVEL | EMAIL
- Gera username a partir do nome: "Karina Melo" → "karina.melo"
- Senha padrão: Projecont@2024 (alterada no 1º acesso)
- Cria 1 utilizador por email único (ignora duplicados)
- Gera CSV: username, senha_padrao, nome, email

Pré-requisitos: pip install openpyxl bcrypt psycopg2-binary

Uso:
  export DATABASE_URL="postgresql://docker:docker@localhost:5432/chamados"
  python3 scripts/criar_usuarios_fiscais.py --xlsx ./planilha.xlsx --dry-run
  python3 scripts/criar_usuarios_fiscais.py --xlsx ./planilha.xlsx --out ./senhas_fiscal.csv
"""
from __future__ import annotations

import argparse
import csv
import os
import re
import unicodedata
from pathlib import Path

import bcrypt
import openpyxl
import psycopg2

SENHA_PADRAO = "Projecont@2024"
SETOR_TIPO = "FISCAL"
ROLE_PADRAO = "ANALISTA"


def remover_acentos(texto: str) -> str:
    nfkd = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def gerar_username(nome: str) -> str:
    """Karina Melo → karina.melo  |  João Marcel → joao.marcel"""
    nome_limpo = remover_acentos(nome.strip())
    partes = nome_limpo.lower().split()
    partes = [re.sub(r"[^a-z0-9]", "", p) for p in partes if p]
    if len(partes) >= 2:
        return f"{partes[0]}.{partes[-1]}"
    return partes[0] if partes else "usuario"


def ler_planilha(path: Path) -> list[dict]:
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    vistos: dict[str, dict] = {}  # email → {nome, email}

    for row in ws.iter_rows(min_row=2, values_only=True):
        cnpj, empresa, responsavel, email = (row + (None, None, None, None))[:4]
        if not email or not responsavel:
            continue
        email_norm = str(email).strip().lower()
        nome = str(responsavel).strip()
        if "fiscal não faz" in nome.lower():
            continue
        if email_norm not in vistos:
            vistos[email_norm] = {"nome": nome, "email": email_norm}

    return list(vistos.values())


def main():
    parser = argparse.ArgumentParser(description="Cria utilizadores fiscais no Sistema de OS")
    parser.add_argument("--xlsx", required=True)
    parser.add_argument("--out", default="senhas_fiscal.csv")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"))
    args = parser.parse_args()

    if not args.database_url:
        raise SystemExit("Defina DATABASE_URL ou use --database-url")

    xlsx = Path(args.xlsx)
    if not xlsx.exists():
        raise SystemExit(f"Arquivo não encontrado: {xlsx}")

    utilizadores = ler_planilha(xlsx)
    if not utilizadores:
        raise SystemExit("Nenhum utilizador encontrado na planilha")

    print(f"Utilizadores únicos encontrados: {len(utilizadores)}")

    conn = psycopg2.connect(args.database_url)
    conn.autocommit = False
    cur = conn.cursor()

    # Buscar setor FISCAL
    cur.execute('SELECT id FROM "Setor" WHERE tipo = %s LIMIT 1', (SETOR_TIPO,))
    setor = cur.fetchone()
    if not setor:
        conn.close()
        raise SystemExit("Setor FISCAL não encontrado. Execute as migrações/seed primeiro.")
    setor_id = setor[0]

    senha_hash = bcrypt.hashpw(SENHA_PADRAO.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode()

    criados = 0
    pulados = 0
    erros: list[str] = []
    out_rows: list[tuple] = []

    for u in utilizadores:
        email = u["email"]
        nome = u["nome"]
        username = gerar_username(nome)

        # Verificar se já existe por email
        cur.execute('SELECT id FROM "Usuario" WHERE lower(email) = %s', (email,))
        if cur.fetchone():
            pulados += 1
            erros.append(f"Email já cadastrado: {email}")
            continue

        # Username pode colidir — sufixo numérico se necessário
        base_username = username
        sufixo = 1
        while True:
            cur.execute('SELECT id FROM "Usuario" WHERE username = %s', (username,))
            if not cur.fetchone():
                break
            username = f"{base_username}{sufixo}"
            sufixo += 1

        uid = __import__("uuid").uuid4().hex

        if not args.dry_run:
            cur.execute(
                """
                INSERT INTO "Usuario" (
                  id, nome, username, email, senha, role,
                  "setorId", ativo, "origemContabilPro", "primeiroAcesso"
                )
                VALUES (%s, %s, %s, %s, %s, %s::\"Role\", %s, true, false, true)
                """,
                (uid, "", username, email, senha_hash, ROLE_PADRAO, setor_id),
            )

        criados += 1
        out_rows.append((username, SENHA_PADRAO, nome, email))
        print(f"  ✓  {username:25s}  ({nome})")

    if args.dry_run:
        conn.rollback()
        print("\n[DRY-RUN] Nenhuma alteração foi gravada.")
    else:
        conn.commit()

    cur.close()
    conn.close()

    if not args.dry_run and out_rows:
        out_path = Path(args.out)
        with out_path.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["username", "senha_padrao", "nome_planilha", "email"])
            w.writerows(out_rows)
        print(f"\nCSV de credenciais salvo em: {out_path.resolve()}")

    print(f"\n=== Resultado ===")
    print(f"Criados : {criados}")
    print(f"Pulados : {pulados}")
    if erros:
        print("--- Avisos ---")
        for e in erros:
            print(f"  - {e}")


if __name__ == "__main__":
    main()
