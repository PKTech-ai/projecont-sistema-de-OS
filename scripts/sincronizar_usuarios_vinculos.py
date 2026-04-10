#!/usr/bin/env python3
"""
Sincroniza a planilha com a BD do Sistema de OS:

1. Atualiza nome + username de cada utilizador fiscal (por email)
2. Cria VinculoEmpresa entre empresa (CNPJ) e responsável (email)

Formato da planilha: CNPJ | EMPRESA | RESPONSÁVEL | EMAIL

Pré-requisitos: pip install openpyxl psycopg2-binary
Uso:
  export DATABASE_URL="postgresql://..."
  python3 scripts/sincronizar_usuarios_vinculos.py --xlsx ./planilha.xlsx [--dry-run]
"""
from __future__ import annotations

import argparse
import os
import re
import unicodedata
from pathlib import Path

import openpyxl
import psycopg2

TIPO_SERVICO_PADRAO = "FISCAL"


def remover_acentos(texto: str) -> str:
    nfkd = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def gerar_username(nome: str) -> str:
    """'Brenno Duarte' → 'brenno.duarte'"""
    nome_limpo = remover_acentos(nome.strip())
    partes = nome_limpo.lower().split()
    partes = [re.sub(r"[^a-z0-9]", "", p) for p in partes if p]
    if len(partes) >= 2:
        return f"{partes[0]}.{partes[-1]}"
    return partes[0] if partes else "usuario"


def normalizar_cnpj(v) -> str:
    s = re.sub(r"\D", "", str(v or ""))
    return s.zfill(14) if 1 <= len(s) <= 14 else s


def ler_planilha(path: Path):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        cnpj_raw, empresa, responsavel, email = (list(row) + [None, None, None, None])[:4]
        cnpj = normalizar_cnpj(cnpj_raw)
        email_norm = str(email).strip().lower() if email else ""
        nome = str(responsavel).strip() if responsavel else ""
        if not email_norm or not nome or len(cnpj) != 14:
            continue
        rows.append({"cnpj": cnpj, "empresa": str(empresa or "").strip(), "nome": nome, "email": email_norm})
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--xlsx", required=True)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"))
    args = parser.parse_args()

    if not args.database_url:
        raise SystemExit("Defina DATABASE_URL ou use --database-url")

    xlsx = Path(args.xlsx)
    if not xlsx.exists():
        raise SystemExit(f"Arquivo não encontrado: {xlsx}")

    rows = ler_planilha(xlsx)
    print(f"Linhas lidas da planilha: {len(rows)}")

    conn = psycopg2.connect(args.database_url)
    conn.autocommit = False
    cur = conn.cursor()

    # ── 1. Atualizar nome e username dos utilizadores fiscais ────────────────
    print("\n── Atualizando utilizadores ────────────────────────────────")
    # Mapa email → (nome, username) — primeiro nome encontrado para esse email ganha
    usuarios_map: dict[str, dict] = {}
    for r in rows:
        em = r["email"]
        if em not in usuarios_map:
            username = gerar_username(r["nome"])
            usuarios_map[em] = {"nome": r["nome"], "username": username}

    atualizados = 0
    for email, dados in usuarios_map.items():
        username = dados["username"]
        nome = dados["nome"]

        # Garante unicidade do username
        cur.execute('SELECT id FROM "Usuario" WHERE lower(email) = %s', (email,))
        user_row = cur.fetchone()
        if not user_row:
            print(f"  ⚠ Utilizador não encontrado na BD: {email}")
            continue
        user_id = user_row[0]

        # Sufixo se username colidir com outro utilizador
        base = username
        sufixo = 1
        while True:
            cur.execute('SELECT id FROM "Usuario" WHERE username = %s AND id <> %s', (username, user_id))
            if not cur.fetchone():
                break
            username = f"{base}{sufixo}"
            sufixo += 1

        if not args.dry_run:
            cur.execute(
                'UPDATE "Usuario" SET nome = %s, username = %s WHERE id = %s',
                (nome, username, user_id),
            )
        atualizados += 1
        print(f"  ✓  {email:35s}  →  username={username:25s}  nome={nome}")

    # ── 2. Criar VinculoEmpresa (empresa ↔ responsável) ─────────────────────
    print("\n── Criando vínculos empresa ↔ responsável ──────────────────")
    vinculos_criados = 0
    vinculos_atualizados = 0
    empresas_nao_encontradas: list[str] = []
    usuarios_nao_encontrados: list[str] = []

    for r in rows:
        # Empresa
        cur.execute('SELECT id FROM "Empresa" WHERE cnpj = %s', (r["cnpj"],))
        emp = cur.fetchone()
        if not emp:
            if r["cnpj"] not in empresas_nao_encontradas:
                empresas_nao_encontradas.append(r["cnpj"])
            continue
        empresa_id = emp[0]

        # Responsável
        cur.execute('SELECT id FROM "Usuario" WHERE lower(email) = %s', (r["email"],))
        usr = cur.fetchone()
        if not usr:
            if r["email"] not in usuarios_nao_encontrados:
                usuarios_nao_encontrados.append(r["email"])
            continue
        responsavel_id = usr[0]

        # Upsert vínculo
        cur.execute(
            'SELECT id FROM "VinculoEmpresa" WHERE "empresaId" = %s AND "tipoServico" = %s',
            (empresa_id, TIPO_SERVICO_PADRAO),
        )
        existente = cur.fetchone()

        if existente:
            if not args.dry_run:
                cur.execute(
                    'UPDATE "VinculoEmpresa" SET "responsavelId" = %s WHERE id = %s',
                    (responsavel_id, existente[0]),
                )
            vinculos_atualizados += 1
            print(f"  ~  CNPJ {r['cnpj']}  responsavel → {r['nome']}")
        else:
            uid = __import__("uuid").uuid4().hex
            if not args.dry_run:
                cur.execute(
                    'INSERT INTO "VinculoEmpresa" (id, "empresaId", "tipoServico", "responsavelId") VALUES (%s, %s, %s, %s)',
                    (uid, empresa_id, TIPO_SERVICO_PADRAO, responsavel_id),
                )
            vinculos_criados += 1
            print(f"  +  CNPJ {r['cnpj']}  {r['empresa'][:50]}  →  {r['nome']}")

    if args.dry_run:
        conn.rollback()
        print("\n[DRY-RUN] Nenhuma alteração gravada.")
    else:
        conn.commit()

    cur.close()
    conn.close()

    print(f"\n=== Resultado ===")
    print(f"Utilizadores atualizados : {atualizados}")
    print(f"Vínculos criados         : {vinculos_criados}")
    print(f"Vínculos atualizados     : {vinculos_atualizados}")
    if empresas_nao_encontradas:
        print(f"Empresas não encontradas : {len(empresas_nao_encontradas)}")
        for c in empresas_nao_encontradas[:5]:
            print(f"   CNPJ {c}")
    if usuarios_nao_encontrados:
        print(f"Utilizadores não encontrados : {usuarios_nao_encontrados}")


if __name__ == "__main__":
    main()
