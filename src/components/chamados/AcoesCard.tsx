"use client";

import { useState } from "react";
import {
  mudarStatus,
  cancelarChamado,
  entregarChamado,
  transferirChamado,
} from "@/server/actions/chamados";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  RotateCcw,
  XCircle,
  Play,
  SendHorizonal,
  ArrowLeftRight,
} from "lucide-react";
import type { StatusChamado, Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface AcoesCardProps {
  chamado: {
    id: string;
    status: StatusChamado;
    responsavelId: string;
    solicitanteId: string;
    setorDestinoTipo?: string | null;
  };
  currentUser: {
    id: string;
    role: Role;
    setorId: string;
    setorTipo: string;
  };
  candidatosTransferencia?: { id: string; nome: string }[];
  podeTransferir?: boolean;
  className?: string;
  /** Sem Card/borda — uso dentro de painel único com &lt;hr /&gt; */
  embedded?: boolean;
}

export function AcoesCard({
  chamado,
  currentUser,
  candidatosTransferencia = [],
  podeTransferir = false,
  className,
  embedded = false,
}: AcoesCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [solucao, setSolucao] = useState("");
  const [novoResponsavelId, setNovoResponsavelId] = useState("");
  const [showPanel, setShowPanel] = useState<
    "justificativa" | "entregar" | "cancelar" | "transferir" | null
  >(null);

  const candidatosItems = useMemo(
    () =>
      Object.fromEntries(
        candidatosTransferencia.map((u) => [u.id, u.nome] as const)
      ),
    [candidatosTransferencia]
  );

  const isResponsavel = currentUser.id === chamado.responsavelId;
  const isSolicitante = currentUser.id === chamado.solicitanteId;

  async function handleAction(action: string) {
    setLoading(true);
    setError(null);
    let result: { success?: boolean; error?: string } | null = null;

    if (action === "iniciar") {
      result = await mudarStatus({ chamadoId: chamado.id, novoStatus: "EM_ANDAMENTO" });
    } else if (action === "entregar") {
      if (!solucao.trim() || solucao.trim().length < 10) {
        setError("Descreva a solução com pelo menos 10 caracteres");
        setLoading(false);
        return;
      }
      result = await entregarChamado({ chamadoId: chamado.id, solucao });
    } else if (action === "concluir") {
      result = await mudarStatus({ chamadoId: chamado.id, novoStatus: "CONCLUIDO" });
    } else if (action === "reprovar") {
      if (!justificativa.trim()) {
        setError("Justificativa é obrigatória para reprovar");
        setLoading(false);
        return;
      }
      result = await mudarStatus({
        chamadoId: chamado.id,
        novoStatus: "EM_ANDAMENTO",
        justificativa,
      });
    } else if (action === "cancelar") {
      result = await cancelarChamado(chamado.id, justificativa || undefined);
    } else if (action === "transferir") {
      if (!novoResponsavelId) {
        setError("Selecione o novo responsável");
        setLoading(false);
        return;
      }
      result = await transferirChamado({
        chamadoId: chamado.id,
        novoResponsavelId,
        justificativa: justificativa.trim() || undefined,
      });
    }

    if (result && "error" in result && result.error) {
      setError(result.error);
    } else {
      setShowPanel(null);
      setJustificativa("");
      setSolucao("");
      setNovoResponsavelId("");
    }
    setLoading(false);
  }

  const operacoesBody = (
    <>
        {chamado.status === "NAO_INICIADO" && isResponsavel && (
          <Button
            disabled={loading}
            className="bg-ds-info hover:bg-ds-ink-dark text-white w-full"
            onClick={() => handleAction("iniciar")}
          >
            <Play className="h-4 w-4 mr-2" />
            Iniciar atendimento
          </Button>
        )}

        {chamado.status === "EM_ANDAMENTO" && isResponsavel && showPanel !== "entregar" && (
          <Button
            disabled={loading}
            className="bg-ds-info hover:bg-ds-ink text-white w-full"
            onClick={() => setShowPanel("entregar")}
          >
            <SendHorizonal className="h-4 w-4 mr-2" />
            Enviar para validação
          </Button>
        )}

        {showPanel === "entregar" && (
          <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Label className="text-sm font-semibold text-ds-ink">
              Descreva a solução aplicada *
            </Label>
            <p className="text-xs text-ds-ash">
              O solicitante verá esta descrição ao validar o chamado.
            </p>
            <Textarea
              value={solucao}
              onChange={(e) => setSolucao(e.target.value)}
              placeholder="O que foi feito para resolver esta demanda? Seja específico."
              rows={4}
              className="border-blue-200 focus-visible:ring-ds-info text-sm bg-white"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={loading}
                className="bg-ds-info hover:bg-ds-ink text-white"
                onClick={() => handleAction("entregar")}
              >
                {loading ? "Enviando..." : "Confirmar entrega"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-ds-pebble"
                onClick={() => {
                  setShowPanel(null);
                  setSolucao("");
                  setError(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {chamado.status === "AGUARDANDO_VALIDACAO" && isSolicitante && (
          <Button
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white w-full"
            onClick={() => handleAction("concluir")}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Aprovar e concluir
          </Button>
        )}

        {chamado.status === "AGUARDANDO_VALIDACAO" && isSolicitante && showPanel !== "justificativa" && (
          <Button
            disabled={loading}
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-50 w-full"
            onClick={() => setShowPanel("justificativa")}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reprovar
          </Button>
        )}

        {showPanel === "justificativa" && chamado.status === "AGUARDANDO_VALIDACAO" && (
          <div className="space-y-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <Label className="text-sm font-semibold text-orange-800">Motivo da reprovação *</Label>
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Explique o que ainda precisa ser corrigido ou complementado..."
              rows={3}
              className="border-orange-200 text-sm bg-white"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => handleAction("reprovar")}
              >
                {loading ? "Enviando..." : "Confirmar reprovação"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowPanel(null);
                  setJustificativa("");
                  setError(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {podeTransferir &&
          showPanel !== "transferir" &&
          chamado.status !== "CONCLUIDO" &&
          chamado.status !== "CANCELADO" && (
            <Button
              disabled={loading}
              variant="outline"
              className="border-ds-pebble text-ds-charcoal hover:bg-ds-paper w-full"
              onClick={() => {
                setShowPanel("transferir");
                setJustificativa("");
                setError(null);
              }}
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Transferir responsável
            </Button>
          )}

        {showPanel === "transferir" && (
          <div className="space-y-3 p-3 bg-ds-linen rounded-lg border border-ds-pebble">
            <Label className="text-sm font-semibold text-ds-ink">Novo responsável *</Label>
            {candidatosTransferencia.length === 0 ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Não há outro usuário ativo no setor de destino para receber este chamado. Cadastre
                mais um membro no setor (Admin → Usuários) ou peça a um administrador.
              </p>
            ) : (
              <Select
                value={novoResponsavelId || null}
                onValueChange={(v) => setNovoResponsavelId(v ?? "")}
                items={candidatosItems}
              >
                <SelectTrigger className="w-full border-ds-stone bg-white">
                  <SelectValue placeholder="Selecione um analista do setor" />
                </SelectTrigger>
                <SelectContent>
                  {candidatosTransferencia.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Label className="text-xs text-ds-ash">Observação (opcional)</Label>
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Motivo da transferência..."
              rows={2}
              className="border-ds-pebble text-sm bg-white"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={loading || candidatosTransferencia.length === 0}
                className="bg-ds-ink text-white hover:bg-ds-ink-dark"
                onClick={() => handleAction("transferir")}
              >
                {loading ? "Transferindo..." : "Confirmar transferência"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowPanel(null);
                  setJustificativa("");
                  setNovoResponsavelId("");
                  setError(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {isSolicitante &&
          chamado.status !== "CONCLUIDO" &&
          chamado.status !== "CANCELADO" &&
          showPanel !== "cancelar" && (
            <Button
              disabled={loading}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50 w-full"
              onClick={() => setShowPanel("cancelar")}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancelar chamado
            </Button>
          )}

        {showPanel === "cancelar" && (
          <div className="space-y-2 p-3 bg-red-50 rounded-lg border border-red-200">
            <Label className="text-sm font-semibold text-red-800">Justificativa do cancelamento</Label>
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Motivo do cancelamento (opcional)..."
              rows={2}
              className="border-red-200 text-sm bg-white"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleAction("cancelar")}
              >
                {loading ? "Cancelando..." : "Confirmar cancelamento"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowPanel(null);
                  setJustificativa("");
                  setError(null);
                }}
              >
                Voltar
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-xs pt-1">{error}</p>}
    </>
  );

  if (embedded) {
    return (
      <div className={cn("space-y-2", className)}>
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ds-ash">
          Operações
        </h3>
        {operacoesBody}
      </div>
    );
  }

  return (
    <Card className={cn("border-ds-pebble shadow-none", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-ds-ink">Operações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{operacoesBody}</CardContent>
    </Card>
  );
}
