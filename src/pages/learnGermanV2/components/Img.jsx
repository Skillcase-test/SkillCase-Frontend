import { useState } from "react";

/* <img> drop-in that keeps a shimmer skeleton behind the art until it has
 * loaded — Cloudinary fetches pop in over the network, and an empty box read
 * as a broken screen. className styles the wrapper exactly like the img it
 * replaces; a failed fetch settles on flat slate instead of pulsing forever. */
export default function Img({ src, alt = "", className = "", imgClassName = "object-cover", ...rest }) {
  const [state, setState] = useState("loading");
  return (
    <span className={`relative inline-block overflow-hidden bg-slate-200 ${className}`}>
      {state === "loading" && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200"
        />
      )}
      {state !== "failed" && (
        <img
          src={src}
          alt={alt}
          {...rest}
          onLoad={() => setState("ready")}
          onError={() => setState("failed")}
          className={`h-full w-full ${imgClassName} transition-opacity duration-300 ${
            state === "ready" ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </span>
  );
}
