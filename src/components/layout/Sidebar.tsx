"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  Plus,
  FolderKanban,
  Users,
  Building2,
  FolderOpen,
  ChevronRight,
  LogOut,
  Headphones,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjecontLogo } from "@/components/ui/logo";
import { TourRestartButton } from "@/components/ui/OnboardingTour";
import { signOut } from "next-auth/react";
import type { Role, TipoSetor } from "@prisma/client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
  exact?: boolean;
  tourId?: string;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    exact: true,
    tourId: "dashboard",
  },
  {
    label: "Chamados",
    href: "/chamados",
    icon: Ticket,
    tourId: "nav-chamados",
  },
  {
    label: "Chamado p/ cliente",
    href: "/sac/novo",
    icon: Headphones,
    roles: ["SAC", "SUPERADMIN"],
    tourId: "nav-sac",
  },
  {
    label: "Meu Setor",
    href: "/setor",
    icon: FolderKanban,
    roles: ["ANALISTA", "GESTOR", "SAC", "SUPERADMIN"],
    tourId: "nav-setor",
  },
];

const adminItems: NavItem[] = [
  {
    label: "Desempenho",
    href: "/admin/desempenho",
    icon: BarChart3,
    roles: ["SUPERADMIN", "GESTOR"],
  },
  {
    label: "Usuários",
    href: "/admin/usuarios",
    icon: Users,
    roles: ["SUPERADMIN", "GESTOR"],
  },
  {
    label: "Empresas",
    href: "/admin/empresas",
    icon: Building2,
    roles: ["SUPERADMIN", "GESTOR"],
  },
  {
    label: "Projetos do setor",
    href: "/admin/projetos",
    icon: FolderOpen,
    roles: ["SUPERADMIN", "ANALISTA", "GESTOR"],
  },
];

interface SidebarProps {
  role: Role;
  setorTipo: TipoSetor;
}

export function Sidebar({ role, setorTipo }: SidebarProps) {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await signOut({ callbackUrl: "/login" });
  }

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  function canSee(item: NavItem) {
    if (!item.roles) return true;
    if (item.href === "/admin/projetos") {
      if (role === "SUPERADMIN") return true;
      return role === "ANALISTA" || role === "GESTOR";
    }
    return item.roles.includes(role);
  }

  const visibleNav = navItems.filter(canSee);
  const visibleAdmin = adminItems.filter(canSee);

  return (
    <aside className="w-60 h-[100dvh] bg-ds-ink flex flex-col shrink-0">
      {/* Logo area */}
      <div className="px-6 py-6 border-b border-white/10">
        <ProjecontLogo variant="dark" size="sm" showTagline />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item)} />
        ))}

        {visibleAdmin.length > 0 && (
          <>
            <div className="pt-4 pb-2" data-tour="admin-section">
              <p className="px-3 text-xs font-semibold text-white/30 uppercase tracking-wider">
                Administração
              </p>
            </div>
            {visibleAdmin.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item)} />
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1" data-tour="sidebar-footer">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-brand-gray-light hover:bg-white/5 hover:text-red-400 transition-colors group"
        >
          <LogOut className="h-4 w-4 shrink-0 group-hover:text-red-400" />
          <span className="flex-1 text-left">Sair do sistema</span>
        </button>
        <div className="px-3 pt-2 flex items-center justify-between">
          <TourRestartButton />
          <p className="text-xs text-white/20">v1.0 · {role}</p>
        </div>
      </div>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      data-tour={item.tourId}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
        active
          ? "bg-ds-ink-dark text-ds-paper border-l-[3px] border-ds-paper pl-[9px]"
          : "text-brand-gray-light hover:bg-ds-ink-dark/80 hover:text-ds-paper"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-ds-paper" : "")} />
      <span className="flex-1">{item.label}</span>
      {active && <ChevronRight className="h-3 w-3 opacity-50" />}
    </Link>
  );
}
