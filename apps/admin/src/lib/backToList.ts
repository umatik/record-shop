/**
 * Poprzednia strona panelu (śledzona w `PanelShell`). Gdy powrót z produktu prowadzi do strony, z której
 * przyszliśmy (np. „/produkty”), cofamy historię zamiast otwierać listę od nowa: przeglądarka przywraca
 * wtedy miejsce na liście.
 */
let current: string | null = null;
let previous: string | null = null;

export const trackPath = (path: string) => {
  if (path === current) return;
  previous = current;
  current = path;
};

export const cameFrom = (path: string) => previous === path && window.history.length > 1;
