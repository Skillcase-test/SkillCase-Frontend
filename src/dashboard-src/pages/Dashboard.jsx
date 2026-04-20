import { useEffect, useMemo, useState } from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { adminAccessApi } from "../../api/adminAccessApi";
import Analytics from "./Analytics";
import ManageEvents from "./event/ManageEvents";
import LandingPageManagement from "./LandingPageManagement";
import SendNotification from "./notification/send";
import TcAgreements from "./TcAgreements";
import AdminExamManager from "./exam/AdminExamManager";
import AdminBatchManager from "./exam/AdminBatchManager";
import InterviewToolsPositionsPage from "../../pages/interviewTools/InterviewToolsPositionsPage";
import InterviewToolsBuilderPage from "../../pages/interviewTools/InterviewToolsBuilderPage";
import InterviewToolsCandidatesPage from "../../pages/interviewTools/InterviewToolsCandidatePage";
import InterviewToolsReviewPage from "../../pages/interviewTools/InterviewToolsReviewPage";
import SkillcaseInterviewToolsPositionsPage from "../../pages/interviewTools/SkillcaseInterviewToolsPositionsPage";
import SkillcaseInterviewToolsBuilderPage from "../../pages/interviewTools/SkillcaseInterviewToolsBuilderPage";
import SkillcaseInterviewToolsCandidatesPage from "../../pages/interviewTools/SkillcaseInterviewToolsCandidatePage";
import SkillcaseInterviewToolsReviewPage from "../../pages/interviewTools/SkillcaseInterviewToolsReviewPage";
import WiseDashboard from "../../pages/internal/WiseDashboard";
import InternalLeadForm from "../../pages/InternalLeadForm";
import AdminAccessManagement from "./AdminAccessManagement";

import A1FlashcardAdd from "./a1/flashcard/add";
import A1FlashcardManage from "./a1/flashcard/manage";
import A1GrammarAdd from "./a1/grammar/add";
import A1GrammarManage from "./a1/grammar/manage";
import A1ListeningAdd from "./a1/listening/add";
import A1ListeningManage from "./a1/listening/manage";
import A1ReadingAdd from "./a1/reading/add";
import A1ReadingManage from "./a1/reading/manage";
import A1SpeakingAdd from "./a1/speaking/add";
import A1SpeakingManage from "./a1/speaking/manage";
import A1TestAdd from "./a1/test/add";
import A1TestManage from "./a1/test/manage";

import A2FlashcardAdd from "./a2/flashcard/add";
import A2FlashcardManage from "./a2/flashcard/manage";
import A2GrammarAdd from "./a2/grammar/add";
import A2GrammarManage from "./a2/grammar/manage";
import A2ListeningAdd from "./a2/listening/add";
import A2ListeningManage from "./a2/listening/manage";
import A2SpeakingAdd from "./a2/speaking/add";
import A2SpeakingManage from "./a2/speaking/manage";
import A2ReadingAdd from "./a2/reading/add";
import A2ReadingManage from "./a2/reading/manage";
import A2TestAdd from "./a2/test/add";
import A2TestManage from "./a2/test/manage";

function hasPermission(me, moduleKey, action = "view") {
  if (!me) return false;
  if (me.role === "super_admin") return true;
  const actions = me.permissions?.[moduleKey] || [];
  return actions.includes("manage") || actions.includes(action);
}

function Guard({ allowed, children }) {
  if (!allowed) return <Navigate to="/admin/no-access" replace />;
  return children;
}

function InterviewToolsModule() {
  const navigate = useNavigate();
  const [selectedInterviewPositionId, setSelectedInterviewPositionId] =
    useState(null);
  const [selectedInterviewSubmissionId, setSelectedInterviewSubmissionId] =
    useState(null);

  const setActivePage = (page) => {
    if (page === "interview-tools-positions")
      navigate("/admin/interview-tools");
    if (page === "interview-tools-builder")
      navigate("/admin/interview-tools/builder");
    if (page === "interview-tools-candidates")
      navigate("/admin/interview-tools/candidates");
    if (page === "interview-tools-review")
      navigate("/admin/interview-tools/review");
  };

  return (
    <Routes>
      <Route
        index
        element={
          <InterviewToolsPositionsPage
            setActivePage={setActivePage}
            setSelectedInterviewPositionId={setSelectedInterviewPositionId}
          />
        }
      />
      <Route
        path="builder"
        element={
          <InterviewToolsBuilderPage
            selectedInterviewPositionId={selectedInterviewPositionId}
            setActivePage={setActivePage}
          />
        }
      />
      <Route
        path="candidates"
        element={
          <InterviewToolsCandidatesPage
            selectedInterviewPositionId={selectedInterviewPositionId}
            setSelectedInterviewSubmissionId={setSelectedInterviewSubmissionId}
            setActivePage={setActivePage}
          />
        }
      />
      <Route
        path="review"
        element={
          <InterviewToolsReviewPage
            selectedInterviewPositionId={selectedInterviewPositionId}
            selectedInterviewSubmissionId={selectedInterviewSubmissionId}
            setActivePage={setActivePage}
          />
        }
      />
    </Routes>
  );
}

function SkillcaseInterviewsModule({ isSuperAdmin = false }) {
  const navigate = useNavigate();
  const [selectedInterviewPositionId, setSelectedInterviewPositionId] =
    useState(null);
  const [selectedInterviewSubmissionId, setSelectedInterviewSubmissionId] =
    useState(null);

  const setActivePage = (page) => {
    if (page === "interview-tools-positions")
      navigate("/admin/skillcase-interviews");
    if (page === "interview-tools-builder")
      navigate("/admin/skillcase-interviews/builder");
    if (page === "interview-tools-candidates")
      navigate("/admin/skillcase-interviews/candidates");
    if (page === "interview-tools-review")
      navigate("/admin/skillcase-interviews/review");
  };

  return (
    <Routes>
      <Route
        index
        element={
          <SkillcaseInterviewToolsPositionsPage
            setActivePage={setActivePage}
            setSelectedInterviewPositionId={setSelectedInterviewPositionId}
            isSuperAdmin={isSuperAdmin}
          />
        }
      />
      <Route
        path="builder"
        element={
          <SkillcaseInterviewToolsBuilderPage
            selectedInterviewPositionId={selectedInterviewPositionId}
            setActivePage={setActivePage}
          />
        }
      />
      <Route
        path="candidates"
        element={
          <SkillcaseInterviewToolsCandidatesPage
            selectedInterviewPositionId={selectedInterviewPositionId}
            setSelectedInterviewSubmissionId={setSelectedInterviewSubmissionId}
            setActivePage={setActivePage}
          />
        }
      />
      <Route
        path="review"
        element={
          <SkillcaseInterviewToolsReviewPage
            selectedInterviewPositionId={selectedInterviewPositionId}
            selectedInterviewSubmissionId={selectedInterviewSubmissionId}
            setActivePage={setActivePage}
          />
        }
      />
    </Routes>
  );
}

function SidebarSection({ title, items }) {
  if (!items.length) return null;
  return (
    <div className="mb-4">
      <p className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      <div className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm font-semibold ${
                isActive
                  ? "bg-blue-700 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

function SidebarModuleGroups({ title, modules }) {
  const location = useLocation();
  const [openMap, setOpenMap] = useState({});

  useEffect(() => {
    const next = {};
    modules.forEach((moduleItem) => {
      next[moduleItem.key] = location.pathname.startsWith(moduleItem.basePath);
    });
    setOpenMap((prev) => ({ ...next, ...prev }));
  }, [location.pathname, modules]);

  if (!modules.length) return null;

  return (
    <div className="mb-4">
      <p className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      <div className="space-y-1">
        {modules.map((moduleItem) => {
          const open = openMap[moduleItem.key];
          return (
            <div
              key={moduleItem.key}
              className="rounded-md border border-slate-200"
            >
              <button
                onClick={() =>
                  setOpenMap((prev) => ({ ...prev, [moduleItem.key]: !open }))
                }
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <span>{moduleItem.label}</span>
                {open ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </button>
              {open && (
                <div className="border-t border-slate-100 px-2 py-2">
                  <div className="space-y-1">
                    <NavLink
                      to={`${moduleItem.basePath}/add`}
                      className={({ isActive }) =>
                        `block rounded px-3 py-1.5 text-xs font-semibold ${
                          isActive
                            ? "bg-blue-700 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`
                      }
                    >
                      Add
                    </NavLink>
                    <NavLink
                      to={`${moduleItem.basePath}/manage`}
                      className={({ isActive }) =>
                        `block rounded px-3 py-1.5 text-xs font-semibold ${
                          isActive
                            ? "bg-blue-700 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`
                      }
                    >
                      Manage
                    </NavLink>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashboardShellSkeleton() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-3 h-4 w-28 animate-pulse rounded bg-slate-200" />
          <div className="space-y-2">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div
                key={idx}
                className="h-9 animate-pulse rounded-md bg-slate-100"
              />
            ))}
          </div>
        </aside>
        <main className="min-h-[calc(100vh-24px)] rounded-lg border border-slate-200 bg-white p-3 lg:p-4">
          <div className="space-y-3">
            <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-36 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
            <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchAccess = (showLoading = false) => {
      if (showLoading && mounted) setLoading(true);
      return adminAccessApi
        .getMyAccess()
        .then((res) => {
          if (mounted) setMe(res.data);
        })
        .catch(() => {
          if (mounted) setMe(null);
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    };

    fetchAccess(true);

    const onFocus = () => {
      fetchAccess(false);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchAccess(false);
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      mounted = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const sections = useMemo(() => {
    if (!me) return { core: [], a1Modules: [], a2Modules: [], superAdmin: [] };

    const core = [
      {
        key: "analytics",
        label: "Analytics",
        path: "/admin/analytics",
        module: "analytics",
      },
      {
        key: "events",
        label: "Events",
        path: "/admin/events",
        module: "events",
      },
      {
        key: "interview",
        label: "Interview Tools",
        path: "/admin/interview-tools",
        module: "interview_tools",
      },
      {
        key: "skillcase-interviews",
        label: "Skillcase Interviews",
        path: "/admin/skillcase-interviews",
        module: "skillcase_interviews",
      },
      {
        key: "wise",
        label: "Wise Dashboard",
        path: "/admin/wise",
        module: "wise",
      },
      {
        key: "internal",
        label: "Internal Lead Form",
        path: "/admin/internal-leads",
        module: "internal",
      },
      {
        key: "exam",
        label: "Exam Manager",
        path: "/admin/exam",
        module: "exam",
      },
      {
        key: "batch",
        label: "Batch Manager",
        path: "/admin/batch",
        module: "batch",
      },
      {
        key: "landing",
        label: "Landing Page",
        path: "/admin/landing",
        module: "landing_page",
      },
      {
        key: "notifications",
        label: "Notifications",
        path: "/admin/notifications",
        module: "notifications",
      },
      {
        key: "agreements",
        label: "T&C Agreements",
        path: "/admin/agreements",
        module: "agreements",
      },
    ].filter((item) => hasPermission(me, item.module, "view"));

    const a1ContentAllowed = hasPermission(me, "content", "view");
    const a2ContentAllowed = hasPermission(me, "a2_content", "view");

    const a1Modules = a1ContentAllowed
      ? [
          {
            key: "a1-flashcard",
            label: "A1 Flashcard",
            basePath: "/admin/a1/flashcard",
          },
          {
            key: "a1-grammar",
            label: "A1 Grammar",
            basePath: "/admin/a1/grammar",
          },
          {
            key: "a1-listening",
            label: "A1 Listening",
            basePath: "/admin/a1/listening",
          },
          {
            key: "a1-reading",
            label: "A1 Reading",
            basePath: "/admin/a1/reading",
          },
          {
            key: "a1-speaking",
            label: "A1 Speaking",
            basePath: "/admin/a1/speaking",
          },
          { key: "a1-test", label: "A1 Test", basePath: "/admin/a1/test" },
        ]
      : [];

    const a2Modules = a2ContentAllowed
      ? [
          {
            key: "a2-flashcard",
            label: "A2 Flashcard",
            basePath: "/admin/a2/flashcard",
          },
          {
            key: "a2-grammar",
            label: "A2 Grammar",
            basePath: "/admin/a2/grammar",
          },
          {
            key: "a2-listening",
            label: "A2 Listening",
            basePath: "/admin/a2/listening",
          },
          {
            key: "a2-reading",
            label: "A2 Reading",
            basePath: "/admin/a2/reading",
          },
          {
            key: "a2-speaking",
            label: "A2 Speaking",
            basePath: "/admin/a2/speaking",
          },
          { key: "a2-test", label: "A2 Test", basePath: "/admin/a2/test" },
        ]
      : [];

    const superAdmin =
      me.role === "super_admin"
        ? [{ key: "access", label: "Admin Access", path: "/admin/access" }]
        : [];

    return { core, a1Modules, a2Modules, superAdmin };
  }, [me]);

  const defaultPath =
    sections.core[0]?.path ||
    (sections.a1Modules[0] ? `${sections.a1Modules[0].basePath}/add` : null) ||
    (sections.a2Modules[0] ? `${sections.a2Modules[0].basePath}/add` : null) ||
    sections.superAdmin[0]?.path ||
    "/admin/no-access";

  if (loading) {
    return <DashboardShellSkeleton />;
  }

  if (!me) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-slate-200 bg-white p-3 lg:sticky lg:top-3 lg:self-start">
          <p className="mb-2 px-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            Admin Panel
          </p>
          <SidebarSection title="Core" items={sections.core} />
          <SidebarModuleGroups title="A1" modules={sections.a1Modules} />
          <SidebarModuleGroups title="A2" modules={sections.a2Modules} />
          <SidebarSection title="Super Admin" items={sections.superAdmin} />
        </aside>

        <main className="min-h-[calc(100vh-24px)] rounded-lg border border-slate-200 bg-white p-3 lg:p-4">
          <Routes>
            <Route index element={<Navigate to={defaultPath} replace />} />
            <Route
              path="no-access"
              element={
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                  You do not have module access yet. Contact super admin.
                </div>
              }
            />

            <Route
              path="analytics"
              element={
                <Guard allowed={hasPermission(me, "analytics")}>
                  <Analytics />
                </Guard>
              }
            />
            <Route
              path="events"
              element={
                <Guard allowed={hasPermission(me, "events")}>
                  <ManageEvents />
                </Guard>
              }
            />
            <Route
              path="interview-tools/*"
              element={
                <Guard allowed={hasPermission(me, "interview_tools")}>
                  <InterviewToolsModule />
                </Guard>
              }
            />
            <Route
              path="skillcase-interviews/*"
              element={
                <Guard allowed={hasPermission(me, "skillcase_interviews")}>
                  <SkillcaseInterviewsModule
                    isSuperAdmin={me.role === "super_admin"}
                  />
                </Guard>
              }
            />
            <Route
              path="wise"
              element={
                <Guard allowed={hasPermission(me, "wise")}>
                  <WiseDashboard />
                </Guard>
              }
            />
            <Route
              path="internal-leads"
              element={
                <Guard allowed={hasPermission(me, "internal")}>
                  <InternalLeadForm />
                </Guard>
              }
            />
            <Route
              path="exam"
              element={
                <Guard allowed={hasPermission(me, "exam")}>
                  <AdminExamManager />
                </Guard>
              }
            />
            <Route
              path="batch"
              element={
                <Guard allowed={hasPermission(me, "batch")}>
                  <AdminBatchManager />
                </Guard>
              }
            />
            <Route
              path="landing"
              element={
                <Guard allowed={hasPermission(me, "landing_page")}>
                  <LandingPageManagement />
                </Guard>
              }
            />
            <Route
              path="notifications"
              element={
                <Guard allowed={hasPermission(me, "notifications")}>
                  <SendNotification />
                </Guard>
              }
            />
            <Route
              path="agreements"
              element={
                <Guard allowed={hasPermission(me, "agreements")}>
                  <TcAgreements />
                </Guard>
              }
            />

            <Route
              path="a1/flashcard/add"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A1FlashcardAdd />
                </Guard>
              }
            />
            <Route
              path="a1/flashcard/manage"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A1FlashcardManage />
                </Guard>
              }
            />
            <Route
              path="a1/grammar/add"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A1GrammarAdd />
                </Guard>
              }
            />
            <Route
              path="a1/grammar/manage"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A1GrammarManage />
                </Guard>
              }
            />
            <Route
              path="a1/listening/add"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A1ListeningAdd />
                </Guard>
              }
            />
            <Route
              path="a1/listening/manage"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A1ListeningManage />
                </Guard>
              }
            />
            <Route
              path="a1/reading/add"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A1ReadingAdd />
                </Guard>
              }
            />
            <Route
              path="a1/reading/manage"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A1ReadingManage />
                </Guard>
              }
            />
            <Route
              path="a1/speaking/add"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A1SpeakingAdd />
                </Guard>
              }
            />
            <Route
              path="a1/speaking/manage"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A1SpeakingManage />
                </Guard>
              }
            />
            <Route
              path="a1/test/add"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A1TestAdd />
                </Guard>
              }
            />
            <Route
              path="a1/test/manage"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A1TestManage />
                </Guard>
              }
            />

            <Route
              path="a2/flashcard/add"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A2FlashcardAdd />
                </Guard>
              }
            />
            <Route
              path="a2/flashcard/manage"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A2FlashcardManage />
                </Guard>
              }
            />
            <Route
              path="a2/grammar/add"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A2GrammarAdd />
                </Guard>
              }
            />
            <Route
              path="a2/grammar/manage"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A2GrammarManage />
                </Guard>
              }
            />
            <Route
              path="a2/listening/add"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A2ListeningAdd />
                </Guard>
              }
            />
            <Route
              path="a2/listening/manage"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A2ListeningManage />
                </Guard>
              }
            />
            <Route
              path="a2/reading/add"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A2ReadingAdd />
                </Guard>
              }
            />
            <Route
              path="a2/reading/manage"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A2ReadingManage />
                </Guard>
              }
            />
            <Route
              path="a2/speaking/add"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A2SpeakingAdd />
                </Guard>
              }
            />
            <Route
              path="a2/speaking/manage"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A2SpeakingManage />
                </Guard>
              }
            />
            <Route
              path="a2/test/add"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A2TestAdd />
                </Guard>
              }
            />
            <Route
              path="a2/test/manage"
              element={
                <Guard allowed={hasPermission(me, "content", "edit")}>
                  <A2TestManage />
                </Guard>
              }
            />

            <Route
              path="access"
              element={
                me.role === "super_admin" ? (
                  <AdminAccessManagement />
                ) : (
                  <Navigate to="/admin/no-access" replace />
                )
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}
