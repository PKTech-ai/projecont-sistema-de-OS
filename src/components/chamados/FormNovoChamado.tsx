"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { criarChamado } from "@/server/actions/chamados";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  calcularPrioridade,
  URGENCIA_LABELS,
  IMPACTO_LABELS,
  TIPO_CHAMADO_LABELS,
  TIPO_CHAMADO_DESC,
} from "@/lib/prioridade";
import type {
  Setor,
  Empresa,
  Projeto,
  Role,
  TipoSetor,
  Urgencia,
  Impacto,
  VinculoEmpresa,
} from "@prisma/client";
import {
  AlertCircle,
  Wrench,
  Zap,
  ArrowDown,
  ArrowUp,
  Minus,
  User2,
} from "lucide-react";

const schema = z.object({
  titulo: z.string().min(5, "Mínimo 5 caracteres"),
  descricao: z.string().min(10, "Mínimo 10 caracteres"),
  tipo: z.enum(["INCIDENTE", "SOLICITACAO"]),
  urgencia: z.enum(["MUITO_BAIXA", "BAIXA", "MEDIA", "ALTA", "MUITO_ALTA"]),
  impacto: z.enum(["MUITO_BAIXO", "BAIXO", "MEDIO", "ALTO", "MUITO_ALTO"]),
  setorDestinoId: z.string().min(1, "Selecione o setor"),
  empresaId: z.string().optional().nullable(),
  projetoId: z.string().optional().nullable(),
  emNomeDeCliente: z.boolean(),
  empresaClienteId: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

type EmpresaComVinculos = Empresa & {
  vinculos: (VinculoEmpresa & { responsavel: { nome: string } })[];
};

interface FormNovoChamadoProps {
  setores: Setor[];
  empresas: EmpresaComVinculos[];
  projetos: (Projeto & { setor: Setor })[];
  currentUserRole: Role;
}

const SETORES_COM_EMPRESA: TipoSetor[] = ["CONTABIL", "FISCAL", "DP"];

const PRIORIDADE_CONFIG = {
  BAIXA: { label: "Baixa", color: "bg-green-100 text-green-800 border-green-200", icon: ArrowDown },
  MEDIA: { label: "Média", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Minus },
  ALTA: { label: "Alta", color: "bg-orange-100 text-orange-800 border-orange-200", icon: ArrowUp },
  CRITICA: { label: "Crítica", color: "bg-red-100 text-red-800 border-red-200", icon: Zap },
};

export function FormNovoChamado({
  setores,
  empresas,
  projetos,
  currentUserRole,
}: FormNovoChamadoProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responsavelPreview, setResponsavelPreview] = useState<string | null>(null);
  const [urgenciaDisplay, setUrgenciaDisplay] = useState<Urgencia>("MEDIA");
  const [impactoDisplay, setImpactoDisplay] = useState<Impacto>("MEDIO");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo: "SOLICITACAO",
      urgencia: "MEDIA",
      impacto: "MEDIO",
      emNomeDeCliente: false,
    },
  });

  const setorDestinoId = watch("setorDestinoId");
  const empresaId = watch("empresaId");
  const emNomeDeCliente = watch("emNomeDeCliente");
  const urgencia = watch("urgencia");
  const impacto = watch("impacto");
  const tipoWatch = watch("tipo");

  const setorSelecionado = setores.find((s) => s.id === setorDestinoId);
  const precisaEmpresa = setorSelecionado && SETORES_COM_EMPRESA.includes(setorSelecionado.tipo as TipoSetor);
  const isSetorIA = setorSelecionado?.tipo === "IA";
  const projetosFiltrados = projetos.filter((p) => p.setor.tipo === "IA");

  // Calcular prioridade automaticamente
  const prioridadeCalculada = urgencia && impacto
    ? calcularPrioridade(urgencia as Urgencia, impacto as Impacto)
    : "MEDIA";
  const PriorIcon = PRIORIDADE_CONFIG[prioridadeCalculada].icon;

  // Preview de responsável com base em empresa + setor
  useEffect(() => {
    if (!empresaId || empresaId === "__none__" || !setorSelecionado) {
      setResponsavelPreview(null);
      return;
    }
    const empresa = empresas.find((e) => e.id === empresaId);
    if (!empresa) { setResponsavelPreview(null); return; }

    const vinculo = empresa.vinculos.find(
      (v) => v.tipoServico === setorSelecionado.tipo
    );
    setResponsavelPreview(vinculo ? vinculo.responsavel.nome : null);
  }, [empresaId, setorSelecionado, empresas]);

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError(null);

    // Passa prioridade calculada automaticamente
    const result = await criarChamado({
      ...data,
      prioridade: prioridadeCalculada,
      empresaId: data.empresaId === "__none__" ? null : data.empresaId,
      projetoId: data.projetoId === "__none__" ? null : data.projetoId,
      empresaClienteId: data.empresaClienteId === "__none__" ? null : data.empresaClienteId,
    });

    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/chamados/${result.data?.id}`);
  }

  return (
    <Card className="border-[#DCE2EB]">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Tipo de chamado ─────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-[#3E3E3D] font-medium">Tipo de chamado *</Label>
            <div className="grid grid-cols-2 gap-3">
              {(["INCIDENTE", "SOLICITACAO"] as const).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setValue("tipo", tipo)}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all ${tipoWatch === tipo
                      ? tipo === "INCIDENTE"
                        ? "border-red-400 bg-red-50"
                        : "border-[#1AB6D9] bg-blue-50"
                      : "border-[#DCE2EB] bg-white hover:border-[#64789B]"
                    }`}
                >
                  {tipo === "INCIDENTE" ? (
                    <AlertCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${tipoWatch === tipo ? "text-red-500" : "text-[#64789B]"}`} />
                  ) : (
                    <Wrench className={`h-5 w-5 mt-0.5 flex-shrink-0 ${tipoWatch === tipo ? "text-[#1AB6D9]" : "text-[#64789B]"}`} />
                  )}
                  <div>
                    <p className={`font-semibold text-sm ${tipoWatch === tipo ? "text-[#001F3E]" : "text-[#3E3E3D]"}`}>
                      {TIPO_CHAMADO_LABELS[tipo]}
                    </p>
                    <p className="text-xs text-[#64789B] mt-0.5">{TIPO_CHAMADO_DESC[tipo]}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Título e Descrição ───────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-[#3E3E3D] font-medium">Título *</Label>
            <Input
              {...register("titulo")}
              placeholder="Descreva brevemente a demanda"
              className="border-[#DCE2EB] focus-visible:ring-[#1AB6D9]"
            />
            {errors.titulo && <p className="text-red-500 text-sm">{errors.titulo.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-[#3E3E3D] font-medium">Descrição *</Label>
            <Textarea
              {...register("descricao")}
              placeholder="Detalhe a demanda com informações relevantes — quanto mais contexto, mais rápida a resolução"
              rows={4}
              className="border-[#DCE2EB] focus-visible:ring-[#1AB6D9]"
            />
            {errors.descricao && <p className="text-red-500 text-sm">{errors.descricao.message}</p>}
          </div>

          {/* ── Urgência × Impacto → Prioridade ─────────────────────────── */}
          <div className="space-y-3 p-4 bg-[#F8FAFC] rounded-lg border border-[#DCE2EB]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#001F3E]">Urgência × Impacto</p>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${PRIORIDADE_CONFIG[prioridadeCalculada].color}`}>
                <PriorIcon className="h-3 w-3" />
                Prioridade {PRIORIDADE_CONFIG[prioridadeCalculada].label}
              </div>
            </div>
            <p className="text-xs text-[#64789B]">
              A prioridade é calculada automaticamente com base na urgência e no impacto
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[#3E3E3D] text-sm">Urgência</Label>
                <select
                  value={urgenciaDisplay}
                  onChange={(e) => {
                    const v = e.target.value as Urgencia;
                    setUrgenciaDisplay(v);
                    setValue("urgencia", v);
                  }}
                  className="w-full h-9 rounded-lg border border-[#DCE2EB] bg-white px-3 text-sm text-[#3E3E3D] focus:outline-none focus:ring-2 focus:ring-[#1AB6D9]/40"
                >
                  {(Object.keys(URGENCIA_LABELS) as Urgencia[]).map((u) => (
                    <option key={u} value={u}>{URGENCIA_LABELS[u]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#3E3E3D] text-sm">Impacto</Label>
                <select
                  value={impactoDisplay}
                  onChange={(e) => {
                    const v = e.target.value as Impacto;
                    setImpactoDisplay(v);
                    setValue("impacto", v);
                  }}
                  className="w-full h-9 rounded-lg border border-[#DCE2EB] bg-white px-3 text-sm text-[#3E3E3D] focus:outline-none focus:ring-2 focus:ring-[#1AB6D9]/40"
                >
                  {(Object.keys(IMPACTO_LABELS) as Impacto[]).map((i) => (
                    <option key={i} value={i}>{IMPACTO_LABELS[i]}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Setor Destino ────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-[#3E3E3D] font-medium">Setor Destino *</Label>
            <Select onValueChange={(v) => {
              setValue("setorDestinoId", String(v));
              setValue("empresaId", null);
              setValue("projetoId", null);
            }}>
              <SelectTrigger className="border-[#DCE2EB] focus:ring-[#1AB6D9]">
                <SelectValue placeholder="Para qual setor vai esta demanda?" />
              </SelectTrigger>
              <SelectContent>
                {setores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.setorDestinoId && <p className="text-red-500 text-sm">{errors.setorDestinoId.message}</p>}
          </div>

          {/* ── Empresa (com preview de responsável) ─────────────────────── */}
          {precisaEmpresa && (
            <div className="space-y-2">
              <Label className="text-[#3E3E3D] font-medium">
                Empresa{" "}
                <span className="text-[#64789B] font-normal text-xs">(opcional — deixe em branco para solicitação interna)</span>
              </Label>
              <Select onValueChange={(v) => setValue("empresaId", v === "__none__" ? null : String(v))}>
                <SelectTrigger className="border-[#DCE2EB] focus:ring-[#1AB6D9]">
                  <SelectValue placeholder="Selecione a empresa..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Sem empresa (solicitação interna) —</SelectItem>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Preview de responsável */}
              {empresaId && empresaId !== "__none__" && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${responsavelPreview
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-yellow-50 border-yellow-200 text-yellow-800"
                  }`}>
                  <User2 className="h-4 w-4 flex-shrink-0" />
                  {responsavelPreview ? (
                    <span>Será atribuído automaticamente para <strong>{responsavelPreview}</strong></span>
                  ) : (
                    <span>Nenhum vínculo cadastrado — chamado ficará em fila aberta para triagem</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Projeto (Setor IA) ───────────────────────────────────────── */}
          {isSetorIA && projetosFiltrados.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[#3E3E3D] font-medium">Projeto (opcional)</Label>
              <Select onValueChange={(v) => setValue("projetoId", String(v))}>
                <SelectTrigger className="border-[#DCE2EB] focus:ring-[#1AB6D9]">
                  <SelectValue placeholder="Vincule a um projeto existente..." />
                </SelectTrigger>
                <SelectContent>
                  {projetosFiltrados.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSetorIA && (
                <p className="text-xs text-[#64789B]">
                  Chamados de IA entram em fila coletiva — qualquer analista pode assumir.
                </p>
              )}
            </div>
          )}

          {/* ── Persona de cliente ───────────────────────────────────────── */}
          {(currentUserRole === "GESTOR" || currentUserRole === "SUPERADMIN") && (
            <div className="space-y-3 p-4 bg-[#F8FAFC] rounded-lg border border-[#DCE2EB]">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="emNomeDeCliente"
                  {...register("emNomeDeCliente")}
                  className="rounded border-[#DCE2EB] accent-[#1AB6D9]"
                />
                <Label htmlFor="emNomeDeCliente" className="text-[#3E3E3D] font-medium cursor-pointer">
                  Abrir em nome de cliente externo
                </Label>
              </div>
              <p className="text-xs text-[#64789B]">
                Registra que você está abrindo este chamado representando um cliente. Gera log de persona.
              </p>

              {emNomeDeCliente && (
                <div className="space-y-2">
                  <Label className="text-[#3E3E3D] font-medium text-sm">Empresa do cliente *</Label>
                  <Select onValueChange={(v) => setValue("empresaClienteId", String(v))}>
                    <SelectTrigger className="border-[#DCE2EB] focus:ring-[#1AB6D9]">
                      <SelectValue placeholder="Selecione a empresa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {empresas.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* ── Erro ────────────────────────────────────────────────────── */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#1AB6D9] hover:bg-[#2082BE] text-white font-semibold"
            >
              {loading ? "Abrindo..." : "Abrir Chamado"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-[#DCE2EB] text-[#64789B]"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
