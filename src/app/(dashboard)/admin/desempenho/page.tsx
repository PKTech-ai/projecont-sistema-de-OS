import { getDashboardSession } from "@/lib/contabil-session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageContextNav } from "@/components/layout/PageContextNav";
import { DashboardMainScroll } from "@/components/layout/DashboardMainScroll";
import { getMetricasPorResponsavel } from "@/server/queries/desempenho";
import { DesempenhoClient } from "./DesempenhoClient";

const DIAS = 30;

export default async function DesempenhoPage() {
  const session = await getDashboardSession();
  if (!session) redirect("/login");

  if (session.user.role !== "GESTOR" && session.user.role !== "SUPERADMIN") {
    redirect("/");
  }

  const setor = await prisma.setor.findUnique({
    where: { id: session.user.setorId },
  });

  const metricas = await getMetricasPorResponsavel({
    viewerRole: session.user.role,
    viewerSetorId: session.user.setorId,
    dias: DIAS,
  });

  return (
    <DashboardMainScroll>
    <>
      <PageContextNav
        items={[
          { label: "Painel inicial", href: "/" },
          { label: "Desempenho" },
        ]}
      />
      <DesempenhoClient
        metricas={metricas}
        modo={session.user.role === "SUPERADMIN" ? "superadmin" : "gestor"}
        setorNome={setor?.nome ?? ""}
        dias={DIAS}
      />
    </>
    </DashboardMainScroll>
  );
}
