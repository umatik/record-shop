import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { PoolClient } from "pg";
import { LabelDraftService } from "@/services/label-draft.service.js";
import type { Database } from "@/database/database.interface.js";
import type { Storage } from "@/storage/storage.interface.js";
import type {
  LabelDraft,
  LabelDraftRepository,
} from "@/repositories/label-draft/label-draft.interface.js";
import {
  LabelDraftNotFoundError,
  LabelDraftPhotosUnavailableError,
} from "@/errors/label-draft.error.js";

const DRAFT_ID = "c192ab28-aa58-48e9-b0c9-b7c7780b25c0";
const photo = (id: string) => ({ id, path: `products/photo/label-${id}.jpg`, contentType: "image/jpeg" });
const state = { details: { title: "News Carrier" } };
const draft = (ids: string[]): LabelDraft => ({
  id: DRAFT_ID,
  photos: ids.map(photo),
  state,
  createdAt: new Date(),
});

describe("LabelDraftService", () => {
  let drafts: jest.Mocked<LabelDraftRepository>;
  let storage: jest.Mocked<Storage>;
  let mockClient: { query: jest.Mock; release: jest.Mock };
  let client: PoolClient;
  let service: LabelDraftService;

  beforeEach(() => {
    drafts = {
      list: jest.fn(),
      lock: jest.fn<LabelDraftRepository["lock"]>().mockResolvedValue([]),
      attachPending: jest.fn<LabelDraftRepository["attachPending"]>(async (_c, _id, ids) => ids),
      saveState: jest.fn(),
      deletePhotos: jest.fn(),
      deleteAbandoned: jest.fn<LabelDraftRepository["deleteAbandoned"]>().mockResolvedValue([]),
    };
    storage = {
      save: jest.fn(),
      copy: jest.fn(),
      delete: jest.fn<Storage["delete"]>(async () => undefined),
      exists: jest.fn(),
    };
    mockClient = { query: jest.fn(), release: jest.fn() };
    client = mockClient as unknown as PoolClient;
    const pool: Database = { connect: async () => client };
    service = new LabelDraftService(drafts, storage, pool);
  });

  describe("get", () => {
    it("throws 404 for a missing draft", async () => {
      drafts.list.mockResolvedValue([]);

      await expect(service.get(DRAFT_ID)).rejects.toBeInstanceOf(LabelDraftNotFoundError);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe("save", () => {
    it("takes pending photos into a new draft with the wizard state", async () => {
      drafts.list.mockResolvedValue([draft(["a", "b"])]);

      const saved = await service.save(DRAFT_ID, ["a", "b"], state);

      expect(drafts.attachPending).toHaveBeenCalledWith(client, DRAFT_ID, ["a", "b"], 24 * 60 * 60 * 1000);
      expect(drafts.saveState).toHaveBeenCalledWith(client, DRAFT_ID, ["a", "b"], state);
      expect(drafts.deletePhotos).not.toHaveBeenCalled();
      expect(mockClient.query.mock.calls.map(([sql]) => sql)).toEqual(["BEGIN", "COMMIT"]);
      expect(saved.photos.map((p) => p.id)).toEqual(["a", "b"]);
    });

    it("keeps photos already in the draft and only updates the state", async () => {
      drafts.lock.mockResolvedValue([photo("a")]);
      drafts.list.mockResolvedValue([draft(["a"])]);

      await service.save(DRAFT_ID, ["a"], state);

      expect(drafts.attachPending).toHaveBeenCalledWith(client, DRAFT_ID, [], expect.any(Number));
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it("replaces photos after a new label lookup and deletes the old files after commit", async () => {
      drafts.lock.mockResolvedValue([photo("a")]);
      drafts.list.mockResolvedValue([draft(["b"])]);

      await service.save(DRAFT_ID, ["b"], state);

      expect(drafts.deletePhotos).toHaveBeenCalledWith(client, DRAFT_ID, ["a"]);
      expect(storage.delete).toHaveBeenCalledWith("products/photo/label-a.jpg");
    });

    it("rejects expired or already used photos and keeps the files", async () => {
      drafts.lock.mockResolvedValue([photo("a")]);
      drafts.attachPending.mockResolvedValue([]);

      await expect(service.save(DRAFT_ID, ["b"], state)).rejects.toBeInstanceOf(
        LabelDraftPhotosUnavailableError,
      );
      expect(mockClient.query).toHaveBeenLastCalledWith("ROLLBACK");
      expect(drafts.saveState).not.toHaveBeenCalled();
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it("removes the files of abandoned drafts", async () => {
      drafts.deleteAbandoned.mockResolvedValue([photo("old")]);
      drafts.list.mockResolvedValue([draft(["a"])]);

      await service.save(DRAFT_ID, ["a"], state);

      expect(storage.delete).toHaveBeenCalledWith("products/photo/label-old.jpg");
    });
  });

  describe("delete", () => {
    it("removes the rows and then the files", async () => {
      drafts.lock.mockResolvedValue([photo("a")]);

      await service.delete(DRAFT_ID);

      expect(drafts.deletePhotos).toHaveBeenCalledWith(client, DRAFT_ID, ["a"]);
      expect(storage.delete).toHaveBeenCalledWith("products/photo/label-a.jpg");
    });

    it("throws 404 for a missing draft", async () => {
      await expect(service.delete(DRAFT_ID)).rejects.toBeInstanceOf(LabelDraftNotFoundError);
      expect(mockClient.query).toHaveBeenLastCalledWith("ROLLBACK");
    });
  });
});
