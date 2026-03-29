"use client";

import { Badge } from "@/components/ui/badge";

type DimensionTag = {
  id: string;
  dimensionId: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
};

type TagTableProps = {
  tags: DimensionTag[];
  onEditTag: (tag: DimensionTag) => void;
};

export function TagTable({ tags, onEditTag }: TagTableProps) {
  if (tags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No tags yet. Add one to start classifying entries.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium">Code</th>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">
              Description
            </th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {tags.map((tag) => (
            <tr
              key={tag.id}
              className="border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => onEditTag(tag)}
            >
              <td className="px-3 py-2 font-mono text-xs">{tag.code}</td>
              <td
                className={`px-3 py-2 ${!tag.isActive ? "text-muted-foreground line-through" : ""}`}
              >
                {tag.name}
              </td>
              <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                {tag.description || "--"}
              </td>
              <td className="px-3 py-2">
                <Badge variant={tag.isActive ? "secondary" : "outline"}>
                  {tag.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
