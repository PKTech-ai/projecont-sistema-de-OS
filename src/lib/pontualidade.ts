/** Compara instante com o prazo previsto na abertura (deadline inclusive). */
export function dentroDoPrazo(acao: Date, prazoPrevisto: Date | null | undefined): boolean {
  if (!prazoPrevisto) return true;
  return acao.getTime() <= prazoPrevisto.getTime();
}
