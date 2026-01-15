import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { Bell, Calendar } from "lucide-react";

import { RRule, rrulestr } from "rrule";

import api from "../../api/axios.js";

import EventCard from "./components/EventCard";
import CalendarWidget from "./components/CalendarWidget";
import EventQuickViewModal from "./components/EventQuickViewModal";
import SubscribeModal from "./components/SubscribeModal";
import RegistrationModal from "./components/RegistrationModal";
import {
  EventCardSkeleton,
  CalendarSkeleton,
} from "./components/EventSkeleton";

export default function AllEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showQuickView, setShowQuickView] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming");

  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get("/events");
      setEvents(res.data.events || []);
    } catch (err) {
      setError("Failed to load events.");
    } finally {
      setLoading(false);
    }
  };

  // Expand recurring events into individual date instances
  const expandRecurringEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events
      .filter((event) => {
        // Filter out events without dates
        if (!event.instance_date && !event.start_datetime) return false;
        return true;
      })
      .map((event, index) => {
        // Get the display datetime - use instance_date if available (from backend expansion)
        let displayDatetime = event.instance_date || event.start_datetime;
        // If there's a custom_start_time from override, adjust the display time
        if (event.custom_start_time && displayDatetime) {
          const [hours, minutes] = event.custom_start_time.split(":");
          const adjustedDate = new Date(displayDatetime);
          adjustedDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          displayDatetime = adjustedDate.toISOString();
        }
        return {
          ...event,
          start_datetime: displayDatetime,
          _instanceId: event._instanceId || `${event.event_id}-${index}`,
          _isRecurringInstance: event.is_instance || false,
        };
      })
      .sort((a, b) => {
        const dateA = new Date(a.start_datetime);
        const dateB = new Date(b.start_datetime);
        return dateA - dateB;
      });
  }, [events]);

  // Group events by day
  const groupEventsByDay = (eventList) => {
    const groups = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    eventList.forEach((event) => {
      if (!event.start_datetime) return; // Skip if no datetime
      const eventDate = new Date(event.start_datetime);
      eventDate.setHours(0, 0, 0, 0);
      let label;
      if (eventDate.getTime() === today.getTime()) {
        label = "Today";
      } else if (eventDate.getTime() === tomorrow.getTime()) {
        label = "Tomorrow";
      } else {
        label = eventDate.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          weekday: "long",
        });
      }
      if (!groups[label]) groups[label] = [];
      groups[label].push(event);
    });
    return groups;
  };

  // Filter by selected date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tabFilteredEvents = expandRecurringEvents.filter((e) => {
    if (!e.start_datetime) return activeTab === "upcoming"; // Show recurring in upcoming
    const eventDate = new Date(e.start_datetime);
    eventDate.setHours(0, 0, 0, 0);

    if (activeTab === "upcoming") {
      return eventDate >= today;
    } else {
      return eventDate < today;
    }
  });
  const filteredEvents = selectedDate
    ? tabFilteredEvents.filter((e) => {
        if (!e.start_datetime) return false;
        const ed = new Date(e.start_datetime);
        return (
          ed.getDate() === selectedDate.getDate() &&
          ed.getMonth() === selectedDate.getMonth() &&
          ed.getFullYear() === selectedDate.getFullYear()
        );
      })
    : tabFilteredEvents;

  const groupedEvents = groupEventsByDay(filteredEvents);

  const handleEventClick = (event) => {
    if (window.innerWidth >= 1024) {
      setSelectedEvent(event);
      setShowQuickView(true);
    } else {
      // Pass the expanded date AND custom times through navigation state
      navigate(`/events/${event.slug}`, {
        state: {
          instanceDate: event.start_datetime,
          custom_start_time: event.custom_start_time,
          custom_end_time: event.custom_end_time,
        },
      });
    }
  };

  const handleRegisterClick = () => {
    setShowQuickView(false);
    setShowRegister(true);
  };
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 min-h-screen">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-6 pb-8 animate-pulse">
          <div className="space-y-2">
            <div className="h-10 bg-gray-200 rounded w-64" />
            <div className="h-4 bg-gray-200 rounded w-96" />
          </div>
          <div className="mt-4 md:mt-0 h-10 bg-gray-200 rounded w-32" />
        </div>
        {/* Main Content Skeleton */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-[60%] space-y-6">
            <div className="mb-6">
              <div className="h-6 bg-gray-200 rounded w-24 mb-3 animate-pulse" />
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <EventCardSkeleton key={i} compact />
                ))}
              </div>
            </div>
          </div>
          <div className="hidden lg:block lg:w-[40%]">
            <div className="sticky top-24">
              <CalendarSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-xl text-red-600">
        {error}
      </div>
    );
  }
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-6 pb-8">
        <div key={activeTab} className="animate-fade">
          <h1 className="text-3xl md:text-4xl font-bold text-[#163B72] mb-2 transition-all duration-300">
            {activeTab === "upcoming" ? "Upcoming Workshops" : "Past Workshops"}
          </h1>
          <p key={activeTab} className="text-gray-600">
            {activeTab === "upcoming"
              ? "Join our German language workshops and accelerate your learning"
              : "Browse our completed workshops and events"}
          </p>
        </div>
        <button
          onClick={() => setShowSubscribe(true)}
          className="mt-4 md:mt-0 flex items-center justify-center gap-2 bg-[#EDB843] text-[#163B72] px-5 py-2.5 rounded-lg font-semibold hover:bg-[#d9a63a] transition"
        >
          <Bell size={18} /> Subscribe
        </button>
      </div>
      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Events List - 60% */}
        <div className="lg:w-[60%]">
          {Object.keys(groupedEvents).length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              No events found. Check back soon!
            </div>
          ) : (
            (() => {
              // Get total count of events across all days
              const allEvents = Object.values(groupedEvents).flat();
              const totalEvents = allEvents.length;
              let currentIndex = 0;

              return Object.entries(groupedEvents).map(([day, dayEvents]) => (
                <div key={day} className="mb-6">
                  <h2 className="text-lg font-semibold text-[#163B72] mb-3 border-b pb-2">
                    {day}
                  </h2>
                  <div className="space-y-4">
                    {dayEvents.map((event, index) => {
                      const eventDate = new Date(event.start_datetime);
                      const isPastEvent = eventDate < new Date();
                      const globalIndex = currentIndex++;
                      const isLastOverall = globalIndex === totalEvents - 1;

                      return (
                        <EventCard
                          key={event._instanceId}
                          event={event}
                          onClick={() => handleEventClick(event)}
                          isLast={isLastOverall}
                          isPast={isPastEvent}
                        />
                      );
                    })}
                  </div>
                </div>
              ));
            })()
          )}
        </div>
        {/* Calendar Sidebar - 40% (Desktop only) */}
        <div className="hidden lg:block lg:w-[40%]">
          <div className="sticky top-24">
            <CalendarWidget
              events={expandRecurringEvents}
              onDateSelect={setSelectedDate}
              selectedDate={selectedDate}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
        </div>
      </div>
      {/* Modals */}
      <EventQuickViewModal
        event={selectedEvent}
        isOpen={showQuickView}
        onClose={() => setShowQuickView(false)}
        onRegister={handleRegisterClick}
      />
      <SubscribeModal
        isOpen={showSubscribe}
        onClose={() => setShowSubscribe(false)}
      />
      <RegistrationModal
        event={selectedEvent}
        isOpen={showRegister}
        onClose={() => setShowRegister(false)}
        onSuccess={() => {}}
        instanceDate={selectedEvent?.start_datetime}
      />
    </div>
  );
}
