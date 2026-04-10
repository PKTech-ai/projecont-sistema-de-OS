const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding base production sectors for OS...");
  const setores = [
    { nome: "Contábil", tipo: "CONTABIL" },
    { nome: "Fiscal", tipo: "FISCAL" },
    { nome: "Departamento Pessoal", tipo: "DP" },
    { nome: "Inteligência Artificial", tipo: "IA" },
    { nome: "Atendimento & Clientes", tipo: "CLIENTES" },
    { nome: "Societário", tipo: "SOCIETARIO" },
  ];

  for (const s of setores) {
    const exists = await prisma.setor.findUnique({ where: { tipo: s.tipo } });
    if (!exists) {
      await prisma.setor.create({ data: s });
      console.log(`Created sector: ${s.nome}`);
    } else {
      console.log(`Sector already exists: ${s.nome}`);
    }
  }

  const superAdminExists = await prisma.usuario.findFirst({
    where: { role: 'SUPERADMIN' }
  });
  
  if (!superAdminExists) {
    const adminSetor = await prisma.setor.findUnique({ where: { tipo: 'IA' }});
    if (adminSetor) {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('Projecont2026!', 10);
      await prisma.usuario.create({
        data: {
          nome: "Administrador OS",
          username: "admin",
          email: "admin@pktech.ai",
          senha: hash,
          role: "SUPERADMIN",
          setorId: adminSetor.id,
          primeiroAcesso: false,
          ativo: true
        }
      });
      console.log('Created backdoor admin user: admin / Projecont2026!');
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
