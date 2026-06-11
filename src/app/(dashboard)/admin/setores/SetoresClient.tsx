"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DsDialogHeader, DsDialogBody, DsDialogActions, DsFormAlert, dsDialogContentClass } from "@/components/ui/ds-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { editarSetor } from "@/server/actions/setores";

interface Setor {
  id: string;
  nome: string;
  tipo: string;
  usuariosAtivos: number;
}

function EditarSetorDialog({ setor }: { setor: Setor }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const novoNome = String(data.get("nome"));

    startTransition(async () => {
      const result = await editarSetor(setor.id, novoNome);
      if ("error" in result) {
        setError(result.error);
      } else {
        setOpen(false);
        setError("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon" className="h-8 w-8 text-ds-ash hover:text-ds-ink hover:bg-ds-paper" title="Editar nome">
          <Pencil className="h-4 w-4" />
        </Button>
      } />
      <DialogContent className={cn(dsDialogContentClass, "max-w-md")} showCloseButton>
        <DsDialogHeader
          icon={FolderKanban}
          title="Editar nome do setor"
          description={`Altere o nome de exibição do setor técnico.`}
        />
        <form onSubmit={handleSubmit}>
          <DsDialogBody>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="ds-label">Código / Identificador único</Label>
                <Input value={setor.tipo} disabled className="bg-ds-linen/50 text-ds-ash cursor-not-allowed border-ds-pebble" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nome" className="ds-label">Nome de Exibição *</Label>
                <Input id="nome" name="nome" defaultValue={setor.nome} required className="rounded-[5px] border-ds-stone focus-visible:ring-ds-ink/10" />
              </div>
            </div>
            {error ? <DsFormAlert>{error}</DsFormAlert> : null}
          </DsDialogBody>
          <DsDialogActions>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-ds-pebble">
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} className="bg-ds-ink text-ds-paper hover:bg-ds-ink-dark">
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DsDialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SetoresClient({ setores }: { setores: Setor[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ds-ink">Setores do Sistema</h2>
        <p className="text-ds-ash text-sm mt-1">
          Lista de setores de atuação. A edição é restrita a administradores do sistema.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-ds-pebble overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-ds-pebble/50 hover:bg-ds-pebble/50">
              <TableHead className="text-ds-ink font-semibold">Nome de Exibição</TableHead>
              <TableHead className="text-ds-ink font-semibold">Código Interno (Tipo)</TableHead>
              <TableHead className="text-ds-ink font-semibold">Funcionários Ativos</TableHead>
              <TableHead className="text-ds-ink font-semibold w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {setores.map((s, i) => (
              <TableRow key={s.id} className={i % 2 === 1 ? "bg-ds-paper" : "bg-white"}>
                <TableCell className="font-medium text-ds-charcoal">{s.nome}</TableCell>
                <TableCell className="text-ds-ash text-sm font-mono">{s.tipo}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-ds-cream/60 border-ds-pebble text-ds-charcoal">
                    {s.usuariosAtivos} funcionário(s)
                  </Badge>
                </TableCell>
                <TableCell>
                  <EditarSetorDialog setor={s} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
