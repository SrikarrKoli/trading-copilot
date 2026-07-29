const CHICAGO_TIME_ZONE = "America/Chicago";

export function getChicagoTradingDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: CHICAGO_TIME_ZONE,
    year: "numeric",
  }).formatToParts(now);
  const valueByType = new Map(parts.map(({ type, value }) => [type, value]));
  const year = valueByType.get("year");
  const month = valueByType.get("month");
  const day = valueByType.get("day");

  if (!year || !month || !day) {
    throw new Error("The current Chicago trading date could not be determined.");
  }

  return `${year}-${month}-${day}`;
}
