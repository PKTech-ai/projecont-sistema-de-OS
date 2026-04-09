#!/usr/bin/env python3
import argparse
import os
import re
from pathlib import Path

import openpyxl
import psycopg2


def normalize_cnpj(v):
    s = re.sub(r"\D", "", str(v or ""))
    if not s:
        return ""
    return s.zfill(14)


def parse_sheet(path: Path):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    rows = []
    for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        cnpj, empresa, responsavel, email = row[:4]
        if not any([cnpj, empresa, responsavel, email]):
            continue
        rows.append(
            {
                "linha": i,
                "cnpj": normalize_cnpj(cnpj),
                "empresa": (str(empresa).strip() if empresa else ""),
                "responsavel": (str(responsavel).strip() if responsavel else ""),
                "email": (str(email).strip().lower() if email else ""),
            }
        )
    return rows


def main():
    parser = argparse.ArgumentParser(
        description="Importa vinculos fiscais de planilha XLSX para o banco do Sistema de OS"
    )
    parser.add_argument("--xlsx", required=True, help="Caminho da planilha .xlsx")
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL")
        or "postgresql://docker:docker@localhost:5432/chamados",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="So valida e mostra resumo, sem gravar",
    )
    args = parser.parse_args()

    xlsx = Path(args.xlsx)
    if not xlsx.exists():
        raise SystemExit(f"Arquivo nao encontrado: {xlsx}")

    rows = parse_sheet(xlsx)
    if not rows:
        raise SystemExit("Planilha sem linhas uteis")

    conn = psycopg2.connect(args.database_url)
    conn.autocommit = False
    cur = conn.cursor()

    importados = 0
    ignorados = 0
    erros = []

    for r in rows:
        if not r["cnpj"] or len(r["cnpj"]) != 14:
            ignorados += 1
            erros.append(f"Linha {r['linha']}: CNPJ invalido ({r['cnpj']})")
            continue
        if not r["email"]:
            ignorados += 1
            erros.append(f"Linha {r['linha']}: email vazio")
            continue

        cur.execute(
            """
            SELECT u.id
            FROM "Usuario" u
            INNER JOIN "Setor" s ON s.id = u."setorId"
            WHERE lower(u.email) = %s AND u.ativo = true AND s.tipo = 'FISCAL'
            LIMIT 1
            """,
            (r["email"],),
        )
        user = cur.fetchone()
        if not user:
            ignorados += 1
            erros.append(
                f"Linha {r['linha']}: usuario fiscal nao encontrado para {r['email']}"
            )
            continue

        cur.execute(
            'SELECT id, nome FROM "Empresa" WHERE cnpj = %s LIMIT 1', (r["cnpj"],)
        )
        empresa = cur.fetchone()
        if not empresa:
            ignorados += 1
            erros.append(
                f"Linha {r['linha']}: empresa nao encontrada para CNPJ {r['cnpj']}"
            )
            continue

        if not args.dry_run:
            cur.execute(
                """
                INSERT INTO "VinculoEmpresa" (id, "empresaId", "tipoServico", "responsavelId")
                VALUES (md5(random()::text || clock_timestamp()::text), %s, 'FISCAL', %s)
                ON CONFLICT ("empresaId", "tipoServico")
                DO UPDATE SET "responsavelId" = EXCLUDED."responsavelId"
                """,
                (empresa[0], user[0]),
            )
        importados += 1

    if args.dry_run:
        conn.rollback()
    else:
        conn.commit()

    cur.close()
    conn.close()

    print("=== Resultado importacao Fiscal ===")
    print(f"Planilha: {xlsx}")
    print(f"Linhas lidas: {len(rows)}")
    print(f"Importados: {importados}")
    print(f"Ignorados: {ignorados}")
    if erros:
        print("--- Primeiros erros (ate 30) ---")
        for e in erros[:30]:
            print("-", e)


if __name__ == "__main__":
    main()
