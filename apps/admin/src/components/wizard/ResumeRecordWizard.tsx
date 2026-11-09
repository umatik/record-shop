"use client";

import { useQuery } from "@tanstack/react-query";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { loadLabelDraft } from "@/services/labelDrafts.services";
import AddRecordWizard from "./AddRecordWizard";

type ResumeRecordWizardProps = {
  /** Szkic z adresu (`?szkic=`), do którego wracamy. */
  id?: string;
  /** Identyfikator nowego szkicu, gdy przeglądarka nie ma `crypto.randomUUID` (np. telefon po HTTP w sieci lokalnej). */
  newId: string;
};

/** Otwiera kreator od zera albo wczytuje zapisany szkic: zdjęcia jako pliki i ostatni wynik odczytu. */
const ResumeRecordWizard = ({ id, newId }: ResumeRecordWizardProps) => {
  const query = useQuery({
    queryKey: ["resume-label-draft", id],
    queryFn: () => loadLabelDraft(id!),
    enabled: Boolean(id),
    refetchOnWindowFocus: false,
    staleTime: 0,
    gcTime: 0,
  });

  if (!id) return <AddRecordWizard newId={newId} />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  if (!query.data) return <LoadingState label="Wczytywanie szkicu" />;
  return <AddRecordWizard newId={newId} initial={query.data} />;
};

export default ResumeRecordWizard;
