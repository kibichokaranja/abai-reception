"use client";

type Choice<T extends string | number> = {
  value: T;
  label: string;
};

type TapChoicesProps<T extends string | number> = {
  label: string;
  options: readonly Choice<T>[] | Choice<T>[];
  value: T | null;
  onChange: (value: T) => void;
  columns?: 3 | 5 | 6;
};

export function TapChoices<T extends string | number>({
  label,
  options,
  value,
  onChange,
  columns = 5,
}: TapChoicesProps<T>) {
  const gridClass =
    columns === 3
      ? "grid-cols-3"
      : columns === 6
        ? "grid-cols-3 sm:grid-cols-6"
        : "grid-cols-5";

  return (
    <fieldset className="animate-fade-up space-y-3">
      <legend className="font-display text-xl font-semibold text-abai-ink sm:text-2xl">
        {label}
      </legend>
      <div className={`grid gap-2 ${gridClass}`}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={String(option.value)}
              type="button"
              className={`tap-choice min-h-14 rounded-lg border-2 px-2 py-3 text-center text-sm font-medium sm:min-h-16 sm:text-base ${
                selected
                  ? "border-abai-gold bg-abai-gold text-abai-navy"
                  : "border-abai-navy/15 bg-white text-abai-ink hover:border-abai-gold/60"
              }`}
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
            >
              <span className="block leading-tight">{option.label}</span>
              {typeof option.value === "number" ? (
                <span
                  className={`mt-1 block text-xs ${
                    selected ? "text-abai-navy/70" : "text-abai-muted"
                  }`}
                >
                  {option.value}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
