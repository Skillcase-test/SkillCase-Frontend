import { lazyPage } from "../lazyPage";

const jobs = { funnels: { jobs: true } };

export const jobsRoutes = [
  { path: "/job-screening", lazy: lazyPage(() => import("../../pages/jobScreening/JobScreening")), handle: jobs },
  {
    path: "/job-screening/terms/sign/:token",
    lazy: lazyPage(() => import("../../pages/terms/JobScreeningTermsSignPage")),
    handle: jobs,
  },
  {
    path: "/job-screening/opportunity/:id",
    lazy: lazyPage(() => import("../../pages/jobScreening/OpportunityDeepLink")),
    handle: jobs,
  },
  { path: "/job-screening/refer", lazy: lazyPage(() => import("../../pages/jobScreening/ReferralPage")), handle: jobs },
  { path: "/job-screening/course", lazy: lazyPage(() => import("../../pages/jobScreening/CoursePage")), handle: jobs },
  {
    path: "/job-screening/interview/:slug",
    lazy: lazyPage(() => import("../../pages/interviewTools/JobScreeningInterviewPage")),
    handle: jobs,
  },
  // A1/A2 locked jobs teaser — B1/B2 redirect to the pipeline
  { path: "/jobs", lazy: lazyPage(() => import("../../pages/jobs/JobsLockedPage")), handle: jobs },
];
