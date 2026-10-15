---
name: pinterest-analytics-review
description: Turn a Pinterest Analytics CSV export into insights and next actions with analyze_pin_analytics. Use when the user shares Pinterest analytics, asks what's working on Pinterest, or wants to improve pin performance.
---

# Pinterest analytics review

1. Ask the user to export **Analytics → Top Pins** (or the Pin stats report) for a date range as CSV and paste it, or share the file so you can read it and pass its text. No Pinterest login is used.
2. Call `analyze_pin_analytics` with the raw text. Preamble lines, thousands separators and varied column names are handled. Check `columns_detected` and mention anything missing (e.g. no outbound clicks).
3. Report:
   - **Totals and rates**: impressions, saves, outbound clicks, save rate %, outbound CTR %. Typical healthy ranges vary by niche; compare to the user's own previous exports rather than generic benchmarks.
   - **Winners**: top 3 by outbound clicks (traffic that can buy) and by saves (future reach).
   - **Hidden gems**: high CTR, low reach. Re-pin to more boards and improve keywords.
   - **High reach, low clicks**: test a clearer benefit headline or CTA.
   - **Boards** ranked by outbound clicks.
4. Close with 3 concrete actions (e.g. "make 4 new designs for pin X", "move Y to board Z") and offer to generate ideas/copy (`generate_pin_ideas`, `write_pin_copy`) and a schedule for them.
