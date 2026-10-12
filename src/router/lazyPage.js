// A swallowed preload error resolves to an empty module — treat it as a stale chunk.
export const lazyPage = (importer) => async () => {
  const mod = await importer();
  if (!mod?.default) {
    throw new Error("Failed to fetch dynamically imported module (empty)");
  }
  return { Component: mod.default };
};
