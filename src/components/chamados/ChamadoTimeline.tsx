"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/utils";
import { adicionarComentario } from "@/server/actions/chamados";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/utils";
import {
  MessageSquare,
  ArrowRight,
  Send,
  User2,
  Info,
  XCircle,
  CheckCircle,
  RotateCcw,
  Play,
  UserCheck,
  SendHorizonal,
} from "lucide-react";
import type { StatusChamado, Role } from "@prisma/client";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type HistoricoItem = {
  id: string;
  tipo: "status";
  criadoEm: Date;
  autor: { id: string; nome: string; role: Role };
  statusAntes: StatusChamado;
  statusDepois: StatusChamado;
  justificativa: string | null;
};

type ComentarioItem = {
  id: string;
  tipo: "comentario";
  criadoEm: Date;
  autor: { id: string; nome: string; role: Role };
  conteudo: string;
};

type TimelineItem = HistoricoItem | ComentarioItem;

interface ChamadoTimelineProps {
  chamadoId: string;
  historico: HistoricoItem[];
  comentarios: ComentarioItem[];
  currentUserId: string;
  currentRole: Role;
  chamadoStatus: StatusChamado;
}

// ─── Configuração visual por transição ───────────────────────────────────────

function getStatusConfig(statusDepois: StatusChamado) {
  const map: Record<StatusChamado, {
    icon: React.ComponentType<{ className?: string }>;
    dotColor: string;
    label?: string;
  }> = {
    ABERTO:               { icon: Info,          dotColor: "bg-blue-400"   },
    EM_ANDAMENTO:         { icon: Play,           dotColor: "bg-yellow-400" },
    AGUARDANDO_VALIDACAO: { icon: SendHorizonal,  dotColor: "bg-purple-400" },
    CONCLUIDO:            { icon: CheckCircle,    dotColor: "bg-green-500"  },
    CANCELADO:            { icon: XCircle,        dotColor: "bg-gray-400"   },
  };
  return map[statusDepois] ?? { icon: Info, dotColor: "bg-gray-400" };
}

function isReprovacao(item: HistoricoItem) {
  return (
    item.statusAntes === "AGUARDANDO_VALIDACAO" &&
    item.statusDepois === "EM_ANDAMENTO"
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ nome, role }: { nome: string; role: Role }) {
  const initials = nome
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const colors: Record<Role, string> = {
    SUPERADMIN: "bg-[#001F3E] text-white",
    GESTOR:     "bg-[#2082BE] text-white",
    ANALISTA:   "bg-[#1AB6D9] text-white",
    TV:         "bg-gray-400 text-white",
  };

  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${colors[role]}`}>
      {initials}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ChamadoTimeline({
  chamadoId,
  historico,
  comentarios,
  currentUserId,
  currentRole,
  chamadoStatus,
}: ChamadoTimelineProps) {
  const [novoComentario, setNovoComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canComment =
    currentRole !== "TV" &&
    chamadoStatus !== "CONCLUIDO" &&
    chamadoStatus !== "CANCELADO";

  // Mescla e ordena por data
  const items: TimelineItem[] = [
    ...historico,
    ...comentarios,
  ].sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime());

  async function enviarComentario() {
    if (!novoComentario.trim()) return;
    setLoading(true);
    setError(null);
    const result = await adicionarComentario(chamadoId, novoComentario);
    if ("error" in result && result.error) {
      setError(result.error);
    } else {
      setNovoComentario("");
    }
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-xl border border-[#DCE2EB]">
      <div className="px-5 py-4 border-b border-[#DCE2EB]">
        <h3 className="font-semibold text-[#001F3E] flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[#1AB6D9]" />
          Timeline do Chamado
          <span className="ml-auto text-xs font-normal text-[#64789B]">
            {items.length} {items.length === 1 ? "evento" : "eventos"}
          </span>
        </h3>
      </div>

      {/* ── Feed ─────────────────────────────────────────────────────────── */}
      <div className="p-5 space-y-0">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;

          if (item.tipo === "status") {
            const cfg = getStatusConfig(item.statusDepois);
            const Icon = cfg.icon;
            const reprova = isReprovacao(item);

            return (
              <div key={item.id} className="flex gap-3">
                {/* Linha vertical */}
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${reprova ? "bg-orange-400" : cfg.dotColor}`} />
                  {!isLast && <div className="w-px flex-1 bg-[#DCE2EB] mt-1 mb-0" />}
                </div>

                {/* Conteúdo */}
                <div className={`pb-5 flex-1 ${isLast ? "pb-0" : ""}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {reprova ? (
                          <RotateCcw className="h-3.5 w-3.5 text-orange-500" />
                        ) : (
                          <Icon className="h-3.5 w-3.5 text-[#64789B]" />
                        )}
                        <span className="text-sm font-medium text-[#3E3E3D]">
                          {reprova ? "Reprovado" : STATUS_LABELS[item.statusDepois]}
                        </span>
                        {item.statusAntes !== item.statusDepois && !reprova && (
                          <span className="flex items-center gap-1 text-xs text-[#64789B]">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                              {STATUS_LABELS[item.statusAntes]}
                            </Badge>
                            <ArrowRight className="h-3 w-3" />
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                              {STATUS_LABELS[item.statusDepois]}
                            </Badge>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#64789B] mt-0.5">
                        <span className="font-medium text-[#3E3E3D]">{item.autor.nome}</span>
                        {" · "}
                        {formatDateTime(item.criadoEm)}
                      </p>
                      {item.justificativa && (
                        <p className={`text-xs mt-1.5 px-3 py-2 rounded-md italic border ${
                          reprova
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-[#F8FAFC] text-[#64789B] border-[#DCE2EB]"
                        }`}>
                          {item.justificativa}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Comentário
          const isMe = item.autor.id === currentUserId;
          return (
            <div key={item.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="mt-0.5 flex-shrink-0">
                  <Avatar nome={item.autor.nome} role={item.autor.role} />
                </div>
                {!isLast && <div className="w-px flex-1 bg-[#DCE2EB] mt-1 mb-0" />}
              </div>

              <div className={`pb-5 flex-1 ${isLast ? "pb-0" : ""}`}>
                <div className={`rounded-xl p-3.5 border ${
                  isMe
                    ? "bg-[#EBF7FC] border-[#1AB6D9]/30"
                    : "bg-[#F8FAFC] border-[#DCE2EB]"
                }`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-[#001F3E]">{item.autor.nome}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-[#DCE2EB] text-[#64789B]">
                      {item.autor.role}
                    </Badge>
                    <span className="text-xs text-[#64789B] ml-auto">{formatDateTime(item.criadoEm)}</span>
                  </div>
                  <p className="text-sm text-[#3E3E3D] leading-relaxed whitespace-pre-wrap">
                    {item.conteudo}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <p className="text-sm text-[#64789B] text-center py-6">Nenhum evento ainda.</p>
        )}
      </div>

      {/* ── Adicionar comentário ────────────────────────────────────────── */}
      {canComment && (
        <div className="px-5 pb-5 border-t border-[#DCE2EB] pt-4">
          <div className="flex gap-3">
            <div className="mt-0.5 flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-[#1AB6D9] flex items-center justify-center">
                <User2 className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <Textarea
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                placeholder="Adicione um comentário ou atualize sobre o andamento..."
                rows={3}
                className="border-[#DCE2EB] focus-visible:ring-[#1AB6D9] text-sm resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    enviarComentario();
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#64789B]">⌘+Enter para enviar</span>
                <Button
                  size="sm"
                  disabled={loading || !novoComentario.trim()}
                  className="bg-[#1AB6D9] hover:bg-[#2082BE] text-white"
                  onClick={enviarComentario}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  {loading ? "Enviando..." : "Comentar"}
                </Button>
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
            </div>
          </div>
        </div>
      )}

      {!canComment && (
        <div className="px-5 pb-4 pt-3 border-t border-[#DCE2EB]">
          <p className="text-xs text-center text-[#64789B]">
            {chamadoStatus === "CONCLUIDO" && "Chamado concluído — comentários desabilitados."}
            {chamadoStatus === "CANCELADO" && "Chamado cancelado — comentários desabilitados."}
            {currentRole === "TV" && "Modo TV — somente leitura."}
          </p>
        </div>
      )}
    </div>
  );
}
