import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";

let mockAuthUser = { role: "super_admin" };

vi.mock("react-redux", () => ({
 useSelector: (selector) => selector({ auth: { user: mockAuthUser } }),
}));

vi.mock("../api/callEngineApi", () => ({
 callEngineApi: {
 getCallers: vi.fn(() => Promise.resolve({ data: { callers: [] } })),
 getOverview: vi.fn(() => Promise.resolve({ data: { overview: [] } })),
 getReport: vi.fn(() => Promise.resolve({ data: { report: {}, previousReport: {} } })),
 getLogs: vi.fn(() => Promise.resolve({ data: { logs: [], total: 0 } })),
 askAssistant: vi.fn(),
 getInsights: vi.fn(),
 syncBackfill: vi.fn(),
 },
}));

vi.mock("chart.js", () => ({
  Chart: {
    register: vi.fn(),
    defaults: {
      font: {},
      plugins: { tooltip: {} },
    },
  },
  CategoryScale: vi.fn(),
 Filler: vi.fn(),
 Legend: vi.fn(),
 LinearScale: vi.fn(),
 LineController: vi.fn(),
 LineElement: vi.fn(),
 PointElement: vi.fn(),
 BarController: vi.fn(),
 BarElement: vi.fn(),
 TimeScale: vi.fn(),
 Tooltip: vi.fn(),
}));

vi.mock("chartjs-adapter-moment", () => ({}));

import CallEnginePage from "../dashboard-src/pages/CallEngine";

describe("CallEnginePage permission gating", () => {
 beforeEach(() => {
 vi.clearAllMocks();
 mockAuthUser = { role: "super_admin" };
 });

 test("super admin has full access: AI input and Sync Calls enabled", async () => {
 mockAuthUser = { role: "super_admin" };
 render(<CallEnginePage />);

 expect(await screen.findByRole("button", { name: /Sync Calls/i })).toBeInTheDocument();
 expect(screen.getByRole("button", { name: /Top Insights/i })).not.toBeDisabled();
 expect(screen.getByRole("button", { name: /Dialer Performance/i })).not.toBeDisabled();

 const input = screen.getByPlaceholderText(/Ask about call performance/i);
 expect(input).not.toBeDisabled();
 expect(screen.queryByText(/Read Only/i)).not.toBeInTheDocument();
 });

 test("view-only user: AI Assistant disabled Sync Calls hidden", async () => {
 mockAuthUser = {
 role: "admin",
 permissions: { call_engine: ["view"] },
 };
 render(<CallEnginePage />);

 expect(await screen.findByText("Read Only")).toBeInTheDocument();
 expect(screen.queryByRole("button", { name: /Sync Calls/i })).not.toBeInTheDocument();
 expect(screen.getByRole("button", { name: /Top Insights/i })).toBeDisabled();
 expect(screen.getByRole("button", { name: /Dialer Performance/i })).toBeDisabled();

 const input = screen.getByPlaceholderText(/AI Assistant is disabled in read-only mode/i);
 expect(input).toBeDisabled();
 });
});
