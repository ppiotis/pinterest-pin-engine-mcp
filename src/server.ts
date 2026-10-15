import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { safe } from "./result.js";
import * as pins from "./pins.js";

export const VERSION = "1.0.0";
const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const keywords = z.array(z.string().trim().min(1).max(80)).min(1).max(30).describe("Search phrases, most important first");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export function createServer(): McpServer {
  const server = new McpServer(
    { name: "pinterest-pin-engine", version: VERSION },
    { instructions: "Pinterest content planning for digital products. No Pinterest login or API: tools generate ideas, copy within Pinterest limits, board plans, bulk-upload CSVs and insights from analytics CSVs the user pastes. Nothing is ever posted." },
  );

  server.registerTool("generate_pin_ideas", {
    title: "Generate pin ideas",
    description: "Generate distinct pin angles (problem/solution, what's inside, how-to, listicle, before/after, mockup, checklist, gift guide, seasonal, social proof, comparison, freebie) with overlay headline, format, visual brief and target keyword.",
    inputSchema: {
      product_name: z.string().trim().min(1).max(120),
      product_type: z.string().trim().min(1).max(60),
      keywords,
      audience: z.string().max(60).optional(),
      benefits: z.array(z.string().max(120)).max(5).optional(),
      digital: z.boolean().optional(),
      season: z.string().max(40).optional(),
      count: z.number().int().min(1).max(12).optional().describe("Default 8"),
    },
    annotations: RO,
  }, safe(({ count, ...b }) => pins.generatePinIdeas(b, count)));

  server.registerTool("write_pin_copy", {
    title: "Write pin title & description",
    description: "Write 1–4 pin title (≤100 chars) and description (≤500 chars) variants with the primary keyword in the first 60 characters.",
    inputSchema: {
      topic: z.string().trim().min(1).max(120).describe("What the pin is about / product name"),
      keywords,
      benefit: z.string().max(120).optional(),
      audience: z.string().max(60).optional(),
      cta: z.string().max(120).optional(),
      digital: z.boolean().optional(),
      variants: z.number().int().min(1).max(4).optional(),
    },
    annotations: RO,
  }, safe((c) => pins.writePinCopy(c)));

  server.registerTool("suggest_boards", {
    title: "Suggest boards",
    description: "Suggest keyword-named boards (≤50 chars) with descriptions, keyword sets and optional sections for a niche.",
    inputSchema: { niche: z.string().trim().min(1).max(80), keywords, products: z.array(z.string().max(60)).max(10).optional(), count: z.number().int().min(1).max(12).optional() },
    annotations: RO,
  }, safe(({ niche, keywords, products, count }) => pins.suggestBoards(niche, keywords, products, count)));

  server.registerTool("plan_schedule", {
    title: "Plan schedule → bulk-upload CSV",
    description: "Spread pins over days/time slots (local time zone → UTC), interleave boards, validate every row against Pinterest bulk-upload rules, and return ready-to-upload CSV text (header: Title, Media URL, Pinterest board, Thumbnail, Description, Link, Publish date, Keywords), split into files of ≤200 rows within a 14-day window each.",
    inputSchema: {
      pins: z.array(z.object({
        title: z.string().trim().min(1).max(200),
        media_url: z.string().trim().min(1).max(2000).describe("Public https URL of the image or video file"),
        board: z.string().trim().min(1).max(150).describe("Board name, or 'Board/Section'"),
        description: z.string().max(1000).optional(),
        link: z.string().max(2000).optional(),
        keywords: z.array(z.string().max(80)).max(20).optional(),
        thumbnail: z.string().max(2000).optional().describe("Video only: mm:ss, seconds, or image URL"),
      })).min(1).max(1000),
      start_date: date,
      pins_per_day: z.number().int().min(1).max(25),
      times: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24h)")).min(1).max(25).describe("Local posting times, e.g. ['08:00','20:30']"),
      timezone: z.string().min(1).max(64).describe("IANA zone, e.g. 'Africa/Johannesburg'"),
      now: z.string().datetime({ offset: true }).optional().describe("Override 'now' (testing)"),
    },
    annotations: RO,
  }, safe(({ pins: rows, ...o }) => pins.planSchedule(rows, o)));

  server.registerTool("analyze_pin_analytics", {
    title: "Analyze Pinterest analytics CSV",
    description: "Read a Pinterest Analytics CSV export (pasted text) and return totals, save rate, outbound CTR, top pins, hidden gems (high CTR, low reach), high-reach/low-click pins, per-board stats and recommendations. Column names are auto-detected.",
    inputSchema: { csv_text: z.string().min(1).max(2_000_000), top: z.number().int().min(1).max(25).optional() },
    annotations: RO,
  }, safe(({ csv_text, top }) => pins.analyzeAnalytics(csv_text, { top })));

  return server;
}
