import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getChamados } from "@/server/queries/chamados";
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
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function ChamadosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const page = Number(params.page ?? 1);

  const { chamados, total, pages } = await getChamados({
    userId: session.user.id,
    role: session.user.role,
    setorId: session.user.setorId,
    page,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#001F3E]">Chamados</h2>
          <p className="text-[#64789B] text-sm mt-1">
            {total} chamado{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          render={<Link href="/chamados/novo" />}
          nativeButton={false}
          className="bg-[#1AB6D9] hover:bg-[#2082BE] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Chamado
        </Button>
      </div>

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
              <TableHead className="text-[#001F3E] font-semibold">Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chamados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[#64789B]">
                  Nenhum chamado encontrado.
                </TableCell>
              </TableRow>
            ) : (
              chamados.map((c, i) => (
                <TableRow
                  key={c.id}
                  className={i % 2 === 1 ? "bg-[#F8FAFC]" : "bg-white"}
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`/chamados/${c.id}`}
                      className="text-[#001F3E] hover:text-[#1AB6D9] hover:underline transition-colors"
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

      {pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              render={<Link href={`/chamados?page=${p}`} />}
              nativeButton={false}
              variant={p === page ? "default" : "outline"}
              size="sm"
              className={
                p === page
                  ? "bg-[#1AB6D9] hover:bg-[#2082BE] text-white"
                  : "border-[#DCE2EB] text-[#64789B]"
              }
            >
              {p}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
