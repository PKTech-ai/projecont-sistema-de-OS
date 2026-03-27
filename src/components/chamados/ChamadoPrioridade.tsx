import { Badge } from "@/components/ui/badge";
import { PRIORIDADE_COLORS, PRIORIDADE_LABELS } from "@/lib/utils";
import type { Prioridade } from "@prisma/client";
import { cn } from "@/lib/utils";

interface ChamadoPrioridadeProps {
  prioridade: Prioridade;
  className?: string;
}

export function ChamadoPrioridade({ prioridade, className }: ChamadoPrioridadeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium border", PRIORIDADE_COLORS[prioridade], className)}
    >
      {PRIORIDADE_LABELS[prioridade]}
    </Badge>
  );
}
