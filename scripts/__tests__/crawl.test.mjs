import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { saveJobs } from "../crawl.mjs";

const withTempFile = async (fn) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crawl-test-"));
  const outFile = path.join(dir, "jobs.json");
  try {
    await fn({ dir, outFile });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

describe("saveJobs", () => {
  it("gemmer jobs når der er nye opslag", async () => {
    await withTempFile(async ({ outFile }) => {
      const result = await saveJobs(
        [
          {
            id: "job-1",
            postDate: "2024-02-01T10:00:00.000Z",
            text: "Første job",
          },
          {
            id: "job-2",
            postDate: "2024-02-02T12:00:00.000Z",
            text: "Andet job",
          },
          {
            id: "job-2",
            postDate: "2024-02-02T12:00:00.000Z",
            text: "Dublet",
          },
        ],
        { outFile }
      );

      expect(result).not.toBeNull();
      expect(result.items.map((item) => item.id)).toEqual(["job-2", "job-1"]);

      const saved = JSON.parse(fs.readFileSync(outFile, "utf8"));
      expect(saved.items).toHaveLength(2);
      expect(saved.items[0].id).toBe("job-2");
    });
  });

  it("bevarer eksisterende fil når dataset er tomt", async () => {
    await withTempFile(async ({ outFile }) => {
      const existing = {
        updatedAt: "2024-01-15T00:00:00.000Z",
        items: [
          {
            id: "existing-job",
            postDate: "2024-01-10T08:00:00.000Z",
            text: "Eksisterende job",
          },
        ],
      };
      fs.writeFileSync(outFile, JSON.stringify(existing, null, 2));
      const original = fs.readFileSync(outFile, "utf8");

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        const result = await saveJobs([], { outFile });
        expect(result).toBeNull();
        expect(fs.readFileSync(outFile, "utf8")).toBe(original);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain("Ingen opslag hentet fra Apify");
      } finally {
        warnSpy.mockRestore();
      }
    });
  });
});
