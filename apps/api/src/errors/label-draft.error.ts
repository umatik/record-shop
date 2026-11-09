import { AppError } from "@/errors/app.error.js";

export class LabelDraftNotFoundError extends AppError {
  constructor(draftId: string) {
    super(`Label draft ${draftId} not found`, 404);
    this.name = "LabelDraftNotFoundError";
  }
}

/** Zdjęcia szkicu zmieniły się w innej karcie albo na innym urządzeniu. */
export class LabelDraftConflictError extends AppError {
  constructor() {
    super("The draft photos have changed. Reopen the draft from the drafts list.", 409);
    this.name = "LabelDraftConflictError";
  }
}
