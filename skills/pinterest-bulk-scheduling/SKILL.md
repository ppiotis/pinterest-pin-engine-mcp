---
name: pinterest-bulk-scheduling
description: Build a posting schedule and Pinterest bulk-upload CSV with plan_schedule. Use when the user wants to schedule pins, create a content calendar, or bulk upload pins.
---

# Scheduling with the bulk-upload CSV

`plan_schedule` never posts. It returns CSV text in Pinterest's bulk-create format, which the user uploads themselves (business account: **Create → Create Pin → Bulk create Pins**).

## Steps
1. Collect per pin: `title` (≤100), public **https** `media_url` (direct image/video file), `board` (or `Board/Section`), optional `description` (≤500), `link`, `keywords`; video pins also need `thumbnail` (mm:ss or seconds).
2. Ask for the user's **time zone** (IANA, e.g. `Africa/Johannesburg`) and preferred daily times. Sensible default: 1–3 pins/day at times like `08:00`, `13:00`, `20:00` local. Consistency beats volume.
3. Call `plan_schedule`. If `valid` is false, show the `errors` table (row, field, problem), fix the rows with the user, and re-run. No CSV is produced until every row passes.
4. Relay any `warnings` (past dates, >14 days ahead, formula-like cells).
5. Give each file in `files` as a code block or save it to disk if you have file tools, named as returned (`pinterest-bulk-1.csv`…). Each file holds ≤200 rows within one 14-day window; upload later files closer to their dates.
6. Show the human-readable `schedule` (local times) so the user can sanity-check it.

Boards are interleaved so the same board isn't posted twice in a row, and identical links aren't back-to-back.
