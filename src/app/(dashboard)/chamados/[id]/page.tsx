import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getChamadoById } from "@/server/queries/chamados";
import { ChamadoStatus } from "@/components/chamados/ChamadoStatus";
import { ChamadoPrioridade } from "@/components/chamados/ChamadoPrioridade";
import { SlaIndicator } from "@/components/chamados/SlaIndicator";
import { AcoesCard } from "@/components/chamados/AcoesCard";
import { ChamadoTimeline } from "@/components/chamados/ChamadoTimeline";
import { formatDateTime } from "@/lib/utils";
import {
  Building2,
  FolderOpen,
  User,
  Calendar,
  Clock,
  AlertCircle,
  Wrench,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { URGENCIA_LABELS, IMPACTO_LABELS } from "@/lib/prioridade";
import type { Urgencia, Impacto } from "@prisma/client";

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

  const canAct =
    session.user.id === chamado.responsavelId ||
    session.user.id === chamado.solicitanteId ||
    session.user.role === "GESTOR" ||
    session.user.role === "SUPERADMIN";

  const isTipoIncidente = chamado.tipo === "INCIDENTE";

  return (
    <div className="max-w-5xl space-y-6">
      {/* ── Cabeçalho ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#DCE2EB] p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            {/* Tipo de chamado */}
            <div className="flex items-center gap-2 mb-2">
              {isTipoIncidente ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Incidente
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                  <Wrench className="h-3.5 w-3.5" />
                  Solicitação
                </span>
              )}
              {chamado.autoFechado && (
                <Badge variant="outline" className="text-xs text-[#8E8E8D]">Auto-fechado</Badge>
              )}
              {chamado.emNomeDeCliente && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                  Em nome de cliente
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-bold text-[#001F3E] leading-tight">{chamado.titulo}</h2>
            <p className="text-[#64789B] text-sm mt-1">
              Aberto por <strong className="text-[#3E3E3D]">{chamado.solicitante.nome}</strong> em {formatDateTime(chamado.criadoEm)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <ChamadoStatus status={chamado.status} />
            <ChamadoPrioridade prioridade={chamado.prioridade} />
            <SlaIndicator prazoSla={chamado.prazoSla} status={chamado.status} />
          </div>
        </div>

        {/* Descrição */}
        <div className="bg-[#F8FAFC] rounded-lg p-4 mb-5">
          <p className="text-[#3E3E3D] leading-relaxed whitespace-pre-wrap text-sm">{chamado.descricao}</p>
        </div>

        <Separator className="my-5 bg-[#DCE2EB]" />

        {/* Meta-dados */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-[#1AB6D9] mt-0.5 shrink-0" />
            <div>
              <p className="text-[#64789B] text-xs">Responsável</p>
              <p className="text-[#3E3E3D] font-medium">
                {chamado.responsavel?.nome ?? (
                  <span className="text-[#8E8E8D] italic font-normal">Não atribuído</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            {chamado.empresa ? (
              <Building2 className="h-4 w-4 text-[#1AB6D9] mt-0.5 shrink-0" />
            ) : (
              <FolderOpen className="h-4 w-4 text-[#1AB6D9] mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-[#64789B] text-xs">{chamado.empresa ? "Empresa" : "Projeto"}</p>
              <p className="text-[#3E3E3D] font-medium">
                {chamado.empresa?.nome ?? chamado.projeto?.nome ?? "—"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-[#1AB6D9] mt-0.5 shrink-0" />
            <div>
              <p className="text-[#64789B] text-xs">Prazo SLA</p>
              <p className="text-[#3E3E3D] font-medium">
                {chamado.prazoSla ? formatDateTime(chamado.prazoSla) : "—"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-[#1AB6D9] mt-0.5 shrink-0" />
            <div>
              <p className="text-[#64789B] text-xs">Atualizado</p>
              <p className="text-[#3E3E3D] font-medium">{formatDateTime(chamado.atualizadoEm)}</p>
            </div>
          </div>
        </div>

        {/* Urgência / Impacto */}
        <div className="mt-4 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-[#64789B]">
            <Zap className="h-3.5 w-3.5" />
            <span>Urgência:</span>
            <span className="font-semibold text-[#3E3E3D]">
              {URGENCIA_LABELS[chamado.urgencia as Urgencia]}
            </span>
          </div>
          <span className="text-[#DCE2EB]">·</span>
          <div className="flex items-center gap-1.5 text-[#64789B]">
            <span>Impacto:</span>
            <span className="font-semibold text-[#3E3E3D]">
              {IMPACTO_LABELS[chamado.impacto as Impacto]}
            </span>
          </div>
        </div>
      </div>

      {/* ── Solução (só aparece quando entregue/concluído) ──────────────── */}
      {chamado.solucao && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-800">Solução Aplicada</h3>
            {chamado.entregueEm && (
              <span className="text-xs text-green-600 ml-auto">
                Entregue em {formatDateTime(chamado.entregueEm)}
              </span>
            )}
          </div>
          <p className="text-green-900 text-sm leading-relaxed whitespace-pre-wrap">
            {chamado.solucao}
          </p>
        </div>
      )}

      {/* ── Ações + Timeline ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          {canAct && session.user.role !== "TV" && (
            <AcoesCard
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
            />
          )}
        </div>

        {/* ── Timeline unificada (GLPI-style) ─────────────────────────── */}
        <div className="lg:col-span-2">
          <ChamadoTimeline
            chamadoId={chamado.id}
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
            }))}
            currentUserId={session.user.id}
            currentRole={session.user.role}
            chamadoStatus={chamado.status}
          />
        </div>
      </div>
    </div>
  );
}
