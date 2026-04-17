import webpush from "web-push";

let initialized = false;

export function getWebPush() {
  if (!initialized) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:admin@pktech.ai";

    if (!publicKey || !privateKey) {
      throw new Error(
        "VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY precisam estar definidos no .env\n" +
        "Para gerar: npx web-push generate-vapid-keys"
      );
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    initialized = true;
  }
  return webpush;
}
