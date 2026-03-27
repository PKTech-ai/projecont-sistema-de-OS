export const FERIADOS: string[] = [
  "2025-01-01",
  "2025-04-18",
  "2025-04-21",
  "2025-05-01",
  "2025-09-07",
  "2025-10-12",
  "2025-11-02",
  "2025-11-15",
  "2025-12-25",
  "2026-01-01",
  "2026-04-03",
  "2026-04-21",
  "2026-05-01",
  "2026-09-07",
  "2026-10-12",
  "2026-11-02",
  "2026-11-15",
  "2026-12-25",
];

export function adicionarDiasUteis(data: Date, dias: number): Date {
  let contador = 0;
  let atual = new Date(data);
  while (contador < dias) {
    atual.setDate(atual.getDate() + 1);
    const diaSemana = atual.getDay();
    const dataStr = atual.toISOString().split("T")[0];
    if (diaSemana !== 0 && diaSemana !== 6 && !FERIADOS.includes(dataStr)) {
      contador++;
    }
  }
  return atual;
}

export function diasUteisEntre(inicio: Date, fim: Date): number {
  let contador = 0;
  let atual = new Date(inicio);
  while (atual < fim) {
    atual.setDate(atual.getDate() + 1);
    const dia = atual.getDay();
    const dataStr = atual.toISOString().split("T")[0];
    if (dia !== 0 && dia !== 6 && !FERIADOS.includes(dataStr)) contador++;
  }
  return contador;
}
