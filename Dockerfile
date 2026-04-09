# Build de produção — Sistema de OS (Next.js + Prisma)
# Uso: docker build -t seu-registro/sistema-os:latest .

FROM node:20-bookworm-slim AS build
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Prisma + Next precisam de DATABASE_URL em build (valor fictício; runtime usa o .env real)
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"

RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=build /app .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Migrações na subida (base do OS só — nunca apontar para a base do Contábil Pro)
CMD ["sh", "-c", "npx prisma migrate deploy && exec npx next start -H 0.0.0.0 -p 3000"]
