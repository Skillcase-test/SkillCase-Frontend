import { Navigate } from "react-router-dom";
import { useFeatureFlags } from "../hooks/useFeatureFlags";

export default function FeatureFlagGated({ featureKey, redirectTo = "/", children }) {
  const { isFeatureEnabled, loading } = useFeatureFlags();
  if (loading) return null;
  if (!isFeatureEnabled(featureKey)) {
    return <Navigate to={redirectTo} replace />;
  }
  return children;
}

// Route lazy() wrapper that gates the loaded page behind a feature flag.
export const gatedPage = (featureKey, importer) => async () => {
  const mod = await importer();
  const Page = mod?.default;
  if (!Page) {
    throw new Error("Failed to fetch dynamically imported module (empty)");
  }
  return {
    Component: () => (
      <FeatureFlagGated featureKey={featureKey}>
        <Page />
      </FeatureFlagGated>
    ),
  };
};
