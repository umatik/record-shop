"use client";

import { ActionIcon, Anchor, Button, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { useUpdateProduct } from "@/hooks/useProduct";
import type { Product } from "@/types/product";

type PreviewLinksEditorProps = {
  product: Product;
};

const isUrl = (value: string) => /^https?:\/\/\S+\.\S+/.test(value);

/** Linki do odsłuchu (YouTube, Bandcamp). Bez żadnego płyta dostaje ostrzeżenie `missing_preview`. */
const PreviewLinksEditor = ({ product }: PreviewLinksEditorProps) => {
  const update = useUpdateProduct(product.id);
  const links = (product.attributes.previewLinks ?? []) as string[];
  const [draft, setDraft] = useState("");

  const save = (previewLinks: string[], onSuccess?: () => void) =>
    update.mutate({ attributes: { ...product.attributes, previewLinks } }, { onSuccess });

  const add = () => {
    const url = draft.trim();
    if (isUrl(url) && !links.includes(url)) save([...links, url], () => setDraft(""));
  };

  return (
    <Stack component="section" aria-labelledby="preview-title" gap="sm">
      <Title id="preview-title" order={2}>
        Odsłuch
      </Title>

      {links.length === 0 ? (
        <Text c="dimmed" fz="lg">
          Brak linków do odsłuchu.
        </Text>
      ) : (
        <ul className="plain-list">
          {links.map((url) => (
            <Group component="li" key={url} wrap="nowrap" justify="space-between" gap="sm" py={6}>
              <Anchor href={url} target="_blank" fz="md" style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                {url.replace(/^https?:\/\/(www\.)?/, "")}
              </Anchor>
              <ActionIcon
                variant="subtle"
                color="red"
                size="xl"
                aria-label={`Usuń link ${url}`}
                loading={update.isPending}
                onClick={() => save(links.filter((link) => link !== url))}
              >
                <IconTrash size={22} aria-hidden="true" />
              </ActionIcon>
            </Group>
          ))}
        </ul>
      )}

      <Group
        component="form"
        wrap="nowrap"
        gap="sm"
        align="flex-start"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <TextInput
          type="url"
          size="lg"
          style={{ flex: 1 }}
          placeholder="https://youtube.com/…"
          aria-label="Nowy link do odsłuchu"
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          error={draft.trim() && !isUrl(draft.trim()) ? "Wpisz pełny adres, z https://" : null}
        />
        <Button type="submit" size="lg" variant="light" disabled={!isUrl(draft.trim())} aria-label="Dodaj link">
          <IconPlus size={24} aria-hidden="true" />
        </Button>
      </Group>
      {update.isError && <ErrorState message={update.error.message} />}
    </Stack>
  );
};

export default PreviewLinksEditor;
