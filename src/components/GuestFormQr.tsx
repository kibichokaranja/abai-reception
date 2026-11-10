import Image from "next/image";

export function GuestFormQr() {
  return (
    <aside className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-3 px-4 pb-2">
      <p className="text-center text-sm font-medium text-abai-navy sm:text-base">
        Scan to open on your phone
      </p>
      <div className="rounded-xl border border-abai-navy/10 bg-abai-navy p-3 shadow-sm">
        <Image
          src="/abai-form-qr.png"
          alt="QR code to open the Abai guest feedback form on your phone"
          width={180}
          height={180}
          className="h-[160px] w-[160px] sm:h-[180px] sm:w-[180px]"
          priority={false}
        />
      </div>
    </aside>
  );
}
