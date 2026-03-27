import { Ticket, Clock, CheckCircle, AlertTriangle, Activity } from "lucide-react";

interface StatsCardsProps {
  abertos: number;
  emAndamento: number;
  aguardando: number;
  concluidosHoje: number;
  vencendoSla: number;
}

export function StatsCards({
  abertos,
  emAndamento,
  aguardando,
  concluidosHoje,
  vencendoSla,
}: StatsCardsProps) {
  const cards = [
    {
      label: "Abertos",
      value: abertos,
      icon: Ticket,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      borderColor: "border-l-blue-500",
    },
    {
      label: "Em Andamento",
      value: emAndamento,
      icon: Activity,
      iconColor: "text-yellow-600",
      iconBg: "bg-yellow-50",
      borderColor: "border-l-yellow-500",
    },
    {
      label: "Aguardando Validação",
      value: aguardando,
      icon: Clock,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50",
      borderColor: "border-l-purple-500",
    },
    {
      label: "Concluídos Hoje",
      value: concluidosHoje,
      icon: CheckCircle,
      iconColor: "text-green-600",
      iconBg: "bg-green-50",
      borderColor: "border-l-green-500",
    },
    {
      label: "Vencendo SLA",
      value: vencendoSla,
      icon: AlertTriangle,
      iconColor: vencendoSla > 0 ? "text-red-600" : "text-[#64789B]",
      iconBg: vencendoSla > 0 ? "bg-red-50" : "bg-[#DCE2EB]",
      borderColor: vencendoSla > 0 ? "border-l-red-500" : "border-l-[#64789B]",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`bg-white rounded-xl border border-[#DCE2EB] border-l-4 ${card.borderColor} p-5 shadow-sm`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#64789B] uppercase tracking-wide">
                  {card.label}
                </p>
                <p className="text-3xl font-bold text-[#001F3E] mt-1">{card.value}</p>
              </div>
              <div className={`${card.iconBg} p-2.5 rounded-lg`}>
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
