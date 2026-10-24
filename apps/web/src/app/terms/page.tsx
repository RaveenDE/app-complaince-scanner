import { LegalPage } from "@/components/LegalPage";
import { TERMS_PARAGRAPHS, TERMS_TITLE } from "@/lib/legal";

export default function TermsPage() {
  return <LegalPage title={TERMS_TITLE} paragraphs={TERMS_PARAGRAPHS} />;
}
