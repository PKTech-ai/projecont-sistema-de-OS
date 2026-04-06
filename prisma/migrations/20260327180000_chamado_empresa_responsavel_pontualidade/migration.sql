-- Pontualidade + obrigatoriedade de empresa e responsável
ALTER TABLE "Chamado" ADD COLUMN IF NOT EXISTS "entregaNoPrazo" BOOLEAN;
ALTER TABLE "Chamado" ADD COLUMN IF NOT EXISTS "conclusaoNoPrazo" BOOLEAN;

-- Instalação sem empresas: cria linha mínima para o backfill
INSERT INTO "Empresa" ("id", "nome", "ativo", "criadoEm")
SELECT 'clmigrateempresa000000000001', 'Empresa (migração)', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Empresa" LIMIT 1);

-- Dados legados: preenche empresa ausente
UPDATE "Chamado" c
SET "empresaId" = (SELECT e.id FROM "Empresa" e ORDER BY e."criadoEm" ASC LIMIT 1)
WHERE c."empresaId" IS NULL;

-- Responsável ausente: usa o solicitante (evita falha até vínculos serem corrigidos)
UPDATE "Chamado"
SET "responsavelId" = "solicitanteId"
WHERE "responsavelId" IS NULL;

-- Calcula pontualidade retroativa
UPDATE "Chamado"
SET "entregaNoPrazo" = ("entregueEm" <= "prazoSla")
WHERE "entregueEm" IS NOT NULL AND "prazoSla" IS NOT NULL;

UPDATE "Chamado"
SET "conclusaoNoPrazo" = ("concluidoEm" <= "prazoSla")
WHERE "concluidoEm" IS NOT NULL AND "prazoSla" IS NOT NULL;

ALTER TABLE "Chamado" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Chamado" ALTER COLUMN "responsavelId" SET NOT NULL;
