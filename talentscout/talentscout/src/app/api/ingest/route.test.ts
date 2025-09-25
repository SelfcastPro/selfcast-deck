  beforeEach(() => {
    process.env.INGEST_TOKEN = TOKEN;
    clearBuffer();
  });

  it("accepts payloads with items nested under data", async () => {
    const payload = {
      data: {
        items: [
          { id: "alpha" },
          { id: "beta" },
        ],
      },
    } satisfies Record<string, unknown>;

    const response = await POST(createRequest(payload));

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ inserted: 2, skipped: 0 });

    const bufferedItems = getBufferEntries().map((entry) => entry.item);
    expect(bufferedItems).toEqual(payload.data.items);
  });

  it("accepts payloads with data arrays", async () => {
    const payload = {
      data: [
        { id: "gamma" },
        { id: "delta" },
      ],
    } satisfies Record<string, unknown>;

    const response = await POST(createRequest(payload));

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ inserted: 2, skipped: 0 });

    const bufferedItems = getBufferEntries().map((entry) => entry.item);
    expect(bufferedItems).toEqual(payload.data);
  });
});
