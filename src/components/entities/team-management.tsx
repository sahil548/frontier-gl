"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: "OWNER" | "EDITOR" | "VIEWER";
}

interface TeamManagementProps {
  entityId: string;
  currentUserEmail?: string;
}

const ROLE_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  OWNER: "default",
  EDITOR: "secondary",
  VIEWER: "outline",
};

export function TeamManagement({ entityId, currentUserEmail }: TeamManagementProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"OWNER" | "EDITOR" | "VIEWER">("EDITOR");
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const currentMember = members.find((m) => m.email === currentUserEmail);
  const currentUserId = currentMember?.id;
  const currentUserRole = currentMember?.role;
  const isOwner = currentUserRole === "OWNER";
  const ownerCount = members.filter((m) => m.role === "OWNER").length;

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/entities/${entityId}/team`);
      const json = await res.json();
      if (json.success) {
        setMembers(json.data);
      } else {
        toast.error(json.error || "Failed to load team members");
      }
    } catch {
      toast.error("Failed to load team members");
    } finally {
      setIsLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAddMember = async () => {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch(`/api/entities/${entityId}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Team member added");
        setEmail("");
        setRole("EDITOR");
        setDialogOpen(false);
        await fetchMembers();
      } else {
        toast.error(json.error || "Failed to add team member");
      }
    } catch {
      toast.error("Failed to add team member");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setRemovingId(memberId);
    try {
      const res = await fetch(`/api/entities/${entityId}/team`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberId }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Team member removed");
        await fetchMembers();
      } else {
        toast.error(json.error || "Failed to remove team member");
      }
    } catch {
      toast.error("Failed to remove team member");
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading team members...</p>;
  }

  return (
    <div className="space-y-4">
      {isOwner && (
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Add a user to this entity by their email address. They must
                  have signed in to the app at least once.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="member-email">Email address</Label>
                  <Input
                    id="member-email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddMember();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member-role">Role</Label>
                  <Select
                    value={role}
                    onValueChange={(v) =>
                      setRole(v as "OWNER" | "EDITOR" | "VIEWER")
                    }
                  >
                    <SelectTrigger id="member-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIEWER">Viewer — read-only access</SelectItem>
                      <SelectItem value="EDITOR">Editor — can create and edit</SelectItem>
                      <SelectItem value="OWNER">Owner — full control</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isAdding}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddMember} disabled={isAdding}>
                  {isAdding ? "Adding..." : "Add Member"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            {isOwner && <TableHead className="w-16" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const isLastOwner = member.role === "OWNER" && ownerCount <= 1;
            const canRemove = isOwner && !isLastOwner;

            return (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  {member.name || "—"}
                  {member.id === currentUserId && (
                    <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {member.email}
                </TableCell>
                <TableCell>
                  <Badge variant={ROLE_BADGE_VARIANT[member.role]}>
                    {member.role}
                  </Badge>
                </TableCell>
                {isOwner && (
                  <TableCell>
                    {canRemove && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        disabled={removingId === member.id}
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove member</span>
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {members.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No team members yet.
        </p>
      )}
    </div>
  );
}
