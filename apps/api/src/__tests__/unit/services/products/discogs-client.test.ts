import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { HttpDiscogsClient } from "@/integrations/discogs/discogs-client.js";
import { ExternalServiceError } from "@/errors/external-service.error.js";

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("HttpDiscogsClient", () => {
  let fetchFn: jest.Mock<typeof fetch>;
  let client: HttpDiscogsClient;

  beforeEach(() => {
    fetchFn = jest.fn<typeof fetch>();
    client = new HttpDiscogsClient("secret-token", "RasBassShop/1.0", fetchFn);
  });

  it("should search vinyl releases with the token and user agent", async () => {
    fetchFn.mockResolvedValue(
      jsonResponse({
        results: [
          { id: 1, title: "A - B", catno: "ZV-7-006", label: ["Zulu Vibes"] },
          { title: "result without id is skipped" },
        ],
      }),
    );

    const results = await client.search({ catno: "ZV-7-006", label: "Zulu Vibes" }, 5);

    const [url, init] = fetchFn.mock.calls[0]!;
    const query = new URL(String(url)).searchParams;

    expect(String(url)).toMatch(/^https:\/\/api\.discogs\.com\/database\/search\?/);
    expect(Object.fromEntries(query)).toEqual({
      type: "release",
      format: "Vinyl",
      per_page: "5",
      catno: "ZV-7-006",
      label: "Zulu Vibes",
    });
    expect(init?.headers).toEqual(
      expect.objectContaining({
        Authorization: "Discogs token=secret-token",
        "User-Agent": "RasBassShop/1.0",
      }),
    );
    expect(results).toEqual([
      expect.objectContaining({ id: 1, catno: "ZV-7-006" }),
    ]);
  });

  it("should report a search response with results that are not a list as an external service error", async () => {
    fetchFn.mockResolvedValue(jsonResponse({ results: null }));

    const search = client.search({ catno: "ZV-7-006" });

    await expect(search).rejects.toBeInstanceOf(ExternalServiceError);
    await expect(search).rejects.toMatchObject({ statusCode: 502 });
  });

  it("should send artist and title as release_title", async () => {
    fetchFn.mockResolvedValue(jsonResponse({ results: [] }));

    await client.search({ artist: "Zulu Vibes", releaseTitle: "Prophetic Dub" });

    const query = new URL(String(fetchFn.mock.calls[0]![0])).searchParams;

    expect(query.get("artist")).toBe("Zulu Vibes");
    expect(query.get("release_title")).toBe("Prophetic Dub");
    expect(query.get("catno")).toBeNull();
  });

  it("should return a release and tolerate unexpected field types", async () => {
    fetchFn.mockResolvedValue(
      jsonResponse({ id: 7, title: "Jah Prophecy", year: "not a number", videos: "oops" }),
    );

    const release = await client.getRelease(7);

    expect(fetchFn.mock.calls[0]![0]).toBe("https://api.discogs.com/releases/7");
    expect(release).toEqual(expect.objectContaining({ id: 7, title: "Jah Prophecy" }));
    expect(release?.year).toBeUndefined();
    expect(release?.videos).toBeUndefined();
  });

  it("should return null for an unknown release", async () => {
    fetchFn.mockResolvedValue(jsonResponse({ message: "Release not found." }, 404));

    expect(await client.getRelease(999)).toBeNull();
  });

  it.each([
    [429, "Discogs rate limit reached, try again in a minute"],
    [500, "Discogs responded with 500"],
  ])("should report HTTP %i", async (status, message) => {
    fetchFn.mockResolvedValue(jsonResponse({}, status));

    await expect(client.search({ catno: "X" })).rejects.toThrow(
      new ExternalServiceError(message),
    );
  });

  it("should report a network failure", async () => {
    fetchFn.mockRejectedValue(new TypeError("fetch failed"));

    await expect(client.getRelease(1)).rejects.toBeInstanceOf(ExternalServiceError);
  });

  describe("downloadImage", () => {
    const imageResponse = (contentType: string, bytes = 3, status = 200) =>
      ({
        ok: status >= 200 && status < 300,
        status,
        headers: new Headers({ "content-type": contentType }),
        arrayBuffer: async () => new ArrayBuffer(bytes),
      }) as Response;

    it("should download an image from the Discogs image server with the user agent", async () => {
      fetchFn.mockResolvedValue(imageResponse("image/jpeg"));

      const image = await client.downloadImage("https://i.discogs.com/abc/cover.jpeg");

      expect(image.contentType).toBe("image/jpeg");
      expect(image.data).toHaveLength(3);
      expect(fetchFn.mock.calls[0]![1]?.headers).toEqual({ "User-Agent": "RasBassShop/1.0" });
    });

    it("should not download from other hosts", async () => {
      await expect(client.downloadImage("https://example.com/cover.jpg")).rejects.toBeInstanceOf(
        ExternalServiceError,
      );
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("should reject unsupported, empty and failed images", async () => {
      fetchFn
        .mockResolvedValueOnce(imageResponse("image/gif"))
        .mockResolvedValueOnce(imageResponse("image/png", 0))
        .mockResolvedValueOnce(imageResponse("image/png", 3, 404));

      for (let i = 0; i < 3; i++) {
        await expect(client.downloadImage("https://i.discogs.com/a.png")).rejects.toBeInstanceOf(
          ExternalServiceError,
        );
      }
    });
  });
});
