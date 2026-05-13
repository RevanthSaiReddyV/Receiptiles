"use client";

export function LocalDate({ date, format = "short" }: { date: string | Date; format?: "short" | "long" | "datetime" }) {
  const d = new Date(date);

  if (format === "long") {
    return <>{d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</>;
  }

  if (format === "datetime") {
    return <>{d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</>;
  }

  return <>{d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</>;
}
