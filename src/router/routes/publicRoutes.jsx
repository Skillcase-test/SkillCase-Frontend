import { Navigate } from "react-router-dom";
import OnboardingFlow from "../../pages/onboarding/OnboardingFlow";
import { lazyPage } from "../lazyPage";

// Marketing, events and share-link landings — open to everyone, including
// users locked into a funnel.
const acquisition = (extra = {}) => ({ access: "acquisition", ...extra });

export const publicRoutes = [
  { path: "/signup", element: <Navigate to="/onboarding" replace />, handle: { access: "public" } },
  { path: "/login", element: <Navigate to="/onboarding" replace />, handle: { access: "public" } },
  {
    path: "/onboarding",
    element: <OnboardingFlow />,
    handle: { access: "public", pullToRefresh: false },
  },
  {
    // Recruitment enrollments reuse this agreement wizard, so screening
    // candidates must be able to reach it too.
    path: "/terms/sign/:token",
    lazy: lazyPage(() => import("../../pages/terms/TermsSignPage")),
    handle: { access: "public", funnels: { jobs: true } },
  },

  { path: "/register", lazy: lazyPage(() => import("../../pages/NursingGermanyLanding")), handle: acquisition() },
  { path: "/start-now", lazy: lazyPage(() => import("../../pages/StartNowLanding")), handle: acquisition() },
  { path: "/start-now/cart", lazy: lazyPage(() => import("../../pages/StartNowCart")), handle: acquisition() },
  { path: "/thank-you", lazy: lazyPage(() => import("../../pages/ThankYouPage")), handle: acquisition() },
  { path: "/open-app", lazy: lazyPage(() => import("../../pages/FallbackPage")), handle: acquisition({ footer: true }) },
  {
    // Android trampoline: web link → skillcase:// scheme → Play Store fallback
    path: "/redirect",
    lazy: lazyPage(() => import("../../pages/deepLink/DeepLinkRedirect")),
    handle: acquisition({ footer: true }),
  },
  { path: "/continue", lazy: lazyPage(() => import("../../pages/ContinuePractice")), handle: acquisition({ footer: true }) },
  { path: "/events", lazy: lazyPage(() => import("../../pages/event/AllEventsPage")), handle: acquisition({ footer: true }) },
  { path: "/events/featured", lazy: lazyPage(() => import("../../pages/event/FeaturedEventPage")), handle: acquisition({ footer: true }) },
  { path: "/events/:slug", lazy: lazyPage(() => import("../../pages/event/EventDetailPage")), handle: acquisition({ footer: true }) },
  {
    // Referral share links — the referred friend is by definition logged out
    path: "/r/:code",
    lazy: lazyPage(() => import("../../pages/referral/ReferralRedirect")),
    handle: acquisition({ footer: true }),
  },
  {
    path: "/interview/:slug",
    lazy: lazyPage(() => import("../../pages/interviewTools/PublicInterviewPage")),
    handle: acquisition({ pullToRefresh: false }),
  },
];
