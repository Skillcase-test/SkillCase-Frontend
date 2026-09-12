import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";

// Clickable table header for the interview candidates table. Shows a neutral
// icon when inactive and a direction arrow on the column driving the sort.
export default function CandidateSortableTh({
  column,
  sort,
  onToggle,
  className = "px-4 py-4",
  children,
}) {
  const isActive = sort.key === column;
  return (
    <th
      className={className}
      aria-sort={
        isActive
          ? sort.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        type="button"
        onClick={() => onToggle(column)}
        className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-gray-900"
      >
        <span>{children}</span>
        {isActive ? (
          sort.direction === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-gray-500" />
        )}
      </button>
    </th>
  );
}
