import { useEffect, useRef, useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  chatWithVideo,
  getSuggestedVideoQuestions,
} from "../../../api/videoCourseApi";
import { trackFeatureEvent } from "../../../telemetry/events";

export default function ChatDrawer({ videoId, open, onClose, language = "en" }) {
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    trackFeatureEvent("video_courses", "chat_opened", {
      entityType: "course_video",
      entityId: videoId,
    });
    getSuggestedVideoQuestions(videoId)
      .then((res) => setSuggestions(res.data?.data?.questions || []))
      .catch(() => setSuggestions([]));
  }, [open, videoId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  const send = async (text) => {
    const message = String(text || "").trim();
    if (!message || sending) return;

    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setSending(true);
    trackFeatureEvent("video_courses", "chat_message_sent", {
      entityType: "course_video",
      entityId: videoId,
      total: history.length,
    });

    try {
      const res = await chatWithVideo(videoId, message, history, language);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data?.data?.reply || "" },
      ]);
    } catch (err) {
      console.error("Video chat failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err?.response?.status === 503
              ? "The assistant is unavailable right now. Please try again shortly."
              : "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <button
        aria-label="Close chat"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 border-0 cursor-pointer"
      />
      <div className="relative mt-auto w-full max-w-md h-[75vh] bg-white rounded-t-2xl flex flex-col shadow-lg">
        <div className="px-4 py-3 border-b border-zinc-100 flex justify-between items-center">
          <span className="text-sky-950 text-sm font-semibold">
            Ask about this video
          </span>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 bg-transparent border-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {messages.length === 0 && suggestions.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                Suggested questions
              </span>
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="px-3 py-2 text-left bg-white border border-zinc-200 hover:border-[#002856] text-[#002856] text-xs font-medium rounded-lg cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-5 ${
                m.role === "user"
                  ? "self-end bg-[#002856] text-white"
                  : "self-start bg-black/5 text-slate-800"
              }`}
            >
              {m.role === "user" ? (
                m.content
              ) : (
                <div className="prose prose-sm max-w-none [&_p]:my-1">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              )}
            </div>
          ))}

          {sending && (
            <Loader2 className="w-4 h-4 animate-spin text-[#002856] self-start" />
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="px-4 py-3 border-t border-zinc-100 flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            aria-label="Message"
            className="flex-1 px-3 py-2 bg-slate-50 border border-zinc-200 rounded-lg text-xs text-slate-800 outline-none focus:border-[#002856]"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="p-2 bg-[#002856] text-white rounded-lg disabled:opacity-50 cursor-pointer border-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
