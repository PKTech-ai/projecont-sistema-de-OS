import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  
  // Clean up standard next-auth cookies if present
  cookieStore.delete("next-auth.session-token");
  cookieStore.delete("__Secure-next-auth.session-token");
  
  // To logout of the SSO, we need to destroy the shared cookie.
  const response = NextResponse.json({ success: true });
  
  // Clear the cookie for localhost
  response.cookies.set("contabil_session", "", { maxAge: 0, expires: new Date(0) });
  // Clear the cookie for production domain
  response.cookies.set("contabil_session", "", { maxAge: 0, expires: new Date(0), domain: ".pktech.ai" });
  
  return response;
}
