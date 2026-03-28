"use client";

import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { EntitySelector } from "@/components/layout/entity-selector";
import { MobileSidebarTrigger } from "@/components/layout/sidebar";

export function Header() {
  return (
    <header className="flex h-14 items-center gap-2 border-b bg-background px-4">
      <MobileSidebarTrigger />

      <div className="flex-1" />

      <EntitySelector />

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
