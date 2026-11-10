import type { Pagination } from "./common";

/** Użytkownik z danymi kontaktowymi, tak jak zwraca `GET /users`. */
export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  /** Liczba kupionych płyt (bez anulowanych zamówień). */
  purchasedCount: number;
};

export type UserList = {
  users: User[];
  pagination: Pagination;
};
