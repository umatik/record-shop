import { Router } from "express";
import type { Multer } from "multer";
import {
  MAX_LABEL_IMAGES,
  type RecordLookupController,
} from "@/controllers/record-lookup.controller.js";
import { authenticationMiddleware } from "@/middleware/authentication.middleware.js";
import { requirePermission } from "@/middleware/permission.middleware.js";
import type { AuthorizationService } from "@/services/authorization.service.js";

/** Pomocnicze endpointy kreatora. Niczego nie zapisują, tylko podpowiadają dane. Montowane pod `/products`. */
export const createRecordLookupRouter = (
  controller: RecordLookupController,
  authorizationService: AuthorizationService,
  upload: Multer,
) => {
  const router = Router();

  const canCreate = [
    authenticationMiddleware,
    requirePermission(authorizationService, "products:create"),
  ];

  /**
   * @openapi
   * /products/lookup/drafts:
   *   get:
   *     summary: List wizard drafts (label photos and wizard state)
   *     security: [{ bearerAuth: [] }]
   *     responses: { '200': { description: Drafts with ordered photos and wizard state } }
   * /products/lookup/drafts/{id}:
   *   parameters:
   *     - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
   *   get:
   *     summary: Resume a wizard draft
   *     security: [{ bearerAuth: [] }]
   *     responses: { '200': { description: Draft with photos and state }, '404': { description: Missing draft } }
   *   put:
   *     summary: Save a wizard draft when the wizard reaches the record details
   *     description: >
   *       Takes pending label photos from the photo lookup (or photos already in this draft) in order,
   *       together with the wizard state. Photos of the draft left out of the list are deleted.
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [photoUploadIds, state]
   *             properties:
   *               photoUploadIds: { type: array, minItems: 1, maxItems: 2, items: { type: string, format: uuid } }
   *               state: { type: object, description: Wizard state, stored as is }
   *     responses:
   *       '200': { description: Saved draft }
   *       '400': { description: Invalid body, or photos expired or already used }
   *   delete:
   *     summary: Delete a wizard draft with its photos
   *     security: [{ bearerAuth: [] }]
   *     responses: { '204': { description: Deleted }, '404': { description: Missing draft } }
   */
  router.get("/lookup/drafts", ...canCreate, controller.listDrafts);
  router.get("/lookup/drafts/:id", ...canCreate, controller.getDraft);
  router.put("/lookup/drafts/:id", ...canCreate, controller.saveDraft);
  router.delete("/lookup/drafts/:id", ...canCreate, controller.deleteDraft);

  /**
   * @openapi
   * /products/lookup/photo:
   *   post:
   *     tags: [Products – wizard]
   *     summary: Read a label photo with Claude and find matching releases on Discogs
   *     description: >-
   *       Returns what was read from the label (`reading`, used for "none of these, enter manually"), up to 10
   *       Discogs `candidates` (search order, stopping at the first hit: catalog number + label, catalog number,
   *       title with each read artist (up to 3), title + label, title alone) and
   *       `photoUploadIds`: the photos are kept for 24 hours; pass them as `photoUploadIds` when creating the
   *       variant and the first one becomes its primary photo. Discogs images are not used.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [images]
   *             properties:
   *               images:
   *                 type: array
   *                 maxItems: 2
   *                 description: 1–2 label photos (JPEG, PNG or WebP, max 5 MB each)
   *                 items:
   *                   type: string
   *                   format: binary
   *     responses:
   *       200:
   *         description: Label read; candidates may be empty
   *       400:
   *         description: Missing, too many, too large or unsupported photos
   *       502:
   *         description: >-
   *           Claude or Discogs failed. The photos are still kept: `photoUploadIds` is returned so the wizard can
   *           continue with manual entry and attach the photo.
   *       503:
   *         description: Claude or Discogs is not configured; `photoUploadIds` is returned as for 502
   */
  router.post(
    "/lookup/photo",
    ...canCreate,
    upload.array("images", MAX_LABEL_IMAGES),
    controller.lookupByPhoto,
  );

  /**
   * @openapi
   * /products/lookup:
   *   get:
   *     tags: [Products – wizard]
   *     summary: Find releases on Discogs without a photo (catalog number, label, artist, title)
   *     description: >-
   *       For a typed or corrected label reading. At least one of catalogNumber, artist or title is required;
   *       empty values are ignored. Same search order as POST /products/lookup/photo.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: catalogNumber
   *         required: false
   *         schema: { type: string }
   *       - in: query
   *         name: label
   *         schema: { type: string }
   *       - in: query
   *         name: artist
   *         description: One or more artists separated by commas
   *         schema: { type: string }
   *       - in: query
   *         name: title
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Candidates (may be empty)
   *       400:
   *         description: None of catalogNumber, artist or title given
   *       503:
   *         description: Discogs is not configured
   */
  router.get("/lookup", ...canCreate, controller.searchReleases);

  /**
   * @openapi
   * /products/lookup/releases/{releaseId}:
   *   get:
   *     tags: [Products – wizard]
   *     summary: Discogs release mapped to the product form (title, artists, tracklist, preview links, pressing)
   *     description: Condition, price and quantity are not included; the admin fills them in.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: releaseId
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: Form draft (`draft`) and products it may belong to (`existingProducts`)
   *       404:
   *         description: Release not found on Discogs
   *       503:
   *         description: Discogs is not configured
   */
  router.get("/lookup/releases/:releaseId", ...canCreate, controller.getReleaseDraft);

  /**
   * @openapi
   * /products/lookup/existing:
   *   get:
   *     tags: [Products – wizard]
   *     summary: Find products the record being added already belongs to
   *     description: >-
   *       A product is an album, so a new copy or pressing should usually become a variant of an existing
   *       product. Matches (strongest first): same Discogs release (`discogs_release`), same catalog number,
   *       optionally with the label (`catalog_number`, ignores case, spaces and dashes), same Discogs master
   *       release (`discogs_master`, any pressing of the same recording), same title (side A only, before
   *       "/") with one of the artists, by name without Discogs suffixes or by Discogs artist id (`title_artist`). `matchingVariantIds` are variants of the same pressing, e.g. to raise
   *       the quantity instead of adding a variant. Also returned by GET /products/lookup/releases/{releaseId}.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - { in: query, name: discogsReleaseId, schema: { type: integer } }
   *       - { in: query, name: catalogNumber, schema: { type: string } }
   *       - { in: query, name: label, schema: { type: string } }
   *       - { in: query, name: title, schema: { type: string } }
   *       - { in: query, name: artist, schema: { type: string } }
   *       - { in: query, name: discogsMasterId, schema: { type: integer } }
   *       - { in: query, name: discogsArtistId, schema: { type: integer } }
   *     responses:
   *       200:
   *         description: "`existingProducts` (up to 10, may be empty)"
   *       400:
   *         description: None of discogsReleaseId, catalogNumber, discogsMasterId or title given
   */
  router.get("/lookup/existing", ...canCreate, controller.findExistingProducts);

  /**
   * @openapi
   * /products/lookup/condition-note:
   *   post:
   *     tags: [Products – wizard]
   *     summary: Translate a Polish condition note into English and Spanish with Claude
   *     description: Saves nothing; the admin confirms or edits the translation before saving the variant.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [text]
   *             properties:
   *               text:
   *                 type: string
   *                 maxLength: 1000
   *           example:
   *             text: Lekki trzask na stronie B, okładka z przetarciem
   *     responses:
   *       200:
   *         description: "`conditionNote` as { en, es, pl }"
   *       503:
   *         description: Claude is not configured
   */
  router.post("/lookup/condition-note", ...canCreate, controller.translateConditionNote);

  /**
   * @openapi
   * /products/{id}/variants/{variantId}/discogs-cover:
   *   post:
   *     tags: [Products – wizard]
   *     summary: Add the Discogs cover of the variant's release as a variant photo
   *     description: >-
   *       Uses the variant's `discogsReleaseId`, takes the release's primary image (or the first one) and saves
   *       it as the next photo of the variant. It becomes the primary photo when the variant has no photos.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - { in: path, name: id, required: true, schema: { type: integer } }
   *       - { in: path, name: variantId, required: true, schema: { type: integer } }
   *     responses:
   *       201:
   *         description: The created media
   *       400:
   *         description: Invalid ids or the variant has no discogsReleaseId
   *       404:
   *         description: Variant not found, or Discogs has no cover for the release
   *       409:
   *         description: The variant already has the Discogs cover (photo with alt "Okładka z Discogs")
   *       502:
   *         description: Discogs failed
   *       503:
   *         description: Discogs is not configured
   */
  router.post(
    "/:id/variants/:variantId/discogs-cover",
    authenticationMiddleware,
    requirePermission(authorizationService, "products:update"),
    controller.addDiscogsCover,
  );

  return router;
};
