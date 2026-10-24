import { LegalPage } from "@/components/LegalPage";
import { PRIVACY_PARAGRAPHS, PRIVACY_TITLE } from "@/lib/legal";

export default function PrivacyPage() {
  return <LegalPage title={PRIVACY_TITLE} paragraphs={PRIVACY_PARAGRAPHS} />;
}
