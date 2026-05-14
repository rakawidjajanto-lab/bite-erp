"use client";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthBounds(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2021 }, (_, i) => 2022 + i);

type Props = {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
};

export function MonthYearPicker({ year, month, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={month}
        onChange={(e) => onChange(year, Number(e.target.value))}
        className="border border-gray-300 rounded-lg text-sm px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-h-[44px]"
      >
        {MONTHS.map((name, i) => (
          <option key={i + 1} value={i + 1}>{name}</option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => onChange(Number(e.target.value), month)}
        className="border border-gray-300 rounded-lg text-sm px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-h-[44px]"
      >
        {YEARS.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
