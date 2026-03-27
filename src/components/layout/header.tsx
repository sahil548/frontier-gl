"use client";

import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MobileSidebarTrigger } from "@/components/layout/sidebar";

/**
 * Top header bar spanning the content area (right of sidebar).
 * Contains mobile hamburger, entity selector (slot), theme toggle, and Clerk user button.
 *
 * EntitySelector is added in Task 2 -- for now renders a placeholder area.
 */
export function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex h-14 items-center gap-2 border-b bg-background px-4">
      {/* Mobile sidebar trigger */}
      <MobileSidebarTrigger />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Entity selector slot (children) */}
      {children}

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Clerk user button */}
      <UserButton
        afterSignOutUrl="/sign-in"
        appearance={{
          elements: {
            avatarBox: "h-8 w-8",
          },
        }}
      />
    </header>
  );
}
