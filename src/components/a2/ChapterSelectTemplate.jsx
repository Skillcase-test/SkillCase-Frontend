import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { images } from "../../assets/images";
export default function ChapterSelectTemplate({
  title,
  subtitle,
  chapters = [],
  loading = false,
  error = null,
  onChapterClick,
  getProgress, // (chapter) => { completed, total }
  backPath = "/",
  showTourIds = false,
}) {
  const navigate = useNavigate();
  const getChapterData = (chapter) => {
    if (!getProgress) return { completed: 0, total: 0 };
    const progress = getProgress(chapter);
    // Handle both field conventions: current vs completed
    return {
      completed: progress.completed ?? progress.current ?? 0,
      total: progress.total ?? 0,
    };
  };
  const isChapterComplete = (chapter) => {
    const { completed, total } = getChapterData(chapter);
    return completed >= total && total > 0;
  };
  const getBadgeStyle = (completed, total) => {
    if (completed === total && total > 0) {
      return { bg: "bg-[rgba(1,144,53,0.12)]", text: "text-[#019035]" };
    }
    return { bg: "bg-[rgba(255,235,192,0.65)]", text: "text-[#ac8121]" };
  };
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Back Navigation */}
      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(backPath)}
            className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-sm font-semibold text-[#7b7b7b]">{title}</span>
        </div>
      </div>
      {/* Header Background Image */}
      <div className="relative h-[140px] w-full overflow-hidden">
        <img
          src={images.headerBackground}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
      </div>
      {/* Level Info Section */}
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-center gap-4 mb-1.5">
          <h1 className="text-[30px] font-semibold text-[#002856] leading-[38px]">
            A2
          </h1>
          <span className="text-base font-semibold text-[#002856]">
            German Language Level
          </span>
        </div>
        <p className="text-xs text-black opacity-70 mb-4">
          {subtitle || "Continue your German learning journey"}
        </p>
        {/* Chapter Progress Carousel */}
        <div
          className="flex gap-2 overflow-x-auto"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {chapters.map((chapter, index) => {
            const { completed, total } = getChapterData(chapter);
            const fillPercent = total > 0 ? (completed / total) * 100 : 0;
            const isComplete = isChapterComplete(chapter);
            return (
              <div
                key={chapter.id || index}
                onClick={() => onChapterClick(chapter)}
                className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ minWidth: "50px", width: "50px" }}
              >
                <div className="h-3 w-full rounded-full bg-[#f0f0f0] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isComplete ? "bg-[#019035]" : "bg-[#edb843]"
                    }`}
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-[#002856] whitespace-nowrap">
                  Ch. {index + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {/* Chapter Cards List */}
      <div
        className="flex-1 px-4 space-y-3"
        id={showTourIds ? "a2-chapter-list" : undefined}
      >
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <RefreshCw className="w-7 h-7 animate-spin text-[#002856]" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">{error}</div>
        ) : chapters.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            No chapters available
          </div>
        ) : (
          chapters.map((chapter, index) => {
            const { completed, total } = getChapterData(chapter);
            const badgeStyle = getBadgeStyle(completed, total);
            return (
              <div
                key={chapter.id || index}
                id={showTourIds && index === 0 ? "a2-first-chapter" : undefined}
                onClick={() => onChapterClick(chapter)}
                className="bg-white border border-[#dbdbdb] rounded-xl px-3 py-5 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-[#181d27] flex-1 pr-2">
                    {chapter.chapter_name || `Chapter ${index + 1}`}
                  </h3>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div
                      className={`${badgeStyle.bg} px-2.5 py-1 rounded-full`}
                    >
                      <span
                        className={`text-[13px] font-medium whitespace-nowrap ${badgeStyle.text}`}
                      >
                        {completed}/{total} done
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#414651]" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
