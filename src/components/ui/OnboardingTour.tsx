"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Step {
  target: string;          // CSS selector do elemento destacado
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
  roles?: Role[];          // undefined = todos
}

// ─── Passos do tour ───────────────────────────────────────────────────────────

const ALL_STEPS: Step[] = [
  {
    target: "[data-tour='dashboard']",
    title: "📊 Seu Dashboard",
    description:
      "Aqui você tem a visão geral dos seus chamados: quantos estão abertos, em andamento, no prazo ou atrasados. Os cards de métricas se atualizam em tempo real.",
    position: "bottom",
  },
  {
    target: "[data-tour='novo-chamado']",
    title: "➕ Abrir Novo Chamado",
    description:
      "Clique aqui para criar uma nova solicitação. Você seleciona o setor destino e a empresa — o sistema encontra automaticamente quem deve atender.",
    position: "right",
  },
  {
    target: "[data-tour='nav-chamados']",
    title: "🎫 Lista de Chamados",
    description:
      "Veja todos os chamados que você abriu ou que são de sua responsabilidade. Use os filtros para encontrar rapidamente por status ou prioridade.",
    position: "right",
  },
  {
    target: "[data-tour='nav-setor']",
    title: "🏢 Dashboard do Setor",
    description:
      "Visualização coletiva de todos os chamados do seu setor. Gestores usam esta tela para acompanhar a equipe e redistribuir demandas.",
    position: "right",
  },
  {
    target: "[data-tour='notifications']",
    title: "🔔 Notificações",
    description:
      "O sino acende quando há novidades: chamado atribuído a você, aguardando sua validação ou mensagem de colega. O número indica quantas estão não lidas.",
    position: "bottom",
  },
  {
    target: "[data-tour='user-menu']",
    title: "👤 Menu do Usuário",
    description:
      "Clique no seu avatar para ver seu perfil, setor e o botão de sair do sistema.",
    position: "bottom",
  },
  {
    target: "[data-tour='admin-section']",
    title: "⚙️ Administração",
    description:
      "Área exclusiva do SUPERADMIN: gerencie usuários, cadastre empresas, defina quem atende cada empresa em cada setor e crie projetos IA.",
    position: "right",
    roles: ["SUPERADMIN"],
  },
  {
    target: "[data-tour='sidebar-footer']",
    title: "🔄 Rever este guia",
    description:
      "A qualquer momento, clique em \"Ver tour novamente\" no rodapé da barra lateral para revisar o sistema. Bom trabalho! 🚀",
    position: "top",
  },
];

// ─── Utilitários de posição ───────────────────────────────────────────────────

interface Rect { top: number; left: number; width: number; height: number }

function getTooltipStyle(
  rect: Rect,
  position: Step["position"],
  tooltipW = 320,
  tooltipH = 160
): React.CSSProperties {
  const gap = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = 0;
  let left = 0;

  switch (position) {
    case "bottom":
      top = rect.top + rect.height + gap;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
    case "top":
      top = rect.top - tooltipH - gap;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
    case "right":
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.left + rect.width + gap;
      break;
    case "left":
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.left - tooltipW - gap;
      break;
  }

  // Guardar dentro da viewport
  left = Math.max(12, Math.min(vw - tooltipW - 12, left));
  top  = Math.max(12, Math.min(vh - tooltipH - 12, top));

  return { position: "fixed", top, left, width: tooltipW, zIndex: 9999 };
}

function getArrowStyle(position: Step["position"]): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "absolute",
    width: 0,
    height: 0,
  };
  switch (position) {
    case "bottom":
      return { ...base, top: -8, left: "50%", transform: "translateX(-50%)",
        borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: "8px solid #001F3E" };
    case "top":
      return { ...base, bottom: -8, left: "50%", transform: "translateX(-50%)",
        borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid #001F3E" };
    case "right":
      return { ...base, left: -8, top: "50%", transform: "translateY(-50%)",
        borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderRight: "8px solid #001F3E" };
    case "left":
      return { ...base, right: -8, top: "50%", transform: "translateY(-50%)",
        borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderLeft: "8px solid #001F3E" };
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

const STORAGE_KEY = "projecont_tour_done";

export function OnboardingTour({ role }: { role: Role }) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  // Filtra steps pela role do usuário
  const steps = ALL_STEPS.filter(
    (s) => !s.roles || s.roles.includes(role)
  );

  const currentStep = steps[step];

  // Mede o elemento alvo e faz scroll até ele
  const measureTarget = useCallback(() => {
    if (!currentStep) return;
    const el = document.querySelector(currentStep.target);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }, 300);
  }, [currentStep]);

  // Abre automaticamente na primeira visita
  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const timer = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Mede sempre que o step muda
  useEffect(() => {
    if (active) measureTarget();
  }, [active, step, measureTarget]);

  function close() {
    localStorage.setItem(STORAGE_KEY, "1");
    setActive(false);
    setStep(0);
    setTargetRect(null);
  }

  function next() {
    if (step < steps.length - 1) setStep((s) => s + 1);
    else close();
  }

  function prev() {
    if (step > 0) setStep((s) => s - 1);
  }

  // API pública: permite abrir o tour de fora
  useEffect(() => {
    const handler = () => {
      setStep(0);
      setActive(true);
    };
    window.addEventListener("projecont:start-tour", handler);
    return () => window.removeEventListener("projecont:start-tour", handler);
  }, []);

  if (!active || !currentStep) return null;

  return (
    <>
      {/* Overlay escuro */}
      <div
        className="fixed inset-0 bg-black/50 z-[9990]"
        onClick={close}
        aria-hidden
      />

      {/* Spotlight: recorte sobre o elemento */}
      {targetRect && (
        <div
          className="fixed z-[9991] rounded-lg ring-4 ring-[#1AB6D9] ring-offset-0 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] pointer-events-none transition-all duration-300"
          style={{
            top:    targetRect.top    - 6,
            left:   targetRect.left   - 6,
            width:  targetRect.width  + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      {/* Tooltip */}
      {targetRect && (
        <div
          className="z-[9999] bg-[#001F3E] text-white rounded-xl shadow-2xl p-5"
          style={getTooltipStyle(targetRect, currentStep.position)}
        >
          {/* Seta */}
          <div style={getArrowStyle(currentStep.position)} />

          {/* Cabeçalho */}
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-base leading-snug pr-2">{currentStep.title}</h3>
            <button
              onClick={close}
              className="text-white/50 hover:text-white shrink-0 mt-0.5"
              aria-label="Fechar tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Descrição */}
          <p className="text-sm text-white/80 leading-relaxed mb-4">
            {currentStep.description}
          </p>

          {/* Rodapé */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">
              {step + 1} / {steps.length}
            </span>
            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={prev}
                  className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </button>
              )}
              <button
                onClick={next}
                className="flex items-center gap-1 bg-[#1AB6D9] hover:bg-[#2082BE] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                {step === steps.length - 1 ? "Concluir" : "Próximo"}
                {step < steps.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Indicadores de progresso */}
          <div className="flex gap-1 mt-3 justify-center">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step ? "w-5 bg-[#1AB6D9]" : "w-1.5 bg-white/20 hover:bg-white/40"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Fallback: se o elemento não for encontrado */}
      {!targetRect && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] bg-[#001F3E] text-white rounded-xl shadow-2xl p-6 w-80">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#1AB6D9]" />
              <h3 className="font-bold">{currentStep.title}</h3>
            </div>
            <button onClick={close} className="text-white/50 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-white/80 mb-4">{currentStep.description}</p>
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/40">{step + 1} / {steps.length}</span>
            <button
              onClick={next}
              className="flex items-center gap-1 bg-[#1AB6D9] hover:bg-[#2082BE] text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
            >
              {step === steps.length - 1 ? "Concluir" : "Próximo"}
              {step < steps.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Botão "Ver tour novamente" ───────────────────────────────────────────────

export function TourRestartButton() {
  return (
    <button
      data-tour="sidebar-footer"
      onClick={() => window.dispatchEvent(new Event("projecont:start-tour"))}
      className="flex items-center gap-2 text-xs text-white/30 hover:text-[#1AB6D9] transition-colors w-full"
      title="Rever guia de uso"
    >
      <Sparkles className="h-3 w-3 shrink-0" />
      Ver tour novamente
    </button>
  );
}
