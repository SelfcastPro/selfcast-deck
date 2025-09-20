import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const readFileMock = vi.fn();
const writeFileMock = vi.fn();

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: readFileMock,
    writeFile: writeFileMock,
  },
  readFile: readFileMock,
  writeFile: writeFileMock,
}));

const importCleaner = () => import("../clean-jobs.mjs");
const OUTPUT_PATH = "radar/jobs/live/jobs.json";

describe("clean-jobs.mjs", () => {
  beforeEach(() => {
    vi.resetModules();
    readFileMock.mockReset();
    writeFileMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("filterer gamle opslag og bruger importedAt som fallback", async () => {
    const now = new Date("2024-02-01T00:00:00.000Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);

    readFileMock.mockResolvedValue(
      JSON.stringify({
        items: [
          { id: "recent", postDate: "2024-01-20T12:00:00.000Z" },
          { id: "old", postDate: "2023-12-01T12:00:00.000Z" },
          { id: "fallback", importedAt: "2024-01-25T08:00:00.000Z" },
          { id: "missingDates" },
        ],
      })
    );
    writeFileMock.mockResolvedValue();

    await importCleaner();

    expect(writeFileMock).toHaveBeenCalledTimes(1);
    const [target, payload] = writeFileMock.mock.calls[0];
    expect(target).toBe(OUTPUT_PATH);

    const result = JSON.parse(payload);
    expect(result.items.map((x) => x.id)).toEqual(["fallback", "recent"]);
  });

  it("beholder første opslag ved dubletter", async () => {
    const now = new Date("2024-01-31T00:00:00.000Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);

    readFileMock.mockResolvedValue(
      JSON.stringify({
        items: [
          { id: "dup", postDate: "2024-01-20T10:00:00.000Z", title: "Original" },
          { id: "dup", postDate: "2024-01-21T10:00:00.000Z", title: "Duplicate" },
        ],
      })
    );
    writeFileMock.mockResolvedValue();

    await importCleaner();

    const [, payload] = writeFileMock.mock.calls[0];
    const result = JSON.parse(payload);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ id: "dup", title: "Original" });
  });

  it("sorterer resultater efter nyeste postDate/importedAt", async () => {
    const now = new Date("2024-02-05T00:00:00.000Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);

    readFileMock.mockResolvedValue(
      JSON.stringify({
        items: [
          { id: "alpha", postDate: "2024-01-10T09:00:00.000Z" },
          { id: "beta", importedAt: "2024-01-28T09:00:00.000Z" },
          { id: "gamma", postDate: "2024-01-20T09:00:00.000Z" },
        ],
      })
    );
    writeFileMock.mockResolvedValue();

    await importCleaner();

    const [, payload] = writeFileMock.mock.calls[0];
    const result = JSON.parse(payload);

    expect(result.items.map((x) => x.id)).toEqual(["beta", "gamma", "alpha"]);
  });
});
