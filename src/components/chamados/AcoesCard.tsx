"use client";

import { useState } from "react";
import {
  mudarStatus,
  assumirChamadoIA,
  cancelarChamado,
  entregarChamado,
} from "@/server/actions/chamados";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, RotateCcw, XCircle, Play, UserCheck, SendHorizonal } from "lucide-react";
import type { StatusChamado, Role } from "@prisma/client";

interface AcoesCardProps {
  chamado: {
    id: string;
    status: StatusChamado;
    responsavelId: string | null;
    solicitanteId: string;
    setorDestinoTipo?: string | null;
  };
  currentUser: {
    id: string;
    role: Role;
    setorId: string;
    setorTipo: string;
  };
}

export function AcoesCard({ chamado, currentUser }: AcoesCardProps) {
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [justificativa, setJustificativa]       = useState("");
  const [solucao, setSolucao]                   = useState("");
  const [showPanel, setShowPanel]               = useState<"justificativa" | "entregar" | "cancelar" | null>(null);

  const isResponsavel   = currentUser.id === chamado.responsavelId;
  const isSolicitante   = currentUser.id === chamado.solicitanteId;
  const isGestorOrAdmin = currentUser.role === "GESTOR" || currentUser.role === "SUPERADMIN";
  // "Assumir" apenas para chamados do SETOR IA (não setor do usuário)
  const isSetorIAChamado = chamado.setorDestinoTipo === "IA";
  const podeAssumir = isSetorIAChamado &&
    (currentUser.setorTipo === "IA" || currentUser.role === "SUPERADMIN");

  async function handleAction(action: string) {
    setLoading(true);
    setError(null);
    let result: { success?: boolean; error?: string } | null = null;

    if (action === "assumir") {
      result = await assumirChamadoIA(chamado.id);
    } else if (action === "iniciar") {
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
      result = await mudarStatus({ chamadoId: chamado.id, novoStatus: "EM_ANDAMENTO", justificativa });
    } else if (action === "cancelar") {
      result = await cancelarChamado(chamado.id, justificativa || undefined);
    }

    if (result && "error" in result && result.error) {
      setError(result.error);
    } else {
      setShowPanel(null);
      setJustificativa("");
      setSolucao("");
    }
    setLoading(false);
  }

  return (
    <Card className="border-[#DCE2EB]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-[#001F3E]">Ações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">

        {/* Assumir (IA) */}
        {chamado.status === "ABERTO" && !chamado.responsavelId && podeAssumir && (
          <Button
            disabled={loading}
            className="bg-[#1AB6D9] hover:bg-[#2082BE] text-white w-full"
            onClick={() => handleAction("assumir")}
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Assumir Chamado
          </Button>
        )}

        {/* Iniciar */}
        {chamado.status === "ABERTO" && isResponsavel && (
          <Button
            disabled={loading}
            className="bg-[#1AB6D9] hover:bg-[#2082BE] text-white w-full"
            onClick={() => handleAction("iniciar")}
          >
            <Play className="h-4 w-4 mr-2" />
            Iniciar Atendimento
          </Button>
        )}

        {/* Entregar → abre painel com campo de solução */}
        {chamado.status === "EM_ANDAMENTO" && isResponsavel && showPanel !== "entregar" && (
          <Button
            disabled={loading}
            className="bg-[#2082BE] hover:bg-[#001F3E] text-white w-full"
            onClick={() => setShowPanel("entregar")}
          >
            <SendHorizonal className="h-4 w-4 mr-2" />
            Enviar para Validação
          </Button>
        )}

        {/* Painel de solução */}
        {showPanel === "entregar" && (
          <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Label className="text-sm font-semibold text-[#001F3E]">
              Descreva a solução aplicada *
            </Label>
            <p className="text-xs text-[#64789B]">
              O solicitante verá esta descrição ao validar o chamado.
            </p>
            <Textarea
              value={solucao}
              onChange={(e) => setSolucao(e.target.value)}
              placeholder="O que foi feito para resolver esta demanda? Seja específico."
              rows={4}
              className="border-blue-200 focus-visible:ring-[#1AB6D9] text-sm bg-white"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={loading}
                className="bg-[#2082BE] hover:bg-[#001F3E] text-white"
                onClick={() => handleAction("entregar")}
              >
                {loading ? "Enviando..." : "Confirmar Entrega"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-[#DCE2EB]"
                onClick={() => { setShowPanel(null); setSolucao(""); setError(null); }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Aprovar */}
        {chamado.status === "AGUARDANDO_VALIDACAO" && isSolicitante && (
          <Button
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white w-full"
            onClick={() => handleAction("concluir")}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Aprovar e Concluir
          </Button>
        )}

        {/* Reprovar → abre painel */}
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

        {/* Painel de reprovação */}
        {showPanel === "justificativa" && (
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
                {loading ? "Enviando..." : "Confirmar Reprovação"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowPanel(null); setJustificativa(""); setError(null); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Cancelar */}
        {isGestorOrAdmin &&
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
            Cancelar Chamado
          </Button>
        )}

        {/* Painel de cancelamento */}
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
                {loading ? "Cancelando..." : "Confirmar Cancelamento"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowPanel(null); setJustificativa(""); setError(null); }}>
                Voltar
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-xs pt-1">{error}</p>}
      </CardContent>
    </Card>
  );
}
