diff --git a/scripts/clean-jobs.mjs b/scripts/clean-jobs.mjs
index 82b1ed28c69f4647926635ab4e487659bbf621c3..28fbf4b40c5c8dee0b27bf4cf8b5a45fc0ad9b5e 100644
--- a/scripts/clean-jobs.mjs
+++ b/scripts/clean-jobs.mjs
@@ -1,37 +1,28 @@
+// scripts/clean-jobs.mjs
 import fs from "node:fs/promises";
-import { jest } from "@jest/globals";
 
-// mock filsystem
-jest.mock("node:fs/promises");
+const OUTPUT_PATH = "radar/jobs/live/jobs.json";
+const MAX_DAYS_KEEP = 30;
+const agoDays = (iso) => (!iso ? Infinity : (Date.now() - new Date(iso).getTime()) / 86400000);
 
-const cleanJobs = async () => {
-  await import("../clean-jobs.mjs");
-};
+(async () => {
+  const buf = await fs.readFile(OUTPUT_PATH, "utf8");
+  const json = JSON.parse(buf);
+  const map = new Map();
 
-describe("clean-jobs.mjs", () => {
-  beforeEach(() => {
-    jest.resetModules();
-  });
+  for (const it of json.items || []) {
+    if (!it.id) continue;
+    if (!map.has(it.id)) map.set(it.id, it);
+  }
 
-  it("fjerner dubletter og holder kun jobs < 30 dage", async () => {
-    const now = Date.now();
-    const sample = {
-      items: [
-        { id: "1", postDate: new Date(now - 10 * 86400000).toISOString() }, // valid
-        { id: "1", postDate: new Date(now - 5 * 86400000).toISOString() },  // dublet
-        { id: "2", postDate: new Date(now - 40 * 86400000).toISOString() }, // for gammel
-      ],
-    };
+  const items = Array.from(map.values())
+    .filter((x) => agoDays(x.postDate || x.importedAt) <= MAX_DAYS_KEEP)
+    .sort((a, b) => new Date(b.postDate || b.importedAt) - new Date(a.postDate || a.importedAt));
 
-    fs.readFile.mockResolvedValue(JSON.stringify(sample));
-    fs.writeFile.mockResolvedValue();
-
-    await cleanJobs();
-
-    expect(fs.writeFile).toHaveBeenCalled();
-    const [, written] = fs.writeFile.mock.calls[0];
-    const json = JSON.parse(written);
-    expect(json.items).toHaveLength(1);
-    expect(json.items[0].id).toBe("1");
-  });
+  const out = { ...json, updatedAt: new Date().toISOString(), items };
+  await fs.writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf8");
+  console.log("Cleaned. Items:", items.length);
+})().catch((e) => {
+  console.error(e);
+  process.exit(1);
 });
