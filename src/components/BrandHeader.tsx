import Image from "next/image";

type BrandHeaderProps = {
  compact?: boolean;
};

export function BrandHeader({ compact = false }: BrandHeaderProps) {
  return (
    <header className="bg-abai-navy text-white shadow-md">
      <div
        className={`mx-auto flex max-w-3xl items-center justify-center px-4 ${
          compact ? "py-3" : "py-5 sm:py-7"
        }`}
      >
        <Image
          src="/abai-logo.png"
          alt="Abai Lodges & Spa — Exclusivity Redefined"
          width={compact ? 220 : 320}
          height={compact ? 90 : 131}
          className="h-auto w-[min(80vw,320px)]"
          priority
        />
      </div>
    </header>
  );
}
