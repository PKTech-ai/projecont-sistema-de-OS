import { getDashboardSession } from "@/lib/contabil-session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, Building2, FolderKanban, FolderOpen, BarChart3 } from "lucide-react";
import { PageContextNav } from "@/components/layout/PageContextNav";
import { DashboardMainScroll } from "@/components/layout/DashboardMainScroll";

export default async function AdminDashboardPage() {
  const session = await getDashboardSession();
  if (!session) redirect("/login");

  const isGestor = session.user.role === "GESTOR";
  const isSuper = session.user.role === "SUPERADMIN";

  if (!isGestor && !isSuper) redirect("/");

  const cards = [
    {
      title: "Usuários",
      desc: isSuper ? "Gerenciar todos os usuários do sistema, perfis e setores." : "Gerenciar funcionários do setor.",
      href: "/admin/usuarios",
      icon: Users,
      show: true
    },
    {
      title: "Empresas",
      desc: "Visualizar empresas parceiras e vínculos de atendimento.",
      href: "/admin/empresas",
      icon: Building2,
      show: true
    },
    {
      title: "Setores",
      desc: "Visualizar setores cadastrados e alterar nomes de exibição.",
      href: "/admin/setores",
      icon: FolderKanban,
      show: isSuper
    },
    {
      title: "Projetos do Setor",
      desc: "Acompanhar e criar projetos para organização interna.",
      href: "/admin/projetos",
      icon: FolderOpen,
      show: true
    },
    {
      title: "Relatórios de Desempenho",
      desc: "Métricas de SLA, volumetria e tempos de conclusão de chamados.",
      href: "/admin/desempenho",
      icon: BarChart3,
      show: true
    }
  ].filter(c => c.show);

  return (
    <DashboardMainScroll>
      <div className="space-y-6">
        <PageContextNav items={[{ label: "Painel inicial", href: "/" }, { label: "Administração Geral" }]} />
        
        <div>
          <h2 className="text-2xl font-bold text-ds-ink">Administração do Sistema</h2>
          <p className="text-ds-ash text-sm mt-1">
            Selecione o módulo administrativo que deseja gerenciar.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(c => {
            const Icon = c.icon;
            return (
              <Link 
                key={c.href} 
                href={c.href}
                className="bg-white p-5 rounded-xl border border-ds-pebble hover:border-ds-ink-dark/30 hover:shadow-sm transition-all duration-200 flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-ds-linen flex items-center justify-center text-ds-ink group-hover:bg-ds-ink group-hover:text-ds-paper transition-all">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ds-ink text-base">{c.title}</h3>
                    <p className="text-ds-ash text-xs mt-1 leading-relaxed">{c.desc}</p>
                  </div>
                </div>
                <span className="text-xs text-ds-ink font-medium mt-4 flex items-center gap-1 group-hover:underline">
                  Acessar painel &rarr;
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </DashboardMainScroll>
  );
}
