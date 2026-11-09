import { z } from "zod";
import { ExternalServiceError } from "@/errors/external-service.error.js";

/**
 * Odpowiedzi Discogs sprawdzamy luźnymi schematami: wszystkie pola są opcjonalne, nieznane są pomijane,
 * dzięki czemu zmiana po stronie Discogs nie wywraca importu, a tylko zostawia puste pole w formularzu.
 */
const optionalText = z.string().optional().catch(undefined);
const optionalNumber = z.number().optional().catch(undefined);

const searchResultSchema = z.object({
  id: z.number(),
  title: optionalText,
  thumb: optionalText,
  cover_image: optionalText,
  year: z.union([z.string(), z.number()]).optional().catch(undefined),
  country: optionalText,
  catno: optionalText,
  label: z.array(z.string()).optional().catch(undefined),
  format: z.array(z.string()).optional().catch(undefined),
});

const searchResponseSchema = z.object({
  results: z.array(z.unknown()).default([]),
});

const namedSchema = z.object({
  /** Numer artysty na Discogs: ten sam także przy innej nazwie na wydaniu („I Jahman*” = „Ijahman Levi”). */
  id: optionalNumber,
  name: z.string(),
  anv: optionalText,
  join: optionalText,
  role: optionalText,
});

const releaseSchema = z.object({
  id: z.number(),
  /** „Master release”: wspólny numer wszystkich wydań tego samego nagrania (tłoczenia, reedycje). */
  master_id: optionalNumber,
  title: optionalText,
  year: optionalNumber,
  country: optionalText,
  notes: optionalText,
  artists: z.array(namedSchema).optional().catch(undefined),
  extraartists: z.array(namedSchema).optional().catch(undefined),
  labels: z
    .array(z.object({ name: z.string(), catno: optionalText }))
    .optional()
    .catch(undefined),
  formats: z
    .array(
      z.object({
        name: optionalText,
        qty: optionalText,
        descriptions: z.array(z.string()).optional().catch(undefined),
      }),
    )
    .optional()
    .catch(undefined),
  tracklist: z
    .array(
      z.object({
        position: optionalText,
        title: optionalText,
        duration: optionalText,
        type_: optionalText,
        artists: z.array(namedSchema).optional().catch(undefined),
      }),
    )
    .optional()
    .catch(undefined),
  videos: z
    .array(z.object({ uri: z.string(), title: optionalText }))
    .optional()
    .catch(undefined),
  /** Zdjęcia wydania; okładka ma zwykle typ „primary”. */
  images: z
    .array(z.object({ type: optionalText, uri: z.string() }))
    .optional()
    .catch(undefined),
});

export type DiscogsSearchResult = z.infer<typeof searchResultSchema>;
export type DiscogsRelease = z.infer<typeof releaseSchema>;

/** Pobrany obraz z Discogs. */
export type DiscogsImage = {
  data: Buffer;
  contentType: "image/jpeg" | "image/png" | "image/webp";
};

const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** Okładki z Discogs mają zwykle kilkaset kB; większy plik to coś nieoczekiwanego. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type DiscogsSearchParams = {
  catno?: string | undefined;
  label?: string | undefined;
  artist?: string | undefined;
  releaseTitle?: string | undefined;
};

export interface DiscogsClient {
  /** Wyszukuje wydania winylowe; zwraca najwyżej `limit` wyników. */
  search(params: DiscogsSearchParams, limit?: number): Promise<DiscogsSearchResult[]>;

  /** Szczegóły wydania albo `null`, gdy Discogs go nie zna. */
  getRelease(releaseId: number): Promise<DiscogsRelease | null>;

  /** Pobiera obraz z serwera zdjęć Discogs (adres z `images[].uri` wydania). */
  downloadImage(url: string): Promise<DiscogsImage>;
}

const BASE_URL = "https://api.discogs.com";

/** Klient API Discogs z osobistym tokenem (limit Discogs: ok. 60 zapytań na minutę). */
export class HttpDiscogsClient implements DiscogsClient {
  constructor(
    private readonly token: string,
    private readonly userAgent: string,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly timeoutMs = 10_000,
  ) {}

  async search(
    params: DiscogsSearchParams,
    limit = 10,
  ): Promise<DiscogsSearchResult[]> {
    const query = new URLSearchParams({
      type: "release",
      format: "Vinyl",
      per_page: String(limit),
    });

    const fields: [string, string | undefined][] = [
      ["catno", params.catno],
      ["label", params.label],
      ["artist", params.artist],
      ["release_title", params.releaseTitle],
    ];

    for (const [key, value] of fields) {
      if (value) {
        query.set(key, value);
      }
    }

    const body = await this.request(`/database/search?${query.toString()}`);
    const parsed = searchResponseSchema.safeParse(body);

    if (!parsed.success) {
      throw new ExternalServiceError("Discogs returned an unexpected search format");
    }

    return parsed.data.results.flatMap((item) => {
      const parsed = searchResultSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
  }

  async getRelease(releaseId: number): Promise<DiscogsRelease | null> {
    const body = await this.request(`/releases/${releaseId}`, true);

    if (body === null) {
      return null;
    }

    const parsed = releaseSchema.safeParse(body);

    if (!parsed.success) {
      throw new ExternalServiceError("Discogs returned an unexpected release format");
    }

    return parsed.data;
  }

  async downloadImage(url: string): Promise<DiscogsImage> {
    // Tylko serwer zdjęć Discogs: adres pochodzi z odpowiedzi Discogs, ale nie chcemy pobierać czegokolwiek.
    if (new URL(url).hostname !== "i.discogs.com") {
      throw new ExternalServiceError("Discogs returned an unexpected image address");
    }

    let response: Response;

    try {
      response = await this.fetchFn(url, {
        headers: { "User-Agent": this.userAgent },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new ExternalServiceError("Discogs is not reachable", error);
    }

    if (!response.ok) {
      throw new ExternalServiceError(`Discogs image server responded with ${response.status}`);
    }

    const contentType = IMAGE_CONTENT_TYPES.find(
      (type) => type === response.headers.get("content-type")?.split(";")[0]?.trim(),
    );

    if (!contentType) {
      throw new ExternalServiceError("Discogs returned an unsupported image type");
    }

    const data = Buffer.from(await response.arrayBuffer());

    if (data.length === 0 || data.length > MAX_IMAGE_BYTES) {
      throw new ExternalServiceError("Discogs returned an empty or too large image");
    }

    return { data, contentType };
  }

  private async request(path: string, allowNotFound = false): Promise<unknown> {
    let response: Response;

    try {
      response = await this.fetchFn(`${BASE_URL}${path}`, {
        headers: {
          Authorization: `Discogs token=${this.token}`,
          "User-Agent": this.userAgent,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new ExternalServiceError("Discogs is not reachable", error);
    }

    if (allowNotFound && response.status === 404) {
      return null;
    }

    if (response.status === 429) {
      throw new ExternalServiceError("Discogs rate limit reached, try again in a minute");
    }

    if (!response.ok) {
      throw new ExternalServiceError(`Discogs responded with ${response.status}`);
    }

    try {
      return await response.json();
    } catch (error) {
      throw new ExternalServiceError("Discogs returned invalid JSON", error);
    }
  }
}
