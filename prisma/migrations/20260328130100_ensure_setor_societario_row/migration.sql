-- Garante o registro do setor Societário quando o enum já foi atualizado
-- mas o banco não tem linha (ex.: migrate sem seed completo).
INSERT INTO "Setor" ("id", "nome", "tipo")
SELECT
  'cmseed_setor_societario_v1',
  'Societário',
  'SOCIETARIO'::"TipoSetor"
WHERE NOT EXISTS (
  SELECT 1 FROM "Setor" WHERE "tipo" = 'SOCIETARIO'::"TipoSetor"
);
