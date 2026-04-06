"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function TVSignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 hover:border-ds-info/50 transition-colors"
    >
      <LogOut className="h-4 w-4" />
      Sair (voltar ao login)
    </button>
  );
}
