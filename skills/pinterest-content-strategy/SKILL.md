---
name: pinterest-content-strategy
description: Plan Pinterest pins and boards for a digital (or handmade) product with pinterest-pin-engine. Use when the user wants pin ideas, pin designs, pin copy, or a board strategy.
---

# Pinterest content for products

Pinterest is a **visual search engine**: pins rank on keywords (title, description, board, image text) and on freshness (new images). Pins keep driving traffic for months.

## Workflow
1. **Brief.** Get the product name, type, 3–6 search keywords (primary first), audience, 1–3 benefits, whether it's digital, and any upcoming season.
2. **Boards first.** `suggest_boards` → recommend 5–8 boards named with exact search phrases. Mention sections for the main board.
3. **Ideas.** `generate_pin_ideas` (8–12) → pick 4–6 angles that fit the product. Present each as: angle, overlay headline, format, visual brief, target keyword.
4. **Copy.** For each chosen idea, `write_pin_copy` with that idea's target keyword. Choose the best variant per pin and keep the keyword in the first 60 characters.
5. **Assets.** Remind the user to design a 1000×1500 (2:3) image per idea, put the keyword in the overlay text, and host images at public https URLs (their shop CDN, Canva share link to the file, etc.).
6. Hand off to **pinterest-bulk-scheduling**.

## Quality bar
- Each pin targets **one** keyword; different pins target different keywords.
- Write natural sentences. No hashtag stuffing.
- Social-proof pins must use genuine reviews only.
- Seasonal pins go live 30–45 days before the peak.
