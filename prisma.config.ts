import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Carrega .env.local assim como o Next.js faz
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
