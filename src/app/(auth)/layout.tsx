import { EntityProvider } from "@/providers/entity-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

/**
 * Layout for all authenticated pages.
 * Wraps children with EntityProvider and renders sidebar + header shell.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EntityProvider>
      <div className="flex min-h-screen">
        {/* Collapsible sidebar (hidden on mobile, Sheet overlay instead) */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex flex-1 flex-col">
          <Header />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </EntityProvider>
  );
}
