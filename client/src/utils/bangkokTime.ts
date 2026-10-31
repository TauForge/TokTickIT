// ui-spec.md section 3: Action date/time is shown in Asia/Bangkok (UTC+7, no DST).
const BANGKOK = "Asia/Bangkok";

export function formatBangkok(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { timeZone: BANGKOK, dateStyle: "medium", timeStyle: "short" });
}

// Value for <input type="datetime-local"> expressed in Bangkok wall-clock time.
export function toBangkokInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function fromBangkokInputValue(value: string): string {
  return new Date(`${value}:00+07:00`).toISOString();
}
