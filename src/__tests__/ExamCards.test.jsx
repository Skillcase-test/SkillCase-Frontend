/**
 * Frontend Tests — ExamCards.jsx
 *
 * Tests rendering behaviour for all exam states:
 * - Not yet open (countdown + locked)
 * - Window closed
 * - In progress
 * - Completed (with and without results visible)
 * - Warned out / auto closed
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock axios BEFORE examApi is imported so the real baseURL is never set.
// Without this, jsdom throws UND_ERR_INVALID_ARG on every test.
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

// Mock examApi directly so getVisibleExams is a vi.fn() we control.
vi.mock('../api/examApi', () => ({
  getVisibleExams: vi.fn(),
}));

// Mock Redux so ExamCards doesn't need a real store
vi.mock('react-redux', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useSelector: vi.fn(() => ({ user_id: 'test-user', role: 'user' })),
    useDispatch: vi.fn(() => vi.fn()),
  };
});

import { getVisibleExams } from '../api/examApi';
import ExamCards from '../pages/exam/ExamCards';

/** Helper: render ExamCards inside a router */
const renderExamCards = () =>
  render(
    <MemoryRouter>
      <ExamCards />
    </MemoryRouter>
  );

/** Build a minimal exam object */
const makeExam = (overrides = {}) => ({
  test_id: 'exam-1',
  title: 'Mock Exam',
  duration_minutes: 60,
  total_questions: 20,
  is_active: true,
  results_visible: false,
  available_from: null,
  available_until: null,
  status: null,
  score: null,
  ...overrides,
});

describe('ExamCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders nothing / returns null when no exams', async () => {
    getVisibleExams.mockResolvedValueOnce({ data: { exams: [] } });

    const { container } = renderExamCards();

    // Wait for loading to complete
    await waitFor(() => {
      expect(getVisibleExams).toHaveBeenCalledOnce();
    });

    // ExamCards returns null when no exams
    expect(container.firstChild).toBeNull();
  });

  test('shows exam title and meta when exam is available', async () => {
    getVisibleExams.mockResolvedValueOnce({
      data: { exams: [makeExam()] }
    });

    renderExamCards();

    await waitFor(() => {
      expect(screen.getByText('Mock Exam')).toBeInTheDocument();
    });

    expect(screen.getByText(/60 min/i)).toBeInTheDocument();
    expect(screen.getByText(/20/i)).toBeInTheDocument();
  });

  test('shows countdown timer and lock icon for exam not yet open', async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    getVisibleExams.mockResolvedValueOnce({
      data: { exams: [makeExam({ available_from: tomorrow })] }
    });

    renderExamCards();

    await waitFor(() => {
      expect(screen.getByText('Mock Exam')).toBeInTheDocument();
    });

    // Should show "Starts in" countdown
    expect(screen.getByText(/Starts in/i)).toBeInTheDocument();
  });

  test('shows "Window Closed" badge when exam window has passed', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    getVisibleExams.mockResolvedValueOnce({
      data: {
        exams: [makeExam({ available_until: yesterday })]
      }
    });

    renderExamCards();

    await waitFor(() => {
      expect(screen.getByText(/Window Closed/i)).toBeInTheDocument();
    });
  });

  test('shows "In Progress" badge for in-progress exam', async () => {
    getVisibleExams.mockResolvedValueOnce({
      data: { exams: [makeExam({ status: 'in_progress' })] }
    });

    renderExamCards();

    await waitFor(() => {
      expect(screen.getByText(/In Progress/i)).toBeInTheDocument();
    });
  });

  test('shows score badge when exam completed and results visible', async () => {
    getVisibleExams.mockResolvedValueOnce({
      data: { exams: [makeExam({ status: 'completed', results_visible: true, score: '87.50' })] }
    });

    renderExamCards();

    await waitFor(() => {
      expect(screen.getByText(/Score: 88%/i)).toBeInTheDocument();
    });
  });

  test('shows "Submitted" badge when exam completed but results not visible', async () => {
    getVisibleExams.mockResolvedValueOnce({
      data: { exams: [makeExam({ status: 'completed', results_visible: false })] }
    });

    renderExamCards();

    await waitFor(() => {
      expect(screen.getByText(/Submitted/i)).toBeInTheDocument();
    });
  });

  test('shows "Closed" badge for warned_out exam', async () => {
    getVisibleExams.mockResolvedValueOnce({
      data: { exams: [makeExam({ status: 'warned_out' })] }
    });

    renderExamCards();

    await waitFor(() => {
      expect(screen.getByText(/Closed/i)).toBeInTheDocument();
    });
  });

  test('shows "Closed" badge for auto_closed exam', async () => {
    getVisibleExams.mockResolvedValueOnce({
      data: { exams: [makeExam({ status: 'auto_closed' })] }
    });

    renderExamCards();

    await waitFor(() => {
      expect(screen.getByText(/Closed/i)).toBeInTheDocument();
    });
  });

  test('links to /exam/:testId for available exam', async () => {
    getVisibleExams.mockResolvedValueOnce({
      data: { exams: [makeExam()] }
    });

    renderExamCards();

    await waitFor(() => {
      expect(screen.getByText('Mock Exam')).toBeInTheDocument();
    });

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/exam/exam-1');
  });

  test('links to /exam/:testId/result for completed exam with results visible', async () => {
    getVisibleExams.mockResolvedValueOnce({
      data: { exams: [makeExam({ status: 'completed', results_visible: true, score: '75' })] }
    });

    renderExamCards();

    await waitFor(() => {
      expect(screen.getByText('Mock Exam')).toBeInTheDocument();
    });

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/exam/exam-1/result');
  });

  test('handles API error gracefully (shows no exams)', async () => {
    getVisibleExams.mockRejectedValueOnce(new Error('Network error'));

    const { container } = renderExamCards();

    await waitFor(() => {
      expect(getVisibleExams).toHaveBeenCalledOnce();
    });

    // No crash, returns null
    expect(container.firstChild).toBeNull();
  });
});
