import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Search, Loader2, FileText } from "lucide-react";
import { getNotes } from "../../api/notesApi";
import { trackFeatureEvent } from "../../telemetry/events";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "hi", label: "हिंदी" },
  { code: "kn", label: "ಕನ್ನಡ" },
];

const LEVELS = ["All", "A1", "A2", "B1", "B2", "C1"];

export default function NotesListPage() {
  const navigate = useNavigate();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState("en");
  const [level, setLevel] = useState("All");
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setDebouncedQ("");
      return undefined;
    }
    const timer = setTimeout(() => {
      setDebouncedQ(q);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setLoading(true);
    getNotes({
      language,
      level: level === "All" ? undefined : level,
      q: debouncedQ || undefined,
    })
      .then((res) => {
        setNotes(res.data?.data || []);
      })
      .catch((err) => console.error("Error fetching notes:", err))
      .finally(() => setLoading(false));
  }, [language, level, debouncedQ]);

  const openNote = (note) => {
    trackFeatureEvent("notes", "note_opened", {
      entityType: "note",
      entityId: note.note_id,
    });
    navigate(`/notes/${note.note_id}`);
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col shadow-sm">
      <div className="self-stretch px-4 py-2.5 flex justify-between items-center bg-white border-b border-zinc-100">
        <button
          onClick={() => navigate("/")}
          className="px-0.5 flex items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
        >

          <ChevronLeft className="w-4 h-4 text-slate-900" />
          <span className="text-slate-900 text-sm font-semibold leading-6">
            Back
          </span>
        </button>
        <span className="text-neutral-500 text-sm font-semibold leading-6">
          Study Notes
        </span>
      </div>

      <div className="px-4 py-3 flex flex-col gap-3">
        <div className="flex gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                language === lang.code
                  ? "bg-[#002856] text-white border-[#002856]"
                  : "bg-slate-50 text-slate-700 border-zinc-200 hover:bg-slate-100"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevel(lvl)}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 cursor-pointer border transition-all ${
                level === lvl
                  ? "bg-amber-100 text-amber-900 border-amber-300 font-semibold"
                  : "bg-white text-slate-600 border-zinc-200 hover:border-zinc-300"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-zinc-200 rounded-lg">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes..."
            aria-label="Search notes"
            className="flex-1 bg-transparent text-xs text-slate-800 outline-none border-0 focus:ring-0 focus:border-0"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-center text-slate-400 py-12 text-sm">
          {debouncedQ
            ? "No matching notes found."
            : "No study notes available for this selection."}
        </p>
      ) : (
        <div className="px-4 pb-6 flex flex-col gap-3">
          {notes.map((note) => (
            <button
              key={note.note_id}
              onClick={() => openNote(note)}
              className="w-full p-3.5 bg-white rounded-xl border border-zinc-200 flex gap-3.5 items-start text-left cursor-pointer hover:border-[#002856] transition-all shadow-xs"
            >
              <div className="w-10 h-10 shrink-0 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-sky-950 text-sm font-semibold leading-5 truncate">
                  {note.title}
                </span>
                {note.description && (
                  <p className="text-slate-500 text-xs line-clamp-2 leading-4">
                    {note.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 text-[10px] font-medium">
                    {note.proficiency_level}
                  </span>
                  {note.page_count > 0 && (
                    <span className="text-slate-400 text-[10px] font-medium">
                      {note.page_count}{" "}
                      {note.page_count === 1 ? "page" : "pages"}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
