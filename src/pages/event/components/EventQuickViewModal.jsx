import { useState } from "react";
import { X, Link2, ExternalLink, Calendar, Video, Check } from "lucide-react";

import { useNavigate } from "react-router-dom";

// Simple markdown parser (without bullet point conversion - keeps "-" as is)
function parseSimpleMarkdown(text) {
  if (!text) return "";

  return (
    text
      // Bold: **text** or __text__
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<strong>$1</strong>")
      // Italic: *text* or _text_
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/_(.+?)_/g, "<em>$1</em>")
      // Links: [text](url)
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$1</a>'
      )
      // Paragraphs: double newline
      .replace(/\n\n/g, '</p><p class="mb-3">')
      // Single newline to <br>
      .replace(/\n/g, "<br>")
      // Wrap in paragraph
      .replace(/^/, '<p class="mb-3">')
      .replace(/$/, "</p>")
  );
}

export default function EventQuickViewModal({
  event,
  isOpen,
  onClose,
  onRegister,
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !event) return null;

  const eventDate = event.start_datetime
    ? new Date(event.start_datetime).toLocaleString("en-IN", {
        timeZone: event.timezone || "Asia/Kolkata",
        dateStyle: "full",
        timeStyle: "short",
      })
    : "Date TBA";

  const copyLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/events/${event.slug}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Modal - Slides from right */}
      <div
        className="fixed top-0 right-0 h-full w-[500px] max-w-full bg-white z-50 shadow-2xl overflow-y-auto animate-slide-in-right"
        style={{
          animation: "slideInRight 0.3s ease-out",
        }}
      >
        {/* Header Actions */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all ${
                copied
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              {copied ? (
                <>
                  <Check size={16} className="animate-scale-in" />
                  Copied!
                </>
              ) : (
                <>
                  <Link2 size={16} />
                  Copy Link
                </>
              )}
            </button>
            <button
              onClick={() => navigate(`/events/${event.slug}`, {
                state: { instanceDate: event.start_datetime }
              })}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Event Page <ExternalLink size={16} />
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Cover Image */}
          {event.cover_image_url && (
            <div className="relative rounded-xl overflow-hidden mb-4">
              <img
                src={event.cover_image_url}
                alt={event.title}
                className="w-full h-48 object-cover"
              />
              <span className="absolute top-3 left-3 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                FREE
              </span> 
            </div>
          )}

          {/* Title */}
          <h2 className="text-2xl font-bold text-[#163B72] mb-2">
            {event.title}
          </h2>

          {/* Host Badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#EDB843] rounded-full flex items-center justify-center text-[#163B72] font-bold text-sm">
              S
            </div>
            <span className="text-sm text-gray-600">By Skillcase Programs</span>
          </div>

          {/* Date/Time */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-3 text-gray-700">
              <Calendar size={18} className="text-[#163B72]" />
              <span>{eventDate}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Video size={18} className="text-[#163B72]" />
              <a
                href={event.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google Meet
              </a>
            </div>
          </div>

          {/* Register Section */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <h3 className="font-semibold text-[#163B72] mb-3">Registration</h3>
            <button
              onClick={onRegister}
              className="w-full bg-white border-2 border-[#163B72] text-[#163B72] py-3 rounded-lg font-semibold hover:bg-[#163B72] hover:text-white transition"
            >
              Register
            </button>
          </div>

          {/* About Event */}
          <div>
            <h3 className="font-semibold text-[#163B72] mb-3">About Event</h3>
            {event.description ? (
              <div
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: parseSimpleMarkdown(event.description),
                }}
              />
            ) : (
              <p className="text-gray-500 italic">No description available.</p>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        @keyframes scale-in {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
