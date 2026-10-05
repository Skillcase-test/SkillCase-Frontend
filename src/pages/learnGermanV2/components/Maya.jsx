import Typed from "./Typed";
import { getMayaImage } from "../../../utils/mayaAvatars";
import { useSelector } from "react-redux";

// The real Skillcase Maya — the same getMayaImage() avatar the rest of the
// product renders (occupation-aware), mapped from the reference app's mood
// names so step content keeps working unchanged.
const MOOD_TO_IMAGE = {
  bob: "smiling",
  cheer: "smiling",
  wobble: "looking",
  curious: "looking",
  concerned: "looking",
  greet: "wave",
  wave: "wave",
  proud: "thumbsup",
};

export default function Maya({ mood = "bob", className = "" }) {
  const user = useSelector((s) => s.auth?.user);
  const src = getMayaImage(MOOD_TO_IMAGE[mood] || "smiling", user);
  return (
    <img
      className={`h-12 w-12 shrink-0 rounded-full object-cover ${className}`}
      src={src}
      alt="Maya"
      draggable="false"
    />
  );
}

// `type` is opt-in, not the default: her line types itself where she is
// introducing something, and stays instant everywhere it is feedback on an
// answer the learner is waiting to get past.
export function MayaSays({ text, mood, type = false, children }) {
  return (
    <div className="mb-3 flex items-end gap-2.5">
      <Maya mood={mood} />
      <div className="relative mb-1 flex-1 rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[15px] leading-snug text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.08)] ring-1 ring-slate-200">
        {type ? <Typed text={text} /> : text}
        {children}
      </div>
    </div>
  );
}
