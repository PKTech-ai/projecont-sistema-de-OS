"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { LucideIcon } from "lucide-react";

/** Container padrão do design system para modais (borda, radius, sombra). */
export const dsDialogContentClass =
  "max-w-lg gap-0 border border-ds-pebble bg-white p-0 shadow-xl shadow-ds-ink/5 rounded-[9px] overflow-hidden sm:max-w-lg";

/** Cabeçalho com ícone, título e descrição — alinhado ao DS Projecont. */
export function DsDialogHeader({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-b border-ds-pebble bg-gradient-to-br from-ds-paper to-white px-6 py-5",
        className
      )}
    >
      <div className="flex gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] bg-ds-info/10 ring-1 ring-ds-info/15">
            <Icon className="h-5 w-5 text-ds-info" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <DialogTitle className="text-lg font-bold text-ds-ink sm:text-xl">{title}</DialogTitle>
          {description != null && description !== false && (
            <DialogDescription className="mt-1.5 text-sm leading-relaxed text-ds-ash">
              {description}
            </DialogDescription>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export function DsDialogBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("space-y-4 bg-white px-6 py-5", className)} {...props} />;
}

export function DsDialogActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-ds-pebble bg-ds-paper/50 px-6 py-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

/** Alerta inline no formulário (erro / aviso). */
export function DsFormAlert({
  variant = "error",
  children,
  className,
}: {
  variant?: "error" | "info";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-[5px] border px-3 py-2 text-sm",
        variant === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-ds-info/30 bg-ds-info-bg text-ds-info-fg",
        className
      )}
    >
      {children}
    </div>
  );
}
