"use client";

type Choice<T extends string | number> = {
  value: T;
  label: string;
};

type TapChoicesBaseProps<T extends string | number> = {
  label: string;
  options: readonly Choice<T>[] | Choice<T>[];
  columns?: 2 | 3 | 5 | 6;
  /** Optional question number shown before the label (e.g. "1."). */
  number?: number;
};

type SingleProps<T extends string | number> = TapChoicesBaseProps<T> & {
  multiple?: false;
  value: T | null;
  onChange: (value: T) => void;
};

type MultiProps<T extends string | number> = TapChoicesBaseProps<T> & {
  multiple: true;
  value: T[];
  onChange: (value: T[]) => void;
};

type TapChoicesProps<T extends string | number> =
  | SingleProps<T>
  | MultiProps<T>;

export function TapChoices<T extends string | number>(
  props: TapChoicesProps<T>,
) {
  const { label, options, columns = 5, number } = props;
  const gridClass =
    columns === 2
      ? "grid-cols-2"
      : columns === 3
        ? "grid-cols-3"
        : columns === 6
          ? "grid-cols-3 sm:grid-cols-6"
          : "grid-cols-5";

  const legend =
    number != null ? `${number}. ${label}` : label;

  function isSelected(optionValue: T): boolean {
    if (props.multiple) {
      return props.value.includes(optionValue);
    }
    return props.value === optionValue;
  }

  function onToggle(optionValue: T) {
    if (props.multiple) {
      const next = props.value.includes(optionValue)
        ? props.value.filter((v) => v !== optionValue)
        : [...props.value, optionValue];
      props.onChange(next);
      return;
    }
    props.onChange(optionValue);
  }

  return (
    <fieldset className="animate-fade-up space-y-3">
      <legend className="max-w-full font-display text-lg font-semibold leading-snug text-abai-ink sm:text-xl">
        {legend}
      </legend>
      {props.multiple ? (
        <p className="text-sm text-abai-muted">Tap all that apply (optional).</p>
      ) : null}
      <div className={`grid gap-2 ${gridClass}`}>
        {options.map((option) => {
          const selected = isSelected(option.value);
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
              onClick={() => onToggle(option.value)}
            >
              <span className="block leading-tight">{option.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
