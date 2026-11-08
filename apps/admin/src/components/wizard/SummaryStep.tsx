"use client";

import { Alert, Anchor, Button, Divider, Group, Image, List, Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconCheck, IconDeviceFloppy, IconPlus, IconWorldUpload } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatEur } from "@/lib/format";
import type { Product } from "@/lib/types";
import type { VariantInput } from "./ConditionStep";
import type { RecordDetails } from "./DetailsStep";
import { usePreview } from "./PhotosStep";

const sleeveLabel: Record<string, string> = { generic: "okładka firmowa", no_cover: "bez okładki" };

const warningLabel: Record<string, string> = {
  missing_preview: "Płyta nie ma odsłuchu. Dodaj link do YouTube albo Bandcamp przy edycji.",
};

/** Ciało `POST /products`: produkt z jednym wariantem; zdjęcia labelu przez `photoUploadIds`. */
function buildProduct(details: RecordDetails, variant: VariantInput, photoUploadIds: string[]) {
  const artists = details.artists.split(",").map((a) => a.trim()).filter(Boolean);
  const year = Number.parseInt(details.year, 10);
  const optional = <K extends string, V>(key: K, value: V | undefined | "") =>
    value === undefined || value === "" ? {} : ({ [key]: value } as Record<K, V>);

  return {
    type: "vinyl",
    title: details.title.trim(),
    ...(details.discogs?.description ? { description: details.discogs.description } : {}),
    attributes: {
      artists,
      tracklist: details.discogs?.tracklist ?? [],
      previewLinks: details.discogs?.previewLinks ?? [],
    },
    variants: [
      {
        priceEur: variant.priceEur,
        quantity: variant.quantity,
        ...(photoUploadIds.length ? { photoUploadIds } : {}),
        attributes: {
          format: details.format,
          ...optional("speed", details.speed ? Number(details.speed) : undefined),
          ...optional("year", Number.isFinite(year) ? year : undefined),
          ...optional("label", details.label.trim()),
          ...optional("catalogNumber", details.catalogNumber.trim()),
          ...optional("country", details.discogs?.country),
          ...optional("pressing", details.discogs?.pressing),
          ...optional("discogsReleaseId", details.discogsReleaseId),
          mediaCondition: variant.mediaCondition,
          sleeveCondition: variant.sleeveCondition,
          ...optional("conditionNote", variant.conditionNote),
        },
      },
    ],
  };
}

type Saved = { product: Product; published: boolean; warnings: string[]; failedPhotos: number };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" wrap="nowrap" align="flex-start" gap="md">
      <Text c="dimmed" fz="lg">
        {label}
      </Text>
      <Text fz="lg" fw={600} ta="right">
        {value}
      </Text>
    </Group>
  );
}

/**
 * Krok 6: podsumowanie i zapis. Tworzy produkt z wariantem (zdjęcie labelu jako główne), wgrywa
 * dodatkowe zdjęcia i opcjonalnie publikuje. Publikacja zwraca ostrzeżenia, które pokazujemy, ale nie blokują.
 */
export function SummaryStep({
  details,
  variant,
  photoUploadIds,
  labelPhotos,
  extraPhotos,
  onSaved,
  onAddAnother,
}: {
  details: RecordDetails;
  variant: VariantInput;
  photoUploadIds: string[];
  labelPhotos: File[];
  extraPhotos: File[];
  onSaved: () => void;
  onAddAnother: () => void;
}) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState<{ message: string; errors: { path: string; message: string }[] } | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const cover = usePreview(labelPhotos[0] ?? extraPhotos[0] ?? new File([], ""));

  async function save(publish: boolean) {
    setSaving(publish ? "publish" : "draft");
    setError(null);
    try {
      const created = await api<{ product: Product }>("/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildProduct(details, variant, photoUploadIds)),
      });
      const variantId = created.product.variants[0]?.id;

      // Dodatkowe zdjęcia po zapisaniu płyty, za zdjęciem labelu.
      let failedPhotos = 0;
      for (const [index, file] of extraPhotos.entries()) {
        const form = new FormData();
        form.append("file", file);
        form.append("sortOrder", String(photoUploadIds.length + index + 1));
        form.append("isPrimary", "false");
        await api(`/products/variants/${variantId}/media`, { method: "POST", body: form }).catch(() => failedPhotos++);
      }

      let warnings: string[] = [];
      if (publish) {
        const result = await api<{ warnings: string[] }>(`/products/${created.product.id}/publish`, { method: "POST" });
        warnings = result.warnings;
      }
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      setSaved({ product: created.product, published: publish, warnings, failedPhotos });
      onSaved();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? { message: e.message, errors: e.errors }
          : { message: "Nie udało się zapisać płyty. Sprawdź połączenie i spróbuj ponownie.", errors: [] },
      );
    } finally {
      setSaving(null);
    }
  }

  if (saved) {
    return (
      <Stack gap="lg">
        <Stack align="center" gap="xs" py="md">
          <ThemeIcon size={88} radius={100} variant="outline" color="green" style={{ borderWidth: 3 }}>
            <IconCheck size={52} stroke={2.5} />
          </ThemeIcon>
          <Title order={1} fz={30} ta="center">
            {saved.published ? "Płyta jest w sprzedaży" : "Zapisano szkic"}
          </Title>
          <Text fz="lg" ta="center">
            {details.artists} – {details.title}
          </Text>
        </Stack>
        {saved.warnings.map((warning) => (
          <Alert key={warning} color="yellow" variant="light" fz="md">
            {warningLabel[warning] ?? warning}
          </Alert>
        ))}
        {saved.failedPhotos > 0 && (
          <Alert color="red" variant="light" fz="md">
            Nie udało się wgrać {saved.failedPhotos} zdjęć. Dodasz je przy edycji płyty.
          </Alert>
        )}
        <Button size="xl" fullWidth leftSection={<IconPlus size={26} />} onClick={onAddAnother}>
          Dodaj kolejną płytę
        </Button>
        <Button component={Link} href={saved.published ? "/produkty" : "/szkice"} size="lg" variant="default" fullWidth>
          {saved.published ? "Zobacz produkty" : "Zobacz szkice"}
        </Button>
      </Stack>
    );
  }

  const sleeve = sleeveLabel[variant.sleeveCondition] ?? `okładka ${variant.sleeveCondition}`;
  const pressing = [details.format, details.speed && `${details.speed} RPM`, details.year].filter(Boolean).join(" · ");

  return (
    <Stack gap="lg">
      <Title order={1} fz={32}>
        Podsumowanie
      </Title>

      <Paper withBorder radius="md" p="md">
        <Stack gap="md">
          <Group wrap="nowrap" gap="md" align="flex-start">
            {cover && <Image src={cover} alt="" w={115} h={115} radius="sm" fit="cover" />}
            <Stack gap={2} style={{ minWidth: 0 }}>
              <Text fw={700} fz={24} lh={1.25}>
                {details.artists}
              </Text>
              <Text fz={20} c="dimmed">
                {details.title}
              </Text>
            </Stack>
          </Group>
          <Divider />
          <Row label="Tłoczenie" value={pressing || "—"} />
          <Row label="Wytwórnia" value={[details.label, details.catalogNumber].filter(Boolean).join(" · ") || "—"} />
          <Row label="Stan" value={`${variant.mediaCondition} · ${sleeve}`} />
          <Row label="Cena" value={formatEur(variant.priceEur)} />
          <Row label="Ilość" value={String(variant.quantity)} />
          <Row label="Zdjęcia" value={String(photoUploadIds.length + extraPhotos.length)} />
          {variant.conditionNote && (
            <Text fz="lg">
              <Text span c="dimmed" inherit>
                Notatka:{" "}
              </Text>
              {variant.conditionNote.pl}
            </Text>
          )}
          {details.discogsReleaseId && (
            <Text fz="md" c="dimmed">
              Data provided by Discogs.{" "}
              <Anchor href={`https://www.discogs.com/release/${details.discogsReleaseId}`} target="_blank" inherit>
                Zobacz wydanie
              </Anchor>
            </Text>
          )}
        </Stack>
      </Paper>

      {error && (
        <Alert color="red" variant="light" title={error.message} fz="md">
          {error.errors.length > 0 && (
            <List fz="md">
              {error.errors.map((item) => (
                <List.Item key={item.path}>
                  {item.path}: {item.message}
                </List.Item>
              ))}
            </List>
          )}
        </Alert>
      )}

      <Button
        size="xl"
        fullWidth
        leftSection={<IconWorldUpload size={26} />}
        loading={saving === "publish"}
        disabled={saving === "draft"}
        onClick={() => save(true)}
      >
        Opublikuj
      </Button>
      <Button
        size="lg"
        variant="default"
        fullWidth
        leftSection={<IconDeviceFloppy size={24} />}
        loading={saving === "draft"}
        disabled={saving === "publish"}
        onClick={() => save(false)}
      >
        Zapisz jako szkic
      </Button>
    </Stack>
  );
}
