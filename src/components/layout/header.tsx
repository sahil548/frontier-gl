"use client";

import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { EntitySelector } from "@/components/layout/entity-selector";
import { MobileSidebarTrigger } from "@/components/layout/sidebar";

/**
 * Top header bar spanning the content area (right of sidebar).
 * Contains mobile hamburger, entity selector, theme toggle, and Clerk user button.
 */
export function Header() {
  return (
    <header className="flex h-14 items-center gap-2 border-b bg-background px-4">
      {/* Mobile sidebar trigger */}
      <MobileSidebarTrigger />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Entity selector */}
      <EntitySelector />

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Clerk user button */}
      <UserButton
        appearance={{
          elements: {
            avatarBox: "h-8 w-8",
          },
        }}
      />
    </header>
  );
}
