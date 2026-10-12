import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import LandingPage from "../../pages/landing/LandingPage";
import { lazyPage } from "../lazyPage";
import { publicRoutes } from "./publicRoutes";
import { accountRoutes } from "./accountRoutes";
import { jobsRoutes } from "./jobsRoutes";
import { levelRoutes } from "./levelRoutes";
import { learnGermanRoutes } from "./learnGermanRoutes";
import { examRoutes } from "./examRoutes";
import { practiceSuiteRoutes } from "./practiceSuiteRoutes";
import { coursesRoutes } from "./coursesRoutes";

function HomeRoute() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? <LandingPage /> : <Navigate to="/onboarding" replace />;
}

const redirect = (path, to) => ({ path, element: <Navigate to={to} replace /> });

// Sunset A1 screens and old internal tools — stale deep links still land somewhere.
const legacyRoutes = [
  redirect("/practice/*", "/"),
  redirect("/pronounce/*", "/"),
  redirect("/test/:prof_level", "/"),
  redirect("/stories", "/"),
  redirect("/story/*", "/"),
  redirect("/conversation/*", "/"),
  redirect("/news", "/"),
  redirect("/news/*", "/"),
  redirect("/internal/lead-form", "/admin/internal-leads"),
  redirect("/internal/wise", "/admin/wise"),
  redirect("/manage-event", "/admin/events"),
];

// Every screen in the app. Each route's handle declares its own access,
// funnel, footer and pull-to-refresh rules (see ../guards.js).
export const appRoutes = [
  { path: "/", element: <HomeRoute />, handle: { funnels: { jobs: "b1" } } },
  ...publicRoutes,
  ...accountRoutes,
  ...jobsRoutes,
  ...levelRoutes,
  ...learnGermanRoutes,
  ...examRoutes,
  ...practiceSuiteRoutes,
  ...coursesRoutes,
  {
    // Dashboard has its own descendant <Routes>, so keep the splat
    path: "/admin/*",
    lazy: lazyPage(() => import("../../dashboard-src/pages/Dashboard")),
    handle: { funnels: { jobs: true } },
  },
  ...legacyRoutes,
  // Unknown paths used to render an empty shell
  redirect("*", "/"),
];
