export type CurrentUser = {
  user: { id: string; email: string; firstName?: string; lastName?: string };
  permissions: string[];
};
