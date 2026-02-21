/**
 * Frontend Tests — ExamLobby.jsx
 *
 * Tests:
 * - Loading state
 * - Error state (403 / not found)
 * - Rules list renders
 * - Start / Continue Exam button visibility by status
 * - Redirect to result page when completed + results_visible
 * - Warned out / auto closed messages
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

// Also stub the axios module so its baseURL doesn't cause jsdom network errors
vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  },
}));

vi.mock('../api/examApi', () => ({
  getExamInfo: vi.fn(),
}));

import { getExamInfo } from '../api/examApi';
import ExamLobby from '../pages/exam/ExamLobby';

const makeExam = (overrides = {}) => ({
  test_id: 'e1',
  title: 'Mock Exam',
  duration_minutes: 60,
  total_questions: 20,
  results_visible: false,
  ...overrides,
});

/** Render ExamLobby at /exam/e1 */
const renderLobby = () =>
  render(
    <MemoryRouter initialEntries={['/exam/e1']}>
      <Routes>
        <Route path="/exam/:testId" element={<ExamLobby />} />
        <Route path="/exam/:testId/result" element={<div>Result Page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('ExamLobby', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows loading spinner initially', () => {
    getExamInfo.mockReturnValueOnce(new Promise(() => {})); // never resolves

    renderLobby();

    // Spinner should be present before resolution
    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).toBeTruthy();
  });

  test('shows error message on API failure', async () => {
    getExamInfo.mockRejectedValueOnce({
      response: { data: { msg: 'You do not have access to this exam' } }
    });

    renderLobby();

    await waitFor(() => {
      expect(screen.getByText(/You do not have access to this exam/i)).toBeInTheDocument();
    });
  });

  test('shows exam title, duration, and question count', async () => {
    getExamInfo.mockResolvedValueOnce({
      data: { exam: makeExam(), submission: null }
    });

    renderLobby();

    await waitFor(() => {
      expect(screen.getByText('Mock Exam')).toBeInTheDocument();
    });

    expect(screen.getByText(/60 minutes/i)).toBeInTheDocument();
    expect(screen.getByText(/20 questions/i)).toBeInTheDocument();
  });

  test('renders all 6 exam rules', async () => {
    getExamInfo.mockResolvedValueOnce({
      data: { exam: makeExam(), submission: null }
    });

    renderLobby();

    await waitFor(() => {
      expect(screen.getByText(/timer cannot be paused/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/navigate freely/i)).toBeInTheDocument();
    expect(screen.getByText(/switch tabs/i)).toBeInTheDocument();
    expect(screen.getByText(/3 violations/i)).toBeInTheDocument();
    expect(screen.getByText(/auto-submit/i)).toBeInTheDocument();
    expect(screen.getByText(/admin releases/i)).toBeInTheDocument();
  });

  test('shows "Start Exam" button when submission is null', async () => {
    getExamInfo.mockResolvedValueOnce({
      data: { exam: makeExam(), submission: null }
    });

    renderLobby();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start Exam/i })).toBeInTheDocument();
    });
  });

  test('shows "Continue Exam" button when status is in_progress', async () => {
    getExamInfo.mockResolvedValueOnce({
      data: {
        exam: makeExam(),
        submission: { submission_id: 's1', status: 'in_progress' }
      }
    });

    renderLobby();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Continue Exam/i })).toBeInTheDocument();
    });
  });

  test('shows warned-out message and hides start button', async () => {
    getExamInfo.mockResolvedValueOnce({
      data: {
        exam: makeExam(),
        submission: { submission_id: 's1', status: 'warned_out' }
      }
    });

    renderLobby();

    await waitFor(() => {
      // "3 violations" appears in both Rule 4 and the warned-out banner.
      // getAllByText returns all matches; we just confirm at least 2 are present.
      expect(screen.getAllByText(/3 violations/i).length).toBeGreaterThanOrEqual(2);
    });

    expect(screen.queryByRole('button', { name: /start|continue/i })).not.toBeInTheDocument();
  });

  test('shows auto-closed message and hides start button', async () => {
    getExamInfo.mockResolvedValueOnce({
      data: {
        exam: makeExam(),
        submission: { submission_id: 's1', status: 'auto_closed' }
      }
    });

    renderLobby();

    await waitFor(() => {
      // The auto-close banner text contains "auto-submit" (from the rule) and a separate
      // auto_closed status message. Match the unique status message.
      expect(screen.getByText(/auto-closed/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /start|continue/i })).not.toBeInTheDocument();
  });

  test('shows "results available after admin releases" message when completed but not visible', async () => {
    getExamInfo.mockResolvedValueOnce({
      data: {
        exam: makeExam({ results_visible: false }),
        submission: { submission_id: 's1', status: 'completed' }
      }
    });

    renderLobby();

    await waitFor(() => {
      expect(screen.getByText(/results will be available/i)).toBeInTheDocument();
    });
  });

  test('redirects to result page when completed and results are visible', async () => {
    getExamInfo.mockResolvedValueOnce({
      data: {
        exam: makeExam({ results_visible: true }),
        submission: { submission_id: 's1', status: 'completed' }
      }
    });

    renderLobby();

    await waitFor(() => {
      expect(screen.getByText('Result Page')).toBeInTheDocument();
    });
  });
});
