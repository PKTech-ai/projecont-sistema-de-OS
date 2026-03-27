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
    <div className="bg-white rounded-xl border border-[#DCE2EB] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#DCE2EB]/50 hover:bg-[#DCE2EB]/50">
            <TableHead className="text-[#001F3E] font-semibold">Título</TableHead>
            <TableHead className="text-[#001F3E] font-semibold">Status</TableHead>
            <TableHead className="text-[#001F3E] font-semibold">Prioridade</TableHead>
            <TableHead className="text-[#001F3E] font-semibold">Destino</TableHead>
            <TableHead className="text-[#001F3E] font-semibold">Responsável</TableHead>
            <TableHead className="text-[#001F3E] font-semibold">SLA</TableHead>
            <TableHead className="text-[#001F3E] font-semibold">Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chamados.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-[#64789B]">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            chamados.map((c, i) => (
              <TableRow key={c.id} className={i % 2 === 1 ? "bg-[#F8FAFC]" : "bg-white"}>
                <TableCell className="font-medium max-w-xs">
                  <Link
                    href={`/chamados/${c.id}`}
                    className="text-[#001F3E] hover:text-[#1AB6D9] hover:underline transition-colors line-clamp-1"
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
                <TableCell className="text-[#3E3E3D] text-sm">
                  {c.empresa?.nome ?? c.projeto?.nome ?? "—"}
                </TableCell>
                <TableCell className="text-[#3E3E3D] text-sm">
                  {c.responsavel?.nome ?? (
                    <span className="text-[#8E8E8D] italic">Não atribuído</span>
                  )}
                </TableCell>
                <TableCell>
                  <SlaIndicator prazoSla={c.prazoSla} status={c.status} />
                </TableCell>
                <TableCell className="text-[#64789B] text-sm">
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
