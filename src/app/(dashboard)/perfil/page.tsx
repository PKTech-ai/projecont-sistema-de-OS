import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { User, Mail, Shield, Building } from "lucide-react";

export default async function PerfilPage() {
  const session = await auth();
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
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#001F3E]">Meu Perfil</h2>
        <p className="text-[#64789B] text-sm mt-1">Visualize suas informações de acesso</p>
      </div>

      <div className="bg-white rounded-xl border border-[#DCE2EB] overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-[#001F3E] to-[#2082BE]"></div>
        
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="h-24 w-24 rounded-xl bg-white p-1 shadow-sm">
              <div className="h-full w-full bg-[#DCE2EB] rounded-lg flex items-center justify-center text-3xl font-bold text-[#001F3E]">
                {initials}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-[#001F3E]">{usuario.nome}</h3>
              <p className="text-[#64789B]">{usuario.role} · {usuario.setor.nome}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[#DCE2EB]">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-[#3E3E3D]">
                  <div className="h-10 w-10 rounded-full bg-[#F8FAFC] flex items-center justify-center text-[#64789B]">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-[#64789B] font-medium uppercase tracking-wider">Nome Completo</p>
                    <p className="font-medium">{usuario.nome}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[#3E3E3D]">
                  <div className="h-10 w-10 rounded-full bg-[#F8FAFC] flex items-center justify-center text-[#64789B]">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-[#64789B] font-medium uppercase tracking-wider">E-mail</p>
                    <p className="font-medium">{usuario.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-[#3E3E3D]">
                  <div className="h-10 w-10 rounded-full bg-[#F8FAFC] flex items-center justify-center text-[#64789B]">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-[#64789B] font-medium uppercase tracking-wider">Perfil de Acesso</p>
                    <p className="font-medium">{usuario.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[#3E3E3D]">
                  <div className="h-10 w-10 rounded-full bg-[#F8FAFC] flex items-center justify-center text-[#64789B]">
                    <Building className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-[#64789B] font-medium uppercase tracking-wider">Setor Vinculado</p>
                    <p className="font-medium">{usuario.setor.nome}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
