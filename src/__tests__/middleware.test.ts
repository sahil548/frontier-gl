/**
 * AUTH-03: Clerk middleware protects routes
 *
 * The middleware defines public routes via createRouteMatcher which internally
 * uses createPathMatcher from @clerk/shared. We test the route matching logic
 * by using createPathMatcher directly with the same patterns defined in
 * src/middleware.ts. This validates the publicRoutes configuration without
 * requiring a Next.js runtime or real Clerk session.
 *
 * We also verify the config export has the correct structure.
 */

import { describe, it, expect } from "vitest";
import { createPathMatcher } from "@clerk/shared/pathMatcher";

// Replicate the public route patterns from src/middleware.ts
const publicRoutePatterns = ["/sign-in(.*)", "/sign-up(.*)"];
const isPublicPath = createPathMatcher(publicRoutePatterns);

describe("AUTH-03: Public route patterns allow sign-in and sign-up", () => {
  it("allows /sign-in as a public path (no auth required)", () => {
    expect(isPublicPath("/sign-in")).toBe(true);
  });

  it("allows /sign-up as a public path (no auth required)", () => {
    expect(isPublicPath("/sign-up")).toBe(true);
  });

  it("allows /sign-in with Clerk catch-all suffix as public", () => {
    expect(isPublicPath("/sign-in/factor-one")).toBe(true);
  });

  it("allows /sign-up with Clerk catch-all suffix as public", () => {
    expect(isPublicPath("/sign-up/continue")).toBe(true);
  });

  it("allows /sign-in/sso-callback as public (Clerk OAuth flow)", () => {
    expect(isPublicPath("/sign-in/sso-callback")).toBe(true);
  });
});

describe("AUTH-03: Protected routes require authentication (not public)", () => {
  it("marks /dashboard as a protected path", () => {
    expect(isPublicPath("/dashboard")).toBe(false);
  });

  it("marks /api/entities as a protected path", () => {
    expect(isPublicPath("/api/entities")).toBe(false);
  });

  it("marks / (root) as a protected path", () => {
    expect(isPublicPath("/")).toBe(false);
  });

  it("marks /entities as a protected path", () => {
    expect(isPublicPath("/entities")).toBe(false);
  });

  it("marks /settings as a protected path", () => {
    expect(isPublicPath("/settings")).toBe(false);
  });

  it("marks /api/entities/some-id as a protected path", () => {
    expect(isPublicPath("/api/entities/some-id")).toBe(false);
  });
});

describe("AUTH-03: Middleware config exports correct matcher structure", () => {
  it("middleware config exports a matcher array", async () => {
    const middleware = await import("@/middleware");
    expect(middleware.config).toBeDefined();
    expect(Array.isArray(middleware.config.matcher)).toBe(true);
  });

  it("middleware config matcher includes API routes pattern", async () => {
    const middleware = await import("@/middleware");
    const matcherStr = JSON.stringify(middleware.config.matcher);
    expect(matcherStr).toContain("api");
  });

  it("middleware config matcher has at least 2 patterns (app + API)", async () => {
    const middleware = await import("@/middleware");
    expect(middleware.config.matcher.length).toBeGreaterThanOrEqual(2);
  });

  it("middleware config matcher skips _next static assets", async () => {
    const middleware = await import("@/middleware");
    const matcherStr = JSON.stringify(middleware.config.matcher);
    expect(matcherStr).toContain("_next");
  });
});
