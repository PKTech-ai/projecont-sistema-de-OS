/** Feriados nacionais (YYYY-MM-DD) — alinhar anualmente ao calendário da empresa */
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

/** Jornada fixa para cálculo de SLA: seg–sex, 9h às 17h = 8 horas úteis por dia */
export const JORNADA_INICIO_HORA = 9;
export const JORNADA_FIM_HORA = 17;
export const MINUTOS_UTEIS_POR_DIA =
  (JORNADA_FIM_HORA - JORNADA_INICIO_HORA) * 60;

function dateStrLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ehDiaUtil(d: Date): boolean {
  const diaSemana = d.getDay();
  if (diaSemana === 0 || diaSemana === 6) return false;
  return !FERIADOS.includes(dateStrLocal(d));
}

function inicioJornadaNoDia(d: Date): Date {
  const x = new Date(d.getTime());
  x.setHours(JORNADA_INICIO_HORA, 0, 0, 0);
  return x;
}

function fimJornadaNoDia(d: Date): Date {
  const x = new Date(d.getTime());
  x.setHours(JORNADA_FIM_HORA, 0, 0, 0);
  return x;
}

/** Próximo dia útil às 9h (a partir do dia seguinte ao calendário de `d`) */
export function proximoDiaUtil9h(d: Date): Date {
  let cur = new Date(d.getTime());
  cur.setDate(cur.getDate() + 1);
  cur.setHours(JORNADA_INICIO_HORA, 0, 0, 0);
  while (!ehDiaUtil(cur)) {
    cur.setDate(cur.getDate() + 1);
  }
  return cur;
}

/**
 * Coloca `d` no primeiro instante válido da jornada (dia útil, entre 9h e 17h).
 */
export function normalizarInicioHorarioUtil(d: Date): Date {
  let cur = new Date(d.getTime());
  while (!ehDiaUtil(cur)) {
    cur = proximoDiaUtil9h(cur);
  }
  const inicio = inicioJornadaNoDia(cur);
  const fim = fimJornadaNoDia(cur);
  if (cur < inicio) return inicio;
  if (cur >= fim) return proximoDiaUtil9h(cur);
  return cur;
}

/**
 * Soma horas úteis (seg–sex, 9h–17h, exceto feriados) a partir de `inicio`.
 */
export function adicionarHorasUteis(inicio: Date, horas: number): Date {
  let remaining = Math.round(horas * 60);
  let cur = normalizarInicioHorarioUtil(new Date(inicio.getTime()));

  while (remaining > 0) {
    if (!ehDiaUtil(cur)) {
      cur = proximoDiaUtil9h(cur);
      continue;
    }
    const fimDia = fimJornadaNoDia(cur);
    if (cur >= fimDia) {
      cur = proximoDiaUtil9h(cur);
      continue;
    }
    const disponivelMin = Math.floor((fimDia.getTime() - cur.getTime()) / 60000);
    const usar = Math.min(remaining, disponivelMin);
    cur = new Date(cur.getTime() + usar * 60000);
    remaining -= usar;
    if (remaining > 0) {
      cur = proximoDiaUtil9h(cur);
    }
  }
  return cur;
}

/**
 * Minutos úteis entre `inicio` (exclusivo do passado) e `fim`.
 * Se `fim <= inicio`, retorna 0.
 */
export function minutosUteisEntre(inicio: Date, fim: Date): number {
  if (fim <= inicio) return 0;
  let total = 0;
  let cur = normalizarInicioHorarioUtil(new Date(inicio.getTime()));
  const end = new Date(fim.getTime());

  while (cur < end) {
    if (!ehDiaUtil(cur)) {
      cur = proximoDiaUtil9h(cur);
      continue;
    }
    const fimDia = fimJornadaNoDia(cur);
    const chunkEnd = end < fimDia ? end : fimDia;
    if (cur < chunkEnd) {
      total += Math.floor((chunkEnd.getTime() - cur.getTime()) / 60000);
    }
    if (chunkEnd >= end) break;
    cur = proximoDiaUtil9h(cur);
  }
  return total;
}

/** Texto curto para exibir tempo restante em horas úteis */
export function formatMinutosUteisLegivel(minutos: number): string {
  if (minutos < 1) return "0min úteis";
  if (minutos < 60) return `${Math.round(minutos)}min úteis`;
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (h < 8) {
    return m ? `${h}h${m}min úteis` : `${h}h úteis`;
  }
  const dias = Math.floor(h / 8);
  const restH = h % 8;
  if (restH === 0 && m === 0) return `${dias}d úteis`;
  if (m === 0) return `${dias}d ${restH}h úteis`;
  return `${dias}d ${restH}h${m}min úteis`;
}

export function adicionarDiasUteis(data: Date, dias: number): Date {
  let contador = 0;
  let atual = new Date(data);
  while (contador < dias) {
    atual.setDate(atual.getDate() + 1);
    const diaSemana = atual.getDay();
    const dataStr = dateStrLocal(atual);
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
    const dataStr = dateStrLocal(atual);
    if (dia !== 0 && dia !== 6 && !FERIADOS.includes(dataStr)) contador++;
  }
  return contador;
}
