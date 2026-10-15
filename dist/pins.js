import Papa from "papaparse";
import { UserError } from "./result.js";
export const LIMITS = { title: 100, description: 500, boardName: 50, csvRows: 200, scheduleWindowDays: 14, descriptionPreview: 60 };
export const BULK_HEADER = ["Title", "Media URL", "Pinterest board", "Thumbnail", "Description", "Link", "Publish date", "Keywords"];
const norm = (s) => s.replace(/\s+/g, " ").trim();
const lower = (s) => norm(s).toLowerCase();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const tc = (s) => norm(s).split(" ").map((w, i) => (i > 0 && /^(a|an|the|and|or|for|of|to|in|on|with)$/i.test(w) ? w.toLowerCase() : cap(w))).join(" ");
/** Cut at a word boundary to fit max, adding an ellipsis only if cut. */
export function fit(s, max) {
    const t = norm(s);
    if (t.length <= max)
        return t;
    const cut = t.slice(0, max - 1);
    const i = cut.lastIndexOf(" ");
    return (i > max * 0.6 ? cut.slice(0, i) : cut).replace(/[\s,;:.-]+$/, "") + "…";
}
const ANGLES = [
    { id: "problem_solution", format: "static 2:3", headline: (b) => (b.benefits?.[0] ? `${cap(lower(b.benefits[0]))}, made easy` : `Tired of messy ${lower(b.product_type)}s?`), brief: "Bold problem statement on top third, product mockup below, short benefit line at the bottom." },
    { id: "whats_inside", format: "carousel (2–5 slides)", headline: (b) => `What's inside the ${tc(b.product_type)}`, brief: "Slide 1 cover mockup; slides 2–5 one page/feature each with a 3-word caption." },
    { id: "how_to", format: "video / idea pin 9:16", headline: (b) => `How to use a ${lower(b.product_type)} in 3 steps`, brief: "Screen-recording or hands-on demo, 6–15s, text overlay per step, end on the product cover." },
    { id: "listicle", format: "static 2:3", headline: (b) => `7 ${tc(b.keywords[0] ?? b.product_type)} ideas${b.audience ? ` for ${lower(b.audience)}` : ""}`, brief: "Numbered list overlay over a flat-lay; product shown as idea #1. Link to a blog/listing roundup." },
    { id: "before_after", format: "static 2:3 split", headline: () => "Before vs after", brief: "Split layout: messy/blank state on top, finished result with the product below." },
    { id: "lifestyle_mockup", format: "static 2:3", headline: (b) => tc(b.product_name), brief: "Aspirational lifestyle mockup (desk, wall, tablet) with minimal text, brand colours." },
    { id: "checklist_infographic", format: "tall infographic 1000×2100", headline: (b) => `The ultimate ${lower(b.keywords[1] ?? b.keywords[0] ?? b.product_type)} checklist`, brief: "Free value: a mini checklist or tips list; product shown as the 'get the full version' CTA at the bottom." },
    { id: "gift_guide", format: "static 2:3 collage", headline: (b) => `Gift idea${b.audience ? ` for ${lower(b.audience)}` : "s they'll actually use"}`, brief: "Collage of 4–6 items incl. this product; price tags; 'gift guide' label." },
    { id: "seasonal", format: "static 2:3", headline: (b) => `${b.season ? tc(b.season) : "This season's"} ${lower(b.product_type)}`, brief: "Seasonal props and palette; publish 30–45 days before the season/holiday peaks." },
    { id: "social_proof", format: "static 2:3", headline: () => '"I wish I\'d found this sooner"', brief: "Real review quote in large type, star rating, small product image. Use only genuine reviews." },
    { id: "comparison", format: "static 2:3", headline: (b) => `${b.digital ? "Digital" : "Handmade"} vs store-bought ${lower(b.product_type)}`, brief: "Two-column comparison table; honest pros; product wins on the benefits it really has." },
    { id: "freebie_teaser", format: "static 2:3", headline: (b) => `Free ${lower(b.product_type)} preview`, brief: "Offer a genuine free sample page / mini version linking to a landing page; upsell the full product." },
];
export function generatePinIdeas(b, count = 8) {
    const kws = b.keywords.map(lower);
    return {
        product: b.product_name,
        ideas: ANGLES.slice(0, Math.min(count, ANGLES.length)).map((a, i) => ({
            angle: a.id,
            headline_overlay: fit(a.headline(b), 60),
            format: a.format,
            visual_brief: a.brief,
            target_keyword: kws[i % kws.length],
            suggested_title: fit(lower(a.headline(b)).includes(kws[i % kws.length]) ? a.headline(b) : `${tc(kws[i % kws.length])}: ${a.headline(b)}`, LIMITS.title),
        })),
        best_practices: [
            "Use a 2:3 vertical image (1000×1500). Taller crops can be cut off in the feed.",
            "Make 3–5 different pin designs per product and link; fresh images rank better than re-pins of the same image.",
            "Put the keyword in the overlay text, title and first sentence of the description.",
        ],
    };
}
export function writePinCopy(c) {
    const [k1, k2, k3] = [c.keywords[0] ?? c.topic, c.keywords[1], c.keywords[2]].map((x) => (x ? lower(x) : x));
    const audience = c.audience ? ` for ${lower(c.audience)}` : "";
    const benefit = c.benefit ? lower(c.benefit) : null;
    const howTo = benefit?.match(/^helps? (?:you )?(.+)$/)?.[1];
    const titleTemplates = [
        `${tc(k1)}${c.audience ? ` for ${tc(c.audience)}` : ""}${benefit ? `: ${tc(benefit)}` : ""}`,
        howTo ? `How to ${tc(howTo)} with a ${tc(k1)}` : `The ${tc(k1)} Everyone Is Saving`,
        `The Easy ${tc(k1)}${k2 ? ` + ${tc(k2)}` : ""} You Need`,
        `${tc(c.topic)} | ${tc(k1)}${c.digital ? " (Instant Download)" : ""}`,
    ];
    const cta = c.cta ?? (c.digital ? "Tap to download yours instantly." : "Tap to shop yours today.");
    const desc = (variant) => {
        const openers = [
            `${cap(k1)}${audience}${benefit ? ` that ${benefit}` : ""}.`,
            `Looking for a ${k1}${audience}?${benefit ? ` This one ${benefit}.` : ""}`,
            `Save this ${k1} for later!${benefit ? ` It ${benefit}.` : ""}`,
            `${cap(k1)} made simple${audience}.`,
        ];
        const middle = [k2 && `Great as a ${k2}`, k3 && `or ${k3}`].filter(Boolean).join(" ");
        return fit(`${openers[variant % openers.length]} ${tc(c.topic)}${c.digital ? " is a digital download you can use right away" : " is made to make life easier"}. ${middle ? middle + ". " : ""}${cta}`, LIMITS.description);
    };
    const n = Math.min(Math.max(c.variants ?? 3, 1), 4);
    const out = Array.from({ length: n }, (_, i) => {
        const title = fit(titleTemplates[i % titleTemplates.length], LIMITS.title);
        const description = desc(i);
        return { title, title_length: title.length, description, description_length: description.length, keyword_in_first_60: description.slice(0, LIMITS.descriptionPreview).toLowerCase().includes(k1) };
    });
    return { variants: out, limits: { title: LIMITS.title, description: LIMITS.description }, tips: ["The first ~60 characters of the description show in most feeds; lead with the keyword.", "Write in natural sentences; Pinterest no longer needs hashtags.", "Add 3–6 keywords in the bulk-upload Keywords column too."] };
}
export function suggestBoards(niche, keywords, products = [], count = 6) {
    const n = lower(niche);
    const kws = [...new Set(keywords.map(lower))];
    const names = [...kws.slice(0, 4).map(tc), tc(`${n} tips`), tc(`${n} inspiration`), ...products.map((p) => tc(/s$/i.test(p) ? p : `${lower(p)}s`)), tc(`${n} ideas`)];
    const boards = [...new Map(names.map((x) => [x.toLowerCase(), x])).values()].slice(0, count).map((name, i) => {
        const k = kws[i % Math.max(1, kws.length)] ?? n;
        const related = kws.filter((x) => x !== k).slice(0, 3);
        return {
            name: fit(name, LIMITS.boardName),
            description: fit(`${cap(k)} ideas, tips and templates${related.length ? ` including ${related.join(", ")}` : ""}. Curated ${n} inspiration to save and try.`, LIMITS.description),
            keywords: [k, ...related],
            sections: i === 0 ? ["Getting started", "Templates", "Examples"] : [],
        };
    });
    return { boards, tips: ["Name boards with the exact phrase people search; avoid clever names.", "Keep 5–10 focused boards with 20+ pins each before adding more.", "Save each new pin to the most relevant board first."] };
}
/** Offset in minutes of an IANA zone at a given UTC instant. */
function tzOffsetMinutes(timeZone, at) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(at).map((p) => [p.type, p.value]));
    const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    return Math.round((asUtc - at.getTime()) / 60000);
}
export function localToUtc(date, time, timeZone) {
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    const guess = Date.UTC(y, m - 1, d, hh, mm);
    const off1 = tzOffsetMinutes(timeZone, new Date(guess));
    const off2 = tzOffsetMinutes(timeZone, new Date(guess - off1 * 60000));
    return new Date(guess - off2 * 60000);
}
export function validateTimeZone(tz) {
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
    }
    catch {
        throw new UserError(`Unknown time zone "${tz}". Use an IANA name like "America/New_York" or "UTC".`);
    }
}
const fmtUtc = (d) => d.toISOString().slice(0, 19);
export function planSchedule(pins, o) {
    validateTimeZone(o.timezone);
    if (o.times.length < o.pins_per_day)
        throw new UserError(`Provide at least ${o.pins_per_day} posting time(s) in 'times' (one per daily slot).`);
    const errors = [];
    const warnings = [];
    const titles = new Map();
    pins.forEach((p, i) => {
        const row = i + 1;
        if (p.title.length > LIMITS.title)
            errors.push({ row, field: "title", problem: `${p.title.length} > ${LIMITS.title} chars` });
        if ((p.description ?? "").length > LIMITS.description)
            errors.push({ row, field: "description", problem: `${p.description.length} > ${LIMITS.description} chars` });
        if (!/^https:\/\/[^\s]+$/i.test(p.media_url))
            errors.push({ row, field: "media_url", problem: "must be a public https:// URL to the image/video file" });
        if (p.link && !/^https?:\/\/[^\s]+$/i.test(p.link))
            errors.push({ row, field: "link", problem: "must be an http(s) URL" });
        if (/\.(mp4|mov|m4v)(\?|$)/i.test(p.media_url) && !p.thumbnail)
            errors.push({ row, field: "thumbnail", problem: "video pins need a thumbnail (mm:ss, seconds, or image URL)" });
        if (!/\.(mp4|mov|m4v)(\?|$)/i.test(p.media_url) && p.thumbnail)
            warnings.push(`Row ${row}: thumbnail is ignored for image pins and should be blank; it was removed.`);
        const k = p.title.trim().toLowerCase();
        if (titles.has(k))
            errors.push({ row, field: "title", problem: `duplicate of row ${titles.get(k)}; titles should be unique within a file` });
        else
            titles.set(k, row);
    });
    if (pins.some((p) => [p.title, p.description ?? "", p.board].some((v) => /^[=+\-@]/.test(v))))
        warnings.push("Some cells start with = + - or @. Pinterest accepts them, but spreadsheet apps may treat them as formulas if you open the CSV. Avoid editing it in Excel, or prefix those cells with an apostrophe.");
    // Order: round-robin across boards, avoiding the same link back-to-back.
    const queue = [...pins.map((p, i) => ({ ...p, _i: i }))];
    const ordered = [];
    while (queue.length) {
        const last = ordered[ordered.length - 1];
        let idx = queue.findIndex((p) => !last || (p.board !== last.board && (!p.link || p.link !== last.link)));
        if (idx < 0)
            idx = queue.findIndex((p) => !last || !p.link || p.link !== last.link);
        if (idx < 0)
            idx = 0;
        ordered.push(queue.splice(idx, 1)[0]);
    }
    const sortedTimes = [...o.times].sort().slice(0, o.pins_per_day);
    const now = o.now ? new Date(o.now) : new Date();
    const windowEnd = new Date(now.getTime() + LIMITS.scheduleWindowDays * 86400000);
    const rows = ordered.map((p, n) => {
        const day = Math.floor(n / o.pins_per_day);
        const slot = n % o.pins_per_day;
        const d = new Date(Date.parse(`${o.start_date}T00:00:00Z`) + day * 86400000).toISOString().slice(0, 10);
        const utc = localToUtc(d, sortedTimes[slot], o.timezone);
        return { p, utc, local: `${d} ${sortedTimes[slot]} ${o.timezone}` };
    });
    if (rows.some((r) => r.utc < now))
        warnings.push("Some publish dates are in the past; Pinterest will publish those immediately.");
    const beyond = rows.filter((r) => r.utc > windowEnd).length;
    if (beyond)
        warnings.push(`${beyond} pin(s) are scheduled more than ${LIMITS.scheduleWindowDays} days ahead. Pinterest may only accept dates in the near future: upload those rows in a later batch (they are split into separate files by date window).`);
    // Split into files: max 200 rows and one 14-day window per file.
    const files = [];
    let chunk = [];
    const flush = () => {
        if (!chunk.length)
            return;
        const data = chunk.map(({ p, utc }) => [p.title, p.media_url, p.board, /\.(mp4|mov|m4v)(\?|$)/i.test(p.media_url) ? p.thumbnail ?? "" : "", p.description ?? "", p.link ?? "", fmtUtc(utc), (p.keywords ?? []).join(", ")]);
        files.push({ name: `pinterest-bulk-${files.length + 1}.csv`, rows: chunk.length, first_publish_utc: fmtUtc(chunk[0].utc), last_publish_utc: fmtUtc(chunk[chunk.length - 1].utc), csv: Papa.unparse({ fields: [...BULK_HEADER], data }) });
        chunk = [];
    };
    for (const r of rows) {
        if (chunk.length && (chunk.length >= LIMITS.csvRows || r.utc.getTime() - chunk[0].utc.getTime() >= LIMITS.scheduleWindowDays * 86400000))
            flush();
        chunk.push(r);
    }
    flush();
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        total_pins: rows.length,
        days: Math.ceil(rows.length / o.pins_per_day),
        schedule: rows.map((r) => ({ title: r.p.title, board: r.p.board, local_time: r.local, publish_date_utc: fmtUtc(r.utc) })),
        files: errors.length ? [] : files,
        upload_instructions: "Pinterest → Create → Create Pin → 'Bulk create Pins' (business account) → upload each CSV. Media URLs must be publicly reachable. Boards that don't exist are created; use 'Board/Section' to target a section.",
    };
}
// ---------- analytics ----------
const ALIASES = {
    title: ["pin title", "title", "pin", "pin name", "pin description"],
    url: ["pin url", "url", "pin link", "link", "destination url"],
    board: ["board", "board name"],
    date: ["date", "created", "pin created date", "created at", "publish date"],
    impressions: ["impressions", "impression"],
    saves: ["saves", "pin saves", "save", "repins"],
    outbound_clicks: ["outbound clicks", "outbound click", "link clicks", "clicks to website"],
    pin_clicks: ["pin clicks", "pin click", "closeups", "closeup"],
    engagements: ["engagements", "engagement", "total engagements"],
    video_views: ["video views", "video starts"],
};
const num = (v) => {
    const s = String(v ?? "").replace(/[,%\s]/g, "");
    if (s === "" || s === "-" || s === "--")
        return 0;
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
};
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 10000) / 100 : null);
export function analyzeAnalytics(csvText, opts = {}) {
    if (csvText.length > 2_000_000)
        throw new UserError("CSV text is larger than 2 MB; filter it to the date range you care about first.");
    // Pinterest exports sometimes have preamble lines before the header. Find the header row.
    const lines = csvText.replace(/^\uFEFF/, "").split(/\r?\n/);
    const headerIdx = lines.findIndex((l) => /impression/i.test(l));
    if (headerIdx < 0)
        throw new UserError("Couldn't find a header row with an 'Impressions' column. Export 'Top Pins' (or Pin stats) from Pinterest Analytics as CSV and paste it unchanged.");
    const parsed = Papa.parse(lines.slice(headerIdx).join("\n"), { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim() });
    const fields = parsed.meta.fields ?? [];
    const map = {};
    for (const [key, aliases] of Object.entries(ALIASES))
        map[key] = fields.find((f) => aliases.includes(f.toLowerCase())) ?? fields.find((f) => aliases.some((a) => f.toLowerCase().includes(a)));
    if (map.title === map.url)
        map.url = undefined;
    const rows = parsed.data
        .map((r) => ({
        title: map.title ? norm(r[map.title] ?? "") : "",
        url: map.url ? r[map.url] : undefined,
        board: map.board ? r[map.board] : undefined,
        impressions: num(r[map.impressions]),
        saves: map.saves ? num(r[map.saves]) : 0,
        outbound_clicks: map.outbound_clicks ? num(r[map.outbound_clicks]) : 0,
        pin_clicks: map.pin_clicks ? num(r[map.pin_clicks]) : 0,
        engagements: map.engagements ? num(r[map.engagements]) : 0,
    }))
        .filter((r) => r.impressions > 0 || r.saves > 0 || r.outbound_clicks > 0)
        .filter((r) => !/^(total|totals|all pins)$/i.test(r.title));
    if (!rows.length)
        throw new UserError("No data rows with metrics were found.");
    const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
    const totals = { pins: rows.length, impressions: sum("impressions"), saves: sum("saves"), outbound_clicks: sum("outbound_clicks"), pin_clicks: sum("pin_clicks"), engagements: sum("engagements") };
    const rates = { save_rate_pct: pct(totals.saves, totals.impressions), outbound_ctr_pct: pct(totals.outbound_clicks, totals.impressions), engagement_rate_pct: pct(totals.engagements, totals.impressions) };
    const enriched = rows.map((r) => ({ ...r, save_rate_pct: pct(r.saves, r.impressions), outbound_ctr_pct: pct(r.outbound_clicks, r.impressions) }));
    const top = opts.top ?? 5;
    const by = (k) => [...enriched].sort((a, b) => b[k] - a[k]).slice(0, top);
    const medianImpr = [...rows.map((r) => r.impressions)].sort((a, b) => a - b)[Math.floor(rows.length / 2)];
    const avgCtr = totals.impressions ? totals.outbound_clicks / totals.impressions : 0;
    const hidden_gems = enriched.filter((r) => r.impressions > 0 && r.impressions < medianImpr && r.outbound_clicks / r.impressions > avgCtr * 1.5 && r.outbound_clicks >= 2).slice(0, top);
    const leaky = enriched.filter((r) => r.impressions >= medianImpr && r.impressions > 0 && r.outbound_clicks / r.impressions < avgCtr * 0.5).sort((a, b) => b.impressions - a.impressions).slice(0, top);
    const boards = map.board
        ? Object.values(enriched.reduce((acc, r) => {
            const b = r.board || "(none)";
            acc[b] ??= { board: b, pins: 0, impressions: 0, saves: 0, outbound_clicks: 0 };
            acc[b].pins++;
            acc[b].impressions += r.impressions;
            acc[b].saves += r.saves;
            acc[b].outbound_clicks += r.outbound_clicks;
            return acc;
        }, {})).sort((a, b) => b.outbound_clicks - a.outbound_clicks)
        : null;
    const recommendations = [];
    if (by("outbound_clicks")[0]?.outbound_clicks)
        recommendations.push(`Make 3–5 fresh pin designs for "${by("outbound_clicks")[0].title || by("outbound_clicks")[0].url}". It drives the most outbound clicks.`);
    if (hidden_gems.length)
        recommendations.push(`${hidden_gems.length} pin(s) convert well but get few impressions. Re-pin them to more relevant boards and strengthen keywords in title and description.`);
    if (leaky.length)
        recommendations.push(`${leaky.length} high-impression pin(s) have weak click-through. Test a clearer benefit headline and a stronger call to action in the image.`);
    if (rates.save_rate_pct !== null && rates.save_rate_pct < 1)
        recommendations.push("Save rate is under 1%. Try more 'save-worthy' formats such as checklists, infographics and listicles.");
    if (!map.outbound_clicks)
        recommendations.push("No outbound-clicks column found; export a report that includes Outbound clicks for traffic insights.");
    return { columns_detected: map, totals, rates, top_by_impressions: by("impressions"), top_by_saves: by("saves"), top_by_outbound_clicks: by("outbound_clicks"), hidden_gems, high_reach_low_clicks: leaky, boards, recommendations };
}
