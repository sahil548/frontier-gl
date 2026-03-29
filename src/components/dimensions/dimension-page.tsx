"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusCircle } from "lucide-react";
import { useEntityContext } from "@/providers/entity-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { DimensionForm } from "./dimension-form";
import { TagForm } from "./tag-form";
import { TagTable } from "./tag-table";

type DimensionTag = {
  id: string;
  dimensionId: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
};

type Dimension = {
  id: string;
  entityId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  tags: DimensionTag[];
};

export function DimensionPage() {
  const {
    currentEntityId,
    entities,
    isLoading: entitiesLoading,
  } = useEntityContext();

  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dimension form state
  const [dimFormOpen, setDimFormOpen] = useState(false);
  const [editDimension, setEditDimension] = useState<Dimension | undefined>();

  // Tag form state
  const [tagFormOpen, setTagFormOpen] = useState(false);
  const [tagFormDimensionId, setTagFormDimensionId] = useState<string>("");
  const [editTag, setEditTag] = useState<DimensionTag | undefined>();

  const fetchDimensions = useCallback(async () => {
    if (!currentEntityId || currentEntityId === "all") {
      setDimensions([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/entities/${currentEntityId}/dimensions?all=true`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setDimensions(json.data);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [currentEntityId]);

  useEffect(() => {
    fetchDimensions();
  }, [fetchDimensions]);

  const handleNewDimension = () => {
    setEditDimension(undefined);
    setDimFormOpen(true);
  };

  const handleEditDimension = (dim: Dimension) => {
    setEditDimension(dim);
    setDimFormOpen(true);
  };

  const handleNewTag = (dimensionId: string) => {
    setEditTag(undefined);
    setTagFormDimensionId(dimensionId);
    setTagFormOpen(true);
  };

  const handleEditTag = (dimensionId: string, tag: DimensionTag) => {
    setEditTag(tag);
    setTagFormDimensionId(dimensionId);
    setTagFormOpen(true);
  };

  if (entitiesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dimensions</h1>
        <p className="text-muted-foreground">
          Create an entity first to manage dimensions.
        </p>
      </div>
    );
  }

  const canCreate = currentEntityId !== "all";
  const currentEntity = entities.find((e) => e.id === currentEntityId);
  const contextLabel = currentEntity ? currentEntity.name : "All Entities";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dimensions</h1>
          <p className="text-muted-foreground text-sm">
            Viewing: {contextLabel}
          </p>
        </div>
        {canCreate && (
          <Button onClick={handleNewDimension}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Dimension
          </Button>
        )}
      </div>

      {/* Content */}
      {!canCreate ? (
        <p className="text-muted-foreground text-sm">
          Select a specific entity to manage dimensions.
        </p>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-10">
          <p className="text-muted-foreground">Loading dimensions...</p>
        </div>
      ) : dimensions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No dimensions yet. Create one to start tagging journal entries.
          </p>
        </div>
      ) : (
        <Accordion>
          {dimensions.map((dim) => {
            const activeTags = dim.tags.filter((t) => t.isActive);
            return (
              <AccordionItem key={dim.id} value={dim.id}>
                <AccordionTrigger className="px-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        dim.isActive ? "" : "text-muted-foreground line-through"
                      }
                    >
                      {dim.name}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {activeTags.length} tag{activeTags.length !== 1 ? "s" : ""}
                    </Badge>
                    {!dim.isActive && (
                      <Badge variant="outline" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-2">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditDimension(dim)}
                      >
                        Edit Dimension
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleNewTag(dim.id)}
                      >
                        <PlusCircle className="mr-2 h-3.5 w-3.5" />
                        New Tag
                      </Button>
                    </div>
                    <TagTable
                      tags={dim.tags}
                      onEditTag={(tag) => handleEditTag(dim.id, tag)}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Dimension slide-over */}
      {canCreate && (
        <DimensionForm
          mode={editDimension ? "edit" : "create"}
          entityId={currentEntityId}
          open={dimFormOpen}
          onOpenChange={setDimFormOpen}
          onSuccess={fetchDimensions}
          editDimension={editDimension}
        />
      )}

      {/* Tag slide-over */}
      {canCreate && (
        <TagForm
          mode={editTag ? "edit" : "create"}
          entityId={currentEntityId}
          dimensionId={tagFormDimensionId}
          open={tagFormOpen}
          onOpenChange={setTagFormOpen}
          onSuccess={fetchDimensions}
          editTag={editTag}
        />
      )}
    </div>
  );
}
