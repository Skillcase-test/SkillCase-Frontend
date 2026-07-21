import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
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
const Analytics = lazy(() => import("./Analytics"));
const AppAnalytics = lazy(() => import("./AppAnalytics"));
const NewAnalytics = lazy(() => import("./NewAnalytics"));
const ManageEvents = lazy(() => import("./event/ManageEvents"));
const LandingPageManagement = lazy(() => import("./LandingPageManagement"));
const TrustPageManagement = lazy(() => import("./TrustPageManagement"));
const SendNotification = lazy(() => import("./notification/send"));
const TermsManager = lazy(() => import("./TermsManager"));
const AdminExamManager = lazy(() => import("./exam/AdminExamManager"));
const AdminBatchManager = lazy(() => import("./exam/AdminBatchManager"));
const InterviewToolsPositionsPage = lazy(
  () => import("../../pages/interviewTools/InterviewToolsPositionsPage"),
);
const InterviewToolsBuilderPage = lazy(
  () => import("../../pages/interviewTools/InterviewToolsBuilderPage"),
);
const InterviewToolsCandidatesPage = lazy(
  () => import("../../pages/interviewTools/InterviewToolsCandidatePage"),
);
const InterviewToolsReviewPage = lazy(
  () => import("../../pages/interviewTools/InterviewToolsReviewPage"),
);
const SkillcaseInterviewToolsPositionsPage = lazy(
  () =>
    import("../../pages/interviewTools/SkillcaseInterviewToolsPositionsPage"),
);
const SkillcaseInterviewToolsBuilderPage = lazy(
  () => import("../../pages/interviewTools/SkillcaseInterviewToolsBuilderPage"),
);
const SkillcaseInterviewToolsCandidatesPage = lazy(
  () =>
    import("../../pages/interviewTools/SkillcaseInterviewToolsCandidatePage"),
);
const SkillcaseInterviewToolsReviewPage = lazy(
  () => import("../../pages/interviewTools/SkillcaseInterviewToolsReviewPage"),
);
const WiseDashboard = lazy(() => import("../../pages/internal/WiseDashboard"));
const WiseClassesDashboard = lazy(
  () => import("../../pages/internal/WiseClassesDashboard"),
);
const InternalLeadForm = lazy(() => import("../../pages/InternalLeadForm"));
const AdminAccessManagement = lazy(() => import("./AdminAccessManagement"));
const ExploreCandidatesAdmin = lazy(() => import("./ExploreCandidatesAdmin"));
const PaymentsAdmin = lazy(() => import("./PaymentsAdmin"));
const CallEnginePage = lazy(() => import("./CallEngine"));
const SupportTicketsAdmin = lazy(() => import("./SupportTicketsAdmin"));
const DynamicLessonAdmin = lazy(
  () => import("../../pages/admin/DynamicLessonAdmin"),
);
const JobScreeningAdmin = lazy(
  () => import("../../pages/admin/JobScreeningAdmin"),
);
const Paywall = lazy(() => import("./Paywall"));

const A1FlashcardAdd = lazy(() => import("./a1/flashcard/add"));
const A1FlashcardManage = lazy(() => import("./a1/flashcard/manage"));
const A1GrammarAdd = lazy(() => import("./a1/grammar/add"));
const A1GrammarManage = lazy(() => import("./a1/grammar/manage"));
const A1ListeningAdd = lazy(() => import("./a1/listening/add"));
const A1ListeningManage = lazy(() => import("./a1/listening/manage"));
const A1ReadingAdd = lazy(() => import("./a1/reading/add"));
const A1ReadingManage = lazy(() => import("./a1/reading/manage"));
const A1SpeakingAdd = lazy(() => import("./a1/speaking/add"));
const A1SpeakingManage = lazy(() => import("./a1/speaking/manage"));
const A1TestAdd = lazy(() => import("./a1/test/add"));
const A1TestManage = lazy(() => import("./a1/test/manage"));

const A2FlashcardAdd = lazy(() => import("./a2/flashcard/add"));
const A2FlashcardManage = lazy(() => import("./a2/flashcard/manage"));
const A2GrammarAdd = lazy(() => import("./a2/grammar/add"));
const A2GrammarManage = lazy(() => import("./a2/grammar/manage"));
const A2ListeningAdd = lazy(() => import("./a2/listening/add"));
const A2ListeningManage = lazy(() => import("./a2/listening/manage"));
const A2SpeakingAdd = lazy(() => import("./a2/speaking/add"));
const A2SpeakingManage = lazy(() => import("./a2/speaking/manage"));
const A2ReadingAdd = lazy(() => import("./a2/reading/add"));
const A2ReadingManage = lazy(() => import("./a2/reading/manage"));
const A2TestAdd = lazy(() => import("./a2/test/add"));
const A2TestManage = lazy(() => import("./a2/test/manage"));

const B1FlashcardAdd = lazy(() => import("./b1/flashcard/add"));
const B1FlashcardManage = lazy(() => import("./b1/flashcard/manage"));
const B1VideoAdd = lazy(() => import("./b1/video/add"));
const B1VideoManage = lazy(() => import("./b1/video/manage"));
const B1DescribeSpeakAdd = lazy(() => import("./b1/describe-speak/add"));
const B1DescribeSpeakManage = lazy(() => import("./b1/describe-speak/manage"));
const B1NewsAdd = lazy(() => import("./b1/news/add"));
const B1NewsManage = lazy(() => import("./b1/news/manage"));
const B1ArticleAdd = lazy(() => import("./b1/article/add"));
const B1ArticleManage = lazy(() => import("./b1/article/manage"));
const B1ExamsAdd = lazy(() => import("./b1/exams/add"));
const B1ExamsManage = lazy(() => import("./b1/exams/manage"));

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

function InterviewToolsModule({ isSuperAdmin = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedInterviewPositionId, setSelectedInterviewPositionId] =
    useState(null);
  const [selectedInterviewSubmissionId, setSelectedInterviewSubmissionId] =
    useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const positionId = params.get("positionId");
    const submissionId = params.get("submissionId");

    setSelectedInterviewPositionId(positionId || null);
    setSelectedInterviewSubmissionId(submissionId || null);
  }, [location.search]);

  const setActivePage = (page, options = {}) => {
    const positionId =
      options.positionId ?? selectedInterviewPositionId ?? null;
    const submissionId =
      options.submissionId ?? selectedInterviewSubmissionId ?? null;
    const params = new URLSearchParams();

    if (positionId) {
      params.set("positionId", String(positionId));
    }

    if (submissionId) {
      params.set("submissionId", String(submissionId));
    }

    const search = params.toString();
    const suffix = search ? `?${search}` : "";

    if (page === "interview-tools-positions")
      navigate("/admin/interview-tools");
    if (page === "interview-tools-builder")
      navigate(`/admin/interview-tools/builder${suffix}`);
    if (page === "interview-tools-candidates")
      navigate(`/admin/interview-tools/candidates${suffix}`);
    if (page === "interview-tools-review")
      navigate(`/admin/interview-tools/review${suffix}`);
  };

  return (
    <Routes>
      <Route
        index
        element={
          <InterviewToolsPositionsPage
            setActivePage={setActivePage}
            setSelectedInterviewPositionId={setSelectedInterviewPositionId}
            isSuperAdmin={isSuperAdmin}
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
            isSuperAdmin={isSuperAdmin}
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
            isSuperAdmin={isSuperAdmin}
          />
        }
      />
    </Routes>
  );
}

function SkillcaseInterviewsModule({
  isSuperAdmin = false,
  canDownload = false,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedInterviewPositionId, setSelectedInterviewPositionId] =
    useState(null);
  const [selectedInterviewSubmissionId, setSelectedInterviewSubmissionId] =
    useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const positionId = params.get("positionId");
    const submissionId = params.get("submissionId");

    setSelectedInterviewPositionId(positionId || null);
    setSelectedInterviewSubmissionId(submissionId || null);
  }, [location.search]);

  const setActivePage = (page, options = {}) => {
    const positionId =
      options.positionId ?? selectedInterviewPositionId ?? null;
    const submissionId =
      options.submissionId ?? selectedInterviewSubmissionId ?? null;
    const params = new URLSearchParams();

    if (positionId) {
      params.set("positionId", String(positionId));
    }

    if (submissionId) {
      params.set("submissionId", String(submissionId));
    }

    const search = params.toString();
    const suffix = search ? `?${search}` : "";

    if (page === "interview-tools-positions")
      navigate("/admin/skillcase-interviews");
    if (page === "interview-tools-builder")
      navigate(`/admin/skillcase-interviews/builder${suffix}`);
    if (page === "interview-tools-candidates")
      navigate(`/admin/skillcase-interviews/candidates${suffix}`);
    if (page === "interview-tools-review")
      navigate(`/admin/skillcase-interviews/review${suffix}`);
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
            isSuperAdmin={isSuperAdmin}
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
            canDownload={canDownload}
            isSuperAdmin={isSuperAdmin}
          />
        }
      />
    </Routes>
  );
}

function SidebarSection({ title, items, onLinkClick }) {
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
            onClick={onLinkClick}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm font-semibold ${
                isActive
                  ? "bg-[#002856] text-white"
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

function ModuleItem({ module, onLinkClick }) {
  const location = useLocation();
  const [open, setOpen] = useState(() =>
    location.pathname.startsWith(module.basePath),
  );

  useEffect(() => {
    if (location.pathname.startsWith(module.basePath)) {
      setOpen(true);
    }
  }, [location.pathname, module.basePath]);

  const toggle = () => setOpen((prev) => !prev);

  return (
    <div className="ml-3">
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-100"
      >
        <span>{module.label}</span>
        <ChevronRight
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{ maxHeight: open ? "120px" : "0px" }}
      >
        <div className="ml-4 space-y-0.5 pb-1">
          <NavLink
            to={`${module.basePath}/add`}
            onClick={onLinkClick}
            className={({ isActive }) =>
              `block rounded px-3 py-1.5 text-xs font-medium ${
                isActive
                  ? "bg-blue-700 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`
            }
          >
            Add
          </NavLink>
          <NavLink
            to={`${module.basePath}/manage`}
            onClick={onLinkClick}
            className={({ isActive }) =>
              `block rounded px-3 py-1.5 text-xs font-medium ${
                isActive
                  ? "bg-blue-700 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`
            }
          >
            Manage
          </NavLink>
        </div>
      </div>
    </div>
  );
}

function ModuleGroup({ title, modules, onLinkClick }) {
  const location = useLocation();
  const [open, setOpen] = useState(() =>
    modules.some((m) => location.pathname.startsWith(m.basePath)),
  );

  useEffect(() => {
    if (modules.some((m) => location.pathname.startsWith(m.basePath))) {
      setOpen(true);
    }
  }, [location.pathname, modules]);

  const toggle = () => setOpen((prev) => !prev);

  return (
    <div className="ml-2">
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        <span>{title}</span>
        <ChevronRight
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{ maxHeight: open ? "800px" : "0px" }}
      >
        <div className="space-y-0.5 pt-1">
          {modules.map((module) => (
            <ModuleItem
              key={module.key}
              module={module}
              onLinkClick={onLinkClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentModuleTree({
  a1Modules,
  a2Modules,
  b1Modules = [],
  extraItems = [],
  onLinkClick,
}) {
  const location = useLocation();
  const hasModules =
    a1Modules.length > 0 ||
    a2Modules.length > 0 ||
    b1Modules.length > 0 ||
    extraItems.length > 0;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const matchesA1 = a1Modules.some((m) =>
      location.pathname.startsWith(m.basePath),
    );
    const matchesA2 = a2Modules.some((m) =>
      location.pathname.startsWith(m.basePath),
    );
    const matchesB1 = b1Modules.some((m) =>
      location.pathname.startsWith(m.basePath),
    );
    if (matchesA1 || matchesA2 || matchesB1) {
      setOpen(true);
    }
    if (extraItems.some((item) => location.pathname.startsWith(item.path))) {
      setOpen(true);
    }
  }, [location.pathname, a1Modules, a2Modules, b1Modules, extraItems]);

  if (!hasModules) return null;

  const toggle = () => setOpen((prev) => !prev);

  return (
    <div className="mb-4">
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        <span>App Content</span>
        <ChevronRight
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{ maxHeight: open ? "1200px" : "0px" }}
      >
        <div className="space-y-1 pt-1">
          {a1Modules.length > 0 && (
            <ModuleGroup
              title="A1"
              modules={a1Modules}
              onLinkClick={onLinkClick}
            />
          )}
          {a2Modules.length > 0 && (
            <ModuleGroup
              title="A2"
              modules={a2Modules}
              onLinkClick={onLinkClick}
            />
          )}
          {b1Modules.length > 0 && (
            <ModuleGroup
              title="B1"
              modules={b1Modules}
              onLinkClick={onLinkClick}
            />
          )}
          {extraItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              onClick={onLinkClick}
              className={({ isActive }) =>
                `ml-2 block rounded-md px-3 py-2 text-sm font-semibold ${
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
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const sidebarHoverTimersRef = useRef({ open: null, close: null });

  const clearSidebarHoverTimer = (timerKey) => {
    const timer = sidebarHoverTimersRef.current[timerKey];
    if (timer) {
      window.clearTimeout(timer);
      sidebarHoverTimersRef.current[timerKey] = null;
    }
  };

  const scheduleSidebarExpand = () => {
    clearSidebarHoverTimer("close");
    if (desktopSidebarExpanded) return;
    clearSidebarHoverTimer("open");
    sidebarHoverTimersRef.current.open = window.setTimeout(() => {
      setDesktopSidebarExpanded(true);
      sidebarHoverTimersRef.current.open = null;
    }, 70);
  };

  const scheduleSidebarCollapse = () => {
    clearSidebarHoverTimer("open");
    clearSidebarHoverTimer("close");
    sidebarHoverTimersRef.current.close = window.setTimeout(() => {
      setDesktopSidebarExpanded(false);
      sidebarHoverTimersRef.current.close = null;
    }, 180);
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen((prev) => !prev);
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

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

  useEffect(() => {
    return () => {
      clearSidebarHoverTimer("open");
      clearSidebarHoverTimer("close");
    };
  }, []);

  const PAYMENTS_TAB_KEYS = useMemo(
    () => [
      "tab_overall",
      "tab_month",
      "tab_all",
      "tab_batch",
      "tab_fee",
      "tab_discounts",
      "tab_discounts_view",
      "tab_payments",
      "tab_payments_view",
      "tab_payments_download",
      "tab_invoice_view",
      "tab_invoice_download",
      "tab_rawlogs",
      "tab_invoice",
      "tab_import",
      "tab_recruitment",
      "tab_recruiter",
    ],
    [],
  );

  const hasPaymentsAccess = useMemo(() => {
    return (
      me &&
      (me.role === "super_admin" ||
        me.permissions?.["payments"]?.includes("manage") ||
        PAYMENTS_TAB_KEYS.some((k) =>
          me.permissions?.["payments"]?.includes(k),
        ))
    );
  }, [me, PAYMENTS_TAB_KEYS]);

  const sections = useMemo(() => {
    if (!me)
      return {
        core: [],
        a1Modules: [],
        a2Modules: [],
        b1Modules: [],
        superAdmin: [],
      };

    const core = [
      {
        key: "analytics",
        label: "Analytics",
        path: "/admin/analytics",
        module: "analytics",
      },
      {
        key: "app-analytics",
        label: "App Analytics",
        path: "/admin/app-analytics",
        module: "app_analytics",
      },
      {
        key: "new-analytics",
        label: "New Analytics",
        path: "/admin/new-analytics",
        module: "new_analytics",
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
        key: "wise-classes",
        label: "Wise Classes",
        path: "/admin/wise-classes",
        module: "wise_classes",
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
        key: "trust-page",
        label: "Trust Page",
        path: "/admin/trust-page",
        module: "trust_page",
      },
      {
        key: "notifications",
        label: "Notifications",
        path: "/admin/notifications",
        module: "notifications",
      },
      {
        key: "terms",
        label: "Terms & Signatures",
        path: "/admin/terms",
        module: "terms",
      },
      {
        key: "explore-candidates",
        label: "Explore Candidates",
        path: "/admin/explore-candidates",
        module: "explore_candidates",
      },
      {
        key: "job-screening",
        label: "Job Screening",
        path: "/admin/job-screening",
        module: "job_screening",
      },
      {
        key: "paywall",
        label: "Paywall",
        path: "/admin/paywall",
        module: "paywall",
      },
    ].filter((item) => hasPermission(me, item.module, "view"));

    if (me.role !== "super_admin" && hasPaymentsAccess) {
      core.push({
        key: "payments",
        label: "Payments",
        path: "/admin/payments",
        module: "payments",
      });
    }

    const a1ContentAllowed = hasPermission(me, "content", "view");
    const a2ContentAllowed = hasPermission(me, "a2_content", "view");
    const b1ContentAllowed = hasPermission(me, "b1_content", "view");
    const dynamicLessonAllowed = hasPermission(me, "learn_german", "view");

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

    const b1Modules = b1ContentAllowed
      ? [
          {
            key: "b1-flashcard",
            label: "B1 Flashcard",
            basePath: "/admin/b1/flashcard",
          },
          {
            key: "b1-video",
            label: "B1 Video",
            basePath: "/admin/b1/video",
          },
          {
            key: "b1-describe-speak",
            label: "B1 Describe & Speak",
            basePath: "/admin/b1/describe-speak",
          },
          {
            key: "b1-news",
            label: "B1 News",
            basePath: "/admin/b1/news",
          },
          {
            key: "b1-article",
            label: "B1 Article",
            basePath: "/admin/b1/article",
          },
          {
            key: "b1-exams",
            label: "B1 Exams",
            basePath: "/admin/b1/exams",
          },
        ]
      : [];

    const superAdmin =
      me.role === "super_admin"
        ? [
            { key: "access", label: "Admin Access", path: "/admin/access" },
            {
              key: "tickets",
              label: "Issues & Tickets",
              path: "/admin/tickets",
            },
            { key: "payments", label: "Payments", path: "/admin/payments" },
            {
              key: "call-engine",
              label: "Call Engine",
              path: "/admin/call-engine",
            },
          ]
        : [];

    const extraContentItems = dynamicLessonAllowed
      ? [
          {
            key: "dynamic-lesson",
            label: "Learn German",
            path: "/admin/dynamic-lesson",
          },
        ]
      : [];

    return {
      core,
      a1Modules,
      a2Modules,
      b1Modules,
      extraContentItems,
      superAdmin,
    };
  }, [me, hasPaymentsAccess]);

  const defaultPath =
    sections.core[0]?.path ||
    sections.extraContentItems?.[0]?.path ||
    (sections.a1Modules[0] ? `${sections.a1Modules[0].basePath}/add` : null) ||
    (sections.a2Modules[0] ? `${sections.a2Modules[0].basePath}/add` : null) ||
    (sections.b1Modules[0] ? `${sections.b1Modules[0].basePath}/add` : null) ||
    sections.superAdmin[0]?.path ||
    "/admin/no-access";

  if (loading) {
    return <DashboardShellSkeleton />;
  }

  if (!me) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-[64px_minmax(0,1fr)]">
        <aside
          className="relative z-40 rounded-lg border border-slate-200 bg-white lg:sticky lg:top-3 lg:self-start lg:min-h-[calc(100vh-24px)]"
          onFocusCapture={scheduleSidebarExpand}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              scheduleSidebarCollapse();
            }
          }}
        >
          {/* Mobile toggle button */}
          <button
            onClick={toggleMobileSidebar}
            className="flex w-full items-center justify-between p-3 lg:hidden"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Menu
            </span>
            {mobileSidebarOpen ? (
              <ChevronDown className="h-5 w-5 text-slate-600 transition-transform" />
            ) : (
              <ChevronRight className="h-5 w-5 text-slate-600 transition-transform" />
            )}
          </button>

          {/* Desktop collapsed state */}
          <div
            className="hidden h-full flex-col items-center pt-2 lg:flex"
            onPointerEnter={scheduleSidebarExpand}
          >
            <div className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600">
              <ChevronRight className="h-4 w-4" />
            </div>
            <div className="flex flex-1 flex-col items-center gap-2 py-2">
              {Array.from({ length: Math.min(sections.core.length, 8) }).map(
                (_, idx) => (
                  <span
                    key={idx}
                    className="h-1.5 w-6 rounded-full bg-slate-300/80"
                  />
                ),
              )}
            </div>
          </div>

          {/* Desktop expanded overlay */}
          <div
            className="absolute left-0 top-0 z-50 hidden h-full rounded-lg border border-slate-200 bg-white shadow-lg lg:block"
            onPointerEnter={scheduleSidebarExpand}
            onPointerLeave={scheduleSidebarCollapse}
            style={{
              width: desktopSidebarExpanded ? "280px" : "0px",
              transition:
                "width 420ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 280ms ease",
              willChange: "width",
            }}
          >
            <div
              className="h-full overflow-y-auto p-3"
              style={{
                opacity: desktopSidebarExpanded ? 1 : 0,
                transform: desktopSidebarExpanded
                  ? "translateX(0)"
                  : "translateX(-6px)",
                transition:
                  "opacity 240ms ease, transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
                willChange: "opacity, transform",
              }}
            >
              <p className="mb-2 px-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                Admin Panel
              </p>
              <SidebarSection title="Core" items={sections.core} />
              <ContentModuleTree
                a1Modules={sections.a1Modules}
                a2Modules={sections.a2Modules}
                b1Modules={sections.b1Modules}
                extraItems={sections.extraContentItems}
              />
              <SidebarSection title="Super Admin" items={sections.superAdmin} />
            </div>
          </div>

          {/* Mobile dropdown */}
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out lg:hidden"
            style={{
              maxHeight: mobileSidebarOpen ? "80vh" : "0px",
            }}
          >
            <div className="border-t border-slate-100 p-3 overflow-y-auto max-h-[70vh]">
              <p className="mb-2 px-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                Admin Panel
              </p>
              <SidebarSection
                title="Core"
                items={sections.core}
                onLinkClick={closeMobileSidebar}
              />
              <ContentModuleTree
                a1Modules={sections.a1Modules}
                a2Modules={sections.a2Modules}
                b1Modules={sections.b1Modules}
                extraItems={sections.extraContentItems}
                onLinkClick={closeMobileSidebar}
              />
              <SidebarSection
                title="Super Admin"
                items={sections.superAdmin}
                onLinkClick={closeMobileSidebar}
              />
            </div>
          </div>
        </aside>

        <main className="min-h-[calc(100vh-24px)] rounded-lg border border-slate-200 bg-white p-3 lg:p-4">
          <Suspense fallback={<DashboardShellSkeleton />}>
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
                path="app-analytics"
                element={
                  <Guard allowed={hasPermission(me, "app_analytics")}>
                    <AppAnalytics me={me} />
                  </Guard>
                }
              />
              <Route
                path="new-analytics"
                element={
                  <Guard allowed={hasPermission(me, "new_analytics")}>
                    <NewAnalytics me={me} />
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
                    <InterviewToolsModule
                      isSuperAdmin={me.role === "super_admin"}
                    />
                  </Guard>
                }
              />
              <Route
                path="skillcase-interviews/*"
                element={
                  <Guard allowed={hasPermission(me, "skillcase_interviews")}>
                    <SkillcaseInterviewsModule
                      isSuperAdmin={me.role === "super_admin"}
                      canDownload={hasPermission(
                        me,
                        "skillcase_interviews",
                        "download",
                      )}
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
                path="wise-classes"
                element={
                  <Guard allowed={hasPermission(me, "wise")}>
                    <WiseClassesDashboard />
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
                path="trust-page"
                element={
                  <Guard allowed={hasPermission(me, "trust_page")}>
                    <TrustPageManagement />
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
                path="terms"
                element={
                  <Guard allowed={hasPermission(me, "terms")}>
                    <TermsManager />
                  </Guard>
                }
              />
              <Route
                path="explore-candidates/*"
                element={
                  <Guard allowed={hasPermission(me, "explore_candidates")}>
                    <ExploreCandidatesAdmin />
                  </Guard>
                }
              />
              <Route
                path="job-screening"
                element={
                  <Guard allowed={hasPermission(me, "job_screening")}>
                    <JobScreeningAdmin />
                  </Guard>
                }
              />
              <Route
                path="paywall"
                element={
                  <Guard allowed={hasPermission(me, "paywall")}>
                    <Paywall />
                  </Guard>
                }
              />
              <Route
                path="dynamic-lesson"
                element={
                  <Guard allowed={hasPermission(me, "learn_german", "edit")}>
                    <DynamicLessonAdmin />
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

              {/* B1 Routes */}
              <Route
                path="b1/flashcard/add"
                element={
                  <Guard allowed={hasPermission(me, "b1_content", "edit")}>
                    <B1FlashcardAdd />
                  </Guard>
                }
              />
              <Route
                path="b1/flashcard/manage"
                element={
                  <Guard allowed={hasPermission(me, "b1_content", "edit")}>
                    <B1FlashcardManage />
                  </Guard>
                }
              />
              <Route
                path="b1/video/add"
                element={
                  <Guard allowed={hasPermission(me, "b1_content", "edit")}>
                    <B1VideoAdd />
                  </Guard>
                }
              />
              <Route
                path="b1/video/manage"
                element={
                  <Guard allowed={hasPermission(me, "b1_content", "edit")}>
                    <B1VideoManage />
                  </Guard>
                }
              />
              <Route
                path="b1/describe-speak/add"
                element={
                  <Guard allowed={hasPermission(me, "b1_content", "edit")}>
                    <B1DescribeSpeakAdd />
                  </Guard>
                }
              />
              <Route
                path="b1/describe-speak/manage"
                element={
                  <Guard allowed={hasPermission(me, "b1_content", "edit")}>
                    <B1DescribeSpeakManage />
                  </Guard>
                }
              />
              <Route
                path="b1/news/add"
                element={
                  <Guard allowed={hasPermission(me, "b1_content", "edit")}>
                    <B1NewsAdd />
                  </Guard>
                }
              />
              <Route
                path="b1/news/manage"
                element={
                  <Guard allowed={hasPermission(me, "b1_content", "edit")}>
                    <B1NewsManage />
                  </Guard>
                }
              />
              <Route
                path="b1/article/add"
                element={
                  <Guard allowed={hasPermission(me, "b1_content", "edit")}>
                    <B1ArticleAdd />
                  </Guard>
                }
              />
              <Route
                path="b1/article/manage"
                element={
                  <Guard allowed={hasPermission(me, "b1_content", "edit")}>
                    <B1ArticleManage />
                  </Guard>
                }
              />
              <Route
                path="b1/exams/add"
                element={
                  <Guard allowed={hasPermission(me, "b1_content", "edit")}>
                    <B1ExamsAdd />
                  </Guard>
                }
              />
              <Route
                path="b1/exams/manage"
                element={
                  <Guard allowed={hasPermission(me, "b1_content", "edit")}>
                    <B1ExamsManage />
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
              <Route
                path="tickets"
                element={
                  me.role === "super_admin" ? (
                    <SupportTicketsAdmin />
                  ) : (
                    <Navigate to="/admin/no-access" replace />
                  )
                }
              />
              <Route
                path="payments"
                element={
                  hasPaymentsAccess ? (
                    <PaymentsAdmin />
                  ) : (
                    <Navigate to="/admin/no-access" replace />
                  )
                }
              />
              <Route
                path="call-engine"
                element={
                  me.role === "super_admin" ? (
                    <CallEnginePage />
                  ) : (
                    <Navigate to="/admin/no-access" replace />
                  )
                }
              />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
