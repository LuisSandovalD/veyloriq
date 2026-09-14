const localDate = /^(\d{4})-(\d{2})-(\d{2})$/;

function offsetAt(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };
  return (
    Date.UTC(
      value.year,
      value.month - 1,
      value.day,
      value.hour,
      value.minute,
      value.second,
    ) - date.getTime()
  );
}

export function parseDateInTimeZone(
  value: string,
  timeZone: string,
  endOfDay = false,
): Date {
  const match = localDate.exec(value);
  if (!match) throw new Error("INVALID_LOCAL_DATE");
  // Constructing the formatter also validates the IANA zone identifier.
  new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date(0));
  const wallClockUtc = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
  let instant = new Date(wallClockUtc);
  instant = new Date(wallClockUtc - offsetAt(instant, timeZone));
  return new Date(wallClockUtc - offsetAt(instant, timeZone));
}

export function dateInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
