-- Renomeia status inicial para comunicação mais clara
ALTER TYPE "StatusChamado" RENAME VALUE 'ABERTO' TO 'NAO_INICIADO';

ALTER TABLE "Chamado" ALTER COLUMN "status" SET DEFAULT 'NAO_INICIADO'::"StatusChamado";

-- Anexos em chamados (arquivos no disco; metadados aqui)
CREATE TABLE "AnexoChamado" (
    "id" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "mimeType" TEXT,
    "tamanhoBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chamadoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,

    CONSTRAINT "AnexoChamado_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnexoChamado_storageKey_key" ON "AnexoChamado"("storageKey");

CREATE INDEX "AnexoChamado_chamadoId_idx" ON "AnexoChamado"("chamadoId");

ALTER TABLE "AnexoChamado" ADD CONSTRAINT "AnexoChamado_chamadoId_fkey" FOREIGN KEY ("chamadoId") REFERENCES "Chamado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnexoChamado" ADD CONSTRAINT "AnexoChamado_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
