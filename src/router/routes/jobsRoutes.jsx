import { lazyPage } from "../lazyPage";
import { germanJobsPage } from "../GermanJobsGate";

const jobs = { funnels: { jobs: true } };

export const jobsRoutes = [
  { path: "/job-screening", lazy: germanJobsPage(lazyPage(() => import("../../pages/jobScreening/JobScreening"))), handle: jobs },
  {
    path: "/job-screening/terms/sign/:token",
    lazy: germanJobsPage(lazyPage(() => import("../../pages/terms/JobScreeningTermsSignPage"))),
    handle: jobs,
  },
  {
    path: "/job-screening/opportunity/:id",
    lazy: germanJobsPage(lazyPage(() => import("../../pages/jobScreening/OpportunityDeepLink"))),
    handle: jobs,
  },
  { path: "/job-screening/refer", lazy: germanJobsPage(lazyPage(() => import("../../pages/jobScreening/ReferralPage"))), handle: jobs },
  { path: "/job-screening/course", lazy: germanJobsPage(lazyPage(() => import("../../pages/jobScreening/CoursePage"))), handle: jobs },
  {
    path: "/job-screening/interview/:slug",
    lazy: germanJobsPage(lazyPage(() => import("../../pages/interviewTools/JobScreeningInterviewPage"))),
    handle: jobs,
  },
  // A1/A2 locked jobs teaser — B1/B2 redirect to the pipeline
  { path: "/jobs", lazy: lazyPage(() => import("../../pages/jobs/JobsLockedPage")), handle: jobs },
];
