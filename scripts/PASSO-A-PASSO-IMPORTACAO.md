# Passo a passo: utilizadores + empresas + vínculos (Sistema de OS)

**O que já está no repositório:** scripts `bulk_create_usuarios_os.py` e `import_fiscal_vinculos_from_xlsx.py`.

**O que tens de fazer tu:** correr comandos na máquina com acesso à BD, preparar/editar planilhas, testar no browser.

---

## Fase 0 — Preparação

| # | Tarefa | Quem |
|---|--------|------|
| 0.1 | **Base de dados:** pode ser o **mesmo servidor** Postgres, mas o Sistema de OS usa sempre a base **`chamados_os`**. O Contábil Pro usa outra base (ex.: `contabil-pro`). Scripts e `DATABASE_URL` para import em massa apontam para **`chamados_os`**. | Tu |
| 0.2 | Na VPS ou PC com Docker: `pip install openpyxl bcrypt psycopg2-binary` (só para correr os scripts Python). | Tu |
| 0.3 | Planilha de **utilizadores** com colunas: `nome`, `email`, `setor_tipo` (ex.: FISCAL), `role` (ex.: ANALISTA). Guarda como `.xlsx`. | Tu |

### Importar de/para no painel (botão “Importar de/para” em Admin → Empresas)

A feature **está funcional** para o que o código prevê: **criar/atualizar vínculos** `empresa ↔ responsável` por **tipo de serviço** (CONTABIL, FISCAL, DP, etc.), desde que:

1. **Utilizador** com o `email_responsavel` **já exista** no OS.  
2. **Empresa** já exista, encontrada por **CNPJ** (14 dígitos, só números) **ou** por **nome exatamente igual** ao cadastro (`empresa_nome`).  
3. **Quem importa:**  
   - **SUPERADMIN** — pode importar qualquer `tipo_servico`.  
   - **GESTOR** — só pode linhas em que `tipo_servico` seja **igual ao setor dele** (ex.: gestor **Contábil** → só `CONTABIL`; **não** consegue importar `FISCAL`).  
   Para importar vínculos **FISCAL**, entra com utilizador **SUPERADMIN** ou com **gestor do setor Fiscal**.

Modelo pronto (separador `;`, Excel BR): ficheiro **`scripts/modelo-de-para-fiscal.csv`** no repositório.

**Colunas obrigatórias no CSV (1.ª linha = cabeçalho):**

| Cabeçalho aceite | Conteúdo |
|------------------|----------|
| `email_responsavel` (ou `usuario_email`, `email`) | Email do analista/gestor **já** cadastrado no OS. |
| `tipo_servico` (ou `servico`, `setor`) | Para fiscal: `FISCAL` (maiúsculas). |
| `cnpj` (ou `empresa_cnpj`) | CNPJ só números (14 dígitos), **ou** deixar vazio se usares só nome. |
| `empresa_nome` (ou `nome_empresa`, `razao_social`) | Nome **igual** ao cadastro no OS (se não usares CNPJ). |

**Como formatar a planilha “oficial” fiscal no Excel:**  
1. Cria uma folha nova ou colunas à direita com estes quatro cabeçalhos.  
2. Preenche: uma **linha por vínculo** (mesmo responsável com várias empresas = várias linhas).  
3. `tipo_servico` = `FISCAL` em todas as linhas fiscais.  
4. CNPJ na célula **só números** (sem pontos/traços) ou copia de uma coluna da planilha oficial e usa `=SOMA()` ou limpa texto.  
5. **Gravar como** CSV (separador ponto e vírgula) **ou** copiar tudo e colar na caixa de texto do diálogo “Importar de/para” no site.

Se a planilha oficial tiver nomes diferentes, mapeia assim: coluna do email do responsável → `email_responsavel`; coluna CNPJ → `cnpj`; coluna razão social/nome cliente → `empresa_nome` (tem de bater com o nome no OS).

---

## Fase 1 — Setores (obrigatório)

Cada valor de `TipoSetor` tem de existir na tabela `"Setor"`.

| # | Tarefa | Quem |
|---|--------|------|
| 1.1 | Ver setores: `docker exec -it $(docker ps -qf name=postgres_postgres) psql -U postgres -d chamados_os -c 'SELECT tipo, nome FROM "Setor";'` | Tu |
| 1.2 | Se faltar algum (ex.: FISCAL), insere à mão **ou** garante migrações/seed já aplicados. Exemplo mínimo (ajusta se já existir): ver SQL na conversa / documentação de integração. | Tu |

---

## Fase 2 — Empresas (antes dos vínculos)

Cada empresa precisa de existir em `"Empresa"`; para o import fiscal por CNPJ, o **CNPJ com 14 dígitos** tem de estar certo.

| # | Tarefa | Quem |
|---|--------|------|
| 2.1 | Cadastrar empresas no OS (Admin → Empresas) **ou** importar de outra fonte (ex.: sync Contábil Pro só para dados que vêm do CP). | Tu |
| 2.2 | Confirmar: `SELECT id, nome, cnpj FROM "Empresa" WHERE cnpj IS NOT NULL LIMIT 20;` | Tu |

---

## Fase 3 — Criar utilizadores em massa + ficheiro de senhas

| # | Tarefa | Quem |
|---|--------|------|
| 3.1 | Copia o projeto (ou só a pasta `scripts/` + planilha) para uma máquina com Python e rede à BD (pode ser a VPS). | Tu |
| 3.2 | `export DATABASE_URL='postgresql://...'` (URL do **chamados_os**). | Tu |
| 3.3 | Teste sem gravar: `python3 scripts/bulk_create_usuarios_os.py --xlsx ./tua_planilha.xlsx --dry-run` | Tu |
| 3.4 | Se estiver ok: `python3 scripts/bulk_create_usuarios_os.py --xlsx ./tua_planilha.xlsx --out ./senhas_para_gestor.csv` | Tu |
| 3.5 | Envia o **CSV de senhas** ao gestor por canal seguro; apaga cópias locais quando já não forem precisas. | Tu |

**Nota:** utilizadores criados assim não vêm do Contábil Pro (`origemContabilPro = false`). Login no tickets: email + senha provisória.

---

## Fase 4 — Vínculos (empresa ↔ responsável por tipo de serviço)

Escolhe **um** dos métodos.

### Opção A — Planilha fiscal (já existente)

Colunas na **1.ª folha**, linha 1 cabeçalho, a partir da linha 2: **CNPJ | empresa | responsável | email** (o script usa as 4 primeiras colunas).

Requisitos: utilizador com esse **email** já existe e é do setor **FISCAL**; empresa com esse **CNPJ** já existe.

```bash
export DATABASE_URL='postgresql://...'
python3 scripts/import_fiscal_vinculos_from_xlsx.py --xlsx ./vinculos_fiscal.xlsx
# teste: acrescentar --dry-run se o script suportar (este script tem --dry-run)
```

### Opção B — CSV no painel do OS

Superadmin ou gestor: Admin → Empresas → importar CSV de vínculos (ver colunas aceites em `importarDeParaVinculosCsv` no código: `email`, `tipo_servico`, `cnpj` ou nome da empresa).

---

## Fase 5 — Testar

| # | Tarefa | Quem |
|---|--------|------|
| 5.1 | Abrir `https://tickets.pktech.ai/login` com um utilizador criado na Fase 3. | Tu |
| 5.2 | Confirmar que vê o dashboard e, se aplicável, empresas/vínculos corretos. | Tu |

---

## Resumo rápido

1. Setores na BD → 2. Empresas (com CNPJ se precisares do import fiscal) → 3. Script bulk utilizadores + CSV de senhas → 4. Import vínculos → 5. Login de teste.

**Eu (assistência no repo) não consigo:** ligar-me à tua VPS, saber a tua `DATABASE_URL`, nem executar SQL na tua infra. Isso é sempre **tu** com os comandos acima.

Se algo falhar, copia a **mensagem de erro completa** ou a **linha** do script e diz em que fase estás.
