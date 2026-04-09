import { getDashboardSession } from "@/lib/contabil-session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { User, Mail, Shield, Building } from "lucide-react";
import { PageContextNav } from "@/components/layout/PageContextNav";
import { DashboardMainScroll } from "@/components/layout/DashboardMainScroll";

export default async function PerfilPage() {
  const session = await getDashboardSession();
  if (!session) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    include: { setor: true },
  });

  if (!usuario) redirect("/login");

  const initials = usuario.nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DashboardMainScroll>
    <div className="max-w-3xl mx-auto">
      <PageContextNav
        items={[
          { label: "Painel inicial", href: "/" },
          { label: "Meu perfil" },
        ]}
      />
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-ds-ink">Meu Perfil</h2>
        <p className="text-ds-ash text-sm mt-1">Visualize suas informações de acesso</p>
      </div>

      <div className="bg-white rounded-xl border border-ds-pebble overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-ds-ink to-ds-info"></div>
        
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="h-24 w-24 rounded-xl bg-white p-1 shadow-sm">
              <div className="h-full w-full bg-ds-pebble rounded-lg flex items-center justify-center text-3xl font-bold text-ds-ink">
                {initials}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-ds-ink">{usuario.nome}</h3>
              <p className="text-ds-ash">{usuario.role} · {usuario.setor.nome}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-ds-pebble">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-ds-charcoal">
                  <div className="h-10 w-10 rounded-full bg-ds-paper flex items-center justify-center text-ds-ash">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-ds-ash font-medium uppercase tracking-wider">Nome Completo</p>
                    <p className="font-medium">{usuario.nome}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-ds-charcoal">
                  <div className="h-10 w-10 rounded-full bg-ds-paper flex items-center justify-center text-ds-ash">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-ds-ash font-medium uppercase tracking-wider">E-mail</p>
                    <p className="font-medium">{usuario.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-ds-charcoal">
                  <div className="h-10 w-10 rounded-full bg-ds-paper flex items-center justify-center text-ds-ash">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-ds-ash font-medium uppercase tracking-wider">Perfil de Acesso</p>
                    <p className="font-medium">{usuario.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-ds-charcoal">
                  <div className="h-10 w-10 rounded-full bg-ds-paper flex items-center justify-center text-ds-ash">
                    <Building className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-ds-ash font-medium uppercase tracking-wider">Setor Vinculado</p>
                    <p className="font-medium">{usuario.setor.nome}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </DashboardMainScroll>
  );
}
