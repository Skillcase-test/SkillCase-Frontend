export const resolveAssetUrl = (url) => {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("/assets/") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
  const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
  return `${backendUrl}/${cleanUrl}`;
};
