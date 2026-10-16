import { Navigate } from "react-router-dom";
import { useGermanJobsHidden } from "../hooks/useGermanJobs";

export default function GermanJobsGate({ children }) {
  const { hidden, checking } = useGermanJobsHidden();
  if (checking) return null;
  if (hidden) return <Navigate to="/" replace />;
  return children;
}

// Route lazy() wrapper: job-screening pages send hidden users to Job Preparation
export const germanJobsPage = (load) => async () => {
  const route = await load();
  const Page = route.Component;
  return { ...route, Component: () => <GermanJobsGate><Page /></GermanJobsGate> };
};
