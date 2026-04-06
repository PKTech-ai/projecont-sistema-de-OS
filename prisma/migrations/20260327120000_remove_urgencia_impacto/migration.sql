-- Remove campos GLPI não usados (prioridade é escolhida diretamente pelo solicitante; ver auditoria técnica)
ALTER TABLE "Chamado" DROP COLUMN IF EXISTS "urgencia";
ALTER TABLE "Chamado" DROP COLUMN IF EXISTS "impacto";

DROP TYPE IF EXISTS "Urgencia";
DROP TYPE IF EXISTS "Impacto";

-- Módulo de templates fora do produto: remove tabela legada (migration init antiga)
ALTER TABLE "Chamado" DROP CONSTRAINT IF EXISTS "Chamado_templateId_fkey";
ALTER TABLE "Chamado" DROP COLUMN IF EXISTS "templateId";
DROP TABLE IF EXISTS "Template";
