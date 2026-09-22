import React from "react";
import { Navigate } from "react-router-dom";

// Legacy A1 is fully sunset — every A1 user lands on the revamp suite.
export default function A1EntryResolver() {
  return <Navigate to="/a1/flashcard" replace />;
}
