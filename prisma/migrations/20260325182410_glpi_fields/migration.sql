-- CreateEnum
CREATE TYPE "TipoChamado" AS ENUM ('INCIDENTE', 'SOLICITACAO');

-- CreateEnum
CREATE TYPE "Urgencia" AS ENUM ('MUITO_BAIXA', 'BAIXA', 'MEDIA', 'ALTA', 'MUITO_ALTA');

-- CreateEnum
CREATE TYPE "Impacto" AS ENUM ('MUITO_BAIXO', 'BAIXO', 'MEDIO', 'ALTO', 'MUITO_ALTO');

-- AlterTable
ALTER TABLE "Chamado" ADD COLUMN     "impacto" "Impacto" NOT NULL DEFAULT 'MEDIO',
ADD COLUMN     "solucao" TEXT,
ADD COLUMN     "tipo" "TipoChamado" NOT NULL DEFAULT 'SOLICITACAO',
ADD COLUMN     "urgencia" "Urgencia" NOT NULL DEFAULT 'MEDIA';
