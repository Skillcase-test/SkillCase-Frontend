import { fireEvent, render, screen } from "@testing-library/react";
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
 getTranscript: vi.fn(),
 getMetricLogs: vi.fn(() => Promise.resolve({ data: { rows: [] } })),
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

describe("CallEnginePage transcript preview", () => {
 const row = {
 callyzer_call_id: "CZ-1",
 client_number: "919999999999",
 dialer_number: "918888888888",
 dialer_name: "Fiza",
 candidate_id: "C-101",
 duration_sec: 540,
 call_datetime: "2026-09-29T10:00:00Z",
 recording_url: "https://example.com/rec.mp3",
 };

 const transcriptPayload = (text, status = "success") =>
 Promise.resolve({
 data: {
 call: {
 callyzerCallId: row.callyzer_call_id,
 candidateId: "C-101",
 dialerName: "Fiza",
 durationSec: 540,
 callDatetime: row.call_datetime,
 },
 transcript: { status, text, confidence: 0.9, provider: "azure_speech" },
 },
 });

 beforeEach(async () => {
 mockAuthUser = { role: "super_admin" };
 const { callEngineApi } = await import("../api/callEngineApi");
 callEngineApi.getLogs.mockResolvedValue({ data: { rows: [row], pagination: { page: 1, limit: 20, total: 1 } } });
 callEngineApi.getTranscript.mockReset();
 });

 test("opens modal and renders labeled turns with download actions", async () => {
 const { callEngineApi } = await import("../api/callEngineApi");
 callEngineApi.getTranscript.mockReturnValue(
 transcriptPayload("[Dialer]: Hello, calling from Skillcase.\n[Candidate]: Yes, tell me about the fees."),
 );

 window.URL.createObjectURL = vi.fn(() => "blob:mock");
 window.URL.revokeObjectURL = vi.fn();

 render(<CallEnginePage />);
 fireEvent.click(await screen.findByTitle("View transcript"));

 expect(await screen.findByText("Call Transcript")).toBeInTheDocument();
 expect(await screen.findByText(/calling from Skillcase/)).toBeInTheDocument();
 expect(screen.getByText(/tell me about the fees/)).toBeInTheDocument();
 expect(screen.getAllByText("Dialer").length).toBeGreaterThan(0);
 expect(screen.getAllByText("Candidate").length).toBeGreaterThan(0);
 expect(screen.getAllByText(/C-101/).length).toBeGreaterThan(0);
 expect(screen.getByRole("button", { name: /TXT/i })).toBeEnabled();
 expect(screen.getByRole("button", { name: /PDF/i })).toBeEnabled();

 fireEvent.click(screen.getByRole("button", { name: /TXT/i }));
 expect(window.URL.createObjectURL).toHaveBeenCalled();
 });

 test("shows pending state when transcript is not ready", async () => {
 const { callEngineApi } = await import("../api/callEngineApi");
 callEngineApi.getTranscript.mockReturnValue(transcriptPayload("", "pending"));

 render(<CallEnginePage />);
 fireEvent.click(await screen.findByTitle("View transcript"));

 expect(await screen.findByText(/being generated/i)).toBeInTheDocument();
 expect(screen.getByRole("button", { name: /TXT/i })).toBeDisabled();
 });
});
