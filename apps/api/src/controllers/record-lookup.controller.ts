import type { Request, Response } from "express";
import { z } from "zod";
import type { RecordLookupService } from "@/services/record-lookup.service.js";
import type { LabelImage } from "@/integrations/claude/label-reader.js";
import type { AuthenticatedRequest } from "@/middleware/authentication.middleware.js";
import { parseId } from "@/validators/helpers/id.validator.js";
import { AppError } from "@/errors/app.error.js";
import type { LabelDraftService } from "@/services/label-draft.service.js";
import { PhotoLookupError } from "@/errors/external-service.error.js";
import type { ProductService } from "@/services/product.service.js";
import { formatZodIssues } from "@/validators/helpers/zod.js";
import type { ProductVariantMediaService } from "@/services/product-variant-media.service.js";

/** Opis okładki z Discogs; po nim rozpoznajemy, że wariant już ją ma (panel ukrywa wtedy przycisk). */
export const DISCOGS_COVER_ALT = "Okładka z Discogs";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Limit Claude dla jednego obrazu przesłanego jako base64. */
export const MAX_LABEL_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_LABEL_IMAGES = 2;

/**
 * Wyszukiwanie wydań bez zdjęcia, np. po poprawieniu odczytu w kreatorze. Wystarczy numer katalogowy,
 * artysta albo tytuł; puste pola są pomijane. Kilku artystów rozdziela się przecinkiem.
 */
const releaseSearchQuerySchema = z
  .object({
    catalogNumber: z.string().trim().max(100).optional(),
    label: z.string().trim().max(255).optional(),
    artist: z.string().trim().max(500).optional(),
    title: z.string().trim().max(255).optional(),
  })
  .refine((query) => Boolean(query.catalogNumber || query.artist || query.title), {
    message: "Give a catalog number, an artist or a title",
    path: ["catalogNumber"],
  });

const existingProductsQuerySchema = z
  .object({
    discogsReleaseId: z.coerce.number().int().positive().optional(),
    catalogNumber: z.string().trim().min(1).max(100).optional(),
    label: z.string().trim().min(1).max(255).optional(),
    title: z.string().trim().min(1).max(255).optional(),
    artist: z.string().trim().min(1).max(255).optional(),
    discogsMasterId: z.coerce.number().int().positive().optional(),
    discogsArtistId: z.coerce.number().int().positive().optional(),
  })
  .refine(
    (query) =>
      query.discogsReleaseId !== undefined ||
      query.catalogNumber !== undefined ||
      query.title !== undefined ||
      query.discogsMasterId !== undefined,
    { message: "Provide discogsReleaseId, catalogNumber, discogsMasterId or title" },
  );

const conditionNoteSchema = z.strictObject({
  text: z.string().trim().min(1).max(1000),
});

function draftId(req: Request) {
  const parsed = z.uuid().safeParse(req.params.id);

  if (!parsed.success) {
    throw new AppError("Invalid draft id", 400);
  }

  return parsed.data;
}

/** Zdjęcia labelu w kolejności i stan kreatora, który panel odtworzy po powrocie do szkicu. */
const saveDraftSchema = z.strictObject({
  photoUploadIds: z
    .array(z.uuid())
    .min(1)
    .max(MAX_LABEL_IMAGES)
    .refine((ids) => new Set(ids).size === ids.length, { message: "Photo ids must be unique" }),
  state: z.record(z.string(), z.unknown()),
});

export class RecordLookupController {
  constructor(
    private readonly recordLookupService: RecordLookupService,
    private readonly productService: ProductService,
    private readonly drafts: LabelDraftService,
    private readonly media: ProductVariantMediaService,
  ) {}

  /** Okładka wydania z Discogs (po `discogsReleaseId` wariantu) jako kolejne zdjęcie wariantu. */
  addDiscogsCover = async (req: Request, res: Response) => {
    const productId = parseId(req.params.id);
    const variantId = parseId(req.params.variantId);

    if (productId === null || variantId === null) {
      res.status(400).json({ message: "Invalid product or variant id" });
      return;
    }

    const variant = await this.productService.findVariant(productId, variantId);

    if (!variant) {
      res.status(404).json({ message: "Product variant not found" });
      return;
    }

    const releaseId = variant.attributes.discogsReleaseId;

    if (typeof releaseId !== "number") {
      res.status(400).json({ message: "The variant is not linked to a Discogs release" });
      return;
    }

    const cover = await this.recordLookupService.getReleaseCover(releaseId);

    if (!cover) {
      res.status(404).json({ message: "Discogs has no cover for this release" });
      return;
    }

    const photos = variant.media.filter((media) => media.type === "photo");

    if (photos.some((photo) => photo.alt === DISCOGS_COVER_ALT)) {
      res.status(409).json({ message: "The variant already has the Discogs cover" });
      return;
    }

    const media = await this.media.create(
      variantId,
      cover.data,
      `discogs-${releaseId}.${cover.contentType.split("/")[1]}`,
      cover.contentType,
      DISCOGS_COVER_ALT,
      photos.reduce((max, photo) => Math.max(max, photo.sortOrder), 0) + 1,
      // Pierwsze zdjęcie wariantu staje się główne, tak jak zdjęcie labelu z kreatora.
      photos.length === 0,
    );

    res.status(201).json(media);
  };

  listDrafts = async (_req: Request, res: Response) => {
    res.json({ drafts: await this.drafts.list() });
  };

  getDraft = async (req: Request, res: Response) => {
    res.json(await this.drafts.get(draftId(req)));
  };

  saveDraft = async (req: Request, res: Response) => {
    const parsed = saveDraftSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ message: "Invalid draft", errors: formatZodIssues(parsed.error) });
      return;
    }

    res.json(await this.drafts.save(draftId(req), parsed.data.photoUploadIds, parsed.data.state));
  };

  deleteDraft = async (req: Request, res: Response) => {
    await this.drafts.delete(draftId(req));
    res.status(204).send();
  };

  lookupByPhoto = async (req: Request, res: Response) => {
    const files = Array.isArray(req.files) ? req.files : [];

    if (files.length === 0 || files.length > MAX_LABEL_IMAGES) {
      res.status(400).json({
        message: `Send 1–${MAX_LABEL_IMAGES} label photos in the "images" field`,
      });
      return;
    }

    const images: LabelImage[] = [];

    for (const file of files) {
      const mediaType = IMAGE_TYPES.find((type) => type === file.mimetype);

      if (!mediaType) {
        res.status(400).json({ message: "Label photos must be JPEG, PNG or WebP" });
        return;
      }

      if (file.size > MAX_LABEL_IMAGE_BYTES) {
        res.status(400).json({ message: "Each label photo can be at most 5 MB" });
        return;
      }

      images.push({ data: file.buffer, mediaType });
    }

    const userId = (req as AuthenticatedRequest).user?.userId;

    try {
      const result = await this.recordLookupService.lookupByPhoto(
        images,
        userId ? Number(userId) : null,
      );

      res.status(200).json({ message: "Label read", ...result });
    } catch (error) {
      if (error instanceof PhotoLookupError) {
        // Zdjęcia są zapisane, więc kreator może przejść do formularza ręcznego z tym zdjęciem.
        res.status(error.statusCode).json({
          message: error.message,
          photoUploadIds: error.photoUploadIds,
        });
        return;
      }

      throw error;
    }
  };

  searchReleases = async (req: Request, res: Response) => {
    const parsed = releaseSearchQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid query parameters",
        errors: formatZodIssues(parsed.error),
      });
      return;
    }

    const { catalogNumber, label, artist, title } = parsed.data;
    const candidates = await this.recordLookupService.searchReleases({
      catno: catalogNumber || undefined,
      label: label || undefined,
      artists: artist ? artist.split(",") : [],
      releaseTitle: title || undefined,
    });

    res.status(200).json({ message: "Releases found", candidates });
  };

  getReleaseDraft = async (req: Request, res: Response) => {
    const releaseId = parseId(req.params.releaseId);

    if (releaseId === null) {
      res.status(400).json({ message: "Invalid release id" });
      return;
    }

    const draft = await this.recordLookupService.getReleaseDraft(releaseId);

    if (!draft) {
      res.status(404).json({ message: "Release not found on Discogs" });
      return;
    }

    // Produkt to album: ten sam album w innym tłoczeniu też powinien trafić jako wariant do istniejącego produktu.
    const existingProducts = await this.productService.findMatchingProducts({
      discogsReleaseId: draft.variant.attributes.discogsReleaseId,
      catalogNumber: draft.variant.attributes.catalogNumber,
      label: draft.variant.attributes.label,
      title: draft.product.title,
      artists: draft.product.attributes.artists,
      discogsMasterId: draft.product.attributes.discogsMasterId,
      discogsArtistIds: draft.product.attributes.discogsArtistIds,
    });

    res.status(200).json({ message: "Release found", draft, existingProducts });
  };

  findExistingProducts = async (req: Request, res: Response) => {
    const parsed = existingProductsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid query parameters",
        errors: formatZodIssues(parsed.error),
      });
      return;
    }

    const { artist, discogsArtistId, ...criteria } = parsed.data;

    const existingProducts = await this.productService.findMatchingProducts({
      ...criteria,
      artists: artist ? [artist] : undefined,
      discogsArtistIds: discogsArtistId ? [discogsArtistId] : undefined,
    });

    res.status(200).json({ message: "Existing products found", existingProducts });
  };

  translateConditionNote = async (req: Request, res: Response) => {
    const parsed = conditionNoteSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid condition note",
        errors: formatZodIssues(parsed.error),
      });
      return;
    }

    const conditionNote = await this.recordLookupService.translateConditionNote(
      parsed.data.text,
    );

    res.status(200).json({ message: "Condition note translated", conditionNote });
  };
}
