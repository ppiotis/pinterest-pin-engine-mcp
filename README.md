<p align="center"><img src="logo.svg" width="96" alt="Pinterest Pin Engine logo"></p>

# Pinterest Pin Engine MCP

[![CI](https://github.com/ppiotis/pinterest-pin-engine-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/ppiotis/pinterest-pin-engine-mcp/actions/workflows/ci.yml)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

**A Pinterest content engine for digital-product sellers.** Your agent plans pins end to end: distinct pin angles with visual briefs, titles and descriptions that fit Pinterest's limits, keyword-named boards, a posting schedule exported as a **ready-to-upload bulk CSV**, and insights from your **analytics export**.

- **No Pinterest login, no API key, nothing is posted.** You stay in control of publishing.
- **Deterministic.** Rule-based templates and validators; same input, same output.
- **Validated.** Every CSV row is checked (title ≤100, description ≤500, https media URL, video thumbnail, unique titles, 200 rows per file, 14-day window, local time → UTC with DST).

## Tools

| Tool | What it does |
|---|---|
| `generate_pin_ideas` | Up to 12 angles: problem/solution, what's inside, how-to, listicle, before/after, lifestyle mockup, checklist infographic, gift guide, seasonal, social proof, comparison, freebie teaser. Each has an overlay headline, format, visual brief, target keyword and suggested title |
| `write_pin_copy` | 1–4 title (≤100) + description (≤500) variants with the keyword in the first 60 characters |
| `suggest_boards` | Keyword-named boards (≤50 chars) with descriptions, keyword sets and sections |
| `plan_schedule` | Spreads pins across days/times in your time zone, interleaves boards, validates rows, outputs CSV with header `Title,Media URL,Pinterest board,Thumbnail,Description,Link,Publish date,Keywords` |
| `analyze_pin_analytics` | Parses a pasted Pinterest Analytics CSV: totals, save rate, outbound CTR, top pins, hidden gems, high-reach/low-click pins, boards, recommendations |

All tools are `readOnlyHint: true`, `openWorldHint: false`.

## Install

### Remote (Streamable HTTP, recommended once hosted)

Stateless with no stored data, so it's safe to host publicly.

- **Vercel:** `vercel deploy` (uses `vercel.json` + `api/mcp.js`, endpoint `/mcp`)
- **Docker:** `docker build -t pinterest-pin-engine-mcp . && docker run -p 3000:3000 pinterest-pin-engine-mcp`

```json
{ "mcpServers": { "pinterest-pin-engine": { "url": "https://<your-host>/mcp" } } }
```

Optional `MCP_AUTH_TOKEN` → clients send `Authorization: Bearer <token>`.

### Local (stdio)

Requires Node.js 20+.

```json
{ "mcpServers": { "pinterest-pin-engine": { "command": "npx", "args": ["-y", "github:ppiotis/pinterest-pin-engine-mcp"] } } }
```

From source: `git clone https://github.com/ppiotis/pinterest-pin-engine-mcp && cd pinterest-pin-engine-mcp && npm ci && npm run build && node dist/stdio.js`

## Skills included

- `pinterest-content-strategy`: brief → boards → ideas → copy.
- `pinterest-bulk-scheduling`: validated bulk-upload CSVs in the right time zone.
- `pinterest-analytics-review`: from analytics export to 3 concrete actions.

## Security & privacy

- **No network calls, no telemetry, no credentials.** It never contacts Pinterest. Runtime deps: the MCP SDK, `zod`, `papaparse`.
- **No file system access.** Analytics are passed as text and CSVs are returned as text, so the server cannot read or write your files.
- **Stateless.** Nothing is stored; each HTTP request gets a fresh server.
- **Validated input** with zod (caps on every field, 2 MB analytics limit, 1 MB HTTP body); warns on spreadsheet-formula-like cells.
- **Hosted hardening.** Optional bearer token (constant-time compare), `127.0.0.1` bind by default, `/health`.

## Reviewer test plan

1. **Ideas.** Add the plugin and ask: *"Give me 8 Pinterest pin ideas for my Minimalist Wedding Budget Planner (digital). Keywords: wedding budget planner, wedding planning checklist, wedding budget spreadsheet. Audience: brides."* → Expect 8 distinct angles, each with overlay text, format (2:3 static, carousel, video), visual brief and target keyword.
2. **Copy within limits.** Ask: *"Write pin titles and descriptions for idea 1."* → Expect titles ≤100 and descriptions ≤500 characters with lengths shown, keyword in the first 60 characters, and no hashtags.
3. **Bulk CSV.** Ask: *"Schedule these 6 pins, 2 a day from 2026-10-20 at 08:00 and 19:00 Johannesburg time"* (give image URLs like `https://cdn.example.com/pins/1.png`) → Expect a CSV with the exact Pinterest header and `Publish date` in UTC (`2026-10-20T06:00:00`, `2026-10-20T17:00:00`…), with boards alternating.
4. **Validation.** Include a pin with an `http://` image and a 120-character title → Expect `valid: false`, a per-row error table, and no CSV until fixed.
5. **Analytics.** Paste `examples/pinterest-analytics-sample.csv` and ask *"What's working?"* → Expect 6 pins, 40,750 impressions, 450 outbound clicks (1.1% CTR); "Wedding Budget Planner: Stay on Budget" as the top traffic pin; "What's Inside the Budget Planner" as a hidden gem; "Gift Ideas for Brides" flagged high-reach/low-clicks; 3+ recommendations.

## Development

```bash
npm ci
npm test               # build + unit tests + e2e over stdio and Streamable HTTP
npm audit --omit=dev
```

## Disclaimer

Not affiliated with or endorsed by Pinterest, Inc. "Pinterest" is a trademark of Pinterest, Inc.

## License

MIT © Paris Piotis
