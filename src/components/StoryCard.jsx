import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

const StoryCard = ({ s, idx }) => {

  return (
    <Link to={`/story/${s.slug}`}>
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 flex items-center gap-3 md:gap-4 hover:shadow-lg transition-shadow border border-[#9c9c9c]/40 relative">
        {/* Completion Badge */}
        {s.completed && (
          <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5 lg:p-1.5 z-10 shadow-md">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
        )}

        <p className="text-center">{idx + 1}.</p>
        <div className="flex-1">
          <h3 className="text-md md:text-lg font-normal text-slate-900 text-start line-clamp-1">
            {s.title}
          </h3>
        </div>
        <div className="shrink-0 size-12 md:size-16 rounded-lg overflow-hidden">
          <img
            src={s.coverImageUrl}
            alt="main image"
            className="size-full object-cover"
          />
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </Link>
  );
};
export default StoryCard;
