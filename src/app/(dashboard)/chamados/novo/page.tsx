import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormNovoChamado } from "@/components/chamados/FormNovoChamado";

export default async function NovoChamadoPage() {
  const session = await auth();
  
  // #region agent log
  fetch('http://127.0.0.1:7448/ingest/adf8baf6-2bfb-4ba5-b401-76fc30788b1a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'197317'},body:JSON.stringify({sessionId:'197317',location:'src/app/(dashboard)/chamados/novo/page.tsx:6',message:'Renderizando NovoChamadoPage full width',data:{role: session?.user?.role},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  
  if (!session) redirect("/login");
  if (session.user.role === "TV") redirect("/");

  const [setores, empresas, projetos] = await Promise.all([
    prisma.setor.findMany({ orderBy: { nome: "asc" } }),
    prisma.empresa.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      include: {
        vinculos: {
          include: { responsavel: { select: { nome: true } } },
        },
      },
    }),
    prisma.projeto.findMany({
      where: { ativo: true },
      include: { setor: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#001F3E]">Novo Chamado</h2>
        <p className="text-[#64789B] text-sm mt-1">
          Preencha os dados para abrir um novo chamado
        </p>
      </div>
      <FormNovoChamado
        setores={setores}
        empresas={empresas}
        projetos={projetos}
        currentUserRole={session.user.role}
      />
    </div>
  );
}
