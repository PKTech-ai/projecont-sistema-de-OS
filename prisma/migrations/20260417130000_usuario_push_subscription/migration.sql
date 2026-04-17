-- Armazena a assinatura de push Web (JSON) para notificações desktop
-- mesmo com o browser / aba fechados.
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "pushSubscription" TEXT;
