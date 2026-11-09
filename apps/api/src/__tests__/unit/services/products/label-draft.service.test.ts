import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { PoolClient } from "pg";
import { LabelDraftService } from "@/services/label-draft.service.js";
import type { Database } from "@/database/database.interface.js";
import type { Storage } from "@/storage/storage.interface.js";
import type {
  LabelDraft,
  LabelDraftRepository,
} from "@/repositories/label-draft/label-draft.interface.js";
import type { RecordLookupService } from "@/services/record-lookup.service.js";
import { PhotoLookupError } from "@/errors/external-service.error.js";
import { LabelDraftConflictError, LabelDraftNotFoundError } from "@/errors/label-draft.error.js";

const DRAFT_ID = "c192ab28-aa58-48e9-b0c9-b7c7780b25c0";
const photo = (id: string) => ({ id, path: `products/photo/label-${id}.jpg`, contentType: "image/jpeg" as const });
const image = { data: Buffer.from("label"), mediaType: "image/jpeg" as const };
const draft = (photos = [photo("a")]): LabelDraft => ({ id: DRAFT_ID, photos, result: null, createdAt: new Date() });

describe("LabelDraftService", () => {
  let drafts: jest.Mocked<LabelDraftRepository>;
  let storage: jest.Mocked<Storage>;
  let mockClient: { query: jest.Mock; release: jest.Mock };
  let client: PoolClient;
  let readLabelPhotos: jest.Mock<RecordLookupService["readLabelPhotos"]>;
  let service: LabelDraftService;

  beforeEach(() => {
    drafts = {
      list: jest.fn(),
      lock: jest.fn(),
      deletePhotos: jest.fn(),
      addPhoto: jest.fn(),
      saveResult: jest.fn(),
      deleteAbandoned: jest.fn<LabelDraftRepository["deleteAbandoned"]>().mockResolvedValue([]),
    };
    storage = {
      save: jest.fn<Storage["save"]>(async (_file, filename) => filename),
      read: jest.fn<Storage["read"]>(async () => Buffer.from("label")),
      delete: jest.fn<Storage["delete"]>(async () => undefined),
      exists: jest.fn(),
    };
    mockClient = { query: jest.fn(), release: jest.fn() };
    client = mockClient as unknown as PoolClient;
    const pool: Database = { connect: async () => client };
    readLabelPhotos = jest.fn<RecordLookupService["readLabelPhotos"]>();
    service = new LabelDraftService(drafts, storage, pool, { readLabelPhotos });
  });

  describe("get", () => {
    it("throws 404 for a missing draft", async () => {
      drafts.list.mockResolvedValue([]);

      await expect(service.get(DRAFT_ID)).rejects.toBeInstanceOf(LabelDraftNotFoundError);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe("replace", () => {
    it("swaps the photos in a transaction and deletes the old files after commit", async () => {
      drafts.lock.mockResolvedValue([photo("a")]);

      const result = await service.replace(DRAFT_ID, ["a"], [image], 7);

      expect(drafts.deletePhotos).toHaveBeenCalledWith(client, DRAFT_ID);
      expect(drafts.addPhoto).toHaveBeenCalledWith(
        client,
        expect.objectContaining({ draftId: DRAFT_ID, position: 0, createdBy: 7, contentType: "image/jpeg" }),
      );
      expect(result.photos).toHaveLength(1);
      expect(mockClient.query.mock.calls.map(([sql]) => sql)).toEqual(["BEGIN", "COMMIT"]);
      expect(storage.delete).toHaveBeenCalledWith("products/photo/label-a.jpg");
    });

    it("rejects a stale photo list and keeps the files", async () => {
      drafts.lock.mockResolvedValue([photo("a"), photo("b")]);

      await expect(service.replace(DRAFT_ID, ["a"], [image], 7)).rejects.toBeInstanceOf(
        LabelDraftConflictError,
      );
      expect(mockClient.query).toHaveBeenLastCalledWith("ROLLBACK");
      expect(storage.save).not.toHaveBeenCalled();
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it("removes the files of abandoned drafts", async () => {
      drafts.deleteAbandoned.mockResolvedValue([photo("old")]);
      drafts.lock.mockResolvedValue([]);

      await service.replace(DRAFT_ID, [], [image], null);

      expect(storage.delete).toHaveBeenCalledWith("products/photo/label-old.jpg");
    });

    it("deletes newly saved files when the insert fails", async () => {
      drafts.lock.mockResolvedValue([]);
      drafts.addPhoto.mockRejectedValue(new Error("db down"));

      await expect(service.replace(DRAFT_ID, [], [image], null)).rejects.toThrow("db down");
      expect(storage.delete).toHaveBeenCalledWith(storage.save.mock.calls[0]![1]);
    });
  });

  describe("read", () => {
    it("reads the stored photos and remembers the result", async () => {
      drafts.list.mockResolvedValue([draft()]);
      readLabelPhotos.mockResolvedValue({ reading: {} as never, candidates: [], photoUploadIds: ["a"] });

      const result = await service.read(DRAFT_ID, ["a"]);

      expect(readLabelPhotos).toHaveBeenCalledWith([image], ["a"]);
      expect(result.kind).toBe("found");
      expect(drafts.saveResult).toHaveBeenCalledWith(client, "a", result);
    });

    it("turns a failed lookup into a `failed` result", async () => {
      drafts.list.mockResolvedValue([draft()]);
      readLabelPhotos.mockRejectedValue(new PhotoLookupError(new Error("Claude down"), ["a"]));

      const result = await service.read(DRAFT_ID, ["a"]);

      expect(result).toMatchObject({ kind: "failed", reading: null, photoUploadIds: ["a"] });
      expect(drafts.saveResult).toHaveBeenCalled();
    });

    it("rejects photos the panel has not seen", async () => {
      drafts.list.mockResolvedValue([draft()]);

      await expect(service.read(DRAFT_ID, ["b"])).rejects.toBeInstanceOf(LabelDraftConflictError);
      expect(readLabelPhotos).not.toHaveBeenCalled();
    });
  });
});
