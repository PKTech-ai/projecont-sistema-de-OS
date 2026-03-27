-- AlterTable
ALTER TABLE "Chamado" ADD COLUMN     "setorDestinoId" TEXT;

-- AddForeignKey
ALTER TABLE "Chamado" ADD CONSTRAINT "Chamado_setorDestinoId_fkey" FOREIGN KEY ("setorDestinoId") REFERENCES "Setor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
