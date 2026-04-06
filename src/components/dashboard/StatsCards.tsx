import { Ticket, Clock, CheckCircle, AlertTriangle, Activity, Target, TimerOff } from "lucide-react";

interface StatsCardsProps {
  naoIniciados: number;
  emAndamento: number;
  aguardando: number;
  concluidosHoje: number;
  vencendoPrazo: number;
  conclusoesNoPrazo30d: number;
  conclusoesForaPrazo30d: number;
}

export function StatsCards({
  naoIniciados,
  emAndamento,
  aguardando,
  concluidosHoje,
  vencendoPrazo,
  conclusoesNoPrazo30d,
  conclusoesForaPrazo30d,
}: StatsCardsProps) {
  const cards = [
    {
      label: "Não iniciados",
      value: naoIniciados,
      icon: Ticket,
      iconColor: "text-ds-info-fg",
      iconBg: "bg-ds-info-bg",
      borderColor: "border-l-ds-info",
    },
    {
      label: "Em andamento",
      value: emAndamento,
      icon: Activity,
      iconColor: "text-ds-warning-fg",
      iconBg: "bg-ds-warning-bg",
      borderColor: "border-l-ds-warning",
    },
    {
      label: "Aguardando validação",
      value: aguardando,
      icon: Clock,
      iconColor: "text-ds-charcoal",
      iconBg: "bg-ds-linen",
      borderColor: "border-l-ds-ash",
    },
    {
      label: "Concluídos hoje",
      value: concluidosHoje,
      icon: CheckCircle,
      iconColor: "text-ds-success-fg",
      iconBg: "bg-ds-success-bg",
      borderColor: "border-l-ds-success",
    },
    {
      label: "Prazo curto",
      value: vencendoPrazo,
      icon: AlertTriangle,
      iconColor: vencendoPrazo > 0 ? "text-ds-danger-fg" : "text-ds-ash",
      iconBg: vencendoPrazo > 0 ? "bg-ds-danger-bg" : "bg-ds-pebble",
      borderColor: vencendoPrazo > 0 ? "border-l-ds-danger" : "border-l-ds-ash",
    },
  ];

  const pontualidade = [
    {
      label: "Conclusões no prazo (30 dias)",
      value: conclusoesNoPrazo30d,
      icon: Target,
      iconColor: "text-ds-success-fg",
      iconBg: "bg-ds-success-bg",
      borderColor: "border-l-ds-success",
    },
    {
      label: "Conclusões fora do prazo (30 dias)",
      value: conclusoesForaPrazo30d,
      icon: TimerOff,
      iconColor: conclusoesForaPrazo30d > 0 ? "text-ds-danger-fg" : "text-ds-ash",
      iconBg: conclusoesForaPrazo30d > 0 ? "bg-ds-danger-bg" : "bg-ds-pebble",
      borderColor: conclusoesForaPrazo30d > 0 ? "border-l-ds-danger" : "border-l-ds-ash",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`bg-white rounded-xl border border-ds-pebble border-l-4 ${card.borderColor} p-5 shadow-sm`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-ds-ash uppercase tracking-wide">
                    {card.label}
                  </p>
                  <p className="text-3xl font-bold text-ds-ink mt-1">{card.value}</p>
                </div>
                <div className={`${card.iconBg} p-2.5 rounded-lg`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {pontualidade.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`bg-white rounded-xl border border-ds-pebble border-l-4 ${card.borderColor} p-5 shadow-sm`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-ds-ash uppercase tracking-wide leading-tight">
                    {card.label}
                  </p>
                  <p className="text-3xl font-bold text-ds-ink mt-1">{card.value}</p>
                </div>
                <div className={`${card.iconBg} p-2.5 rounded-lg shrink-0`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
