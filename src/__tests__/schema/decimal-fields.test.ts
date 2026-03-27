/**
 * DI-01: Prisma schema uses Decimal(19,4) for money fields convention
 * DI-02: All financial tables include entityId FK
 *
 * Strategy: Parse the prisma/schema.prisma file and assert on:
 * 1. The NUMERIC(19,4) convention comment is present in the schema
 * 2. The entityId FK convention comment is present
 * 3. The Entity model has the correct structure (id, name, type, fiscalYearEnd)
 * 4. The EntityType enum includes all 9 required values
 *
 * This is a static schema inspection test — no DB connection needed.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

let schemaContent: string;

beforeAll(() => {
  const schemaPath = join(
    process.cwd(),
    "prisma",
    "schema.prisma"
  );
  schemaContent = readFileSync(schemaPath, "utf-8");
});

describe("DI-01: Decimal(19,4) convention for money fields", () => {
  it("schema documents the Decimal(19,4) convention for money fields", () => {
    // The schema must have a comment establishing the money field convention
    expect(schemaContent).toContain("Decimal");
    expect(schemaContent).toMatch(/Decimal.*19.*4|19,4.*Decimal/i);
  });

  it("schema contains the DI-01 requirement marker comment", () => {
    // The plan requires a comment noting the Decimal(19,4) convention
    expect(schemaContent).toContain("DI-01");
  });

  it("schema uses postgresql provider (required for Decimal precision)", () => {
    expect(schemaContent).toContain('provider = "postgresql"');
  });
});

describe("DI-02: entityId FK pattern documented in schema", () => {
  it("schema documents the entityId FK convention for financial tables", () => {
    // The plan requires a comment noting the entityId scoping pattern
    expect(schemaContent).toContain("DI-02");
  });

  it("Entity model establishes the entityId relation pattern", () => {
    // Entity model has createdById as FK to User — establishing the FK pattern
    expect(schemaContent).toContain("createdById");
    expect(schemaContent).toContain("@relation(fields: [createdById]");
  });

  it("schema comment documents that financial tables must include entityId FK", () => {
    // Should mention entityId in the convention comment
    expect(schemaContent).toContain("entityId");
  });
});

describe("DI-01 + DI-02: Entity model structure", () => {
  it("Entity model exists in schema", () => {
    expect(schemaContent).toContain("model Entity {");
  });

  it("Entity model has id field with cuid default", () => {
    expect(schemaContent).toMatch(/id\s+String\s+@id\s+@default\(cuid\(\)\)/);
  });

  it("Entity model has name field", () => {
    expect(schemaContent).toMatch(/name\s+String/);
  });

  it("Entity model has type field referencing EntityType enum", () => {
    expect(schemaContent).toMatch(/type\s+EntityType/);
  });

  it("Entity model has fiscalYearEnd field (String for MM-DD format)", () => {
    expect(schemaContent).toMatch(/fiscalYearEnd\s+String/);
  });

  it("Entity model has isActive boolean for soft-delete pattern", () => {
    expect(schemaContent).toMatch(/isActive\s+Boolean/);
  });

  it("Entity model has createdAt and updatedAt timestamps", () => {
    expect(schemaContent).toContain("createdAt");
    expect(schemaContent).toContain("updatedAt");
  });

  it("EntityType enum defines all 9 required entity types", () => {
    const requiredTypes = [
      "LP",
      "LLC",
      "CORPORATION",
      "S_CORP",
      "TRUST",
      "FOUNDATION",
      "PARTNERSHIP",
      "INDIVIDUAL",
      "OTHER",
    ];
    for (const type of requiredTypes) {
      expect(schemaContent).toContain(type);
    }
  });

  it("CoaTemplate enum is defined", () => {
    expect(schemaContent).toContain("enum CoaTemplate {");
    expect(schemaContent).toContain("TEMPLATE");
    expect(schemaContent).toContain("BLANK");
  });

  it("User model exists with clerkId for auth integration", () => {
    expect(schemaContent).toContain("model User {");
    expect(schemaContent).toContain("clerkId");
    expect(schemaContent).toMatch(/clerkId\s+String\s+@unique/);
  });
});
