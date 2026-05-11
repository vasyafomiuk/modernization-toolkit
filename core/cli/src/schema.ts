// Type definitions for the rule catalog.
// Kept in sync with rules/_schema.json.

export type RuleType =
  | "validation"
  | "calculation"
  | "authorization"
  | "state_transition"
  | "side_effect";

export type RuleStatus =
  | "extracted"
  | "implemented_unverified"
  | "implemented_verified"
  | "gap"
  | "drift"
  | "net_new"
  | "deprecated";

export type Confidence = "high" | "medium" | "low";

export type ExampleKind = "positive" | "negative" | "edge";

export interface Source {
  path: string;
  symbol: string;
  lines: [number, number];
}

export interface Example {
  input: Record<string, unknown>;
  expect: Record<string, unknown>;
  kind: ExampleKind;
  notes?: string;
}

export interface Rule {
  id: string;
  type: RuleType;
  domain: string;
  description: string;
  trigger?: string;
  preconditions?: string[];
  logic: string;
  effect?: string;
  sources: {
    legacy?: Source[];
    modern?: Source[];
  };
  examples: Example[];
  status: RuleStatus;
  confidence: Confidence;
  notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  aliases?: string[];
  drift_reason?: string;
  deprecated_reason?: string;
  tags?: string[];
}

export type Catalog = Rule[];
