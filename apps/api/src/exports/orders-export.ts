import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import type { ManagedOrder, ManagedOrderScope } from "@/types/order.types.js";

// Eksport historii zamówień (CSV i PDF). Te same dane i filtry co lista w panelu.

const FONT_FILE = fileURLToPath(
  new URL("../assets/fonts/Figtree-Regular.ttf", import.meta.url),
);
const TIME_ZONE = "Europe/Warsaw";
const dateTime = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: TIME_ZONE,
});
const day = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeZone: TIME_ZONE,
});

const STATUS_LABEL: Record<ManagedOrder["status"], string> = {
  pending: "Czeka na płatność",
  paid: "Opłacone",
  shipped: "Wysłane",
  delivered: "Doręczone",
  cancelled: "Anulowane",
};

const eur = (cents: number) =>
  `${(cents / 100).toFixed(2).replace(".", ",")} €`;
const when = (iso: string | null) =>
  iso ? dateTime.format(new Date(iso)) : "";
const buyerName = (order: ManagedOrder) =>
  [order.buyer.firstName, order.buyer.lastName].filter(Boolean).join(" ") ||
  order.buyer.email;
const recordTitle = (artists: string[], title: string) =>
  [artists.join(", "), title].filter(Boolean).join(" – ");
const formatOf = (attributes: Record<string, unknown>) =>
  typeof attributes.format === "string" ? attributes.format : "";

/** Zamówienia anulowane nie są sprzedażą, więc nie wchodzą do sumy wartości ani sztuk. */
export const summarize = (orders: ManagedOrder[]) => {
  const sold = orders.filter((order) => order.status !== "cancelled");
  return {
    orders: orders.length,
    soldOrders: sold.length,
    units: sold.reduce(
      (sum, order) =>
        sum + order.items.reduce((n, item) => n + item.quantity, 0),
      0,
    ),
    totalEur: sold.reduce((sum, order) => sum + order.totalEur, 0),
  };
};

/** Opis filtrów do nagłówka pliku, np. „Status: Wysłane · od 1.11.2026 · szukaj: Kowalska”. */
export const describeScope = (scope: ManagedOrderScope): string => {
  const parts: string[] = [];
  if (scope.status) parts.push(`status: ${STATUS_LABEL[scope.status]}`);
  if (scope.from)
    parts.push(`złożone od ${day.format(new Date(`${scope.from}T12:00:00Z`))}`);
  if (scope.to)
    parts.push(`złożone do ${day.format(new Date(`${scope.to}T12:00:00Z`))}`);
  if (scope.q) parts.push(`szukaj: ${scope.q}`);
  return parts.length > 0 ? parts.join(" · ") : "wszystkie zamówienia";
};

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** CSV dla arkusza: jeden wiersz na pozycję zamówienia, średnik jako separator, BOM dla polskich znaków. */
export const buildOrdersCsv = (orders: ManagedOrder[]): Buffer => {
  const header = [
    "Numer zamówienia",
    "Data złożenia",
    "Data zapłaty",
    "Status",
    "Kupujący",
    "E-mail",
    "Płyta",
    "Format",
    "Ilość",
    "Cena za sztukę (EUR)",
    "Wartość pozycji (EUR)",
  ];
  const rows = orders.flatMap((order) =>
    order.items.map((item) =>
      [
        order.id,
        when(order.createdAt),
        when(order.paidAt),
        STATUS_LABEL[order.status],
        buyerName(order),
        order.buyer.email,
        recordTitle(item.artists, item.productTitle),
        formatOf(item.variantAttributes),
        item.quantity,
        (item.priceEur / 100).toFixed(2).replace(".", ","),
        ((item.priceEur * item.quantity) / 100).toFixed(2).replace(".", ","),
      ]
        .map(csvCell)
        .join(";"),
    ),
  );
  return Buffer.from(
    `﻿${[header.join(";"), ...rows].join("\r\n")}\r\n`,
    "utf8",
  );
};

type Column = {
  x: number;
  width: number;
  title: string;
  align?: "left" | "right";
};

const COLUMNS: Record<
  "number" | "placed" | "buyer" | "status" | "units" | "total",
  Column
> = {
  number: { x: 40, width: 45, title: "Nr" },
  placed: { x: 90, width: 95, title: "Złożono" },
  buyer: { x: 190, width: 140, title: "Kupujący" },
  status: { x: 335, width: 95, title: "Status" },
  units: { x: 435, width: 50, title: "Sztuki", align: "right" },
  total: { x: 495, width: 60, title: "Kwota", align: "right" },
};

/** PDF zestawienia: nagłówek z filtrami, suma, tabela z pozycjami pod każdym zamówieniem. */
export const buildOrdersPdf = (
  orders: ManagedOrder[],
  scope: ManagedOrderScope,
  generatedAt: Date,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
      info: { Title: "Historia zamówień RasBass" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.registerFont("Figtree", FONT_FILE);
    doc.font("Figtree");

    const bottom = () => doc.page.height - doc.page.margins.bottom;
    const drawHeader = () => {
      doc.fontSize(9).fillColor("#686d65");
      const y = doc.y;
      for (const column of Object.values(COLUMNS)) {
        doc.text(column.title, column.x, y, {
          width: column.width,
          align: column.align ?? "left",
        });
      }
      doc.moveDown(0.4);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#dedfd9").stroke();
      doc.moveDown(0.4);
      doc.fillColor("#20211e");
    };

    doc.fontSize(20).fillColor("#20211e").text("Historia zamówień");
    doc
      .fontSize(9)
      .fillColor("#686d65")
      .text(
        `${describeScope(scope)} · wygenerowano ${dateTime.format(generatedAt)}`,
      );
    const summary = summarize(orders);
    doc.moveDown(0.6);
    doc
      .fontSize(11)
      .fillColor("#20211e")
      .text(
        `Zamówień: ${summary.orders} (opłaconych i wysłanych: ${summary.soldOrders}) · sztuk: ${summary.units} · wartość: ${eur(summary.totalEur)}`,
      );
    doc.moveDown(0.3);
    doc
      .fontSize(8)
      .fillColor("#686d65")
      .text(
        "Wartość i sztuki bez zamówień anulowanych. Kwoty to wartość produktów.",
      );
    doc.moveDown(0.8);
    drawHeader();

    for (const order of orders) {
      doc.fontSize(10);
      const itemLines = order.items.map(
        (item) =>
          `${recordTitle(item.artists, item.productTitle)}${formatOf(item.variantAttributes) ? ` (${formatOf(item.variantAttributes)})` : ""} × ${item.quantity} · ${eur(item.priceEur * item.quantity)}`,
      );
      const rowHeight = Math.max(
        doc.heightOfString(buyerName(order), { width: COLUMNS.buyer.width }),
        doc.heightOfString(`#${order.id}`, { width: COLUMNS.number.width }),
      );
      const itemsHeight = itemLines.reduce(
        (sum, line) => sum + doc.heightOfString(line, { width: 515 - 16 }) + 2,
        0,
      );

      if (doc.y + rowHeight + itemsHeight + 14 > bottom()) {
        doc.addPage();
        drawHeader();
      }

      const y = doc.y;
      doc.text(`#${order.id}`, COLUMNS.number.x, y, {
        width: COLUMNS.number.width,
      });
      doc.text(when(order.createdAt), COLUMNS.placed.x, y, {
        width: COLUMNS.placed.width,
      });
      doc.text(buyerName(order), COLUMNS.buyer.x, y, {
        width: COLUMNS.buyer.width,
      });
      doc.text(STATUS_LABEL[order.status], COLUMNS.status.x, y, {
        width: COLUMNS.status.width,
      });
      doc.text(
        String(order.items.reduce((sum, item) => sum + item.quantity, 0)),
        COLUMNS.units.x,
        y,
        {
          width: COLUMNS.units.width,
          align: "right",
        },
      );
      doc.text(eur(order.totalEur), COLUMNS.total.x, y, {
        width: COLUMNS.total.width,
        align: "right",
      });
      doc.y = y + rowHeight + 2;

      doc.fontSize(9).fillColor("#686d65");
      for (const line of itemLines) {
        doc.text(line, 56, doc.y, { width: 515 - 16 });
        doc.moveDown(0.1);
      }
      doc.fillColor("#20211e");
      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#eeefea").stroke();
      doc.moveDown(0.5);
    }

    if (orders.length === 0) {
      doc.fontSize(11).text("Brak zamówień dla tych filtrów.");
    }

    doc.end();
  });
