import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  createContext,
} from "react";
import { useSensors, useSensor } from "@dnd-kit/core";
import { PointerSensor, KeyboardSensor } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  GraduationCap,
  Plus,
  Loader2,
  X,
  Clock,
  FileQuestion,
  Users,
  ListChecks,
  LayoutDashboard,
  Play,
  Copy,
  Trash2,
  Award,
  UserPlus,
  History,
  ArrowLeft,
  Edit2,
} from "lucide-react";
import Chip from "./ui/Chip";
import toast, { Toaster } from "react-hot-toast";
import { getDefaultData, normalizeQuestionData } from "../AdminExamManager";

import * as api from "../../../../api/scholarshipExamApi";
import PathwaysHub from "./PathwaysHub";
import PathwayModal from "./PathwayModal";
import ExamSidebar from "./ExamSidebar";
import OverviewTab from "./OverviewTab";
import QuestionsTab from "./QuestionsTab";
import CandidatesTab from "./CandidatesTab";
import SubmissionsTab from "./SubmissionsTab";
import TiersTab from "./TiersTab";
import UserAwardsTab from "./UserAwardsTab";
import ActivityLogTab from "./ActivityLogTab";
import CreateExamModal from "./CreateExamModal";
import ConfirmDialog from "./ui/ConfirmDialog";
import { btn } from "./ui/buttons";
import { toUTC, toLocalInput } from "../../../../utils/dateTime";
import { ControlDropdown } from "../../../payments-admin/components/controls";
import { hasPermission, useAdminAccess } from "../../../../utils/adminPermissions";

// ─── Helpers ────────────────────────────────────────────────────────────────

const releaseToastMessage = (data) => {
  const sent = data?.notifications_sent;
  if (sent == null) return "Results released";
  if (sent === 0) return "Results released — no devices reachable, nothing sent";
  return `Results released — ${sent} notification${sent === 1 ? "" : "s"} sent`;
};

// eslint-disable-next-line react-refresh/only-export-components
export const questionLabel = (q) =>
  q?.question_data?.question ||
  q?.question_data?.title ||
  q?.question_data?.text ||
  q?.question_data?.incorrect_sentence ||
  (q?.question_type || "").replace(/_/g, " ");

// ─── Workspace context ──────────────────────────────────────────────────────

const WorkspaceContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useScholarshipWorkspace = () => useContext(WorkspaceContext);

const EMPTY_NEW_EXAM = {
  pathway_id: null,
  title: "",
  description: "",
  duration_minutes: 60,
  available_from: null,
  available_until: null,
  is_active: false,
};

// ─── Orchestrator ───────────────────────────────────────────────────────────

export default function AdminScholarshipManager({ me: propMe } = {}) {
  const me = useAdminAccess(propMe);
  const examActions = me?.permissions?.scholarship_exam || [];
  const isSuperAdmin = me?.role === "super_admin";

  const isGrader = Boolean(
    examActions.includes("grader") &&
      !examActions.includes("edit") &&
      !examActions.includes("manage") &&
      !examActions.includes("create"),
  );

  const canCreateExam = Boolean(
    !isGrader && (isSuperAdmin || examActions.includes("create") || examActions.includes("manage")),
  );
  const canEditExam = Boolean(
    !isGrader && (isSuperAdmin || examActions.includes("edit") || examActions.includes("manage")),
  );
  const canDeleteExam = Boolean(
    !isGrader && (isSuperAdmin || examActions.includes("delete") || examActions.includes("manage")),
  );
  const hasFullExamAccess = !isGrader;

  const [exams, setExams] = useState([]);
  const [pathways, setPathways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState({ active: false, label: "" });

  // Active view: null = PathwaysHub (Level 1), number = Scoped Workspace (Level 2)
  const [activePathwayId, setActivePathwayId] = useState(null);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [pathwayModalState, setPathwayModalState] = useState({
    isOpen: false,
    pathway: null,
  });
  const [newExam, setNewExam] = useState(EMPTY_NEW_EXAM);
  const [confirm, setConfirm] = useState(null);

  // Selected Exam inside Level 2
  const [selectedExam, setSelectedExam] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [tab, setTab] = useState(isGrader ? "candidates" : "overview");

  useEffect(() => {
    if (isGrader && (tab === "overview" || tab === "questions" || tab === "tiers" || tab === "audit_log")) {
      setTab("candidates");
    }
  }, [isGrader, tab]);

  const [editSettings, setEditSettings] = useState(null);

  // Question form state
  const [qForm, setQForm] = useState({
    question_type: "mcq_single",
    question_data: getDefaultData("mcq_single"),
    points: 1,
  });
  const [audioFile, setAudioFile] = useState(null);
  const [audioLink, setAudioLink] = useState("");
  const [imageBlockFile, setImageBlockFile] = useState(null);
  const [questionImageFile, setQuestionImageFile] = useState(null);
  const [optionImageFiles, setOptionImageFiles] = useState({});
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  // Visibility state
  const [visStudents, setVisStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [visQuery, setVisQuery] = useState("");

  // Submissions state
  const [submissions, setSubmissions] = useState([]);
  const [submissionDetail, setSubmissionDetail] = useState(null);
  const [itemOverrides, setItemOverrides] = useState({});
  const [tiers, setTiers] = useState([]);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const runWithActionLoading = useCallback(async (label, fn) => {
    setActionLoading({ active: true, label });
    try {
      return await fn();
    } finally {
      setActionLoading({ active: false, label: "" });
    }
  }, []);

  // ── Exam list ────────────────────────────────────────────────────────────

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listExams();
      setExams(res.data?.exams || []);
    } catch {
      setError("Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const fetchPathways = useCallback(async () => {
    try {
      const res = await api.listPathways();
      setPathways(res.data?.pathways || []);
    } catch {
      // Non-fatal: the exam workspace still works without the pathway list.
      setPathways([]);
    }
  }, []);

  useEffect(() => {
    fetchPathways();
  }, [fetchPathways]);

  // ── Exam detail ──────────────────────────────────────────────────────────

  const openExam = useCallback(async (testId) => {
    setLoading(true);
    try {
      const res = await api.getExamDetail(testId);
      setSelectedExam(res.data?.exam);
      setExamQuestions(res.data?.questions || []);
      setTab(isGrader ? "candidates" : "overview");
      setError("");
      if (isGrader) {
        api.getExamVisibility(testId).then((visRes) => {
          setVisStudents(visRes.data?.students || []);
        }).catch(() => {});
        api.listAllStudents().then((studentsRes) => {
          setAllStudents(studentsRes.data?.students || []);
        }).catch(() => {});
      }
    } catch {
      setError("Failed to load exam");
    } finally {
      setLoading(false);
    }
  }, [isGrader]);

  const refreshDetail = useCallback(async () => {
    if (!selectedExam) return;
    try {
      const res = await api.getExamDetail(selectedExam.test_id);
      setSelectedExam(res.data?.exam);
      setExamQuestions(res.data?.questions || []);
    } catch {
      setError("Failed to refresh exam");
    }
  }, [selectedExam]);

  const switchExam = useCallback(
    (testId) => {
      openExam(Number(testId));
    },
    [openExam],
  );

  const handleSelectPathway = useCallback(
    (pathway) => {
      setActivePathwayId(Number(pathway.id));
      const pathwayExams = exams.filter(
        (e) => Number(e.pathway_id) === Number(pathway.id),
      );
      const live = pathwayExams.find((e) => e.is_active);
      const target = live || pathwayExams[0];
      if (target) {
        openExam(target.test_id);
      } else {
        setSelectedExam(null);
      }
    },
    [exams, openExam],
  );

  const handleBackToPathways = useCallback(() => {
    setActivePathwayId(null);
    setSelectedExam(null);
  }, []);

  useEffect(() => {
    if (
      activePathwayId &&
      pathways.length > 0 &&
      !pathways.some((p) => p.id === activePathwayId)
    ) {
      setActivePathwayId(null);
      setSelectedExam(null);
    }
  }, [pathways, activePathwayId]);

  // ── Create / Delete / Duplicate / Activate ───────────────────────────────

  const handleCreateExam = async () => {
    if (!newExam.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const targetPathwayId = newExam.pathway_id || activePathwayId;
    if (!targetPathwayId) {
      toast.error("Please select a pathway for this exam");
      return;
    }
    if (!newExam.duration_minutes || newExam.duration_minutes < 1) {
      toast.error("Duration must be at least 1 minute");
      return;
    }
    setSaving(true);
    try {
      const created = await runWithActionLoading("Creating exam...", () =>
        api.createExam({
          pathway_id: newExam.pathway_id,
          title: newExam.title,
          description: newExam.description,
          duration_minutes: newExam.duration_minutes,
          available_from: toUTC(newExam.available_from),
          available_until: toUTC(newExam.available_until),
          is_active: newExam.is_active,
        }),
      );

      toast.success("Exam created");
      setShowCreate(false);
      setNewExam(EMPTY_NEW_EXAM);
      await Promise.all([fetchExams(), fetchPathways()]);
      if (created?.data?.exam?.test_id) {
        openExam(created.data.exam.test_id);
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to create exam");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExam = (exam) => {
    requestConfirm({
      title: "Delete exam?",
      message: `"${exam.title}" and all of its questions, submissions and audio will be permanently removed. This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
      action: async () => {
        try {
          await runWithActionLoading("Deleting exam...", () =>
            api.deleteExam(exam.test_id),
          );
          toast.success("Exam deleted");
          if (selectedExam?.test_id === exam.test_id) setSelectedExam(null);
          await fetchExams();
        } catch {
          toast.error("Failed to delete exam");
        }
      },
    });
  };

  const handleDuplicate = (exam) => {
    requestConfirm({
      title: "Duplicate exam?",
      message: `A copy of "${exam.title}" will be created as a draft. All audio and images are copied to fresh files, so the original stays untouched.`,
      confirmLabel: "Yes, Duplicate",
      action: async () => {
        try {
          const res = await runWithActionLoading("Duplicating exam...", () =>
            api.duplicateExam(exam.test_id),
          );
          toast.success(`Duplicated as "${res.data?.exam?.title}"`);
          await fetchExams();
        } catch (err) {
          toast.error(err.response?.data?.msg || "Failed to duplicate exam");
        }
      },
    });
  };

  const handleToggleActive = (exam, nextActive) => {
    if (nextActive) {
      const other = exams.find((e) => e.is_active && e.test_id !== exam.test_id);
      if (other) {
        requestConfirm({
          title: "Switch the live exam?",
          message: `Only one exam is served at a time. Activating "${exam.title}" will deactivate "${other?.title || "the current exam"}". Continue?`,
          confirmLabel: "Yes, Activate",
          action: () => doToggleActive(exam, true),
        });
      } else {
        requestConfirm({
          title: "Activate exam?",
          message: `"${exam.title}" will become the live exam served to candidates.`,
          confirmLabel: "Yes, Activate",
          action: () => doToggleActive(exam, true),
        });
      }
      return;
    }
    requestConfirm({
      title: "Deactivate exam?",
      message: `"${exam.title}" will stop being served to candidates. Existing in-progress attempts are preserved.`,
      confirmLabel: "Yes, Deactivate",
      action: () => doToggleActive(exam, false),
    });
  };

  const doToggleActive = async (exam, nextActive) => {
    try {
      await runWithActionLoading(
        nextActive ? "Activating exam..." : "Deactivating exam...",
        () => api.updateExam(exam.test_id, { is_active: nextActive }),
      );
      toast.success(nextActive ? "Exam is now live" : "Exam deactivated");
      await fetchExams();
      if (selectedExam?.test_id === exam.test_id) {
        setSelectedExam((prev) => (prev ? { ...prev, is_active: nextActive } : prev));
      }
    } catch {
      toast.error("Failed to update exam status");
    }
  };

  const handleToggleResultsVisible = (exam) => {
    const nextVisible = !exam.results_visible;
    requestConfirm({
      title: nextVisible ? "Release results?" : "Hide results?",
      message: nextVisible
        ? `Every candidate who finished "${exam.title}" will see their scholarship award and receive a push notification. Tiers will be locked until you hide results again.`
        : `Scholarship results will no longer be visible to candidates for "${exam.title}". Tiers can be edited again.`,
      confirmLabel: nextVisible ? "Yes, Release Results" : "Yes, Hide Results",
      requireAck: nextVisible,
      ackLabel: "I understand tiers will be locked",
      action: () => doToggleResultsVisible(exam, nextVisible),
    });
  };

  const doToggleResultsVisible = async (exam, nextVisible) => {
    try {
      const res = await runWithActionLoading("Updating result visibility...", () =>
        api.updateExam(exam.test_id, { results_visible: nextVisible }),
      );
      toast.success(nextVisible ? releaseToastMessage(res.data) : "Results hidden");
      await fetchExams();
      if (selectedExam?.test_id === exam.test_id) setSelectedExam(res.data?.exam);
      await loadTiers();
    } catch (err) {
      const msg = err.response?.data?.msg || "Failed to update result visibility";
      toast.error(msg);
    }
  };

  // ── Pathways ─────────────────────────────────────────────────────────────

  const handleSavePathwayModal = async (formData, pathwayId) => {
    setSaving(true);
    try {
      if (pathwayId) {
        await runWithActionLoading("Saving pathway...", () =>
          api.updatePathway(pathwayId, formData),
        );
        toast.success("Pathway updated");
      } else {
        await runWithActionLoading("Creating pathway...", () =>
          api.createPathway(formData),
        );
        toast.success("Pathway created");
      }
      setPathwayModalState({ isOpen: false, pathway: null });
      await Promise.all([fetchPathways(), fetchExams()]);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to save pathway");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePathway = (pathway) => {
    if (pathway.is_builtin) return;
    requestConfirm({
      title: "Delete pathway?",
      message: `"${pathway.title}" and its configuration will be permanently removed. Pathways with existing candidate exam attempts cannot be deleted.`,
      confirmLabel: "Delete",
      danger: true,
      action: async () => {
        try {
          await runWithActionLoading("Deleting pathway...", () =>
            api.deletePathway(pathway.id),
          );
          toast.success("Pathway deleted");
          if (activePathwayId === pathway.id) {
            setActivePathwayId(null);
            setSelectedExam(null);
          }
          await Promise.all([fetchPathways(), fetchExams()]);
        } catch (err) {
          toast.error(err.response?.data?.msg || "Failed to delete pathway");
        }
      },
    });
  };

  // ── Settings ─────────────────────────────────────────────────────────────

  const openSettings = () => {
    if (!selectedExam) return;
    setEditSettings({
      title: selectedExam.title || "",
      description: selectedExam.description || "",
      duration_minutes: selectedExam.duration_minutes || 60,
      available_from: toLocalInput(selectedExam.available_from),
      available_until: toLocalInput(selectedExam.available_until),
    });
  };

  const handleSaveSettings = async () => {
    if (!editSettings?.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const res = await runWithActionLoading("Saving settings...", () =>
        api.updateExam(selectedExam.test_id, {
          title: editSettings.title.trim(),
          description: editSettings.description || null,
          duration_minutes: parseInt(editSettings.duration_minutes),
          available_from: toUTC(editSettings.available_from),
          available_until: toUTC(editSettings.available_until),
        }),
      );
      toast.success("Exam settings saved");
      setSelectedExam(res.data?.exam);
      await fetchExams();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // ── Questions ────────────────────────────────────────────────────────────

  const resetQuestionForm = () => {
    setQForm({
      question_type: "mcq_single",
      question_data: getDefaultData("mcq_single"),
      points: 1,
    });
    setAudioFile(null);
    setAudioLink("");
    setImageBlockFile(null);
    setQuestionImageFile(null);
    setOptionImageFiles({});
    setEditingQuestionId(null);
  };

  const handleQuestionTypeChange = (type) => {
    setQForm({
      question_type: type,
      question_data: getDefaultData(type),
      points: qForm.points,
    });
    setAudioFile(null);
    setAudioLink("");
    setImageBlockFile(null);
    setQuestionImageFile(null);
    setOptionImageFiles({});
  };

  const startEditQuestion = (q) => {
    setEditingQuestionId(q.question_id);
    setQForm({
      question_type: q.question_type,
      question_data: normalizeQuestionData(q.question_type, q.question_data),
      points: q.points,
    });
    setAudioFile(null);
    setAudioLink(q.audio_url || "");
    setImageBlockFile(null);
    setQuestionImageFile(null);
    setOptionImageFiles({});
  };

  const buildQuestionFormData = () => {
    const formData = new FormData();
    formData.append("question_type", qForm.question_type);
    formData.append("question_data", JSON.stringify(qForm.question_data));
    formData.append("points", qForm.points);
    if (audioFile) formData.append("audio", audioFile);
    formData.append("audio_url", audioLink.trim());
    if (imageBlockFile) formData.append("image_block_file", imageBlockFile);
    if (questionImageFile) formData.append("question_image_file", questionImageFile);
    Object.entries(optionImageFiles).forEach(([idx, file]) => {
      if (file) formData.append(`option_image_file_${idx}`, file);
    });
    return formData;
  };

  const handleAddQuestion = async () => {
    if (!selectedExam) return;
    setSaving(true);
    try {
      await runWithActionLoading("Adding question...", () =>
        api.addQuestion(selectedExam.test_id, buildQuestionFormData()),
      );
      toast.success("Question added");
      resetQuestionForm();
      await refreshDetail();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to add question");
    } finally {
      setSaving(false);
    }
  };

  const handleEditQuestion = async () => {
    if (!selectedExam || !editingQuestionId) return;
    setSaving(true);
    try {
      await runWithActionLoading("Saving question...", () =>
        api.editQuestion(selectedExam.test_id, editingQuestionId, buildQuestionFormData()),
      );
      toast.success("Question updated");
      resetQuestionForm();
      await refreshDetail();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to update question");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = (questionId) => {
    requestConfirm({
      title: "Delete this question?",
      message: "The question will be removed from the exam. This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
      action: async () => {
        try {
          await runWithActionLoading("Deleting question...", () =>
            api.deleteQuestion(selectedExam.test_id, questionId),
          );
          toast.success("Question deleted");
          await refreshDetail();
        } catch {
          toast.error("Failed to delete question");
        }
      },
    });
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = examQuestions.findIndex((q) => q.question_id === active.id);
    const newIndex = examQuestions.findIndex((q) => q.question_id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...examQuestions];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setExamQuestions(reordered);
    try {
      await api.reorderQuestions(
        selectedExam.test_id,
        reordered.map((q) => q.question_id),
      );
    } catch {
      setExamQuestions(examQuestions);
      toast.error("Failed to reorder questions");
    }
  };

  // ── Visibility ───────────────────────────────────────────────────────────

  const loadVisibility = useCallback(async () => {
    if (!selectedExam) return;
    try {
      const [visRes, studentsRes] = await Promise.all([
        api.getExamVisibility(selectedExam.test_id),
        api.listAllStudents(),
      ]);
      setVisStudents(visRes.data?.students || []);
      setAllStudents(studentsRes.data?.students || []);
    } catch {
      toast.error("Failed to load visibility");
    }
  }, [selectedExam]);

  const handleAddStudents = async (userIds) => {
    if (!userIds.length) return;
    try {
      const res = await runWithActionLoading("Adding candidates...", () =>
        api.setExamVisibility(selectedExam.test_id, userIds),
      );
      const data = res?.data || {};
      const conflicts = Array.isArray(data.conflicts) ? data.conflicts : [];
      const added = data.count ?? userIds.length - conflicts.length;

      if (conflicts.length > 0) {
        const first = conflicts[0]?.msg || conflicts[0]?.conflicting_exam_title;
        toast(
          added > 0
            ? `Added ${added}. ${conflicts.length} refused — ${first || "already active in another exam"}.`
            : `Refused — ${first || "already active in another exam"}.`,
          { icon: "⚠️" },
        );
      } else {
        toast.success(
          added === 1
            ? "Candidate granted access"
            : `${added} candidates granted access`,
        );
      }
      await loadVisibility();
    } catch (err) {
      const data = err?.response?.data;
      const conflicts = Array.isArray(data?.conflicts) ? data.conflicts : [];
      const first = conflicts[0]?.msg || data?.msg;
      toast.error(
        first || "Failed to add candidates",
      );
      if (data?.count > 0) await loadVisibility();
    }
  };

  const handleRemoveStudent = (visId, name) => {
    requestConfirm({
      title: "Remove candidate?",
      message: `"${name}" will lose access to this exam. Their submission stays intact, and removing them frees them to be added to a different exam.`,
      confirmLabel: "Remove",
      danger: true,
      action: async () => {
        try {
          await runWithActionLoading("Removing student...", () =>
            api.removeExamVisibility(selectedExam.test_id, visId),
          );
          toast.success("Student removed");
          await loadVisibility();
        } catch {
          toast.error("Failed to remove student");
        }
      },
    });
  };

  const handleRemoveStudents = (visIds) => {
    if (!visIds.length) return;
    requestConfirm({
      title:
        visIds.length === 1
          ? "Remove candidate?"
          : `Remove ${visIds.length} candidates?`,
      message: `They will lose access to this exam. Submissions stay intact, and removing them frees each candidate to be added to a different exam.`,
      confirmLabel: "Yes, Remove",
      danger: true,
      action: async () => {
        try {
          await runWithActionLoading("Removing candidates...", () =>
            api.removeExamVisibilityBulk(selectedExam.test_id, visIds),
          );
          toast.success(
            visIds.length === 1
              ? "Candidate removed"
              : `${visIds.length} candidates removed`,
          );
          await loadVisibility();
        } catch {
          toast.error("Failed to remove candidates");
        }
      },
    });
  };

  const addableStudents = useMemo(() => {
    const granted = new Set(visStudents.map((s) => s.user_id));
    const q = studentQuery.trim().toLowerCase();
    return allStudents
      .filter((s) => !granted.has(s.user_id))
      .filter(
        (s) =>
          !q ||
          (s.fullname || "").toLowerCase().includes(q) ||
          (s.username || "").toLowerCase().includes(q) ||
          (s.number || "").includes(q),
      );
  }, [allStudents, visStudents, studentQuery]);

  const filteredVisStudents = useMemo(() => {
    const q = visQuery.trim().toLowerCase();
    if (!q) return visStudents;
    return visStudents.filter(
      (s) =>
        (s.fullname || "").toLowerCase().includes(q) ||
        (s.username || "").toLowerCase().includes(q) ||
        (s.number || "").includes(q),
    );
  }, [visStudents, visQuery]);

  const loadTiers = useCallback(async () => {
    if (!selectedExam) return;
    try {
      const res = await api.listTiers(selectedExam.test_id);
      setTiers(res.data?.tiers || []);
    } catch {
      // silent — chip just won't show
    }
  }, [selectedExam]);

  useEffect(() => {
    if (!isGrader) {
      loadTiers();
    }
  }, [loadTiers, isGrader]);

  // ── Submissions ──────────────────────────────────────────────────────────

  const loadSubmissions = useCallback(async () => {
    if (!selectedExam) return;
    try {
      const res = await api.getExamSubmissions(selectedExam.test_id);
      setSubmissions(res.data?.submissions || []);
    } catch {
      toast.error("Failed to load submissions");
    }
  }, [selectedExam]);

  const openSubmissionDetail = async (submissionId) => {
    try {
      const res = await runWithActionLoading("Loading submission...", () =>
        api.getSubmissionDetail(submissionId),
      );
      setSubmissionDetail(res.data);
      setItemOverrides({});
    } catch {
      toast.error("Failed to load submission");
    }
  };

  const handleReopen = (submissionId) => {
    requestConfirm({
      title: "Reopen this exam?",
      message: "The student will be able to continue their exam from where they left off.",
      confirmLabel: "Reopen",
      action: async () => {
        try {
          await runWithActionLoading("Reopening...", () =>
            api.reopenSubmission(submissionId),
          );
          toast.success("Test reopened");
          await loadSubmissions();
        } catch {
          toast.error("Failed to reopen");
        }
      },
    });
  };

  const handleResetRetest = (submissionId) => {
    requestConfirm({
      title: "Clear & retest?",
      message: "All answers will be cleared so the student can take a fresh attempt. This cannot be undone.",
      confirmLabel: "Clear & Retest",
      danger: true,
      action: async () => {
        try {
          await runWithActionLoading("Resetting...", () =>
            api.resetSubmissionForRetest(submissionId),
          );
          toast.success("Submission cleared for retest");
          await loadSubmissions();
        } catch {
          toast.error("Failed to reset submission");
        }
      },
    });
  };

  const handleOverrideAnswer = async (questionId) => {
    if (!submissionDetail) return;
    try {
      const res = await runWithActionLoading("Saving override...", () =>
        api.overrideAnswer(submissionDetail.submission.submission_id, questionId),
      );
      const { is_correct, points_earned, earned_points, score } = res.data;
      setSubmissionDetail((prev) => ({
        ...prev,
        submission: { ...prev.submission, earned_points, score },
        questions: prev.questions.map((q) =>
          q.question_id === questionId ? { ...q, is_correct, points_earned } : q,
        ),
      }));
    } catch {
      toast.error("Failed to override answer");
    }
  };

  const handleOverrideAnswerPoints = async (questionId, computedPoints) => {
    if (!submissionDetail) return;
    try {
      const res = await runWithActionLoading("Saving score correction...", () =>
        api.overrideAnswerPoints(
          submissionDetail.submission.submission_id,
          questionId,
          computedPoints,
        ),
      );
      const { is_correct, points_earned, earned_points, score } = res.data;
      setSubmissionDetail((prev) => ({
        ...prev,
        submission: { ...prev.submission, earned_points, score },
        questions: prev.questions.map((q) =>
          q.question_id === questionId ? { ...q, is_correct, points_earned } : q,
        ),
      }));
      setItemOverrides((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    } catch {
      toast.error("Failed to save corrections");
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.exportExamExcel(selectedExam.test_id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(selectedExam.title || "scholarship").replace(/[^a-z0-9_-]/gi, "_")}_submissions.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export (no finished submissions?)");
    }
  };

  // ── Derived State ────────────────────────────────────────────────────────

  const requestConfirm = (opts) => setConfirm(opts);
  const selectedPathway = pathways.find((p) => Number(p.id) === Number(activePathwayId)) || null;

  const value = {
    canCreateExam,
    canEditExam,
    canDeleteExam,
    isGrader,
    isSuperAdmin,
    hasFullExamAccess,
    exams,
    loading,
    saving,
    error,
    setError,
    actionLoading,
    selectedExam,
    examQuestions,
    tab,
    setTab,
    editSettings,
    setEditSettings,
    openSettings,
    handleSaveSettings,
    // question form
    qForm,
    setQForm,
    setAudioFile,
    audioLink,
    setAudioLink,
    setImageBlockFile,
    setQuestionImageFile,
    setOptionImageFiles,
    editingQuestionId,
    resetQuestionForm,
    handleQuestionTypeChange,
    startEditQuestion,
    handleAddQuestion,
    handleEditQuestion,
    handleDeleteQuestion,
    handleDragEnd,
    dndSensors,
    // visibility
    visStudents,
    allStudents,
    studentQuery,
    setStudentQuery,
    visQuery,
    setVisQuery,
    addableStudents,
    filteredVisStudents,
    loadVisibility,
    handleAddStudents,
    handleRemoveStudent,
    handleRemoveStudents,
    tiers,
    loadTiers,
    // submissions
    submissions,
    submissionDetail,
    setSubmissionDetail,
    itemOverrides,
    setItemOverrides,
    loadSubmissions,
    openSubmissionDetail,
    handleReopen,
    handleResetRetest,
    handleOverrideAnswer,
    handleOverrideAnswerPoints,
    handleExport,
    // exam management
    fetchExams,
    openExam,
    switchExam,
    refreshDetail,
    handleCreateExam,
    handleDeleteExam,
    handleDuplicate,
    handleToggleActive,
    handleToggleResultsVisible,
    // pathway context
    pathways,
    selectedPathway,
    activePathwayId,
    handleSelectPathway,
    handleBackToPathways,
    handleSavePathwayModal,
    handleDeletePathway,
    // ui state
    showCreate,
    setShowCreate,
    newExam,
    setNewExam,
    confirm,
    requestConfirm,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      <div className="space-y-5 p-6 max-w-[1400px] mx-auto">
        <Toaster position="top-right" />

        {actionLoading.active && (
          <div className="fixed top-4 right-4 z-[200] flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            {actionLoading.label || "Loading..."}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            {error}
            <button onClick={() => setError("")} aria-label="Dismiss error">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Level 1: Pathways Hub */}
        {activePathwayId === null ? (
          <PathwaysHub
            pathways={pathways}
            exams={exams}
            loading={loading}
            onSelectPathway={handleSelectPathway}
            onOpenCreatePathway={() =>
              setPathwayModalState({ isOpen: true, pathway: null })
            }
            onEditPathway={(pathway) =>
              setPathwayModalState({ isOpen: true, pathway })
            }
            onDeletePathway={handleDeletePathway}
          />
        ) : (
          /* Level 2: Scoped Pathway Exam Workspace */
          <>
            {/* Pathway Header Bar with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#e5e7eb] shadow-sm">
              <div className="flex items-center gap-4 min-w-0">
                <button
                  type="button"
                  onClick={handleBackToPathways}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-[#002856] bg-slate-100 hover:bg-slate-200 rounded-xl transition shrink-0 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> All Pathways
                </button>

                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#002856] flex items-center justify-center shrink-0 border border-blue-100 overflow-hidden">
                    {selectedPathway?.image_url ? (
                      <img
                        src={selectedPathway.image_url}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <GraduationCap className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-lg font-bold text-slate-800 truncate">
                        {selectedPathway?.title || "Exam Pathway"}
                      </h1>
                      {selectedPathway?.badge && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                          {selectedPathway.badge}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          selectedPathway?.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {selectedPathway?.is_active ? "Onboarding Active" : "Hidden"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!isGrader && canEditExam && (
                  <button
                    type="button"
                    onClick={() =>
                      setPathwayModalState({ isOpen: true, pathway: selectedPathway })
                    }
                    className={btn.secondary}
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Pathway
                  </button>
                )}
                {canCreateExam && !isGrader && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewExam((prev) => ({
                        ...prev,
                        pathway_id: activePathwayId,
                      }));
                      setShowCreate(true);
                    }}
                    className={btn.primary}
                  >
                    <Plus className="w-4 h-4" /> New Exam
                  </button>
                )}
              </div>
            </div>

            {/* Mobile exam switcher */}
            <div className="lg:hidden">
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Exam
              </label>
              <ControlDropdown
                aria-label="Exam"
                value={String(selectedExam?.test_id ?? "")}
                onChange={switchExam}
                options={exams
                  .filter((e) => Number(e.pathway_id) === Number(activePathwayId))
                  .map((e) => ({
                    value: String(e.test_id),
                    label: `${e.is_active ? "● " : ""}${e.title}${e.is_active ? " (Live)" : " (Draft)"}`,
                  }))}
                placeholder="Select an exam…"
              />
            </div>

            {/* Scoped Workspace Layout */}
            <div className="flex gap-5 items-start">
              <ExamSidebar onSelect={switchExam} />
              <main className="flex-1 min-w-0">
                {!selectedExam ? (
                  <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm flex flex-col items-center justify-center py-20 text-center">
                    <GraduationCap className="w-12 h-12 text-[#002856]/20 mb-3" />
                    <p className="font-semibold text-slate-700">
                      No exam selected in {selectedPathway?.title || "this pathway"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      Create an exam or pick an existing draft from the sidebar to manage it.
                    </p>
                    {canCreateExam && !isGrader && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewExam((prev) => ({
                            ...prev,
                            pathway_id: activePathwayId,
                          }));
                          setShowCreate(true);
                        }}
                        className={btn.primary}
                      >
                        <Plus className="w-4 h-4" /> Create First Exam
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Exam Header & Tabs */}
                    <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm px-6 py-5 mb-5">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-lg font-bold text-slate-800 truncate">
                              {selectedExam.title}
                            </h2>
                            <Chip
                              cls={
                                selectedExam.is_active
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }
                            >
                              {selectedExam.is_active ? "● Live" : "Draft"}
                            </Chip>
                            {selectedExam.results_visible && (
                              <Chip cls="bg-amber-50 text-amber-700 border-amber-200">
                                Results out
                              </Chip>
                            )}
                            {selectedExam.results_visible && !isGrader && tiers.length > 0 && (
                              <Chip cls="bg-sky-50 text-sky-700 border-sky-200">
                                Up to {Math.max(...tiers.map((t) => Number(t.scholarship_pct)))}% scholarship
                              </Chip>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {selectedExam.duration_minutes} min
                            </span>
                            <span className="text-slate-200">·</span>
                            <span className="inline-flex items-center gap-1">
                              <FileQuestion className="w-3.5 h-3.5" /> {selectedExam.total_questions || 0} Qs
                            </span>
                            <span className="text-slate-200">·</span>
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" /> {selectedExam.submission_count || 0} started
                            </span>
                          </div>
                        </div>

                        {!isGrader && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {canEditExam && (
                              <>
                                {selectedExam.is_active ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleActive(selectedExam, false)}
                                    className={btn.amber}
                                  >
                                    Deactivate
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleActive(selectedExam, true)}
                                    className={btn.success}
                                  >
                                    <Play className="w-3.5 h-3.5" /> Activate Exam
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleToggleResultsVisible(selectedExam)}
                                  className={`${btn.secondary} ${
                                    selectedExam.results_visible
                                      ? "!border-amber-300 !text-amber-700 hover:!bg-amber-50"
                                      : ""
                                  }`}
                                >
                                  {selectedExam.results_visible ? "Hide Results" : "Release Results"}
                                </button>
                              </>
                            )}
                            {canCreateExam && (
                              <button
                                type="button"
                                onClick={() => handleDuplicate(selectedExam)}
                                className={btn.secondary}
                                title="Duplicate exam (media copied, copy is a draft)"
                              >
                                <Copy className="w-3.5 h-3.5" /> Duplicate
                              </button>
                            )}
                            {canDeleteExam && (
                              <button
                                type="button"
                                onClick={() => handleDeleteExam(selectedExam)}
                                className={btn.dangerGhost}
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Workspace Tabs */}
                      <div className="flex items-center gap-1 mt-4 border-t border-slate-100 pt-3 overflow-x-auto">
                        {(isGrader
                          ? [
                              { key: "candidates", label: "Candidates", icon: Users },
                              { key: "submissions", label: "Submissions", icon: ListChecks },
                              { key: "user_awards", label: "User Awards", icon: UserPlus },
                            ]
                          : [
                              { key: "overview", label: "Overview", icon: LayoutDashboard },
                              { key: "questions", label: "Questions", icon: FileQuestion },
                              { key: "candidates", label: "Candidates", icon: Users },
                              { key: "submissions", label: "Submissions", icon: ListChecks },
                              { key: "tiers", label: "Scholarship Tiers", icon: Award },
                              { key: "user_awards", label: "User Awards", icon: UserPlus },
                              { key: "audit_log", label: "Activity Log", icon: History },
                            ]
                        ).map((t) => (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => {
                              setTab(t.key);
                              if (t.key === "candidates") loadVisibility();
                              if (t.key === "submissions") loadSubmissions();
                              if (t.key === "overview" && !isGrader) openSettings();
                              if (t.key === "tiers" && !isGrader) loadTiers();
                            }}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-lg transition-colors ${
                              tab === t.key
                                ? "bg-[#002856] text-white shadow-sm"
                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <t.icon className="w-3.5 h-3.5" />
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {tab === "overview" && !isGrader && <OverviewTab />}
                    {tab === "questions" && !isGrader && <QuestionsTab />}
                    {tab === "candidates" && <CandidatesTab />}
                    {tab === "submissions" && <SubmissionsTab />}
                    {tab === "tiers" && !isGrader && <TiersTab />}
                    {tab === "user_awards" && <UserAwardsTab />}
                    {tab === "audit_log" && !isGrader && <ActivityLogTab />}
                  </>
                )}
              </main>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateExamModal
          exam={newExam}
          onChange={setNewExam}
          onClose={() => setShowCreate(false)}
          onSave={handleCreateExam}
          saving={saving}
          pathways={pathways}
        />
      )}

      {pathwayModalState.isOpen && (
        <PathwayModal
          pathway={pathwayModalState.pathway}
          onClose={() => setPathwayModalState({ isOpen: false, pathway: null })}
          onSave={handleSavePathwayModal}
          saving={saving}
        />
      )}

      <ConfirmDialog confirm={confirm} onCancel={() => setConfirm(null)} />
    </WorkspaceContext.Provider>
  );
}
