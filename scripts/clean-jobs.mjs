import fs from "node:fs/promises";
import { jest } from "@jest/globals";

// mock filsystem
jest.mock("node:fs/promises");

const cleanJobs = async () => {
  await import("../clean-jobs.mjs");
};

describe("clean-jobs.mjs", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("fjerner dubletter og holder kun jobs < 30 dage", async () => {
    const now = Date.now();
    const sample = {
      items: [
        { id: "1", postDate: new Date(now - 10 * 86400000).toISOString() }, // valid
        { id: "1", postDate: new Date(now - 5 * 86400000).toISOString() },  // dublet
        { id: "2", postDate: new Date(now - 40 * 86400000).toISOString() }, // for gammel
      ],
    };

    fs.readFile.mockResolvedValue(JSON.stringify(sample));
    fs.writeFile.mockResolvedValue();

    await cleanJobs();

    expect(fs.writeFile).toHaveBeenCalled();
    const [, written] = fs.writeFile.mock.calls[0];
    const json = JSON.parse(written);
    expect(json.items).toHaveLength(1);
    expect(json.items[0].id).toBe("1");
  });
});
