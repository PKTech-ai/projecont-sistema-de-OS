const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function run() {
  const email = 'admin@pktech.ai';
  console.log(`Verificando se o usuário ${email} já existe...`);
  
  const existing = await prisma.usuario.findUnique({
    where: { email }
  });

  if (existing) {
    console.log(`O usuário ${email} já está cadastrado no sistema.`);
    return;
  }

  // Busca o setor IA ou qualquer setor cadastrado para vincular o admin
  let setor = await prisma.setor.findFirst({
    where: { tipo: 'IA' }
  });

  if (!setor) {
    setor = await prisma.setor.findFirst();
  }

  if (!setor) {
    throw new Error('Nenhum setor encontrado no banco de dados. Cadastre pelo menos um setor antes.');
  }

  console.log(`Criando usuário administrador vinculado ao setor: ${setor.nome} (${setor.tipo})...`);
  
  const senhaHash = await bcrypt.hash('Admin123', 10);

  await prisma.usuario.create({
    data: {
      nome: "Admin PK Tech",
      email,
      senha: senhaHash,
      role: "SUPERADMIN",
      setorId: setor.id,
      ativo: true,
      primeiroAcesso: false
    }
  });

  console.log(`Usuário ${email} criado com sucesso! Senha padrão: Admin123`);
}

run()
  .catch((e) => {
    console.error('Erro ao executar criação do admin:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
