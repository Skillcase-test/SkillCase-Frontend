import { useEffect, useMemo, useState } from "react";
import { Search, Users, AlertTriangle } from "lucide-react";
import { useScholarshipWorkspace } from "./index";
import { formatDateTime } from "../../../../utils/dateTime";
import StatusPill from "./ui/StatusPill";
import Chip from "./ui/Chip";
import EmptyState from "./ui/EmptyState";
import { btn, inputCls } from "./ui/buttons";

const PAGE_SIZE = 10;

/**
 * Candidates tab: enrolment explained, plus two searchable, paginated
 * (10 + "Show more") multi-select lists — one to grant access to students who
 * don't have it, one to manage (and bulk-remove) candidates who do. A candidate
 * sits one exam at a time, so moving them to another exam means removing them
 * here first. No "Remove All": bulk actions only ever apply to what is selected.
 */
export default function CandidatesTab() {
  const {
    visStudents,
    studentQuery,
    setStudentQuery,
    visQuery,
    setVisQuery,
    addableStudents,
    filteredVisStudents,
    handleAddStudents,
    handleRemoveStudent,
    handleRemoveStudents,
  } = useScholarshipWorkspace();

  // Pagination (10 per page, "Show more" reveals more)
  const [addCount, setAddCount] = useState(PAGE_SIZE);
  const [visCount, setVisCount] = useState(PAGE_SIZE);

  // Multi-select state (user_ids for add, visibility row ids for remove)
  const [selectedAdd, setSelectedAdd] = useState(() => new Set());
  const [selectedVis, setSelectedVis] = useState(() => new Set());

  // When the granted list reloads (add/remove), drop stale selections + reset page
  useEffect(() => {
    setSelectedVis(new Set());
    setVisCount(PAGE_SIZE);
  }, [visStudents]);

  // Prune add-selections that are no longer addable (granted or filtered out)
  useEffect(() => {
    const valid = new Set(addableStudents.map((s) => s.user_id));
    setSelectedAdd((prev) => {
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [addableStudents]);

  const visibleAddable = useMemo(
    () => addableStudents.slice(0, addCount),
    [addableStudents, addCount],
  );
  const visibleVis = useMemo(
    () => filteredVisStudents.slice(0, visCount),
    [filteredVisStudents, visCount],
  );

  const allVisibleAddSelected =
    visibleAddable.length > 0 &&
    visibleAddable.every((s) => selectedAdd.has(s.user_id));
  const allVisibleVisSelected =
    visibleVis.length > 0 &&
    visibleVis.every((s) => selectedVis.has(s.id));

  const onStudentQuery = (e) => {
    setStudentQuery(e.target.value);
    setAddCount(PAGE_SIZE);
    setSelectedAdd(new Set());
  };

  const onVisQuery = (e) => {
    setVisQuery(e.target.value);
    setVisCount(PAGE_SIZE);
    setSelectedVis(new Set());
  };

  const toggleAdd = (userId) => {
    setSelectedAdd((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleAllVisibleAdd = (checked) => {
    setSelectedAdd((prev) => {
      const next = new Set(prev);
      visibleAddable.forEach((s) => {
        if (checked) next.add(s.user_id);
        else next.delete(s.user_id);
      });
      return next;
    });
  };

  const toggleVis = (visId) => {
    setSelectedVis((prev) => {
      const next = new Set(prev);
      if (next.has(visId)) next.delete(visId);
      else next.add(visId);
      return next;
    });
  };

  const toggleAllVisibleVis = (checked) => {
    setSelectedVis((prev) => {
      const next = new Set(prev);
      visibleVis.forEach((s) => {
        if (checked) next.add(s.id);
        else next.delete(s.id);
      });
      return next;
    });
  };

  const addSelected = () => {
    const ids = [...selectedAdd];
    if (!ids.length) return;
    handleAddStudents(ids);
  };

  const removeSelected = () => {
    const ids = [...selectedVis];
    if (!ids.length) return;
    handleRemoveStudents(ids);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-800 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Candidates are enrolled here — via onboarding or by adding them
          below. A candidate can be active in only one exam at a time, so you
          must remove them from another exam before adding them here. Bulk
          actions only ever apply to what you have selected.
        </p>
      </div>

      {/* ── Add candidates manually ── */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-[#f1f5f9]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-slate-700">
                Add candidates manually
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {addableStudents.length} student(s) without access
                {studentQuery ? " matching your search" : ""}
              </p>
            </div>
            <button
              onClick={addSelected}
              disabled={selectedAdd.size === 0}
              className={btn.primary}
            >
              Add selected ({selectedAdd.size})
            </button>
          </div>
          <div className="relative mt-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={studentQuery}
              onChange={onStudentQuery}
              placeholder="Search students by name, username or phone…"
              className={`${inputCls} pl-9`}
            />
          </div>
        </div>

        {visibleAddable.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              addableStudents.length === 0
                ? "Everyone already has access"
                : "No students match your search"
            }
            sub="All students without access are listed here, 10 at a time."
            compact
          />
        ) : (
          <>
            <div className="divide-y divide-[#f1f5f9]">
              <div className="px-4 py-2 flex items-center gap-3 bg-[#f8fafc]">
                <input
                  type="checkbox"
                  checked={allVisibleAddSelected}
                  onChange={(e) => toggleAllVisibleAdd(e.target.checked)}
                  aria-label="Select all visible students to add"
                  className="w-4 h-4 rounded border-slate-300 accent-[#002856]"
                />
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Select all visible
                </span>
              </div>
              {visibleAddable.map((s) => (
                <label
                  key={s.user_id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedAdd.has(s.user_id)}
                    onChange={() => toggleAdd(s.user_id)}
                    aria-label={`Select ${s.fullname || s.username} to add`}
                    className="w-4 h-4 rounded border-slate-300 accent-[#002856]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-700 text-sm truncate flex items-center gap-1.5">
                      {s.fullname || s.username}
                      {/* Admins are listed so the team can add themselves and
                          dry-run an exam — tagged so they're not mistaken for
                          candidates. */}
                      {String(s.role || "").includes("admin") && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 shrink-0">
                          Admin
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      @{s.username}
                      {s.number ? ` · ${s.number}` : ""}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            {addableStudents.length > addCount && (
              <div className="px-4 py-3 border-t border-[#f1f5f9] text-center">
                <button
                  onClick={() => setAddCount((c) => c + PAGE_SIZE)}
                  className="text-xs font-bold text-[#002856] hover:underline"
                >
                  Show more ({addableStudents.length - addCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Granted list ── */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-[#f1f5f9]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-slate-700">
                Candidates with access ({filteredVisStudents.length})
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {visQuery
                  ? `${filteredVisStudents.length} matching your search`
                  : "Enrolled via onboarding or added manually · search, select and remove in bulk"}
              </p>
            </div>
            {selectedVis.size > 0 && (
              <button onClick={removeSelected} className={btn.dangerSmall}>
                Remove selected ({selectedVis.size})
              </button>
            )}
          </div>
          <div className="relative mt-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={visQuery}
              onChange={onVisQuery}
              placeholder="Search candidates by name, username or phone…"
              className={`${inputCls} pl-9`}
            />
          </div>
        </div>

        {visibleVis.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              visStudents.length === 0
                ? "No candidates yet"
                : "No candidates match your search"
            }
            sub="Candidates appear here once enrolled via onboarding or added manually."
            compact
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f1f5f9] text-left text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allVisibleVisSelected}
                        onChange={(e) => toggleAllVisibleVis(e.target.checked)}
                        aria-label="Select all visible candidates to remove"
                        className="w-4 h-4 rounded border-slate-300 accent-[#002856]"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">Candidate</th>
                    <th className="px-4 py-3 font-semibold">Source</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Score</th>
                    <th className="px-4 py-3 font-semibold">Started</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleVis.map((s, i) => (
                    <tr
                      key={s.id}
                      className={`border-b border-[#f1f5f9] hover:bg-slate-50/60 ${
                        i % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedVis.has(s.id)}
                          onChange={() => toggleVis(s.id)}
                          aria-label={`Select ${s.fullname || s.username} to remove`}
                          className="w-4 h-4 rounded border-slate-300 accent-[#002856]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-700">
                          {s.fullname || s.username}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          @{s.username}
                          {s.number ? ` · ${s.number}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Chip
                          cls={
                            s.added_via === "scholarship"
                              ? "bg-[#eef2f6] text-[#002856] border-[#ccd9e8]"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }
                        >
                          {s.added_via === "scholarship"
                            ? "Scholarship"
                            : "Added"}
                        </Chip>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill
                          status={s.submission_status}
                          visited={Boolean(s.submission_status)}
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600">
                        {s.submission_status === "completed" && s.score !== null
                          ? `${parseFloat(s.score).toFixed(1)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {formatDateTime(s.started_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() =>
                            handleRemoveStudent(s.id, s.fullname || s.username)
                          }
                          className={btn.dangerSmall}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredVisStudents.length > visCount && (
              <div className="px-4 py-3 border-t border-[#f1f5f9] text-center">
                <button
                  onClick={() => setVisCount((c) => c + PAGE_SIZE)}
                  className="text-xs font-bold text-[#002856] hover:underline"
                >
                  Show more ({filteredVisStudents.length - visCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
