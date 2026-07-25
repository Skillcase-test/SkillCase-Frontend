import { describe, expect, it } from "vitest";
import { isMaintenanceResponse } from "../utils/maintenanceSignal";

describe("maintenance response classifier", () => {
  it("recognizes the explicit maintenance response shape", () => {
    expect(
      isMaintenanceResponse({
        status: 503,
        data: { code: "maintenance_mode" },
      }),
    ).toBe(true);

    expect(
      isMaintenanceResponse({
        response: {
          status: 503,
          data: { code: "maintenance_mode" },
        },
      }),
    ).toBe(true);

    expect(
      isMaintenanceResponse({
        status: 503,
        data: { message: "System under maintenance" },
      }),
    ).toBe(true);
  });

  it("does not classify ordinary outages or transport failures as maintenance", () => {
    expect(
      isMaintenanceResponse({
        status: 503,
        data: { code: "backend_unhealthy" },
      }),
    ).toBe(false);
    expect(isMaintenanceResponse({ code: "ERR_NETWORK" })).toBe(false);
    expect(isMaintenanceResponse({ status: 500 })).toBe(false);
  });
});
