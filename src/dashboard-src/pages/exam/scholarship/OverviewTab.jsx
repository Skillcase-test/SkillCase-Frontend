import { useEffect, useState } from "react";
import {
  FileQuestion,
  Users,
  ListChecks,
  CheckCircle2,
  Loader2,
  Save,
  Info,
  GraduationCap,
} from "lucide-react";
import toast from "react-hot-toast";
import * as api from "../../../../api/scholarshipExamApi";
import { useScholarshipWorkspace } from "./index";
import StatCard from "./ui/StatCard";
import { btn, inputCls, labelCls } from "./ui/buttons";

/**
 * Overview tab: quick stats about the selected exam, its settings form,
 * and a short "how it works" card.
 */
export default function OverviewTab() {
  const {
    selectedExam,
    examQuestions,
    visStudents,
    submissions,
    editSettings,
    setEditSettings,
    openSettings,
    handleSaveSettings,
    saving,
    loadVisibility,
    loadSubmissions,
  } = useScholarshipWorkspace();

  const [showOnLanding, setShowOnLanding] = useState(false);
  const [showOnProfile, setShowOnProfile] = useState(false);
  const [landingSaving, setLandingSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    api.getAdminLandingVisibility()
      .then((r) => setShowOnLanding(!!r.data?.settings?.show_on_landing))
      .catch(() => {});
    api.getAdminProfileVisibility()
      .then((r) => setShowOnProfile(!!r.data?.settings?.show_on_profile))
      .catch(() => {});
  }, []);

  const handleToggleLanding = async () => {
    const next = !showOnLanding;
    setLandingSaving(true);
    try {
      const r = await api.updateAdminLandingVisibility(next);
      setShowOnLanding(!!r.data?.settings?.show_on_landing);
      toast.success(next ? "Scholarship card will show on Landing Page" : "Scholarship card hidden from Landing Page");
    } catch (e) {
      toast.error(e.response?.data?.msg || "Failed to update");
    } finally {
      setLandingSaving(false);
    }
  };

  const handleToggleProfile = async () => {
    const next = !showOnProfile;
    setProfileSaving(true);
    try {
      const r = await api.updateAdminProfileVisibility(next);
      setShowOnProfile(!!r.data?.settings?.show_on_profile);
      toast.success(next ? "Scholarship card will show on Profile Page" : "Scholarship card hidden from Profile Page");
    } catch (e) {
      toast.error(e.response?.data?.msg || "Failed to update");
    } finally {
      setProfileSaving(false);
    }
  };

  // Load the visibility + submission counts when the overview opens.
  useEffect(() => {
    loadVisibility();
    loadSubmissions();
    openSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam?.test_id]);

  // Only answerable items count as questions (blocks render as content)
  const NON_ANSWERABLE = new Set([
    "page_break",
    "reading_passage",
    "audio_block",
    "content_block",
    "image_block",
  ]);
  const answerableCount = examQuestions.filter(
    (q) => !NON_ANSWERABLE.has(q.question_type),
  ).length;

  const stats = [
    {
      icon: FileQuestion,
      label: "Questions",
      value: answerableCount,
      tone: "bg-[#eef2f6] text-[#002856]",
    },
    {
      icon: Users,
      label: "Candidates with access",
      value: visStudents.length,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      icon: ListChecks,
      label: "Submissions",
      value: submissions.length,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      icon: CheckCircle2,
      label: "Results",
      value: selectedExam?.results_visible ? "Released" : "Awaited",
      tone: selectedExam?.results_visible
        ? "bg-green-50 text-green-700"
        : "bg-slate-50 text-slate-500",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        {/* Settings */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <h3 className="text-sm font-bold text-slate-700">Exam settings</h3>
          </div>
          {!editSettings ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-[#002856]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Exam title *</label>
                <input
                  type="text"
                  value={editSettings.title}
                  onChange={(e) => setEditSettings({ ...editSettings, title: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Description</label>
                <textarea
                  value={editSettings.description || ""}
                  onChange={(e) =>
                    setEditSettings({ ...editSettings, description: e.target.value })
                  }
                  rows={3}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Duration (minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={editSettings.duration_minutes}
                  onChange={(e) =>
                    setEditSettings({ ...editSettings, duration_minutes: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Available from</label>
                <input
                  type="datetime-local"
                  value={editSettings.available_from || ""}
                  onChange={(e) =>
                    setEditSettings({ ...editSettings, available_from: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Available until</label>
                <input
                  type="datetime-local"
                  value={editSettings.available_until || ""}
                  onChange={(e) =>
                    setEditSettings({ ...editSettings, available_until: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className={btn.primary}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Show on Landing/Profile — independent global flags, same audience */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <GraduationCap className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-slate-700">Show on Landing Page</h3>
            </div>
            <button
              onClick={handleToggleLanding}
              disabled={landingSaving}
              className={`relative w-11 h-6 rounded-full transition-colors ${showOnLanding ? "bg-[#002856]" : "bg-slate-300"} ${landingSaving ? "opacity-60" : ""}`}
              aria-label="Toggle show on landing"
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showOnLanding ? "translate-x-5" : ""}`} />
            </button>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            When enabled, the Scholarship Exam card appears on Landing Page for candidates with scholarship access only.
          </p>
          {landingSaving && <p className="text-[11px] text-slate-400">Saving…</p>}
          <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <GraduationCap className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-slate-700">Show on Profile Page</h3>
            </div>
            <button
              onClick={handleToggleProfile}
              disabled={profileSaving}
              className={`relative w-11 h-6 rounded-full transition-colors ${showOnProfile ? "bg-[#002856]" : "bg-slate-300"} ${profileSaving ? "opacity-60" : ""}`}
              aria-label="Toggle show on profile"
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showOnProfile ? "translate-x-5" : ""}`} />
            </button>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            When enabled, the Scholarship Exam card appears on Profile Page for candidates with scholarship access only.
          </p>
          {profileSaving && <p className="text-[11px] text-slate-400">Saving…</p>}
        </div>

        {/* How it works */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-lg bg-[#eef2f6] flex items-center justify-center text-[#002856]">
              <Info className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-700">How it works</h3>
          </div>
          <ul className="space-y-3 text-xs text-slate-500 leading-relaxed">
            <li className="flex gap-2">
              <span className="text-[#002856] font-bold shrink-0">1.</span>
              <span>
                <b className="text-slate-600">Each exam has a pathway.</b>{" "}
                Candidates see the exam tied to the pathway they chose; edit its
                onboarding card from the <b className="text-slate-600">Pathway</b>{" "}
                tab.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#002856] font-bold shrink-0">2.</span>
              <span>
                <b className="text-slate-600">Candidates are enrolled, not auto-added.</b>{" "}
                They join when they pick this pathway at onboarding or when you
                add them under <b className="text-slate-600">Candidates</b> —
                visiting alone no longer grants access.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#002856] font-bold shrink-0">3.</span>
              <span>
                <b className="text-slate-600">Results release manually.</b>{" "}
                Candidates see "Results awaited" until you hit{" "}
                <b className="text-slate-600">Release Results</b>.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#002856] font-bold shrink-0">4.</span>
              <span>
                <b className="text-slate-600">Duplicates are drafts.</b>{" "}
                Duplicating an exam copies all questions, audio and images to
                fresh files — the copy starts as a draft.
              </span>
            </li>
          </ul>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
            <GraduationCap className="w-4 h-4 text-[#edb843]" />
            <span>Scholarship exam workspace</span>
          </div>
        </div>
      </div>
    </div>
  );
}
