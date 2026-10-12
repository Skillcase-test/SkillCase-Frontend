import { RouterProvider } from "react-router-dom";
import { router } from "./router";

import "./dashboard-src/css/style.css";

if (typeof global === "undefined") {
  window.global = window;
}

// Routes live in src/router/routes, the app shell in src/app/AppLayout.
export default function App() {
  return <RouterProvider router={router} />;
}
