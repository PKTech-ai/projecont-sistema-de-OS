"use client";

import { useState } from "react";
import { adicionarComentario } from "@/server/actions/chamados";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDateTime } from "@/lib/utils";
import type { Role } from "@prisma/client";
import { MessageSquare, Send } from "lucide-react";

interface Comentario {
  id: string;
  conteudo: string;
  criadoEm: Date;
  autor: { id: string; nome: string; role: Role };
}

interface ComentariosSectionProps {
  chamadoId: string;
  comentarios: Comentario[];
  currentUserId: string;
  currentRole: Role;
}

export function ComentariosSection({
  chamadoId,
  comentarios,
  currentUserId,
  currentRole,
}: ComentariosSectionProps) {
  const [conteudo, setConteudo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!conteudo.trim()) return;
    setLoading(true);
    setError(null);

    const result = await adicionarComentario(chamadoId, conteudo);
    if ("error" in result) {
      setError(result.error);
    } else {
      setConteudo("");
    }
    setLoading(false);
  }

  const canComment = currentRole !== "TV";

  return (
    <div className="bg-white rounded-xl border border-[#DCE2EB] p-5">
      <h3 className="font-semibold text-[#001F3E] mb-4 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-[#1AB6D9]" />
        Comentários ({comentarios.length})
      </h3>

      <div className="space-y-4 mb-5">
        {comentarios.length === 0 ? (
          <p className="text-[#64789B] text-sm text-center py-6">
            Nenhum comentário ainda.
          </p>
        ) : (
          comentarios.map((c) => {
            const isOwn = c.autor.id === currentUserId;
            const initials = c.autor.nome
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <div key={c.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback
                    className={`text-xs font-semibold ${
                      isOwn ? "bg-[#001F3E] text-white" : "bg-[#DCE2EB] text-[#64789B]"
                    }`}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="bg-[#F8FAFC] rounded-lg px-4 py-3 border border-[#DCE2EB]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-[#001F3E]">
                        {c.autor.nome}
                      </span>
                      <span className="text-xs text-[#8E8E8D]">
                        {formatDateTime(c.criadoEm)}
                      </span>
                    </div>
                    <p className="text-sm text-[#3E3E3D] whitespace-pre-wrap">{c.conteudo}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {canComment && (
        <div className="space-y-2">
          <Textarea
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            placeholder="Escreva um comentário..."
            rows={3}
            className="border-[#DCE2EB] focus-visible:ring-[#1AB6D9]"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex justify-end">
            <Button
              disabled={loading || !conteudo.trim()}
              className="bg-[#1AB6D9] hover:bg-[#2082BE] text-white"
              onClick={handleSubmit}
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? "Enviando..." : "Comentar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
