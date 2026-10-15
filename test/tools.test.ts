import { describe, it, expect, beforeAll } from "vitest";
import Papa from "papaparse";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import * as pins from "../src/pins.js";
import { brief, pinRows, sampleAnalytics } from "./helpers.js";

let client: Client;
type Text = { type: string; text: string };
async function call(name: string, args: Record<string, unknown>) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content as Text[])[0].text;
  return { isError: Boolean(res.isError), text, json: () => JSON.parse(text) };
}
beforeAll(async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  await createServer().connect(a);
  client = new Client({ name: "unit", version: "1" });
  await client.connect(b);
});
const base = { start_date: "2026-10-20", pins_per_day: 2, times: ["08:00", "19:00"], timezone: "Africa/Johannesburg", now: "2026-10-15T00:00:00Z" };

describe("fit", () => {
  it("cuts at word boundaries with an ellipsis", () => {
    expect(pins.fit("short", 10)).toBe("short");
    const f = pins.fit("the quick brown fox jumps over the lazy dog", 20);
    expect(f.length).toBeLessThanOrEqual(20);
    expect(f.endsWith("…")).toBe(true);
    expect(f).not.toMatch(/ …$/);
  });
});

describe("generate_pin_ideas", () => {
  it("returns distinct angles with briefs and keywords", async () => {
    const r = (await call("generate_pin_ideas", { ...brief, count: 12 })).json();
    expect(r.ideas).toHaveLength(12);
    expect(new Set(r.ideas.map((i: { angle: string }) => i.angle)).size).toBe(12);
    for (const i of r.ideas) {
      expect(i.headline_overlay.length).toBeLessThanOrEqual(60);
      expect(i.suggested_title.length).toBeLessThanOrEqual(100);
      expect(brief.keywords).toContain(i.target_keyword);
    }
    expect(r.ideas[0].headline_overlay).toBe("Keeping wedding costs under control, made easy");
  });
});

describe("write_pin_copy", () => {
  it("respects limits and front-loads the keyword", async () => {
    const r = (await call("write_pin_copy", { topic: brief.product_name, keywords: brief.keywords, benefit: "helps you stay on budget", audience: "brides", digital: true, variants: 4 })).json();
    expect(r.variants).toHaveLength(4);
    expect(r.variants[1].title).toBe("How to Stay on Budget with a Wedding Budget Planner");
    for (const v of r.variants) {
      expect(v.title.length).toBeLessThanOrEqual(100);
      expect(v.description.length).toBeLessThanOrEqual(500);
      expect(v.keyword_in_first_60).toBe(true);
    }
    expect(new Set(r.variants.map((v: { description: string }) => v.description)).size).toBe(4);
  });
  it("truncates very long input within limits", () => {
    const long = "budget ".repeat(40);
    const r = pins.writePinCopy({ topic: long, keywords: [long, long], benefit: long });
    for (const v of r.variants) {
      expect(v.title_length).toBeLessThanOrEqual(100);
      expect(v.description_length).toBeLessThanOrEqual(500);
    }
  });
});

describe("suggest_boards", () => {
  it("names boards with search phrases, unique, ≤50 chars", async () => {
    const r = (await call("suggest_boards", { niche: "wedding planning", keywords: brief.keywords, products: ["budget planner"], count: 8 })).json();
    const names = r.boards.map((b: { name: string }) => b.name);
    expect(names[0]).toBe("Wedding Budget Planner");
    expect(new Set(names.map((n: string) => n.toLowerCase())).size).toBe(names.length);
    for (const b of r.boards) {
      expect(b.name.length).toBeLessThanOrEqual(50);
      expect(b.description.length).toBeLessThanOrEqual(500);
    }
  });
});

describe("plan_schedule", () => {
  it("produces a valid Pinterest bulk CSV in UTC with interleaved boards", async () => {
    const r = (await call("plan_schedule", { pins: pinRows(6), ...base })).json();
    expect(r.valid).toBe(true);
    expect(r.days).toBe(3);
    const csv = Papa.parse<Record<string, string>>(r.files[0].csv, { header: true });
    expect(csv.meta.fields).toEqual([...pins.BULK_HEADER]);
    expect(csv.data[0]["Publish date"]).toBe("2026-10-20T06:00:00");
    expect(csv.data[1]["Publish date"]).toBe("2026-10-20T17:00:00");
    expect(csv.data[0].Keywords).toBe("wedding budget planner, wedding planning");
    expect(csv.data[0].Thumbnail).toBe("");
    for (let i = 1; i < csv.data.length; i++) expect(csv.data[i]["Pinterest board"]).not.toBe(csv.data[i - 1]["Pinterest board"]);
  });
  it("handles DST correctly", () => {
    expect(pins.localToUtc("2026-07-01", "09:00", "America/New_York").toISOString()).toBe("2026-07-01T13:00:00.000Z");
    expect(pins.localToUtc("2026-12-01", "09:00", "America/New_York").toISOString()).toBe("2026-12-01T14:00:00.000Z");
  });
  it("splits into ≤200-row files within a 14-day window and warns", async () => {
    const r = (await call("plan_schedule", { pins: pinRows(450), ...base, pins_per_day: 25, times: Array.from({ length: 25 }, (_, i) => `${String(Math.floor(i / 2) + 6).padStart(2, "0")}:${i % 2 ? "30" : "00"}`) })).json();
    expect(r.valid).toBe(true);
    expect(r.files.length).toBeGreaterThanOrEqual(3);
    for (const f of r.files) {
      expect(f.rows).toBeLessThanOrEqual(200);
      expect(Date.parse(f.last_publish_utc + "Z") - Date.parse(f.first_publish_utc + "Z")).toBeLessThan(14 * 86400000);
    }
    expect(r.files.reduce((a: number, f: { rows: number }) => a + f.rows, 0)).toBe(450);
    expect(r.warnings.some((w: string) => /14 days/.test(w))).toBe(true);
  });
  it("reports row-level validation errors and emits no files", async () => {
    const bad = [
      { title: "x".repeat(101), media_url: "http://insecure.example.com/a.png", board: "B" },
      { title: "Dup", media_url: "https://e.com/v.mp4", board: "B" },
      { title: "dup", media_url: "https://e.com/b.png", board: "B", link: "javascript:alert(1)", description: "y".repeat(501) },
    ];
    const r = (await call("plan_schedule", { pins: bad, ...base, pins_per_day: 1, times: ["09:00"] })).json();
    expect(r.valid).toBe(false);
    expect(r.files).toEqual([]);
    const probs = r.errors.map((e: { row: number; field: string }) => `${e.row}:${e.field}`);
    expect(probs).toEqual(expect.arrayContaining(["1:title", "1:media_url", "2:thumbnail", "3:title", "3:link", "3:description"]));
  });
  it("rejects bad time zones, too few times and bad formats", async () => {
    expect((await call("plan_schedule", { pins: pinRows(1), ...base, timezone: "Mars/Olympus" })).text).toMatch(/Unknown time zone/);
    expect((await call("plan_schedule", { pins: pinRows(1), ...base, pins_per_day: 3 })).text).toMatch(/at least 3/);
    expect((await call("plan_schedule", { pins: pinRows(1), ...base, times: ["8am"] })).isError).toBe(true);
  });
  it("warns about past dates and formula-like cells", () => {
    const r = pins.planSchedule([{ title: "=HYPERLINK(1)", media_url: "https://e.com/a.png", board: "B" }], { ...base, start_date: "2026-01-01" });
    expect(r.warnings.some((w) => /past/.test(w))).toBe(true);
    expect(r.warnings.some((w) => /formulas/.test(w))).toBe(true);
  });
});

describe("analyze_pin_analytics", () => {
  it("parses an export with preamble lines and thousands separators", async () => {
    const r = (await call("analyze_pin_analytics", { csv_text: sampleAnalytics })).json();
    expect(r.columns_detected).toMatchObject({ title: "Pin title", url: "Pin URL", board: "Board", impressions: "Impressions", saves: "Saves", outbound_clicks: "Outbound clicks" });
    expect(r.totals).toMatchObject({ pins: 6, impressions: 40750, saves: 862, outbound_clicks: 450 });
    expect(r.rates.outbound_ctr_pct).toBe(1.1);
    expect(r.top_by_outbound_clicks[0].title).toBe("Wedding Budget Planner: Stay on Budget");
    expect(r.top_by_impressions[0].title).toBe("Gift Ideas for Brides");
    expect(r.hidden_gems.map((x: { title: string }) => x.title)).toContain("What's Inside the Budget Planner");
    expect(r.high_reach_low_clicks.map((x: { title: string }) => x.title)).toContain("Gift Ideas for Brides");
    expect(r.boards[0].board).toBe("Wedding Budget Planner");
    expect(r.recommendations.length).toBeGreaterThanOrEqual(3);
  });
  it("gives a helpful error for the wrong file", async () => {
    const r = await call("analyze_pin_analytics", { csv_text: "name,email\na,b" });
    expect(r.isError).toBe(true);
    expect(r.text).toMatch(/Impressions/);
  });
  it("tolerates missing optional columns", () => {
    const r = pins.analyzeAnalytics("Title,Impressions\nA,100\nB,50\nTotal,150");
    expect(r.totals.pins).toBe(2);
    expect(r.recommendations.some((x) => /Outbound/.test(x))).toBe(true);
  });
});

describe("annotations", () => {
  it("all tools are read-only and closed-world", async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(5);
    for (const t of tools) expect(t.annotations).toMatchObject({ readOnlyHint: true, openWorldHint: false });
  });
});
