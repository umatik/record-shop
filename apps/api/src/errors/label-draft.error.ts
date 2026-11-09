import { AppError } from "@/errors/app.error.js";

export class LabelDraftNotFoundError extends AppError {
  constructor(draftId: string) {
    super(`Label draft ${draftId} not found`, 404);
    this.name = "LabelDraftNotFoundError";
  }
}

/** Zdjęcia z odczytu labelu wygasły albo trafiły już do innego szkicu lub płyty. */
export class LabelDraftPhotosUnavailableError extends AppError {
  constructor() {
    super("Some label photos have expired or are already used. Read the label again.", 400);
    this.name = "LabelDraftPhotosUnavailableError";
  }
}
