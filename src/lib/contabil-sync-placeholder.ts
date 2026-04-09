import bcrypt from "bcryptjs";

let cachedHash: string | null = null;

/** Senha inválida para login local; utilizadores só-Contábil Pro autenticam via SSO. */
export async function getSyncPasswordHash(): Promise<string> {
  if (cachedHash) return cachedHash;
  const secret =
    process.env.CONTABIL_SYNC_PLACEHOLDER_SECRET || "__sync_no_local_login__contabil_pro";
  cachedHash = await bcrypt.hash(secret, 10);
  return cachedHash;
}
