import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { exploreCandidatesAdminApi } from "../../api/exploreCandidatesAdminApi";
import {
  JobsAdminPage,
  JobAssignPage,
} from "./ExploreCandidatesJobsAdmin";
import { TabNavigation } from "../explore-candidates-admin/components/common";
import { AccountsPage } from "../explore-candidates-admin/pages/AccountsPage";
import { AccountProfilesPage } from "../explore-candidates-admin/pages/AccountProfilesPage";
import { LibraryPage } from "../explore-candidates-admin/pages/LibraryPage";
import { AccessRequestsPage } from "../explore-candidates-admin/pages/AccessRequestsPage";
import { ProfileFormPage } from "../explore-candidates-admin/pages/ProfileFormPage";

// Re-export shared UI elements for backward compatibility
export {
  PageCard,
  TableWrapper,
  TableHead,
  TableBody,
} from "../explore-candidates-admin/components/common";
export { ActionButton } from "../explore-candidates-admin/components/controls";

export default function ExploreCandidatesAdmin() {
  const location = useLocation();
  const [tabCounts, setTabCounts] = useState({
    accounts: null,
    access_requests: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      try {
        const [accRes, reqRes] = await Promise.allSettled([
          exploreCandidatesAdminApi.listAccounts(),
          exploreCandidatesAdminApi.listAccessRequests({ status: "pending" }),
        ]);

        if (cancelled) return;

        setTabCounts({
          accounts:
            accRes.status === "fulfilled"
              ? accRes.value?.data?.data?.length ?? null
              : null,
          "access-requests":
            reqRes.status === "fulfilled"
              ? reqRes.value?.data?.counts?.pending ??
                reqRes.value?.data?.data?.length ??
                null
              : null,
        });
      } catch (_e) {
        // Silently catch badge count errors
      }
    }
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  return (
    <div className="space-y-6">
      {/* Shared Header Tab Navigation */}
      <TabNavigation counts={tabCounts} />

      {/* Main Routed Content */}
      <Routes>
        <Route index element={<AccountsPage />} />
        <Route
          path="accounts/:accountId/profiles"
          element={<AccountProfilesPage />}
        />
        <Route path="library" element={<LibraryPage />} />
        <Route path="access-requests" element={<AccessRequestsPage />} />
        <Route path="jobs" element={<JobsAdminPage />} />
        <Route path="jobs/:jobId" element={<JobAssignPage />} />
        <Route path="profiles/new" element={<ProfileFormPage mode="create" />} />
        <Route
          path="profiles/:profileId/edit"
          element={<ProfileFormPage mode="edit" />}
        />
        <Route
          path="*"
          element={<Navigate to="/admin/explore-candidates" replace />}
        />
      </Routes>
    </div>
  );
}
