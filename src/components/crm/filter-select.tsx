interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: Array<{ value: string; label: string }>;
}

export function FilterSelect({
  value,
  onChange,
  label,
  options,
}: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 min-w-0 flex-1 sm:flex-none sm:min-w-[140px] rounded-md border border-border bg-background px-3 text-sm"
      aria-label={label}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}