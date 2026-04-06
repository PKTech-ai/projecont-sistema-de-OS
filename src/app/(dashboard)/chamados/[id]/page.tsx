import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getChamadoById } from "@/server/queries/chamados";
import { ChamadoStatus } from "@/components/chamados/ChamadoStatus";
import { ChamadoPrioridade } from "@/components/chamados/ChamadoPrioridade";
import { SlaIndicator } from "@/components/chamados/SlaIndicator";
import { AcoesCard } from "@/components/chamados/AcoesCard";
import { ChamadoTimeline } from "@/components/chamados/ChamadoTimeline";
import { ChamadoDetalheHeader } from "@/components/chamados/ChamadoDetalheHeader";
import { formatDateTime } from "@/lib/utils";
import {
  Building2,
  FolderOpen,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { PRAZO_HORAS_UTEIS_POR_PRIORIDADE } from "@/lib/prioridade";
import { JORNADA_INICIO_HORA, JORNADA_FIM_HORA } from "@/lib/sla";
import { PageContextNav } from "@/components/layout/PageContextNav";
import { prisma } from "@/lib/prisma";

export default async function ChamadoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const chamado = await getChamadoById(id);
  if (!chamado) notFound();

  const gestorDoDestino =
    session.user.role === "GESTOR" && chamado.setorDestinoId === session.user.setorId;

  const canAct =
    session.user.id === chamado.responsavelId ||
    session.user.id === chamado.solicitanteId ||
    session.user.role === "SUPERADMIN" ||
    gestorDoDestino;

  const podeTransferirGestorOuAdmin =
    (session.user.role === "GESTOR" || session.user.role === "SUPERADMIN") &&
    Boolean(chamado.setorDestinoId) &&
    chamado.status !== "CONCLUIDO" &&
    chamado.status !== "CANCELADO";

  const podeTransferirAnalista =
    session.user.role === "ANALISTA" &&
    session.user.id === chamado.responsavelId &&
    Boolean(chamado.setorDestinoId) &&
    chamado.status !== "CONCLUIDO" &&
    chamado.status !== "CANCELADO";

  const podeTransferir = podeTransferirGestorOuAdmin || podeTransferirAnalista;

  const candidatosTransferencia = podeTransferir
    ? await prisma.usuario.findMany({
      where: {
        ativo: true,
        id: { not: chamado.responsavelId },
        setorId: chamado.setorDestinoId!,
      },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    })
    : [];

  const tituloNav =
    chamado.titulo.length > 52 ? `${chamado.titulo.slice(0, 49)}…` : chamado.titulo;

  const podeAnexar =
    canAct &&
    session.user.role !== "TV" &&
    chamado.status !== "CONCLUIDO" &&
    chamado.status !== "CANCELADO";

  const podeTiposEspeciais =
    session.user.role === "SUPERADMIN" ||
    session.user.id === chamado.responsavelId ||
    (session.user.role === "GESTOR" &&
      chamado.setorDestinoId === session.user.setorId);

  const canDeleteIds = new Set(
    chamado.anexos
      .filter((a) => {
        if (session.user.id === a.autorId) return true;
        if (session.user.role === "SUPERADMIN") return true;
        if (
          session.user.role === "GESTOR" &&
          chamado.setorDestinoId === session.user.setorId
        )
          return true;
        return false;
      })
      .map((a) => a.id)
  );

  const idCurto = chamado.id.slice(0, 8);

  const chamadoIniciado = chamado.status !== "NAO_INICIADO";

  return (
    <div className="mx-auto flex h-full min-h-0 w-full min-w-0 max-w-[1600px] flex-1 flex-col overflow-x-hidden overflow-y-hidden">
      {/* Bloco fixo no topo: trilha + cabeçalho/dropdown — não rola com o grid */}
      <div className="sticky top-0 z-30 shrink-0 border-b border-ds-pebble/90 bg-ds-paper/98 pb-2 pt-0 backdrop-blur-sm supports-[backdrop-filter]:bg-ds-paper/90">
        <PageContextNav
          items={[
            { label: "Painel inicial", href: "/" },
            { label: "Chamados", href: "/chamados" },
            { label: tituloNav },
          ]}
        />

        <ChamadoDetalheHeader
          chamadoIniciado={chamadoIniciado}
          idCurto={idCurto}
          titulo={chamado.titulo}
          aberturaFormatada={formatDateTime(chamado.criadoEm)}
          solicitanteNome={chamado.solicitante.nome}
          descricao={chamado.descricao}
          status={chamado.status}
        />
      </div>

      <div className="mt-2 grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-stretch lg:gap-3">
        {/* Conversa — só a lista de mensagens rola (Virtuoso) */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-hidden">
          {chamado.solucao && (
            <div className="rounded-xl border border-green-200 bg-green-50/90 p-4 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <h2 className="font-semibold text-green-800 text-sm">Solução aplicada</h2>
                {chamado.entregueEm && (
                  <span className="text-xs text-green-700 ml-auto">
                    {formatDateTime(chamado.entregueEm)}
                  </span>
                )}
              </div>
              <p className="text-green-900 text-sm leading-relaxed whitespace-pre-wrap">
                {chamado.solucao}
              </p>
            </div>
          )}

          <ChamadoTimeline
            className="min-h-0 w-full min-w-0 flex-1 basis-0"
            chamadoId={chamado.id}
            solicitanteId={chamado.solicitanteId}
            historico={chamado.historicoStatus.map((h) => ({
              id: h.id,
              tipo: "status" as const,
              criadoEm: h.criadoEm,
              autor: h.ator,
              statusAntes: h.statusAntes,
              statusDepois: h.statusDepois,
              justificativa: h.justificativa,
            }))}
            comentarios={chamado.comentarios.map((c) => ({
              id: c.id,
              tipo: "comentario" as const,
              criadoEm: c.criadoEm,
              autor: c.autor,
              conteudo: c.conteudo,
              tipoMensagem: c.tipo,
            }))}
            anexos={chamado.anexos.map((a) => ({
              id: a.id,
              nomeOriginal: a.nomeOriginal,
              tamanhoBytes: a.tamanhoBytes,
              criadoEm: a.criadoEm,
              autor: a.autor,
            }))}
            podeUploadAnexo={podeAnexar}
            canDeleteAnexoIds={canDeleteIds}
            currentRole={session.user.role}
            chamadoStatus={chamado.status}
            podeTiposEspeciais={podeTiposEspeciais}
          />
        </div>

        {/* Detalhes + operações: um bloco, scroll interno, seções por <hr /> */}
        <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-ds-pebble bg-white shadow-sm lg:max-h-full lg:shrink-0">
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 py-3 sm:px-4">
            <section aria-labelledby="det-chamado-meta">
              <h2
                id="det-chamado-meta"
                className="text-[11px] font-semibold uppercase tracking-wide text-ds-ash flex items-center gap-2 mb-2"
              >
                <Layers className="h-3.5 w-3.5 shrink-0" />
                Chamado
              </h2>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] font-medium text-ds-ash uppercase tracking-wide mb-1 text-center">
                    Status
                  </p>
                  <div className="flex justify-center">
                    <ChamadoStatus status={chamado.status} />
                  </div>
                </div>
                <Separator className="bg-ds-pebble" />
                <div>
                  <p className="text-[10px] font-medium text-ds-ash uppercase tracking-wide mb-1">
                    Prioridade
                  </p>
                  <ChamadoPrioridade prioridade={chamado.prioridade} />
                  <p className="text-[10px] text-ds-ash mt-1 leading-snug">
                    {PRAZO_HORAS_UTEIS_POR_PRIORIDADE[chamado.prioridade]}h úteis (
                    {JORNADA_INICIO_HORA}h–{JORNADA_FIM_HORA}h)
                  </p>
                </div>
                <Separator className="bg-ds-pebble" />
                <div>
                  <p className="text-[10px] font-medium text-ds-ash uppercase tracking-wide mb-1">
                    Prazo (SLA)
                  </p>
                  <p className="text-sm font-medium text-ds-charcoal">
                    {chamado.prazoSla ? formatDateTime(chamado.prazoSla) : "—"}
                  </p>
                  <div className="mt-1.5">
                    <SlaIndicator prazoSla={chamado.prazoSla} status={chamado.status} />
                  </div>
                </div>
              </div>
            </section>

            <hr className="my-4 border-ds-pebble" />

            <section aria-labelledby="det-atores">
              <h2 id="det-atores" className="text-[11px] font-semibold uppercase tracking-wide text-ds-ash mb-2">
                Atores
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <User className="h-4 w-4 text-ds-info mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-ds-ash">Atribuído a</p>
                    <p className="font-medium text-ds-charcoal leading-tight">
                      {chamado.responsavel?.nome ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <User className="h-4 w-4 text-ds-info mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-ds-ash">Solicitante</p>
                    <p className="font-medium text-ds-charcoal leading-tight">{chamado.solicitante.nome}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {chamado.empresa ? (
                    <Building2 className="h-4 w-4 text-ds-info mt-0.5 shrink-0" />
                  ) : (
                    <FolderOpen className="h-4 w-4 text-ds-info mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-[10px] text-ds-ash">{chamado.empresa ? "Empresa" : "Projeto"}</p>
                    <p className="font-medium text-ds-charcoal leading-tight">
                      {chamado.empresa?.nome ?? chamado.projeto?.nome ?? "—"}
                    </p>
                  </div>
                </div>
                {chamado.setorDestino && (
                  <div className="flex gap-2">
                    <Layers className="h-4 w-4 text-ds-info mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-ds-ash">Setor</p>
                      <p className="font-medium text-ds-charcoal leading-tight">
                        {chamado.setorDestino.nome}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <hr className="my-4 border-ds-pebble" />

            <section aria-label="Datas" className="space-y-2.5 text-sm">
              <div className="flex gap-2">
                <Calendar className="h-4 w-4 text-ds-ash mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-ds-ash">Última atualização</p>
                  <p className="font-medium text-ds-charcoal text-[13px]">
                    {formatDateTime(chamado.atualizadoEm)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Clock className="h-4 w-4 text-ds-ash mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-ds-ash">Abertura (referência)</p>
                  <p className="font-medium text-ds-charcoal text-[13px]">
                    {formatDateTime(chamado.criadoEm)}
                  </p>
                </div>
              </div>
            </section>

            {(chamado.entregaNoPrazo != null || chamado.conclusaoNoPrazo != null) && (
              <>
                <hr className="my-4 border-ds-pebble" />
                <section aria-label="Pontualidade" className="text-xs space-y-1.5">
                  <p className="font-semibold text-ds-ink text-[11px] uppercase tracking-wide">
                    Pontualidade
                  </p>
                  {chamado.entregaNoPrazo != null && (
                    <span
                      className={`inline-block rounded-md px-2 py-1 font-medium ${chamado.entregaNoPrazo
                          ? "bg-ds-success-bg text-ds-success-fg"
                          : "bg-ds-danger-bg text-ds-danger-fg"
                        }`}
                    >
                      Entrega: {chamado.entregaNoPrazo ? "no prazo" : "fora"}
                    </span>
                  )}
                  {chamado.conclusaoNoPrazo != null && (
                    <span
                      className={`inline-block rounded-md px-2 py-1 font-medium ${chamado.conclusaoNoPrazo
                          ? "bg-ds-success-bg text-ds-success-fg"
                          : "bg-ds-danger-bg text-ds-danger-fg"
                        }`}
                    >
                      Conclusão: {chamado.conclusaoNoPrazo ? "no prazo" : "fora"}
                    </span>
                  )}
                </section>
              </>
            )}

            {(chamado.autoFechado || chamado.emNomeDeCliente) && (
              <>
                <hr className="my-4 border-ds-pebble" />
                <div className="flex flex-wrap gap-1.5">
                  {chamado.autoFechado && (
                    <span className="text-[10px] px-2 py-0.5 rounded border border-ds-pebble text-ds-ash">
                      Auto-fechado
                    </span>
                  )}
                  {chamado.emNomeDeCliente && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                      Em nome de cliente
                    </span>
                  )}
                </div>
              </>
            )}

            {canAct && session.user.role !== "TV" && (
              <>
                <hr className="my-4 border-ds-pebble" />
                <AcoesCard
                  embedded
                  chamado={{
                    id: chamado.id,
                    status: chamado.status,
                    responsavelId: chamado.responsavelId,
                    solicitanteId: chamado.solicitanteId,
                    setorDestinoTipo: chamado.setorDestino?.tipo ?? null,
                  }}
                  currentUser={{
                    id: session.user.id,
                    role: session.user.role,
                    setorId: session.user.setorId,
                    setorTipo: session.user.setorTipo ?? "",
                  }}
                  candidatosTransferencia={candidatosTransferencia}
                  podeTransferir={podeTransferir}
                />
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
