"use client";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthBounds(
  year: number | null,
  month: number | null
): { from: string | null; to: string | null } {
  if (year === null || month === null) return { from: null, to: null };
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2021 }, (_, i) => 2022 + i);

type Props = {
  year: number | null;
  month: number | null;
  onChange: (year: number | null, month: number | null) => void;
};

export function MonthYearPicker({ year, month, onChange }: Props) {
  const isAll = year === null;
  const displayYear = year ?? currentYear;
  const displayMonth = month ?? (new Date().getMonth() + 1);

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(null, null)}
        className={`px-3 py-2.5 rounded-lg text-sm font-medium border min-h-[44px] transition ${
          isAll
            ? "bg-blue-600 text-white border-blue-600"
            : "border-gray-300 text-gray-600 hover:bg-gray-50"
        }`}
      >
        All
      </button>
      <select
        value={displayMonth}
        onChange={(e) => onChange(displayYear, Number(e.target.value))}
        className={`border border-gray-300 rounded-lg text-sm px-2 py-2.5 bg-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isAll ? "opacity-40" : ""}`}
      >
        {MONTHS.map((name, i) => (
          <option key={i + 1} value={i + 1}>{name}</option>
        ))}
      </select>
      <select
        value={displayYear}
        onChange={(e) => onChange(Number(e.target.value), displayMonth)}
        className={`border border-gray-300 rounded-lg text-sm px-2 py-2.5 bg-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isAll ? "opacity-40" : ""}`}
      >
        {YEARS.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
