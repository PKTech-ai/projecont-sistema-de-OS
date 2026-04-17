-- Salva os IDs originais dos responsáveis vindo do Contábil Pro.
-- Permite reconciliar vínculos depois que os usuários forem sincronizados.
ALTER TABLE "Empresa" ADD COLUMN IF NOT EXISTS "fiscalContabilId"      TEXT;
ALTER TABLE "Empresa" ADD COLUMN IF NOT EXISTS "rhContabilId"           TEXT;
ALTER TABLE "Empresa" ADD COLUMN IF NOT EXISTS "societarioContabilId"   TEXT;
