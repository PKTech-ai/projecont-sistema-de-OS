-- Índice para consultas de histórico por chamado (OS)
CREATE INDEX IF NOT EXISTS "HistoricoStatus_chamadoId_idx" ON "HistoricoStatus"("chamadoId");
