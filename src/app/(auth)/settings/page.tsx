"use client";

import { useTheme } from "next-themes";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useEntityContext } from "@/providers/entity-provider";
import { CoaImportDialog } from "@/components/settings/coa-import-dialog";
import { exportToCsv } from "@/lib/export/csv-export";

export default function SettingsPage() {
  const { theme } = useTheme();
  const { currentEntityId, entities } = useEntityContext();

  const hasSpecificEntity = currentEntityId !== "all";
  const entityName = entities.find((e) => e.id === currentEntityId)?.name;

  const handleExportCoa = async () => {
    if (!hasSpecificEntity) return;

    try {
      const res = await fetch(`/api/entities/${currentEntityId}/accounts`);
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Failed to fetch accounts");
        return;
      }

      const rows = json.data.map(
        (account: {
          number: string;
          name: string;
          type: string;
          description?: string;
        }) => ({
          number: account.number,
          name: account.name,
          type: account.type,
          description: account.description || "",
        })
      );

      if (rows.length === 0) {
        toast.error("No accounts to export");
        return;
      }

      const filename = `chart-of-accounts-${entityName || currentEntityId}`;
      exportToCsv(rows, filename);
      toast.success("Chart of Accounts exported");
    } catch {
      toast.error("Failed to export Chart of Accounts");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Application preferences and information
        </p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize the look of the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">
                Current: {theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Use the theme toggle in the header to switch themes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Import and export your chart of accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasSpecificEntity && (
            <p className="text-sm text-muted-foreground">
              Select a specific entity from the header to enable import and
              export.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {hasSpecificEntity ? (
              <CoaImportDialog
                entityId={currentEntityId}
                onSuccess={() => {
                  toast.success("You can view updated accounts in the Chart of Accounts page.");
                }}
              />
            ) : (
              <Button variant="outline" disabled>
                Import Chart of Accounts
              </Button>
            )}
            <Button
              variant="outline"
              disabled={!hasSpecificEntity}
              onClick={handleExportCoa}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Chart of Accounts
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>Application information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Application</span>
            <span className="text-sm text-muted-foreground">Frontier GL</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Version</span>
            <span className="text-sm text-muted-foreground">0.1.0</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Built by</span>
            <span className="text-sm text-muted-foreground">
              Family Office Frontier
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
