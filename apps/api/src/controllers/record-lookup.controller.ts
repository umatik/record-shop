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
  })
  .refine(
    (query) =>
      query.discogsReleaseId !== undefined ||
      query.catalogNumber !== undefined ||
      query.title !== undefined,
    { message: "Provide discogsReleaseId, catalogNumber or title" },
  );

const conditionNoteSchema = z.strictObject({
  text: z.string().trim().min(1).max(1000),
});

function parsePhotos(req: Request, allowEmpty = false) {
  const files = Array.isArray(req.files) ? req.files : [];

  if ((!allowEmpty && files.length === 0) || files.length > MAX_LABEL_IMAGES) {
    throw new AppError(`Send 1–${MAX_LABEL_IMAGES} label photos in the "images" field`, 400);
  }

  const images: LabelImage[] = [];

  for (const file of files) {
    const mediaType = IMAGE_TYPES.find((type) => type === file.mimetype);

    if (!mediaType) {
      throw new AppError("Label photos must be JPEG, PNG or WebP", 400);
    }

    if (file.size > MAX_LABEL_IMAGE_BYTES) {
      throw new AppError("Each label photo can be at most 5 MB", 400);
    }

    images.push({ data: file.buffer, mediaType });
  }

  return images;
}

function draftId(req: Request) {
  const parsed = z.uuid().safeParse(req.params.id);

  if (!parsed.success) {
    throw new AppError("Invalid draft id", 400);
  }

  return parsed.data;
}

/** Identyfikatory zdjęć szkicu, które widział panel, po przecinku w kolejności. */
function previousPhotoIds(req: Request) {
  const raw: unknown = req.body?.previous;
  const parsed = z
    .array(z.uuid())
    .max(MAX_LABEL_IMAGES)
    .safeParse(typeof raw === "string" ? raw.split(",").filter(Boolean) : []);

  if (!parsed.success) {
    throw new AppError("Invalid photo ids", 400);
  }

  return parsed.data;
}

export class RecordLookupController {
  constructor(
    private readonly recordLookupService: RecordLookupService,
    private readonly productService: ProductService,
    private readonly drafts: LabelDraftService,
  ) {}

  listDrafts = async (_req: Request, res: Response) => {
    res.json({ drafts: await this.drafts.list() });
  };

  getDraft = async (req: Request, res: Response) => {
    res.json(await this.drafts.get(draftId(req)));
  };

  saveDraft = async (req: Request, res: Response) => {
    const previous = previousPhotoIds(req);
    const photos = parsePhotos(req, previous.length > 0);
    const userId = (req as AuthenticatedRequest).user?.userId;

    res.json(
      await this.drafts.replace(draftId(req), previous, photos, userId ? Number(userId) : null),
    );
  };

  readDraft = async (req: Request, res: Response) => {
    res.json(await this.drafts.read(draftId(req), previousPhotoIds(req)));
  };

  lookupByPhoto = async (req: Request, res: Response) => {
    const images = parsePhotos(req);
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

    const { artist, ...criteria } = parsed.data;

    const existingProducts = await this.productService.findMatchingProducts({
      ...criteria,
      artists: artist ? [artist] : undefined,
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
