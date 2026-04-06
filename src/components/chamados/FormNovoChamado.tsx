"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { criarChamado } from "@/server/actions/chamados";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PRIORIDADE_GUIA } from "@/lib/prioridade";
import type { Setor, Empresa, Projeto, Prioridade, VinculoEmpresa } from "@prisma/client";
import {
  AlertCircle,
  Zap,
  ArrowDown,
  ArrowUp,
  Minus,
  User2,
  Info,
} from "lucide-react";
import { JORNADA_INICIO_HORA, JORNADA_FIM_HORA } from "@/lib/sla";

const schema = z.object({
  titulo: z.string().min(5, "Mínimo 5 caracteres"),
  descricao: z.string().min(10, "Mínimo 10 caracteres"),
  prioridade: z.enum(["BAIXA", "MEDIA", "ALTA", "CRITICA"]),
  setorDestinoId: z.string().min(1, "Selecione o setor"),
  empresaId: z.string().min(1, "Selecione a empresa"),
  projetoId: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

type EmpresaComVinculos = Empresa & {
  vinculos: (VinculoEmpresa & { responsavel: { nome: string } })[];
};

interface FormNovoChamadoProps {
  setores: Setor[];
  empresas: EmpresaComVinculos[];
  projetos: (Projeto & { setor: Setor })[];
}

const PRIORIDADE_CONFIG: Record<
  Prioridade,
  { label: string; color: string; icon: typeof ArrowDown }
> = {
  BAIXA: {
    label: "Baixa",
    color: "bg-ds-success-bg text-ds-success-fg border-ds-pebble",
    icon: ArrowDown,
  },
  MEDIA: {
    label: "Média",
    color: "bg-ds-warning-bg text-ds-warning-fg border-ds-pebble",
    icon: Minus,
  },
  ALTA: {
    label: "Alta",
    color: "bg-ds-warning-bg text-ds-warning-fg border-ds-warning ring-1 ring-ds-warning/30",
    icon: ArrowUp,
  },
  CRITICA: {
    label: "Crítica",
    color: "bg-ds-danger-bg text-ds-danger-fg border-ds-pebble",
    icon: Zap,
  },
};

export function FormNovoChamado({
  setores,
  empresas,
  projetos,
}: FormNovoChamadoProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responsavelPreview, setResponsavelPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      prioridade: "MEDIA",
      empresaId: "",
      setorDestinoId: "",
      projetoId: null as string | null,
    },
  });

  const setorDestinoId = watch("setorDestinoId");
  const empresaId = watch("empresaId");
  const prioridadeWatch = watch("prioridade");
  const projetoIdWatch = watch("projetoId");

  const setorSelecionado = setores.find((s) => s.id === setorDestinoId);
  const empresasFiltradas = setorSelecionado
    ? empresas.filter((e) =>
        e.vinculos.some((v) => v.tipoServico === setorSelecionado.tipo)
      )
    : [];
  const isSetorIA = setorSelecionado?.tipo === "IA";
  const projetosFiltrados = projetos.filter((p) => p.setor.tipo === "IA");

  /** Base UI: `items` faz o trigger mostrar o nome, não o id bruto (evita cuid/valor solto). */
  const setorItems = useMemo(
    () => Object.fromEntries(setores.map((s) => [s.id, s.nome] as const)),
    [setores]
  );
  const empresaItems = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of empresasFiltradas) m[e.id] = e.nome;
    if (empresaId && m[empresaId] === undefined) {
      const found = empresas.find((x) => x.id === empresaId);
      if (found) m[empresaId] = found.nome;
    }
    return m;
  }, [empresasFiltradas, empresaId, empresas]);

  const projetoItems = useMemo(() => {
    const map: Record<string, string> = { __none__: "— Nenhum —" };
    for (const p of projetosFiltrados) map[p.id] = p.nome;
    return map;
  }, [projetosFiltrados]);

  const prioridadeSel = (prioridadeWatch ?? "MEDIA") as Prioridade;
  const PriorIcon = PRIORIDADE_CONFIG[prioridadeSel].icon;

  useEffect(() => {
    if (!empresaId || !setorSelecionado) {
      setResponsavelPreview(null);
      return;
    }
    const empresa = empresas.find((e) => e.id === empresaId);
    if (!empresa) {
      setResponsavelPreview(null);
      return;
    }

    const vinculo = empresa.vinculos.find(
      (v) => v.tipoServico === setorSelecionado.tipo
    );
    setResponsavelPreview(vinculo ? vinculo.responsavel.nome : null);
  }, [empresaId, setorSelecionado, empresas]);

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError(null);

    const result = await criarChamado({
      titulo: data.titulo,
      descricao: data.descricao,
      prioridade: data.prioridade,
      setorDestinoId: data.setorDestinoId,
      emNomeDeCliente: false,
      empresaId: data.empresaId,
      projetoId: data.projetoId === "__none__" ? null : data.projetoId,
      empresaClienteId: null,
    });

    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/chamados/${result.data?.id}`);
  }

  return (
    <Card className="border-ds-pebble rounded-[9px] bg-white/95 shadow-sm">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <input type="hidden" {...register("setorDestinoId")} />
          <input type="hidden" {...register("empresaId")} />

          {/* ── Título e Descrição ───────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="ds-label">Título *</Label>
            <Input
              {...register("titulo")}
              placeholder="Descreva brevemente a demanda"
              className="rounded-[5px] border-ds-stone text-sm focus-visible:border-ds-ink focus-visible:ring-ds-ink/10"
            />
            {errors.titulo && <p className="text-ds-danger text-xs mt-1">{errors.titulo.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="ds-label">Descrição *</Label>
            <Textarea
              {...register("descricao")}
              placeholder="Detalhe a demanda com informações relevantes — quanto mais contexto, mais rápida a resolução"
              rows={4}
              className="rounded-[5px] border-ds-stone text-sm focus-visible:border-ds-ink focus-visible:ring-ds-ink/10 min-h-[100px]"
            />
            {errors.descricao && <p className="text-ds-danger text-xs mt-1">{errors.descricao.message}</p>}
          </div>

          {/* ── Prioridade (única escala + prazo fixo) ───────────────────── */}
          <div className="space-y-3 p-4 bg-ds-linen/80 rounded-[9px] border border-ds-pebble">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-ds-info mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-ds-ink">Prioridade *</p>
                <p className="text-xs text-ds-ash mt-0.5">
                  Escolha só o nível. O prazo para resposta é calculado automaticamente em horas úteis
                  ({JORNADA_INICIO_HORA}h–{JORNADA_FIM_HORA}h, segunda a sexta, exceto feriados).
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <select
                {...register("prioridade")}
                className="w-full sm:max-w-md h-10 rounded-[5px] border border-ds-stone bg-white px-3 text-sm text-ds-charcoal focus:outline-none focus:border-ds-ink focus:ring-2 focus:ring-ds-ink/10"
              >
                {PRIORIDADE_GUIA.map((g) => (
                  <option key={g.prioridade} value={g.prioridade}>
                    {g.titulo} — até {g.prazoHorasUteis} horas úteis
                  </option>
                ))}
              </select>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold w-fit ${PRIORIDADE_CONFIG[prioridadeSel].color}`}>
                <PriorIcon className="h-3 w-3" />
                {PRIORIDADE_CONFIG[prioridadeSel].label}
              </div>
            </div>
            {errors.prioridade && (
              <p className="text-ds-danger text-xs mt-1">{errors.prioridade.message}</p>
            )}

            <ul className="space-y-2.5 pt-1 border-t border-ds-pebble mt-2">
              {PRIORIDADE_GUIA.map((g) => (
                <li key={g.prioridade} className="text-xs text-ds-charcoal leading-snug">
                  <span className="font-semibold text-ds-ink">{g.titulo}</span>
                  <span className="text-ds-ash"> ({g.prazoHorasUteis}h úteis) — </span>
                  {g.quandoUsar}
                </li>
              ))}
            </ul>
          </div>

          {/* ── Setor Destino ────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="ds-label">Setor Destino *</Label>
            <Select
              value={setorDestinoId || null}
              onValueChange={(v) => {
                const next = v ?? "";
                setValue("setorDestinoId", next, { shouldValidate: true });
                setValue("empresaId", "");
                setValue("projetoId", null);
              }}
              items={setorItems}
            >
              <SelectTrigger className="w-full rounded-[5px] border-ds-stone focus:ring-ds-ink/10">
                <SelectValue placeholder="Para qual setor vai esta demanda?" />
              </SelectTrigger>
              <SelectContent>
                {setores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.setorDestinoId && <p className="text-ds-danger text-xs mt-1">{errors.setorDestinoId.message}</p>}
          </div>

          {/* ── Empresa (responsável vem do vínculo empresa × setor) ─────── */}
          {setorSelecionado && (
            <div className="space-y-2">
              <Label className="ds-label">Empresa *</Label>
              {empresasFiltradas.length === 0 ? (
                <div className="ds-alert-warn text-[13px] [&>span]:leading-snug">
                  <User2 className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Nenhuma empresa possui vínculo com o setor <strong>{setorSelecionado.nome}</strong>.
                    Cadastre o vínculo antes de abrir o chamado.
                  </span>
                </div>
              ) : (
                <>
                  <Select
                    value={empresaId || null}
                    onValueChange={(v) =>
                      setValue("empresaId", v ?? "", { shouldValidate: true })
                    }
                    items={empresaItems}
                  >
                    <SelectTrigger className="w-full rounded-[5px] border-ds-stone focus:ring-ds-ink/10">
                      <SelectValue placeholder="Selecione a empresa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {empresasFiltradas.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.empresaId && (
                    <p className="text-ds-danger text-xs mt-1">{errors.empresaId.message}</p>
                  )}
                  {empresaId && responsavelPreview && (
                    <div className="ds-alert-ok text-[13px] [&>span]:leading-snug">
                      <User2 className="h-4 w-4 flex-shrink-0" />
                      <span>
                        Responsável pelo atendimento: <strong>{responsavelPreview}</strong> (vínculo
                        empresa × setor)
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Projeto (Setor IA) ───────────────────────────────────────── */}
          {isSetorIA && projetosFiltrados.length > 0 && (
            <div className="space-y-2">
              <Label className="ds-label">Projeto (opcional)</Label>
              <Select
                value={projetoIdWatch ? String(projetoIdWatch) : "__none__"}
                onValueChange={(v) =>
                  setValue("projetoId", v === "__none__" ? null : String(v), {
                    shouldValidate: true,
                  })
                }
                items={projetoItems}
              >
                <SelectTrigger className="w-full rounded-[5px] border-ds-stone focus:ring-ds-ink/10">
                  <SelectValue placeholder="Vincule a um projeto existente..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum —</SelectItem>
                  {projetosFiltrados.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSetorIA && (
                <p className="text-xs text-ds-ash">
                  O responsável é definido pelo vínculo da empresa com o setor IA (projeto continua opcional).
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="ds-alert-err" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="font-semibold rounded-[5px]"
            >
              {loading ? "Abrindo..." : "Abrir Chamado"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-ds-pebble text-ds-ash"
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
