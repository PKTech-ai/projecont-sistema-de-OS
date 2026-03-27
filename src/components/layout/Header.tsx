"use client";

import { Bell, LogOut, User, CheckCircle2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@prisma/client";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface Notificacao {
  id: string;
  mensagem: string;
  lida: boolean;
  criadoEm: Date;
  chamado?: { id: string; titulo: string; status: string } | null;
}

interface HeaderProps {
  title: string;
  userName: string;
  role: Role;
  setorNome?: string;
  unreadCount?: number;
  notificacoes?: Notificacao[];
}

export function Header({ title, userName, role, setorNome, unreadCount = 0, notificacoes = [] }: HeaderProps) {
  const router = useRouter();
  const [isMarking, setIsMarking] = useState(false);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleMarcarLida(id: string, chamadoId?: string) {
    setIsMarking(true);
    try {
      await fetch(`/api/notificacoes/${id}/ler`, { method: "POST" });
      router.refresh();
      if (chamadoId) {
        router.push(`/chamados/${chamadoId}`);
      }
    } finally {
      setIsMarking(false);
    }
  }

  return (
    <header className="bg-white border-b border-[#DCE2EB] px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-[#001F3E]">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <button className="relative cursor-pointer hover:bg-zinc-100 p-2 rounded-md transition-colors outline-none" data-tour="notifications">
              <Bell className="h-5 w-5 text-[#64789B]" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center bg-[#1AB6D9] text-white text-[10px] font-bold rounded-full pointer-events-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          } />
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#DCE2EB] bg-[#F8FAFC]">
              <p className="font-semibold text-[#001F3E]">Notificações</p>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="bg-[#1AB6D9]/10 text-[#1AB6D9] border-0">
                  {unreadCount} novas
                </Badge>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {notificacoes.length === 0 ? (
                <div className="p-4 text-center text-sm text-[#64789B]">
                  Nenhuma notificação no momento.
                </div>
              ) : (
                notificacoes.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleMarcarLida(notif.id, notif.chamado?.id)}
                    className={`p-4 border-b border-[#DCE2EB] last:border-0 cursor-pointer transition-colors hover:bg-[#F8FAFC] ${
                      !notif.lida ? "bg-white" : "bg-zinc-50 opacity-70"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5">
                        {!notif.lida ? (
                          <div className="h-2 w-2 rounded-full bg-[#1AB6D9]" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 text-zinc-400" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className={`text-sm ${!notif.lida ? "text-[#3E3E3D] font-medium" : "text-zinc-600"}`}>
                          {notif.mensagem}
                        </p>
                        {notif.chamado && (
                          <p className="text-xs text-[#1AB6D9] font-medium truncate">
                            {notif.chamado.titulo}
                          </p>
                        )}
                        <p className="text-xs text-[#64789B]">
                          {formatDate(notif.criadoEm)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <button data-tour="user-menu" className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[#DCE2EB]/50 transition-colors outline-none cursor-pointer">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[#001F3E] text-white text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium text-[#3E3E3D] leading-none">{userName}</p>
                <p className="text-xs text-[#64789B] mt-0.5">{setorNome ?? role}</p>
              </div>
            </button>
          } />
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div>
                  <p className="font-semibold text-[#001F3E]">{userName}</p>
                  <p className="text-xs text-[#64789B] font-normal">{setorNome} · {role}</p>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={
                <Link href="/perfil" className="flex w-full items-center">
                  <User className="mr-2 h-4 w-4" />
                  Meu Perfil
                </Link>
              } className="text-[#3E3E3D] cursor-pointer" />
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
