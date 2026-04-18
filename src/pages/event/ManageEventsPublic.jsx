import { Navigate } from "react-router-dom";

export default function ManageEventsPublic() {
  return <Navigate to="/admin/events" replace />;
}
