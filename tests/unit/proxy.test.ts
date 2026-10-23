import { describe, it, expect } from "bun:test";
import { NextRequest, NextResponse } from "next/server";
import { proxy } from "@/proxy";

function makeReq(path: string, hasCookie = false): NextRequest {
  const req = new NextRequest(new URL(`http://localhost${path}`));
  if (hasCookie) {
    req.cookies.set("__Secure-better-auth.session_token", "dummy");
  }
  return req;
}

function isRedirect(res: Response): boolean {
  return res.status === 307 || res.status === 302;
}

function getRedirectUrl(res: Response): string | null {
  return res.headers.get("location");
}

describe("proxy", () => {
  it("redirects unauthenticated / to dashboard login", () => {
    const res = proxy(makeReq("/"));
    expect(isRedirect(res)).toBe(true);
    expect(getRedirectUrl(res)).toContain("/dashboard/login");
  });

  it("redirects unauthenticated /dashboard to dashboard login with redirectTo", () => {
    const res = proxy(makeReq("/dashboard/settings"));
    expect(isRedirect(res)).toBe(true);
    const loc = getRedirectUrl(res);
    expect(loc).toContain("/dashboard/login");
    expect(loc).toContain("redirectTo=%2Fdashboard%2Fsettings");
  });

  it("passes through /auth/sign-in with session (server validates)", () => {
    const res = proxy(makeReq("/auth/sign-in", true));
    expect(res.status).toBe(200);
  });

  it("allows /developers without session", () => {
    const res = proxy(makeReq("/developers"));
    expect(res.status).toBe(200);
  });

  it("allows /auth/consent with session (mid-flow)", () => {
    const res = proxy(makeReq("/auth/consent", true));
    expect(res.status).toBe(200);
  });

  it("allows /auth/device without session (mid-flow)", () => {
    const res = proxy(makeReq("/auth/device"));
    expect(res.status).toBe(200);
  });

  it("allows /2fa without session (2FA flow)", () => {
    const res = proxy(makeReq("/2fa"));
    expect(res.status).toBe(200);
  });

  it("allows /auth/ott/verify without session (OTT flow)", () => {
    const res = proxy(makeReq("/auth/ott/verify"));
    expect(res.status).toBe(200);
  });

  it("allows root with session", () => {
    const res = proxy(makeReq("/", true));
    expect(res.status).toBe(200);
  });

  it("allows dashboard with session", () => {
    const res = proxy(makeReq("/dashboard", true));
    expect(res.status).toBe(200);
  });

  it("allows dashboard subpaths with session", () => {
    const res = proxy(makeReq("/dashboard/settings/security", true));
    expect(res.status).toBe(200);
  });

  it("falls back to better-auth.session_token cookie name (dev)", () => {
    const req = new NextRequest(new URL("http://localhost/dashboard"));
    req.cookies.set("better-auth.session_token", "dummy");
    const res = proxy(req);
    expect(res.status).toBe(200);
  });

  // Better Auth sólo trocea session_data (cookie cache), nunca session_token:
  // un `session_token.0` suelto no es una sesión.
  it("does NOT treat a chunk-suffixed session_token as a session", () => {
    const req = new NextRequest(new URL("http://localhost/dashboard"));
    req.cookies.set("__Secure-better-auth.session_token.0", "dummy");
    const res = proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard/login");
  });

  it("does NOT redirect /auth/sign-in with stale cookie (prevents loop)", () => {
    const req = new NextRequest(new URL("http://localhost/auth/sign-in"));
    req.cookies.set("__Secure-better-auth.session_token", "expired-or-invalid");
    const res = proxy(req);
    expect(res.status).toBe(200);
  });

  it("does NOT redirect /dashboard with stale cookie (server validates, no loop)", () => {
    const req = new NextRequest(new URL("http://localhost/dashboard"));
    req.cookies.set("__Secure-better-auth.session_token", "expired-or-invalid");
    const res = proxy(req);
    expect(res.status).toBe(200);
  });
});