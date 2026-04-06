"use client";

import { useState } from "react";
import { upsertVinculo, removerVinculo } from "@/server/actions/empresas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DsDialogHeader, DsDialogBody, DsFormAlert, dsDialogContentClass } from "@/components/ui/ds-dialog";
import { cn } from "@/lib/utils";
import { Link2, Trash2, Plus } from "lucide-react";

const SETORES_SERVICO = [
  { valor: "CONTABIL", label: "Contábil" },
  { valor: "FISCAL", label: "Fiscal" },
  { valor: "DP", label: "Depto. Pessoal" },
  { valor: "IA", label: "IA" },
  { valor: "CLIENTES", label: "Clientes" },
  { valor: "SOCIETARIO", label: "Societário" },
];

interface Vinculo {
  id: string;
  tipoServico: string;
  responsavel: { id: string; nome: string };
}

interface Analista {
  id: string;
  nome: string;
  setor: { tipo: string };
}

interface Props {
  empresa: { id: string; nome: string };
  vinculos: Vinculo[];
  analistas: Analista[];
}

export function FormVinculos({ empresa, vinculos, analistas }: Props) {
  const [open, setOpen] = useState(false);
  const [lista, setLista] = useState<Vinculo[]>(vinculos);
  const [novoSetor, setNovoSetor] = useState("");
  const [novoResponsavel, setNovoResponsavel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analistasFiltrados = novoSetor
    ? analistas.filter((a) => a.setor.tipo === novoSetor)
    : analistas;

  const setoresVinculados = lista.map((v) => v.tipoServico);

  async function adicionar() {
    if (!novoSetor || !novoResponsavel) { setError("Selecione setor e responsável"); return; }
    setLoading(true);
    setError(null);

    const result = await upsertVinculo({
      empresaId: empresa.id,
      tipoServico: novoSetor,
      responsavelId: novoResponsavel,
    });

    if ("error" in result) { setError(result.error); setLoading(false); return; }

    const responsavelObj = analistas.find((a) => a.id === novoResponsavel);
    const novoVinculo: Vinculo = {
      id: Date.now().toString(),
      tipoServico: novoSetor,
      responsavel: { id: novoResponsavel, nome: responsavelObj?.nome ?? "" },
    };

    setLista((prev) => {
      const idx = prev.findIndex((v) => v.tipoServico === novoSetor);
      if (idx >= 0) { const cópia = [...prev]; cópia[idx] = novoVinculo; return cópia; }
      return [...prev, novoVinculo];
    });

    setNovoSetor(""); setNovoResponsavel("");
    setLoading(false);
  }

  async function remover(tipoServico: string) {
    setLoading(true);
    const result = await removerVinculo(empresa.id, tipoServico);
    if (!("error" in result)) setLista((prev) => prev.filter((v) => v.tipoServico !== tipoServico));
    setLoading(false);
  }

  const setorLabel = (tipo: string) => SETORES_SERVICO.find((s) => s.valor === tipo)?.label ?? tipo;

  const selectCls = "w-full border border-ds-pebble rounded-lg px-3 py-2 text-sm text-ds-charcoal focus:outline-none focus:ring-2 focus:ring-ds-info/40";

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="border-ds-pebble text-ds-ash text-xs">
        <Link2 className="h-3 w-3 mr-1" />
        Vínculos
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={cn(dsDialogContentClass, "max-w-md")} showCloseButton>
          <DsDialogHeader
            icon={Link2}
            title={`Vínculos — ${empresa.nome}`}
            description="Defina qual colaborador é responsável por esta empresa em cada tipo de serviço."
          />

          {/* Lista de vínculos */}
          <DsDialogBody className="space-y-2 pt-0">
            {lista.length === 0 ? (
              <p className="text-sm text-brand-gray-mid italic text-center py-3">Nenhum vínculo definido</p>
            ) : (
              lista.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between bg-ds-paper border border-ds-pebble rounded-lg px-3 py-2"
                >
                  <div>
                    <span className="text-xs font-semibold text-ds-ink uppercase">{setorLabel(v.tipoServico)}</span>
                    <span className="text-xs text-ds-ash ml-2">→ {v.responsavel.nome}</span>
                  </div>
                  <button
                    onClick={() => remover(v.tipoServico)}
                    disabled={loading}
                    className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </DsDialogBody>

          <div className="border-t border-ds-pebble bg-ds-paper/40 px-6 py-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ds-ash">Adicionar ou atualizar</p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-ds-charcoal">Setor de serviço</label>
                <select value={novoSetor} onChange={(e) => { setNovoSetor(e.target.value); setNovoResponsavel(""); }} className={selectCls}>
                  <option value="">Selecione...</option>
                  {SETORES_SERVICO.map((s) => (
                    <option key={s.valor} value={s.valor}>
                      {s.label}{setoresVinculados.includes(s.valor) ? " ✓" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ds-charcoal">
                  Responsável{novoSetor ? ` (${setorLabel(novoSetor)})` : ""}
                </label>
                <select value={novoResponsavel} onChange={(e) => setNovoResponsavel(e.target.value)} disabled={!novoSetor} className={selectCls}>
                  <option value="">Selecione...</option>
                  {analistasFiltrados.map((a) => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {error ? <DsFormAlert>{error}</DsFormAlert> : null}

            <Button
              onClick={adicionar}
              disabled={loading || !novoSetor || !novoResponsavel}
              size="sm"
              className="w-full bg-ds-ink hover:bg-ds-ink-dark text-ds-paper"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {setoresVinculados.includes(novoSetor) && novoSetor ? "Atualizar responsável" : "Adicionar vínculo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
