export type Level = "normal" | "reminder" | "reflection" | "hold";

export type Features = {
  novelRecipient: boolean;
  amountRatio: number;
  hour: number;
  interactions: number;
};

export type Decision = {
  id: string;
  recipient: string;
  amount: number;
  reason: string;
  ts: number;
  features: Features;
  action: "deny" | "approve" | "override" | "delete";
  source: "real" | "seeded" | "demo";
  kind: "hard" | "soft" | "context";
  /** For action "delete": the id of the decision being removed. */
  target?: string;
  blobId?: string;
};

export type Match = { decision: Decision; similarity: number };

export type Verdict = {
  level: Level;
  score: number;
  matches: Match[];
  counterfactualLevel: Level;
  reasons: string[];
};
