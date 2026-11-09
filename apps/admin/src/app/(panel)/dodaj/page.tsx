import { randomUUID } from "node:crypto";
import ResumeRecordWizard from "@/components/wizard/ResumeRecordWizard";

export default async function AddRecordPage({ searchParams }: { searchParams: Promise<{ szkic?: string }> }) {
  const { szkic } = await searchParams;
  return <ResumeRecordWizard key={szkic ?? "new"} id={szkic} newId={randomUUID()} />;
}
