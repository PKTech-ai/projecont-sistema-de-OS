import Link from "next/link";
import { ChamadoStatus } from "@/components/chamados/ChamadoStatus";
import { ChamadoPrioridade } from "@/components/chamados/ChamadoPrioridade";
import { SlaIndicator } from "@/components/chamados/SlaIndicator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type { StatusChamado, Prioridade } from "@prisma/client";

interface ChamadoRow {
  id: string;
  titulo: string;
  status: StatusChamado;
  prioridade: Prioridade;
  prazoSla: Date | null;
  criadoEm: Date;
  solicitante: { nome: string } | null;
  responsavel: { nome: string } | null;
  empresa: { nome: string } | null;
  projeto: { nome: string } | null;
  entregaNoPrazo?: boolean | null;
  conclusaoNoPrazo?: boolean | null;
}

interface TabelaChamadosProps {
  chamados: ChamadoRow[];
  emptyMessage?: string;
}

export function TabelaChamados({
  chamados,
  emptyMessage = "Nenhum chamado encontrado.",
}: TabelaChamadosProps) {
  return (
    <div className="min-w-0 max-w-full overflow-x-hidden bg-white rounded-xl border border-ds-pebble overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-ds-pebble/50 hover:bg-ds-pebble/50">
            <TableHead className="text-ds-ink font-semibold">Título</TableHead>
            <TableHead className="text-ds-ink font-semibold">Status</TableHead>
            <TableHead className="text-ds-ink font-semibold">Prioridade</TableHead>
            <TableHead className="text-ds-ink font-semibold">Destino</TableHead>
            <TableHead className="text-ds-ink font-semibold">Responsável</TableHead>
            <TableHead className="text-ds-ink font-semibold">Prazo</TableHead>
            <TableHead className="text-ds-ink font-semibold">Pontualidade</TableHead>
            <TableHead className="text-ds-ink font-semibold">Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chamados.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-10 text-ds-ash">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            chamados.map((c, i) => (
              <TableRow key={c.id} className={i % 2 === 1 ? "bg-ds-paper" : "bg-white"}>
                <TableCell className="font-medium max-w-xs">
                  <Link
                    href={`/chamados/${c.id}`}
                    className="text-ds-ink hover:text-ds-info hover:underline transition-colors line-clamp-1"
                  >
                    {c.titulo}
                  </Link>
                </TableCell>
                <TableCell>
                  <ChamadoStatus status={c.status} />
                </TableCell>
                <TableCell>
                  <ChamadoPrioridade prioridade={c.prioridade} />
                </TableCell>
                <TableCell className="text-ds-charcoal text-sm">
                  {c.empresa?.nome ?? c.projeto?.nome ?? "—"}
                </TableCell>
                <TableCell className="text-ds-charcoal text-sm">
                  {c.responsavel?.nome ?? "—"}
                </TableCell>
                <TableCell>
                  <SlaIndicator prazoSla={c.prazoSla} status={c.status} />
                </TableCell>
                <TableCell className="text-ds-charcoal text-xs">
                  {c.status === "AGUARDANDO_VALIDACAO" && c.entregaNoPrazo != null ? (
                    <span className={c.entregaNoPrazo ? "text-ds-success-fg" : "text-ds-danger-fg"}>
                      Entrega {c.entregaNoPrazo ? "no prazo" : "fora do prazo"}
                    </span>
                  ) : c.status === "CONCLUIDO" && c.conclusaoNoPrazo != null ? (
                    <span className={c.conclusaoNoPrazo ? "text-ds-success-fg" : "text-ds-danger-fg"}>
                      Conclusão {c.conclusaoNoPrazo ? "no prazo" : "fora do prazo"}
                    </span>
                  ) : (
                    <span className="text-ds-ash">—</span>
                  )}
                </TableCell>
                <TableCell className="text-ds-ash text-sm">
                  {formatDate(c.criadoEm)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
