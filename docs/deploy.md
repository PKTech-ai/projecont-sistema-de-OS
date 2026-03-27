# Manual de Deploy - Sistema de Chamados Projecont

Este documento descreve os passos necessários para realizar o deploy do Sistema de Chamados em um ambiente de produção (Self-hosted ou Cloud).

## Requisitos de Infraestrutura

- **Node.js**: Versão 20.x ou superior (recomendado 22.x)
- **Banco de Dados**: PostgreSQL 15 ou superior
- **Gerenciador de Pacotes**: npm ou pnpm
- **Memória RAM**: Mínimo 1GB (recomendado 2GB+)

## Variáveis de Ambiente (.env)

Crie um arquivo `.env` na raiz do projeto (`/chamados`) com as seguintes variáveis:

```env
# URL de conexão com o banco de dados PostgreSQL
DATABASE_URL="postgresql://usuario:senha@localhost:5432/chamados?schema=public"

# Secret para criptografia dos tokens de sessão (Gere um hash forte de 32+ caracteres)
# Você pode gerar usando: openssl rand -base64 32
AUTH_SECRET="seu_auth_secret_super_seguro_aqui"

# URL base da aplicação (Importante para o NextAuth funcionar corretamente em produção)
# Exemplo: https://chamados.projecont.com.br
NEXTAUTH_URL="http://localhost:3000"
```

## Passos para Deploy (Manual / Self-Hosted)

### 1. Preparar o Banco de Dados

Certifique-se de que o PostgreSQL está rodando e o banco de dados foi criado.

```bash
# Instalar dependências
npm install

# Rodar as migrações do Prisma para criar as tabelas
npx prisma migrate deploy

# Gerar o Prisma Client
npx prisma generate

# (Opcional) Popular o banco de dados com dados iniciais (admin, setores, etc)
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

### 2. Build da Aplicação

Gere a versão otimizada para produção:

```bash
npm run build
```

### 3. Iniciar o Servidor

Inicie a aplicação em modo de produção:

```bash
npm run start
```

A aplicação estará rodando na porta `3000` por padrão.

## Configuração com PM2 (Recomendado para Self-Hosted)

Para manter a aplicação rodando em background e reiniciar automaticamente em caso de falhas ou reinicialização do servidor, recomendamos o uso do PM2.

```bash
# Instalar o PM2 globalmente
npm install -g pm2

# Iniciar a aplicação com PM2
pm2 start npm --name "chamados-projecont" -- start

# Salvar a configuração para reiniciar com o sistema operacional
pm2 save
pm2 startup
```

## Proxy Reverso (Nginx)

Se for expor a aplicação para a internet, é altamente recomendado usar um proxy reverso como o Nginx para gerenciar os certificados SSL (HTTPS) e redirecionar o tráfego para a porta 3000.

Exemplo de configuração básica do Nginx (`/etc/nginx/sites-available/chamados`):

```nginx
server {
    listen 80;
    server_name chamados.projecont.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Deploy na Vercel (Alternativa Cloud)

O deploy na Vercel é a forma mais simples, pois o Next.js é nativo da plataforma.

1. Suba o código para um repositório no GitHub/GitLab.
2. Crie um novo projeto na Vercel e importe o repositório.
3. Configure as variáveis de ambiente (`DATABASE_URL`, `AUTH_SECRET`) nas configurações do projeto na Vercel.
4. O comando de build (`npm run build`) e install (`npm install`) serão detectados automaticamente.
5. Clique em **Deploy**.

*Nota: Para rodar as migrações na Vercel, você pode adicionar o comando `npx prisma migrate deploy` no script de build no `package.json` ou rodar manualmente via Vercel CLI.*
