"use client";

import { Button, Stack, Textarea, TextInput, Title } from "@mantine/core";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useState } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { useUpdateProduct } from "@/hooks/useProduct";
import type { Product } from "@/types/product";

type ProductInfoFormProps = {
  product: Product;
};

/** Dane płyty: artyści, tytuł, opis. API zastępuje całe atrybuty, więc pozostałe (tracklista, odsłuch) idą bez zmian. */
const ProductInfoForm = ({ product }: ProductInfoFormProps) => {
  const update = useUpdateProduct(product.id);
  const [artists, setArtists] = useState(product.attributes.artists?.join(", ") ?? "");
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description ?? "");
  const [saved, setSaved] = useState(false);

  const artistList = artists
    .split(",")
    .map((artist) => artist.trim())
    .filter(Boolean);
  const canSave = artistList.length > 0 && title.trim().length > 0;

  return (
    <Stack
      component="form"
      aria-labelledby="info-title"
      gap="md"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSave) return;
        setSaved(false);
        update.mutate(
          {
            title: title.trim(),
            attributes: { ...product.attributes, artists: artistList },
            description: description.trim() || null,
          },
          { onSuccess: () => setSaved(true) },
        );
      }}
    >
      <Title id="info-title" order={2}>
        Płyta
      </Title>
      <TextInput
        size="lg"
        label="Artysta"
        description="Kilku rozdziel przecinkiem"
        value={artists}
        onChange={(event) => setArtists(event.currentTarget.value)}
        error={artistList.length === 0 ? "Wpisz artystę." : null}
      />
      <TextInput
        size="lg"
        label="Tytuł"
        value={title}
        onChange={(event) => setTitle(event.currentTarget.value)}
        error={title.trim() ? null : "Wpisz tytuł."}
      />
      <Textarea
        size="lg"
        autosize
        minRows={2}
        label="Opis"
        value={description}
        onChange={(event) => setDescription(event.currentTarget.value)}
      />
      {update.isError && <ErrorState message={update.error.message} />}
      <Button
        type="submit"
        size="lg"
        variant="light"
        fullWidth
        disabled={!canSave}
        loading={update.isPending}
        leftSection={<IconDeviceFloppy size={24} aria-hidden="true" />}
      >
        {saved && !update.isPending ? "Zapisano" : "Zapisz dane płyty"}
      </Button>
    </Stack>
  );
};

export default ProductInfoForm;
