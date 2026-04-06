-- CreateEnum
CREATE TYPE "TipoMensagemChat" AS ENUM ('NORMAL', 'ACAO_SOLICITANTE', 'RESOLUCAO');

-- AlterTable
ALTER TABLE "Comentario" ADD COLUMN "tipo" "TipoMensagemChat" NOT NULL DEFAULT 'NORMAL';
