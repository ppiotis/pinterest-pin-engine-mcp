import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const sampleAnalytics = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "examples", "pinterest-analytics-sample.csv"), "utf8");
export const brief = {
  product_name: "Minimalist Wedding Budget Planner",
  product_type: "budget planner",
  keywords: ["wedding budget planner", "wedding planning checklist", "wedding budget spreadsheet"],
  audience: "brides",
  benefits: ["Keeping wedding costs under control"],
  digital: true,
};
export const pinRows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    title: `Wedding budget pin ${i + 1}`,
    media_url: `https://cdn.example.com/pins/${i + 1}.png`,
    board: ["Wedding Budget Planner", "Wedding Planning Tips", "Wedding Budget Planner/Templates"][i % 3],
    description: "Wedding budget planner for brides.",
    link: `https://shop.example.com/p/${i % 2}`,
    keywords: ["wedding budget planner", "wedding planning"],
  }));
