import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import { Calendar, Clock, CheckCircle } from "lucide-react";

import api from "../../api/axios.js";
import googleMeetIcon from "../../assets/google-meet-icon.png";

import RegistrationModal from "./components/RegistrationModal";
import { EventDetailSkeleton } from "./components/EventSkeleton";

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

export default function EventDetailPage() {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [registered, setRegistered] = useState(false);

  const location = useLocation();
  const instanceDate = location.state?.instanceDate;
  const customStartTimeFromNav = location.state?.custom_start_time;
  const customEndTimeFromNav = location.state?.custom_end_time;

  const { slug } = useParams();

  const { user } = useSelector((state) => state.auth);

  const navigate = useNavigate();

  useEffect(() => {
    fetchEvent();
  }, [slug]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      // Pass instance_date to API if we have it from navigation
      const url = instanceDate
        ? `/events/${slug}?instance_date=${encodeURIComponent(instanceDate)}`
        : `/events/${slug}`;
      const res = await api.get(url);
      setEvent(res.data.event);
    } catch (err) {
      setError("Event not found");
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrationSuccess = () => {
    setRegistered(true);
  };

  if (loading) {
    return <EventDetailSkeleton />;
  }

  if (error && !event) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Event Not Found</h2>
          <p className="text-lg text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/events")}
            className="bg-[#163B72] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#0f2d5a] transition"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const displayDate =
    instanceDate || event?.next_instance_date || event?.start_datetime;

  // Format date without year
  const eventDateNoYear = displayDate
    ? new Date(displayDate).toLocaleDateString("en-IN", {
        timeZone: event?.timezone || "Asia/Kolkata",
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "Date TBA";

  const eventMonth = displayDate
    ? new Date(displayDate).toLocaleDateString("en-IN", {
        month: "short",
      })
    : "";

  const eventDay = displayDate ? new Date(displayDate).getDate() : "";
  // Use custom time if override exists, otherwise use event time
  let eventTime;
  const effectiveCustomStartTime =
    customStartTimeFromNav || event?.custom_start_time;

  if (effectiveCustomStartTime) {
    // Custom time from override - parse "HH:MM:SS" format
    const [hours, minutes] = effectiveCustomStartTime.split(":");
    const timeDate = new Date(displayDate);
    timeDate.setHours(parseInt(hours), parseInt(minutes), 0);
    eventTime = timeDate.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } else if (displayDate) {
    // Regular event time
    eventTime = new Date(displayDate).toLocaleTimeString("en-IN", {
      timeZone: event?.timezone || "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } else {
    eventTime = "Time TBA";
  }

  let eventEndTime = "";
  const effectiveCustomEndTime = customEndTimeFromNav || event?.custom_end_time;
  if (effectiveCustomEndTime) {
    const [hours, minutes] = effectiveCustomEndTime.split(":");
    const endDate = new Date(displayDate);
    endDate.setHours(parseInt(hours), parseInt(minutes), 0);
    eventEndTime = endDate.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } else {
    // Calculate end time: start time + 1 hour (default duration)
    let effectiveStart;
    if (effectiveCustomStartTime) {
      const [hours, minutes] = effectiveCustomStartTime.split(":");
      effectiveStart = new Date(displayDate);
      effectiveStart.setHours(parseInt(hours), parseInt(minutes), 0);
    } else if (displayDate) {
      effectiveStart = new Date(displayDate);
    }

    if (effectiveStart) {
      // Use event duration if available, otherwise default to 1 hour
      let durationMs = 60 * 60 * 1000; // 1 hour default
      if (event?.end_datetime && event?.start_datetime) {
        const originalStart = new Date(event.start_datetime);
        const originalEnd = new Date(event.end_datetime);
        const diff = originalEnd - originalStart;
        if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
          // Valid duration (less than 24 hours)
          durationMs = diff;
        }
      }

      const calculatedEnd = new Date(effectiveStart.getTime() + durationMs);
      eventEndTime = calculatedEnd.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Two-Column Layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-8">
          {/* LEFT COLUMN - Square Image with Grey Bar at Bottom */}
          <div>
            <div className="relative rounded-2xl overflow-hidden shadow-lg aspect-square">
              {event?.cover_image_url ? (
                <>
                  <img
                    src={event.cover_image_url}
                    alt={event.title}
                    className="w-full h-full object-contain"
                  />

                  {event.is_featured && (
                    <div className="absolute top-4 right-4 bg-[#EDB843] text-[#163B72] px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                      Featured
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#163B72] to-[#0f2d5a] flex items-center justify-center">
                  <div className="text-white text-center">
                    <Calendar size={64} className="mx-auto mb-4 opacity-50" />
                    <p className="text-xl font-semibold">
                      {event?.title || "Event"}
                    </p>
                  </div>
                </div>
              )}

              {/* Grey Bar at Bottom with Date and Time */}
              <div className="absolute bottom-0 left-0 right-0 bg-gray-100/70 backdrop-blur-sm px-3 py-2 flex items-center justify-center gap-3">
                <div className="flex items-center gap-1.5 text-[#163B72]">
                  <Calendar size={14} />
                  <span className="text-md font-semibold">
                    {eventDay} {eventMonth}
                  </span>
                </div>
                <div className="h-4 w-px bg-gray-400"></div>
                <div className="flex items-center gap-1.5 text-[#163B72]">
                  <Clock size={14} />
                  <span className="text-md font-semibold">{eventTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Event Details */}
          <div className="space-y-5">
            {/* Title */}
            <h1 className="text-[24px] md:text-4xl font-semibold leading-8 md:leading-12 text-[#163B72] mb-1">
              {event?.title}
            </h1>

            {/* Hosted By */}
            <div className="flex items-center gap-2 mb-5">
              <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                S
              </div>
              <span className="text-sm md:text-base text-[#163B72]">
                Hosted by Skillcase Programs
              </span>
            </div>

            <hr className="border-t border-gray-200 mb-4" />

            {/* Date and Time Block */}
            <div className="flex items-center gap-3 mb-3">
              {/* Calendar Icon Box */}
              <div className="flex-shrink-0 w-14 h-14 bg-blue-50 rounded-lg flex flex-col items-center justify-center">
                <span className="text-[10px] text-gray-500 font-medium uppercase">
                  {eventMonth}
                </span>
                <span className="text-xl font-bold text-[#163B72]">
                  {eventDay}
                </span>
              </div>
              {/* Date and Time Text */}
              <div>
                <p className="text-base font-semibold text-[#163B72]">
                  {eventDateNoYear}
                </p>
                <p className="text-sm text-gray-600">
                  {eventTime}
                  {eventEndTime ? ` - ${eventEndTime}` : ""}
                </p>
              </div>
            </div>

            {/* Google Meet */}
            <a
              href={event?.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 mb-5 hover:opacity-80 transition w-fit ml-3"
            >
              <div className="w-10 h-10 flex items-center justify-center">
                <img
                  src={googleMeetIcon}
                  alt="Meeting Link"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[#163B72] font-medium">Meeting Link</span>
            </a>

            {/* Registration Status */}
            {registered && (
              <div className="bg-green-50 border-2 border-green-200 p-6 rounded-xl text-center">
                <CheckCircle
                  size={48}
                  className="text-green-500 mx-auto mb-2"
                />
                <h2 className="text-xl font-bold text-green-700 mb-2">
                  You're Registered!
                </h2>
                <p className="text-gray-600">
                  Check your email for the meeting link.
                </p>
              </div>
            )}

            {/* About Event */}
            <div>
              <h2 className="text-md text-[#163B72] mb-3">About Event</h2>
              <hr className="border-t border-gray-200 mb-4" />
              <div
                className="prose prose-md max-w-none text-[#163B72] leading-relaxed space-y-2"
                dangerouslySetInnerHTML={{
                  __html: event?.description
                    ? parseSimpleMarkdown(event.description)
                    : '<p class="text-gray-400 italic">No description available.</p>',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Register Button at Bottom */}
      {!registered && !loading && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-transparent p-4 z-50"
          style={{
            animation: "slideUp 0.4s ease-out forwards",
          }}
        >
          <style>{`
            @keyframes slideUp {
              from {
                transform: translateY(100%);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
          `}</style>
          <div className="max-w-7xl mx-auto">
            <button
              onClick={() => setShowRegister(true)}
              className="w-full bg-[#163B72] text-white py-4 px-6 rounded-xl text-lg font-semibold hover:bg-blue-700 transition shadow-lg"
            >
              Register
            </button>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      <RegistrationModal
        event={event}
        isOpen={showRegister}
        onClose={() => setShowRegister(false)}
        onSuccess={handleRegistrationSuccess}
        instanceDate={displayDate}
      />
    </div>
  );
}
