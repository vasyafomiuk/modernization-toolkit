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

export type RulePriority = "P0" | "P1" | "P2" | "P3";

export type RuleCriticality = "critical" | "high" | "medium" | "low";

export type ShadowStatus =
  | "not_configured"
  | "warming"
  | "clean"
  | "diffs"
  | "blocked";

export type VerificationEvidenceKind =
  | "example_test"
  | "property_test"
  | "shadow_run"
  | "ci_run"
  | "manual_review";

export type VerificationEvidenceStatus =
  | "passed"
  | "failed"
  | "pending"
  | "accepted";

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

export interface VerificationEvidence {
  kind: VerificationEvidenceKind;
  ref: string;
  status: VerificationEvidenceStatus;
  at?: string;
  notes?: string;
}

export interface Rule {
  id: string;
  type: RuleType;
  domain: string;
  description: string;
  app?: string;
  capability?: string;
  endpoint?: string;
  owner?: string;
  priority?: RulePriority;
  criticality?: RuleCriticality;
  target_release?: string;
  jira_ticket?: string;
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
  shadow_status?: ShadowStatus;
  shadow_clean_days?: number;
  last_verified_at?: string;
  verification_evidence?: VerificationEvidence[];
  adr_refs?: string[];
  test_refs?: string[];
  tags?: string[];
}

export type Catalog = Rule[];
