import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { getNote } from "../../api/notesApi";
import { useUsageLimitGate } from "../../hooks/useUsageLimits";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function NotePreviewPage() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  useUsageLimitGate("ALL", "notes");

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [containerWidth, setContainerWidth] = useState(360);

  const containerRef = useRef(null);

  useEffect(() => {
    if (!noteId) return;
    setLoading(true);
    setError(null);

    getNote(noteId)
      .then((res) => {
        if (res.data?.data) {
          setNote(res.data.data);
        } else {
          setError("Note not found.");
        }
      })
      .catch((err) => {
        console.error("Error fetching note:", err);
        setError(err.response?.data?.message || "Failed to load note.");
      })
      .finally(() => setLoading(false));
  }, [noteId]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 32);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const onDocumentLoadSuccess = ({ numPages: nextNumPages }) => {
    setNumPages(nextNumPages);
  };

  return (
    <div
      ref={containerRef}
      className="w-full max-w-md mx-auto min-h-screen bg-slate-100 flex flex-col shadow-sm select-none"
    >
      <div className="self-stretch px-4 py-2.5 flex justify-between items-center bg-white border-b border-zinc-100 sticky top-0 z-20">
        <button
          onClick={() => navigate("/video-courses/notes")}
          className="px-0.5 flex items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
        >
          <ChevronLeft className="w-4 h-4 text-slate-900" />
          <span className="text-slate-900 text-sm font-semibold leading-6">Back</span>
        </button>
        <span className="text-neutral-500 text-sm font-semibold leading-6 truncate max-w-[60%]">
          {note?.title || "Study Note"}
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center text-slate-500 text-sm">
          {error}
        </div>
      ) : !note?.file_url ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center text-slate-500 text-sm">
          Note document is unavailable.
        </div>
      ) : (
        <div className="flex-1 px-4 py-4 flex flex-col gap-4 items-center overflow-y-auto">
          <div className="w-full bg-white p-3 rounded-xl border border-zinc-200 shadow-xs flex flex-col gap-1">
            <h1 className="text-sky-950 text-base font-semibold">{note.title}</h1>
            {note.description && (
              <p className="text-slate-600 text-xs leading-4">{note.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 text-[10px] font-medium">
                {note.proficiency_level}
              </span>
              {numPages && (
                <span className="text-slate-400 text-[10px] font-medium">
                  {numPages} {numPages === 1 ? "page" : "pages"}
                </span>
              )}
            </div>
          </div>

          <Document
            file={note.file_url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#002856]" />
              </div>
            }
            error={
              <div className="p-6 text-center text-slate-500 text-xs">
                Failed to render PDF preview.
              </div>
            }
            className="flex flex-col gap-4 items-center w-full"
          >
            {numPages &&
              Array.from({ length: numPages }, (_, index) => (
                <div
                  key={`page_${index + 1}`}
                  className="bg-white rounded-lg border border-zinc-200 overflow-hidden shadow-xs"
                >
                  <Page
                    pageNumber={index + 1}
                    width={containerWidth > 100 ? containerWidth : 340}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </div>
              ))}
          </Document>
        </div>
      )}
    </div>
  );
}
