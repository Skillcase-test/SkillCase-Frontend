import Chip from "./Chip";

const STATUS_META = {
  not_started: { label: "Not started", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  in_progress: { label: "In progress", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "Completed", cls: "bg-green-50 text-green-700 border-green-200" },
  warned_out: { label: "Warned out", cls: "bg-red-50 text-red-600 border-red-200" },
  auto_closed: { label: "Auto closed", cls: "bg-orange-50 text-orange-600 border-orange-200" },
};

/** Submission-status pill (not_started / in_progress / completed / warned_out / auto_closed). */
export default function StatusPill({ status, visited = true }) {
  const meta = STATUS_META[status] || STATUS_META.not_started;
  return <Chip cls={meta.cls}>{visited ? meta.label : "Not visited"}</Chip>;
}
