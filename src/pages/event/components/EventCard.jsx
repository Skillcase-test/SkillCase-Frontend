import { Calendar, Clock, Video, MapPin } from "lucide-react";
export default function EventCard({
  event,
  onClick,
  isLast = false,
  isPast = false,
}) {
  // 12-hour time format
  const eventTime = event.start_datetime
    ? new Date(event.start_datetime).toLocaleString("en-IN", {
        timeZone: event.timezone || "Asia/Kolkata",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "TBA";
  const eventDate = event.start_datetime
    ? new Date(event.start_datetime).toLocaleDateString("en-IN", {
        timeZone: event.timezone || "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
  const eventDay = event.start_datetime
    ? new Date(event.start_datetime).toLocaleDateString("en-IN", {
        timeZone: event.timezone || "Asia/Kolkata",
        weekday: "short",
      })
    : "";
  return (
    <div className="flex">
      {/* Timeline Dots */}
      <div className="flex flex-col items-center mr-4">
        {/* Big Dot */}
        <div
          className={`w-3 h-3 rounded-full ${
            isPast ? "bg-gray-400" : "bg-[#163B72]"
          } z-10`}
        />

        {/* Dotted Line to next event */}
        {!isLast && (
          <div className="flex-1 w-0 border-l-2 border-dashed border-gray-300 my-1" />
        )}
      </div>
      {/* Event Card */}
      <div
        onClick={!isPast ? onClick : undefined}
        className={`flex-1 mb-4 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 ${
          isPast
            ? "opacity-60 cursor-not-allowed"
            : "cursor-pointer hover:scale-[1.01]"
        }`}
      >
        <div className="flex flex-col sm:flex-row">
          {/* Left: Image */}
          <div className="sm:w-40 md:w-48 h-42 md:h-auto flex-shrink-0">
            {event.cover_image_url ? (
              <img
                src={event.cover_image_url}
                alt={event.title}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#163B72] to-[#0f2d5a] flex items-center justify-center">
                <Calendar size={32} className="text-white/50" />
              </div>
            )}
          </div>
          {/* Right: Content */}
          <div className="flex-1 p-4 sm:p-5">
            {/* Badges Row */}
            <div className="flex items-center gap-2 mb-2">
              {event.is_featured && (
                <span className="bg-[#EDB843] text-[#163B72] text-xs font-bold px-2 py-0.5 rounded-full">
                  FEATURED
                </span>
              )}
              {event._isRecurringInstance && (
                <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  Daily Event
                </span>
              )}
              {isPast && (
                <span className="bg-gray-200 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                  EVENT ENDED
                </span>
              )}
            </div>
            {/* Title */}
            <h3 className="text-lg sm:text-xl font-bold text-[#163B72] mb-2 line-clamp-2 group-hover:text-[#0f2d5a]">
              {event.title}
            </h3>
            {/* Date & Time */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-[#163B72]" />
                <span>
                  {eventDay}, {eventDate}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-[#163B72]" />
                <span className="font-medium">{eventTime}</span>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="flex items-center justify-between">
              {/* Host Badge */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#EDB843] rounded-full flex items-center justify-center text-xs font-bold text-[#163B72]">
                  S
                </div>
                <span className="text-xs text-gray-500">By Skillcase</span>
                <Video size={14} className="text-gray-400" />
              </div>
              {/* CTA */}
              {!isPast ? (
                <span className="text-sm font-semibold text-[#163B72] group-hover:underline">
                  View Details →
                </span>
              ) : (
                <span className="text-sm text-gray-400">
                  Registration Closed
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
