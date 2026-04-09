import { getDashboardSession } from "@/lib/contabil-session";
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
import { Plus, Headphones } from "lucide-react";
import { PageContextNav } from "@/components/layout/PageContextNav";
import { DashboardMainScroll } from "@/components/layout/DashboardMainScroll";

export default async function ChamadosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getDashboardSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const page = Number(params.page ?? 1);

  const { chamados, total, pages } = await getChamados({
    userId: session.user.id,
    role: session.user.role,
    setorId: session.user.setorId,
    page,
  });

  const isSac = session.user.role === "SAC";
  const novoChamadoHref = isSac ? "/sac/novo" : "/chamados/novo";
  const novoChamadoLabel = isSac ? "Chamado para cliente" : "Novo chamado";

  return (
    <DashboardMainScroll>
    <div className="space-y-6">
      <PageContextNav
        items={[
          { label: "Painel inicial", href: "/" },
          { label: "Chamados" },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ds-ink">Chamados</h2>
          <p className="text-ds-ash text-sm mt-1">
            {total} chamado{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          render={<Link href={novoChamadoHref} />}
          nativeButton={false}
          className="bg-ds-ink hover:bg-ds-ink-dark text-ds-paper"
        >
          {isSac ? (
            <Headphones className="h-4 w-4 mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          {novoChamadoLabel}
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-ds-pebble overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-ds-pebble/50 hover:bg-ds-pebble/50">
              <TableHead className="text-ds-ink font-semibold">Título</TableHead>
              <TableHead className="text-ds-ink font-semibold">Status</TableHead>
              <TableHead className="text-ds-ink font-semibold">Prioridade</TableHead>
              <TableHead className="text-ds-ink font-semibold">Destino</TableHead>
              <TableHead className="text-ds-ink font-semibold">Responsável</TableHead>
              <TableHead className="text-ds-ink font-semibold">Prazo</TableHead>
              <TableHead className="text-ds-ink font-semibold">Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chamados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-ds-ash">
                  Nenhum chamado encontrado.
                </TableCell>
              </TableRow>
            ) : (
              chamados.map((c, i) => (
                <TableRow
                  key={c.id}
                  className={i % 2 === 1 ? "bg-ds-paper" : "bg-white"}
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`/chamados/${c.id}`}
                      className="text-ds-ink hover:text-ds-info hover:underline transition-colors"
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
                    {c.responsavel?.nome ?? (
                      <span className="text-brand-gray-mid italic">Não atribuído</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <SlaIndicator prazoSla={c.prazoSla} status={c.status} />
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
                  ? "bg-ds-info hover:bg-ds-ink-dark text-white"
                  : "border-ds-pebble text-ds-ash"
              }
            >
              {p}
            </Button>
          ))}
        </div>
      )}
    </div>
    </DashboardMainScroll>
  );
}
