import { AppError } from "./app.error.js";

/** Gość podaje e-mail istniejącego konta: zamówienie musi złożyć zalogowany użytkownik. */
export class AccountExistsError extends AppError {
  constructor() {
    super("Account exists for this email", 409);
    this.name = "AccountExistsError";
  }
}
