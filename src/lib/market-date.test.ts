import { describe, expect, it } from "vitest";

import { getChicagoTradingDate } from "@/lib/market-date";

describe("getChicagoTradingDate", () => {
  it("uses the Chicago calendar date before UTC midnight", () => {
    expect(getChicagoTradingDate(new Date("2026-07-29T02:30:00.000Z"))).toBe(
      "2026-07-28",
    );
  });

  it("handles the winter UTC offset", () => {
    expect(getChicagoTradingDate(new Date("2026-01-15T05:30:00.000Z"))).toBe(
      "2026-01-14",
    );
  });
});
