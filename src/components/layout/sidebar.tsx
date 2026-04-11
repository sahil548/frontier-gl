"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  Scale,
  FileText,
  BarChart3,
  DollarSign,
  Lock,
  Briefcase,
  Tags,
  Import,
  RefreshCw,
  Settings,
  ArrowLeftRight,
  Landmark,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const SIDEBAR_STORAGE_KEY = "frontier-gl-sidebar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/entities", label: "Entities", icon: Building2 },
  { href: "/accounts", label: "Chart of Accounts", icon: BookOpen },
  { href: "/journal-entries", label: "Journal Entries", icon: FileText },
  { href: "/recurring", label: "Recurring", icon: RefreshCw },
  { href: "/trial-balance", label: "Trial Balance", icon: Scale },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/bank-feed", label: "Bank Feed", icon: Landmark },
  { href: "/budgets", label: "Budgets", icon: DollarSign },
  { href: "/holdings", label: "Holdings", icon: Briefcase },
  { href: "/dimensions", label: "Dimensions", icon: Tags },
  { href: "/period-close", label: "Period Close", icon: Lock },
  { href: "/import", label: "Data", icon: Import },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/settings/eliminations", label: "Eliminations", icon: ArrowLeftRight },
];

function LedgerMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-8 w-8 text-primary", className)}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.5" />
      <line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="1.5" />
      <line x1="9" y1="3" x2="9" y2="21" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SidebarNav({
  isCollapsed,
  onNavClick,
}: {
  isCollapsed: boolean;
  onNavClick?: () => void;
}) {
  const pathname = usePathname();

  return (
    <TooltipProvider delay={0}>
      <nav className="flex flex-col gap-1 px-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          const linkContent = (
            <Link
              href={item.href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground",
                isCollapsed && "justify-center px-2"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{linkContent}</div>;
        })}
      </nav>
    </TooltipProvider>
  );
}

/**
 * Collapsible sidebar with FOF branding, navigation, and collapse toggle.
 * Responsive: renders as Sheet overlay on mobile (< 768px).
 */
export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      setIsCollapsed(stored === "true");
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r bg-sidebar text-sidebar-foreground h-screen sticky top-0 transition-all duration-200",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header / Branding */}
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-4",
          isCollapsed && "justify-center px-2"
        )}
      >
        <LedgerMark />
        {!isCollapsed && (
          <span className="text-lg font-semibold tracking-tight">
            Frontier GL
          </span>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <div className="flex-1 py-4">
        <SidebarNav isCollapsed={isCollapsed} />
      </div>

      <Separator />

      {/* Footer */}
      <div
        className={cn(
          "flex items-center px-4 py-3",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        {!isCollapsed && (
          <span className="text-xs text-muted-foreground">
            Powered by Family Office Frontier
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}

/**
 * Mobile sidebar trigger (hamburger) that opens sidebar as a Sheet.
 */
export function MobileSidebarTrigger() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" />
        }
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle navigation</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0">
        <div className="flex items-center gap-2 px-4 py-4">
          <LedgerMark />
          <span className="text-lg font-semibold tracking-tight">
            Frontier GL
          </span>
        </div>
        <Separator />
        <div className="py-4">
          <SidebarNav isCollapsed={false} />
        </div>
        <Separator />
        <div className="px-4 py-3">
          <span className="text-xs text-muted-foreground">
            Powered by Family Office Frontier
          </span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
