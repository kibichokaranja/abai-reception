import { BrandHeader } from "@/components/BrandHeader";
import { GuestFeedbackForm } from "@/components/GuestFeedbackForm";
import { GuestFormQr } from "@/components/GuestFormQr";
import { GuestPageShell } from "@/components/GuestPageShell";

export default function HomePage() {
  return (
    <GuestPageShell>
      <BrandHeader />
      <GuestFeedbackForm />
      <GuestFormQr />
      <p className="mt-4 text-center text-xs text-abai-muted">
        Abai Lodges &amp; Spa ·{" "}
        <a
          href="https://abailodges.com"
          className="underline decoration-abai-gold/50 underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          abailodges.com
        </a>
      </p>
    </GuestPageShell>
  );
}
