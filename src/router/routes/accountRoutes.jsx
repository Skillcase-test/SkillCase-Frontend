import { lazyPage } from "../lazyPage";

// Profile + billing are never mode-specific — every locked funnel must be able
// to claim the trial, subscribe, cancel and read receipts.
const account = { funnels: { jobs: true }, footer: true };
// These two carry the bottom tab bar instead of the footer
const accountShell = { ...account, footer: false };

export const accountRoutes = [
  { path: "/profile", lazy: lazyPage(() => import("../../pages/ProfilePage")), handle: account },
  { path: "/profile/upgrade", lazy: lazyPage(() => import("../../pages/payments/UpgradePlanPage")), handle: accountShell },
  { path: "/trial-offer", lazy: lazyPage(() => import("../../pages/payments/TrialOfferPage")), handle: account },
  { path: "/profile/manage-plan", lazy: lazyPage(() => import("../../pages/payments/ManagePlanPage")), handle: accountShell },
  {
    path: "/profile/transactions",
    lazy: lazyPage(() => import("../../pages/payments/TransactionHistoryPage")),
    handle: account,
  },
];
