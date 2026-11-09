import type { ReactNode } from "react";

type RowListProps<T> = {
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T) => ReactNode;
  /** Nazwa listy dla czytnika ekranu, gdy nie ma widocznego nagłówka. */
  label?: string;
};

/** Semantyczna lista (`ul`/`li`) wierszy rozdzielonych cienką linią. */
const RowList = <T,>({ items, getKey, renderItem, label }: RowListProps<T>) => (
  <ul className="plain-list" aria-label={label}>
    {items.map((item, index) => (
      <li key={getKey(item)} style={index > 0 ? { borderTop: "1px solid var(--mantine-color-gray-3)" } : undefined}>
        {renderItem(item)}
      </li>
    ))}
  </ul>
);

export default RowList;
