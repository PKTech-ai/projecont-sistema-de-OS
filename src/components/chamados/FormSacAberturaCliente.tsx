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
  Headphones,
} from "lucide-react";
import { JORNADA_INICIO_HORA, JORNADA_FIM_HORA } from "@/lib/sla";

const schema = z.object({
  empresaClienteId: z.string().min(1, "Selecione a empresa do cliente"),
  titulo: z.string().min(5, "Mínimo 5 caracteres"),
  descricao: z.string().min(10, "Mínimo 10 caracteres"),
  prioridade: z.enum(["BAIXA", "MEDIA", "ALTA", "CRITICA"]),
  setorDestinoId: z.string().min(1, "Selecione o setor"),
  projetoId: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

type EmpresaComVinculos = Empresa & {
  vinculos: (VinculoEmpresa & { responsavel: { nome: string } })[];
};

interface FormSacAberturaClienteProps {
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

export function FormSacAberturaCliente({
  setores,
  empresas,
  projetos,
}: FormSacAberturaClienteProps) {
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
      empresaClienteId: "",
      setorDestinoId: "",
      projetoId: null as string | null,
    },
  });

  const setorDestinoId = watch("setorDestinoId");
  const empresaClienteId = watch("empresaClienteId");
  const prioridadeWatch = watch("prioridade");
  const projetoIdWatch = watch("projetoId");

  const setorSelecionado = setores.find((s) => s.id === setorDestinoId);
  const empresasFiltradas = setorSelecionado
    ? empresas.filter((e) =>
        e.vinculos.some((v) => v.tipoServico === setorSelecionado.tipo)
      )
    : empresas;
  const isSetorIA = setorSelecionado?.tipo === "IA";
  const projetosFiltrados = projetos.filter((p) => p.setor.tipo === "IA");

  const setorItems = useMemo(
    () => Object.fromEntries(setores.map((s) => [s.id, s.nome] as const)),
    [setores]
  );
  const empresaClienteItems = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of empresasFiltradas) m[e.id] = e.nome;
    if (empresaClienteId && m[empresaClienteId] === undefined) {
      const found = empresas.find((x) => x.id === empresaClienteId);
      if (found) m[empresaClienteId] = found.nome;
    }
    return m;
  }, [empresasFiltradas, empresaClienteId, empresas]);

  const projetoItems = useMemo(() => {
    const map: Record<string, string> = { __none__: "— Nenhum —" };
    for (const p of projetosFiltrados) map[p.id] = p.nome;
    return map;
  }, [projetosFiltrados]);

  const prioridadeSel = (prioridadeWatch ?? "MEDIA") as Prioridade;
  const PriorIcon = PRIORIDADE_CONFIG[prioridadeSel].icon;

  useEffect(() => {
    if (!setorSelecionado || !empresaClienteId) {
      return;
    }
    const temVinculo =
      empresas.find((e) => e.id === empresaClienteId)?.vinculos.some(
        (v) => v.tipoServico === setorSelecionado.tipo
      ) ?? false;
    if (!temVinculo) {
      setValue("empresaClienteId", "", { shouldValidate: true });
    }
  }, [setorSelecionado, empresaClienteId, empresas, setValue]);

  useEffect(() => {
    if (!empresaClienteId || !setorSelecionado) {
      setResponsavelPreview(null);
      return;
    }
    const empresa = empresas.find((e) => e.id === empresaClienteId);
    if (!empresa) {
      setResponsavelPreview(null);
      return;
    }
    const vinculo = empresa.vinculos.find(
      (v) => v.tipoServico === setorSelecionado.tipo
    );
    setResponsavelPreview(vinculo ? vinculo.responsavel.nome : null);
  }, [empresaClienteId, setorSelecionado, empresas]);

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError(null);

    const result = await criarChamado({
      titulo: data.titulo,
      descricao: data.descricao,
      prioridade: data.prioridade,
      setorDestinoId: data.setorDestinoId,
      emNomeDeCliente: true,
      empresaId: data.empresaClienteId,
      projetoId: data.projetoId === "__none__" || !data.projetoId ? null : data.projetoId,
      empresaClienteId: data.empresaClienteId,
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
        <div className="ds-alert-info mb-6 text-[13px] [&>svg]:shrink-0">
          <Headphones className="h-4 w-4" />
          <span>
            Você está registrando um pedido <strong>em nome do cliente</strong>. Escolha a empresa
            dele e preencha o chamado normalmente — o prazo para resposta segue a prioridade escolhida.
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label className="ds-label">Empresa do cliente *</Label>
            {setorSelecionado && empresasFiltradas.length === 0 ? (
              <div className="ds-alert-warn text-[13px]">
                Nenhuma empresa com vínculo para o setor selecionado. Cadastre o vínculo antes de registrar.
              </div>
            ) : (
            <Select
              value={empresaClienteId || null}
              onValueChange={(v) =>
                setValue("empresaClienteId", v ?? "", { shouldValidate: true })
              }
              items={empresaClienteItems}
            >
              <SelectTrigger className="w-full rounded-[5px] border-ds-stone focus:ring-ds-ink/10">
                <SelectValue placeholder="Para qual empresa é este atendimento?" />
              </SelectTrigger>
              <SelectContent>
                {empresasFiltradas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            )}
            {errors.empresaClienteId && (
              <p className="text-ds-danger text-xs mt-1">{errors.empresaClienteId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="ds-label">Título *</Label>
            <Input
              {...register("titulo")}
              placeholder="Resumo do que o cliente precisa"
              className="rounded-[5px] border-ds-stone text-sm focus-visible:border-ds-ink focus-visible:ring-ds-ink/10"
            />
            {errors.titulo && <p className="text-ds-danger text-xs mt-1">{errors.titulo.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="ds-label">Descrição *</Label>
            <Textarea
              {...register("descricao")}
              placeholder="Detalhe o pedido com o contexto que o setor precisa para ajudar"
              rows={4}
              className="rounded-[5px] border-ds-stone text-sm focus-visible:border-ds-ink focus-visible:ring-ds-ink/10 min-h-[100px]"
            />
            {errors.descricao && (
              <p className="text-ds-danger text-xs mt-1">{errors.descricao.message}</p>
            )}
          </div>

          <div className="space-y-3 p-4 bg-ds-linen/80 rounded-[9px] border border-ds-pebble">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-ds-info mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-ds-ink">Prioridade *</p>
                <p className="text-xs text-ds-ash mt-0.5">
                  O prazo para resposta é calculado em horas úteis ({JORNADA_INICIO_HORA}h–
                  {JORNADA_FIM_HORA}h, segunda a sexta, exceto feriados).
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
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold w-fit ${PRIORIDADE_CONFIG[prioridadeSel].color}`}
              >
                <PriorIcon className="h-3 w-3" />
                {PRIORIDADE_CONFIG[prioridadeSel].label}
              </div>
            </div>

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

          <div className="space-y-2">
            <Label className="ds-label">Setor de destino *</Label>
            <Select
              value={setorDestinoId || null}
              onValueChange={(v) => {
                const next = v ?? "";
                setValue("setorDestinoId", next, { shouldValidate: true });
                setValue("projetoId", null);
              }}
              items={setorItems}
            >
              <SelectTrigger className="w-full rounded-[5px] border-ds-stone focus:ring-ds-ink/10">
                <SelectValue placeholder="Para qual setor enviar?" />
              </SelectTrigger>
              <SelectContent>
                {setores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.setorDestinoId && (
              <p className="text-ds-danger text-xs mt-1">{errors.setorDestinoId.message}</p>
            )}
          </div>

          {setorSelecionado && empresaClienteId && responsavelPreview && (
            <div className="ds-alert-ok text-[13px] [&>span]:leading-snug">
              <User2 className="h-4 w-4 flex-shrink-0" />
              <span>
                Responsável pelo atendimento: <strong>{responsavelPreview}</strong> (vínculo empresa ×
                setor)
              </span>
            </div>
          )}

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
                  <SelectValue placeholder="Vincule a um projeto..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum —</SelectItem>
                  {projetosFiltrados.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && (
            <div className="ds-alert-err" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} className="font-semibold rounded-[5px]">
              {loading ? "Registrando..." : "Registrar chamado"}
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
