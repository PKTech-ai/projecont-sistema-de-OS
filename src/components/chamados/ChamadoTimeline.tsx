"use client";

import { useMemo, useState, useTransition } from "react";
import { Virtuoso } from "react-virtuoso";
import { formatDateTime } from "@/lib/utils";
import { adicionarComentario } from "@/server/actions/chamados";
import { uploadAnexoChamado, removerAnexoChamado } from "@/server/actions/anexos";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, cn } from "@/lib/utils";
import {
  MessageSquare,
  ArrowRight,
  Send,
  Paperclip,
  Download,
  Trash2,
  FileText,
  Info,
  XCircle,
  CheckCircle,
  RotateCcw,
  Play,
  SendHorizonal,
} from "lucide-react";
import { TipoMensagemChat, type StatusChamado, type Role } from "@prisma/client";
import {
  estiloBubbleComentario,
  TIPO_MENSAGEM_HINT,
  TIPO_MENSAGEM_LABEL,
} from "@/lib/mensagem-chat";

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
  tipoMensagem: TipoMensagemChat;
};

type AnexoItem = {
  id: string;
  nomeOriginal: string;
  tamanhoBytes: number;
  criadoEm: Date;
  autor: { id: string; nome: string; role: Role };
};

type FeedRow =
  | { kind: "status"; data: HistoricoItem }
  | { kind: "comentario"; data: ComentarioItem }
  | { kind: "anexo"; data: AnexoItem };

interface ChamadoTimelineProps {
  chamadoId: string;
  /** Mensagens do solicitante à esquerda; demais (atendimento) à direita */
  solicitanteId: string;
  historico: HistoricoItem[];
  comentarios: ComentarioItem[];
  anexos: AnexoItem[];
  podeUploadAnexo: boolean;
  canDeleteAnexoIds: Set<string>;
  currentRole: Role;
  chamadoStatus: StatusChamado;
  /** Responsável, gestor do setor destino ou superadmin — pode marcar ação / resolução */
  podeTiposEspeciais: boolean;
  className?: string;
}

function getStatusConfig(statusDepois: StatusChamado) {
  const map: Record<
    StatusChamado,
    {
      icon: React.ComponentType<{ className?: string }>;
      dotColor: string;
    }
  > = {
    NAO_INICIADO: { icon: Info, dotColor: "bg-blue-400" },
    EM_ANDAMENTO: { icon: Play, dotColor: "bg-yellow-400" },
    AGUARDANDO_VALIDACAO: { icon: SendHorizonal, dotColor: "bg-purple-400" },
    CONCLUIDO: { icon: CheckCircle, dotColor: "bg-green-500" },
    CANCELADO: { icon: XCircle, dotColor: "bg-gray-400" },
  };
  return map[statusDepois] ?? { icon: Info, dotColor: "bg-gray-400" };
}

function isReprovacao(item: HistoricoItem) {
  return (
    item.statusAntes === "AGUARDANDO_VALIDACAO" &&
    item.statusDepois === "EM_ANDAMENTO"
  );
}

function Avatar({ nome, role }: { nome: string; role: Role }) {
  const initials = nome
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const colors: Record<Role, string> = {
    SUPERADMIN: "bg-ds-ink text-white",
    GESTOR: "bg-ds-info text-white",
    ANALISTA: "bg-ds-info text-white",
    SAC: "bg-ds-success text-white",
    TV: "bg-gray-400 text-white",
  };

  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${colors[role]}`}
    >
      {initials}
    </div>
  );
}

function formatTamanho(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isLadoSolicitante(autorId: string, solicitanteId: string) {
  return autorId === solicitanteId;
}

export function ChamadoTimeline({
  chamadoId,
  solicitanteId,
  historico,
  comentarios,
  anexos,
  podeUploadAnexo,
  canDeleteAnexoIds,
  currentRole,
  chamadoStatus,
  podeTiposEspeciais,
  className,
}: ChamadoTimelineProps) {
  const [novoComentario, setNovoComentario] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<TipoMensagemChat>(TipoMensagemChat.NORMAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anexoError, setAnexoError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canComment =
    currentRole !== "TV" &&
    chamadoStatus !== "CONCLUIDO" &&
    chamadoStatus !== "CANCELADO";

  const feed: FeedRow[] = useMemo(
    () =>
      [
        ...historico.map((h) => ({ kind: "status" as const, data: h })),
        ...comentarios.map((c) => ({ kind: "comentario" as const, data: c })),
        ...anexos.map((a) => ({ kind: "anexo" as const, data: a })),
      ].sort(
        (a, b) =>
          new Date(
            a.kind === "status"
              ? a.data.criadoEm
              : a.kind === "comentario"
                ? a.data.criadoEm
                : a.data.criadoEm
          ).getTime() -
          new Date(
            b.kind === "status"
              ? b.data.criadoEm
              : b.kind === "comentario"
                ? b.data.criadoEm
                : b.data.criadoEm
          ).getTime()
      ),
    [historico, comentarios, anexos]
  );

  async function enviarComentario() {
    if (!novoComentario.trim()) return;
    setLoading(true);
    setError(null);
    const result = await adicionarComentario(
      chamadoId,
      novoComentario,
      podeTiposEspeciais ? tipoMensagem : TipoMensagemChat.NORMAL
    );
    if ("error" in result && result.error) {
      setError(result.error);
    } else {
      setNovoComentario("");
      setTipoMensagem(TipoMensagemChat.NORMAL);
    }
    setLoading(false);
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAnexoError(null);
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const r = await uploadAnexoChamado(chamadoId, fd);
      if ("error" in r && r.error) setAnexoError(r.error);
    });
  }

  function renderRow(row: FeedRow) {
    if (row.kind === "status") {
      const item = row.data;
      const cfg = getStatusConfig(item.statusDepois);
      const Icon = cfg.icon;
      const reprova = isReprovacao(item);
      return (
        <div className="mb-4 flex w-full min-w-0 justify-center px-1">
          <div className="w-full max-w-md rounded-lg border border-ds-pebble bg-ds-paper/80 px-3 py-2">
            <div className="flex items-center gap-2 flex-wrap justify-center text-center">
              {reprova ? (
                <RotateCcw className="h-3.5 w-3.5 text-orange-500 shrink-0" />
              ) : (
                <Icon className="h-3.5 w-3.5 text-ds-ash shrink-0" />
              )}
              <span className="text-xs font-semibold text-ds-charcoal">
                {reprova ? "Reprovado" : STATUS_LABELS[item.statusDepois]}
              </span>
              {item.statusAntes !== item.statusDepois && !reprova && (
                <span className="flex items-center gap-1 text-[10px] text-ds-ash">
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
            <p className="text-[10px] text-ds-ash text-center mt-1">
              {formatDateTime(item.criadoEm)} · {item.autor.nome}
            </p>
            {item.justificativa && (
              <p
                className={cn(
                  "text-xs mt-2 px-2 py-1.5 rounded border text-center",
                  reprova
                    ? "bg-orange-50 text-orange-800 border-orange-200"
                    : "bg-white text-ds-ash border-ds-pebble"
                )}
              >
                {item.justificativa}
              </p>
            )}
          </div>
        </div>
      );
    }

    if (row.kind === "anexo") {
      const a = row.data;
      const ladoSolicitante = isLadoSolicitante(a.autor.id, solicitanteId);
      return (
        <div
          className={cn(
            "flex min-w-0 max-w-full mb-4",
            ladoSolicitante ? "justify-start" : "justify-end"
          )}
        >
          <div
            className={cn(
              "w-full min-w-0 max-w-[min(100%,420px)] rounded-xl border overflow-hidden shadow-sm",
              ladoSolicitante ? "border-ds-pebble bg-ds-paper" : "border-ds-info/40 bg-ds-info-bg/50"
            )}
          >
            <div className="text-[10px] uppercase tracking-wide text-ds-ash bg-ds-linen/90 px-3 py-1.5 border-b border-ds-pebble flex justify-between gap-2">
              <span>Anexo · {formatDateTime(a.criadoEm)}</span>
              <span className="font-medium text-ds-charcoal normal-case">{a.autor.nome}</span>
            </div>
            <div className="px-3 py-2.5 flex items-start gap-2">
              <FileText className="h-5 w-5 text-ds-info shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ds-ink truncate">{a.nomeOriginal}</p>
                <p className="text-[11px] text-ds-ash">{formatTamanho(a.tamanhoBytes)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={`/api/chamados/${chamadoId}/anexos/${a.id}`}
                  download={a.nomeOriginal}
                  className="p-1.5 rounded-md border border-ds-pebble bg-white hover:bg-ds-linen"
                  title="Baixar"
                >
                  <Download className="h-4 w-4" />
                </a>
                {canDeleteAnexoIds.has(a.id) && (
                  <button
                    type="button"
                    disabled={pending}
                    className="p-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    title="Remover"
                    onClick={() =>
                      startTransition(async () => {
                        setAnexoError(null);
                        const r = await removerAnexoChamado(a.id);
                        if ("error" in r && r.error) setAnexoError(r.error);
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    const item = row.data;
    const ladoSolicitante = isLadoSolicitante(item.autor.id, solicitanteId);
    const tm = item.tipoMensagem ?? TipoMensagemChat.NORMAL;
    const est = estiloBubbleComentario(tm, !ladoSolicitante);
    return (
      <div
        className={cn(
          "flex min-w-0 max-w-full gap-2 mb-4",
          ladoSolicitante ? "flex-row" : "flex-row-reverse"
        )}
      >
        <Avatar nome={item.autor.nome} role={item.autor.role} />
        <div
          className={cn(
            "min-w-0 max-w-[min(100%,480px)]",
            ladoSolicitante ? "items-start" : "items-end"
          )}
        >
          <div className={cn("rounded-xl border overflow-hidden", est.shell)}>
            <div
              className={cn(
                "text-[10px] uppercase tracking-wide px-3 py-1.5 border-b flex flex-wrap justify-between gap-x-2 gap-y-0.5 items-center",
                est.headerBar
              )}
            >
              <span className={est.badge}>{TIPO_MENSAGEM_LABEL[tm]}</span>
              <span className="font-medium normal-case opacity-90">
                {item.autor.nome} · {formatDateTime(item.criadoEm)}
              </span>
            </div>
            <div className="px-3 py-2.5">
              <p className="text-sm text-ds-charcoal leading-relaxed whitespace-pre-wrap">
                {item.conteudo}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden rounded-xl border border-ds-pebble bg-white",
        className
      )}
    >
      <div className="px-3 py-2 border-b border-ds-pebble shrink-0">
        <h3 className="font-semibold text-ds-ink flex items-center gap-2 text-sm">
          <MessageSquare className="h-4 w-4 text-ds-info shrink-0" />
          Conversa
          <span className="ml-auto text-xs font-normal text-ds-ash">
            {feed.length} {feed.length === 1 ? "evento" : "eventos"}
          </span>
        </h3>
        <p className="sr-only">
          Mensagens do solicitante à esquerda; atendimento à direita. Lista com rolagem interna.
        </p>
      </div>

      <div className="flex-1 min-h-[240px] lg:min-h-0">
        {feed.length === 0 ? (
          <p className="text-sm text-ds-ash text-center py-10 px-4">Nenhuma atividade ainda.</p>
        ) : (
          <Virtuoso
            className="min-w-0 max-w-full overflow-x-hidden px-3 sm:px-4"
            data={feed}
            style={{ height: "100%" }}
            initialTopMostItemIndex={{ index: "LAST", align: "end" }}
            increaseViewportBy={{ top: 120, bottom: 200 }}
            computeItemKey={(_, row) =>
              row.kind === "status"
                ? `s-${row.data.id}`
                : row.kind === "comentario"
                  ? `c-${row.data.id}`
                  : `a-${row.data.id}`
            }
            itemContent={(_index, row) => renderRow(row)}
          />
        )}
      </div>

      {canComment && (
        <div className="border-t border-ds-pebble bg-ds-paper/90 p-3 shrink-0">
          {anexoError ? <p className="text-ds-danger text-xs mb-2">{anexoError}</p> : null}
          {podeTiposEspeciais && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {(
                [
                  TipoMensagemChat.NORMAL,
                  TipoMensagemChat.ACAO_SOLICITANTE,
                  TipoMensagemChat.RESOLUCAO,
                ] as const
              ).map((t) => (
                <button
                  key={t}
                  type="button"
                  title={TIPO_MENSAGEM_HINT[t]}
                  onClick={() => setTipoMensagem(t)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    t === TipoMensagemChat.RESOLUCAO
                      ? tipoMensagem === t
                        ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                        : "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                      : t === TipoMensagemChat.ACAO_SOLICITANTE
                        ? tipoMensagem === t
                          ? "border-amber-500 bg-amber-400 text-amber-950 shadow-sm"
                          : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                        : tipoMensagem === t
                          ? "border-ds-ink bg-ds-ink text-white"
                          : "border-ds-pebble bg-white text-ds-ash hover:bg-ds-linen"
                  )}
                >
                  {TIPO_MENSAGEM_LABEL[t]}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            {podeUploadAnexo && (
              <label className="shrink-0 cursor-pointer rounded-full p-2.5 border border-ds-pebble bg-white hover:bg-ds-linen transition-colors">
                <input
                  type="file"
                  className="sr-only"
                  disabled={pending}
                  onChange={onPickFile}
                />
                <Paperclip className="h-5 w-5 text-ds-charcoal" />
              </label>
            )}
            <Textarea
              value={novoComentario}
              onChange={(e) => setNovoComentario(e.target.value)}
              placeholder="Escreva uma mensagem…"
              rows={2}
              className="flex-1 min-h-[44px] max-h-36 rounded-xl border-ds-pebble focus-visible:ring-ds-info text-sm resize-y"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  enviarComentario();
                }
              }}
            />
            <Button
              size="sm"
              disabled={loading || !novoComentario.trim()}
              className="shrink-0 h-10 px-4 bg-ds-ink hover:bg-ds-ink-dark text-white rounded-xl"
              onClick={enviarComentario}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-between mt-1.5 px-0.5">
            <span className="text-[10px] text-ds-ash">⌘+Enter envia · até 8 MB por anexo</span>
            {error ? <span className="text-red-500 text-xs">{error}</span> : null}
          </div>
        </div>
      )}

      {!canComment && (
        <div className="border-t border-ds-pebble px-4 py-3 text-center text-xs text-ds-ash shrink-0">
          {chamadoStatus === "CONCLUIDO" && "Chamado concluído — conversa encerrada."}
          {chamadoStatus === "CANCELADO" && "Chamado cancelado — conversa encerrada."}
          {currentRole === "TV" && "Somente leitura."}
        </div>
      )}
    </div>
  );
}
