import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  const isProtected = request.nextUrl.pathname.startsWith("/home") || request.nextUrl.pathname.startsWith("/perfil") || request.nextUrl.pathname.startsWith("/testing");
  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (request.nextUrl.pathname.startsWith("/login") && token) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/home/:path*", "/perfil/:path*", "/testing/:path*", "/login"],
};
