#!/usr/bin/env python3
"""
Importa empresas do xlsx para o Sistema de OS (tabela "Empresa").

Lê da planilha: CNPJ | EMPRESA | RESPONSÁVEL | EMAIL
- CNPJ: normaliza para 14 dígitos
- nome: campo EMPRESA da planilha (tal como está)
- Ignora linhas sem CNPJ ou sem nome
- ON CONFLICT (cnpj) → atualiza nome (upsert seguro)

Pré-requisitos: pip install openpyxl psycopg2-binary

Uso:
  export DATABASE_URL="postgresql://docker:docker@localhost:5432/chamados"
  python3 scripts/importar_empresas_xlsx.py --xlsx ./planilha.xlsx --dry-run
  python3 scripts/importar_empresas_xlsx.py --xlsx ./planilha.xlsx
"""
from __future__ import annotations

import argparse
import os
import re
from pathlib import Path

import openpyxl
import psycopg2


def normalizar_cnpj(v) -> str:
    s = re.sub(r"\D", "", str(v or ""))
    return s.zfill(14) if s else ""


def ler_empresas(path: Path) -> list[dict]:
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    vistos: dict[str, dict] = {}  # cnpj → {cnpj, nome}

    for row in ws.iter_rows(min_row=2, values_only=True):
        cnpj_raw, empresa, *_ = (list(row) + [None, None, None, None])[:4]
        cnpj = normalizar_cnpj(cnpj_raw)
        nome = str(empresa).strip() if empresa else ""
        if not cnpj or len(cnpj) != 14 or not nome:
            continue
        if cnpj not in vistos:
            vistos[cnpj] = {"cnpj": cnpj, "nome": nome}

    return list(vistos.values())


def main():
    parser = argparse.ArgumentParser(description="Importa empresas do xlsx para o Sistema de OS")
    parser.add_argument("--xlsx", required=True)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"))
    args = parser.parse_args()

    if not args.database_url:
        raise SystemExit("Defina DATABASE_URL ou use --database-url")

    xlsx = Path(args.xlsx)
    if not xlsx.exists():
        raise SystemExit(f"Arquivo não encontrado: {xlsx}")

    empresas = ler_empresas(xlsx)
    if not empresas:
        raise SystemExit("Nenhuma empresa encontrada na planilha")

    print(f"Empresas únicas no xlsx: {len(empresas)}")

    conn = psycopg2.connect(args.database_url)
    conn.autocommit = False
    cur = conn.cursor()

    inseridas = 0
    atualizadas = 0

    for emp in empresas:
        cnpj = emp["cnpj"]
        nome = emp["nome"]

        cur.execute('SELECT id FROM "Empresa" WHERE cnpj = %s', (cnpj,))
        existente = cur.fetchone()

        if existente:
            if not args.dry_run:
                cur.execute(
                    'UPDATE "Empresa" SET nome = %s WHERE cnpj = %s',
                    (nome, cnpj),
                )
            atualizadas += 1
            print(f"  ~ ATUALIZADA  CNPJ {cnpj}  {nome[:60]}")
        else:
            uid = __import__("uuid").uuid4().hex
            if not args.dry_run:
                cur.execute(
                    """
                    INSERT INTO "Empresa" (id, nome, cnpj, ativo, "origemContabilPro")
                    VALUES (%s, %s, %s, true, false)
                    """,
                    (uid, nome, cnpj),
                )
            inseridas += 1
            print(f"  + NOVA        CNPJ {cnpj}  {nome[:60]}")

    if args.dry_run:
        conn.rollback()
        print("\n[DRY-RUN] Nenhuma alteração foi gravada.")
    else:
        conn.commit()

    cur.close()
    conn.close()

    print(f"\n=== Resultado ===")
    print(f"Inseridas  : {inseridas}")
    print(f"Atualizadas: {atualizadas}")
    print(f"Total      : {inseridas + atualizadas}")


if __name__ == "__main__":
    main()
