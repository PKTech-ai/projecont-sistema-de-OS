"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MetricaResponsavel } from "@/server/queries/desempenho";
import { Badge } from "@/components/ui/badge";

function pctCell(v: number | null) {
  if (v == null) return <span className="text-ds-ash">—</span>;
  return <span className="font-semibold tabular-nums text-ds-ink">{v}%</span>;
}

export function DesempenhoClient({
  metricas,
  modo,
  setorNome,
  dias,
}: {
  metricas: MetricaResponsavel[];
  modo: "superadmin" | "gestor";
  setorNome: string;
  dias: number;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ds-ink">Desempenho por funcionário</h2>
        <p className="text-ds-ash text-sm mt-1">
          {modo === "gestor" ? (
            <>
              Setor <strong className="text-ds-charcoal">{setorNome}</strong> — últimos{" "}
              <strong>{dias}</strong> dias. Considera chamados em que a pessoa é{" "}
              <strong>responsável</strong> e o destino é o seu setor.
            </>
          ) : (
            <>
              Visão global (todos os setores), últimos <strong>{dias}</strong> dias. Métricas por{" "}
              <strong>responsável</strong> nos chamados.
            </>
          )}
        </p>
      </div>

      <div className="ds-alert-info text-[13px] [&>svg]:shrink-0">
        <span>
          <strong>No prazo</strong> e <strong>atraso</strong> usam apenas conclusões com{" "}
          <code className="rounded bg-ds-paper px-1">prazoSla</code> definido na abertura: conclusão
          até o SLA conta como no prazo; após o SLA, como atraso. A taxa de atraso é a parcela de
          conclusões fora do prazo entre as concluídas com SLA.
        </span>
      </div>

      <div className="bg-white rounded-xl border border-ds-pebble overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-ds-pebble/50 hover:bg-ds-pebble/50">
              {modo === "superadmin" ? (
                <TableHead className="text-ds-ink font-semibold">Setor</TableHead>
              ) : null}
              <TableHead className="text-ds-ink font-semibold">Funcionário</TableHead>
              <TableHead className="text-ds-ink font-semibold">E-mail</TableHead>
              <TableHead className="text-ds-ink font-semibold text-right">
                Chamados ({dias}d)
              </TableHead>
              <TableHead className="text-ds-ink font-semibold text-right">
                Concl. c/ SLA
              </TableHead>
              <TableHead className="text-ds-ink font-semibold text-right">No prazo</TableHead>
              <TableHead className="text-ds-ink font-semibold text-right">Atraso</TableHead>
              <TableHead className="text-ds-ink font-semibold text-right">Taxa no prazo</TableHead>
              <TableHead className="text-ds-ink font-semibold text-right">Taxa atraso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metricas.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={modo === "superadmin" ? 9 : 8}
                  className="text-center py-10 text-ds-ash"
                >
                  Nenhum funcionário no escopo.
                </TableCell>
              </TableRow>
            ) : (
              metricas.map((m, i) => (
                <TableRow key={m.usuarioId} className={i % 2 === 1 ? "bg-ds-paper" : "bg-white"}>
                  {modo === "superadmin" ? (
                    <TableCell className="text-ds-charcoal text-sm">{m.setorNome}</TableCell>
                  ) : null}
                  <TableCell className="font-medium text-ds-charcoal">{m.nome}</TableCell>
                  <TableCell className="text-ds-ash text-sm">{m.email}</TableCell>
                  <TableCell className="text-right tabular-nums text-ds-charcoal">
                    {m.chamadosNoPeriodo}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-ds-charcoal">
                    {m.concluidosComPrazo}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className="border-ds-success/40 bg-ds-success-bg text-ds-success-fg"
                    >
                      {m.concluidosNoPrazo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={
                        m.concluidosForaDoPrazo > 0
                          ? "border-ds-danger/40 bg-ds-danger-bg text-ds-danger-fg"
                          : "border-ds-pebble bg-ds-paper text-ds-ash"
                      }
                    >
                      {m.concluidosForaDoPrazo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{pctCell(m.taxaNoPrazoPct)}</TableCell>
                  <TableCell className="text-right">{pctCell(m.taxaAtrasoPct)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
