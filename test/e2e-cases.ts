import { expect } from "vitest";
import { brief, pinRows, sampleAnalytics } from "./helpers.js";

export const e2eEnv: Record<string, string> = {};
export async function setupE2E() {
  return {};
}
export async function teardownE2E() {}
export const expectedTools = ["generate_pin_ideas", "write_pin_copy", "suggest_boards", "plan_schedule", "analyze_pin_analytics"];
export interface Case {
  tool: string;
  args: (ctx: Record<string, unknown>) => Record<string, unknown>;
  isError?: boolean;
  check?: (text: string, ctx: Record<string, unknown>) => void;
}
const j = (t: string) => JSON.parse(t);
export const cases: Case[] = [
  { tool: "generate_pin_ideas", args: () => ({ ...brief, count: 5 }), check: (t) => expect(j(t).ideas).toHaveLength(5) },
  { tool: "write_pin_copy", args: () => ({ topic: brief.product_name, keywords: brief.keywords, digital: true }), check: (t) => j(t).variants.forEach((v: { title_length: number; description_length: number }) => { expect(v.title_length).toBeLessThanOrEqual(100); expect(v.description_length).toBeLessThanOrEqual(500); }) },
  { tool: "suggest_boards", args: () => ({ niche: "wedding planning", keywords: brief.keywords }), check: (t) => expect(j(t).boards.length).toBeGreaterThan(2) },
  { tool: "plan_schedule", args: () => ({ pins: pinRows(4), start_date: "2026-10-20", pins_per_day: 2, times: ["08:00", "19:00"], timezone: "UTC", now: "2026-10-15T00:00:00Z" }), check: (t) => expect(j(t).files[0].csv.split(/\r?\n/)[0]).toBe("Title,Media URL,Pinterest board,Thumbnail,Description,Link,Publish date,Keywords") },
  { tool: "analyze_pin_analytics", args: () => ({ csv_text: sampleAnalytics }), check: (t) => expect(j(t).totals.pins).toBe(6) },
  { tool: "plan_schedule", args: () => ({ pins: pinRows(1), start_date: "20-10-2026", pins_per_day: 1, times: ["08:00"], timezone: "UTC" }), isError: true },
];
