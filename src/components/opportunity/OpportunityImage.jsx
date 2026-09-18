import { useState } from "react";

// Opportunity artwork with a skeleton shimmer while the presigned URL loads.
// `placeholder` renders when src is missing or the URL fails — callers pass
// their existing fallback so nothing changes visually for the no-image case.
// Tracks the loaded/failed src (not a boolean) so a swapped URL re-skeletons.
const OpportunityImage = ({
  src,
  alt = "",
  className = "",
  imgClassName = "",
  placeholder = null,
}) => {
  const [loadedSrc, setLoadedSrc] = useState(null);
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === src) return placeholder;
  const loading = loadedSrc !== src;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 animate-pulse bg-slate-200/70" />
      )}
      <img
        src={src}
        alt={alt}
        draggable="false"
        onLoad={() => setLoadedSrc(src)}
        onError={() => setFailedSrc(src)}
        className={`w-full h-full object-contain select-none transition-opacity duration-300 ${
          loading ? "opacity-0" : "opacity-100"
        } ${imgClassName}`}
      />
    </div>
  );
};

export default OpportunityImage;
