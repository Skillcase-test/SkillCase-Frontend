const moduleHome = (modules) => (modules?.[0] ? `${modules[0].basePath}/add` : null);

// App Analytics when allowed, otherwise the first item in sidebar order.
export function adminLandingPath(sections) {
  return (
    sections.core.find((item) => item.key === "app-analytics")?.path ||
    sections.overview[0]?.path ||
    sections.core[0]?.path ||
    moduleHome(sections.a1Modules) ||
    moduleHome(sections.a2Modules) ||
    moduleHome(sections.b1Modules) ||
    moduleHome(sections.b2Modules) ||
    moduleHome(sections.videoCoursesModules) ||
    sections.extraContentItems?.[0]?.path ||
    sections.superAdmin[0]?.path ||
    "/admin/no-access"
  );
}
