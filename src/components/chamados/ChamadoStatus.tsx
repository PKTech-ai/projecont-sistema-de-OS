import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";
import type { StatusChamado } from "@prisma/client";
import { cn } from "@/lib/utils";

interface ChamadoStatusProps {
  status: StatusChamado;
  className?: string;
}

export function ChamadoStatus({ status, className }: ChamadoStatusProps) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium border", STATUS_COLORS[status], className)}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
