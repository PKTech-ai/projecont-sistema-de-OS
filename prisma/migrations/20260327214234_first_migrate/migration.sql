-- DropForeignKey
ALTER TABLE "Chamado" DROP CONSTRAINT "Chamado_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "Chamado" DROP CONSTRAINT "Chamado_responsavelId_fkey";

-- AddForeignKey
ALTER TABLE "Chamado" ADD CONSTRAINT "Chamado_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chamado" ADD CONSTRAINT "Chamado_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
