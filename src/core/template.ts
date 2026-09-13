// Templates (08 §5): named block sequences the block-filler serves weakest-first.
// The starter ships as editable seed — real basic by design (log #43); blocks whose pool
// is empty in this phase (Reading before P3, F3 before P2) report unavailable and skip (08 §4/§7).
export type BlockFamily = "keys" | "chord" | "scale" | "arp" | "reading";

export interface TemplateBlock {
  name: string;
  families: BlockFamily[];
  boundMinutes?: number;
  boundCount?: number;
}

export interface PracticeTemplate { name: string; blocks: TemplateBlock[]; }

export const STARTER_TEMPLATE: PracticeTemplate = {
  name: "Starter session",
  blocks: [
    { name: "Keys & chords", families: ["keys", "chord"], boundMinutes: 10 }, // F3 joins with the staff (P2)
    { name: "Scales", families: ["scale"], boundMinutes: 5 },
    { name: "Arpeggios", families: ["arp"], boundMinutes: 5 },
    { name: "Reading", families: ["reading"], boundCount: 4 },               // F10 — Phase 3
  ],
};
