/** Remove não-dígitos; retorna null se não tiver 14 dígitos. */
export function normalizarCnpj(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const d = input.replace(/\D/g, "");
  return d.length === 14 ? d : null;
}

/** Formata para exibição: 00.000.000/0000-00 */
export function formatarCnpjExibicao(digitos14: string | null | undefined): string {
  if (!digitos14 || digitos14.length !== 14) return digitos14 ?? "";
  return digitos14.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}
