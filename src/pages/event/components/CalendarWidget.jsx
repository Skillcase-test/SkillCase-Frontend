import { useState } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CalendarWidget({
  events = [],
  onDateSelect,
  selectedDate,
  activeTab = "upcoming",
  onTabChange,
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get dates with events
  const eventDates = events.map((e) => {
    const d = new Date(e.start_datetime);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  });

  const hasEvent = (day) => {
    const key = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${day}`;
    return eventDates.includes(key);
  };

  const isToday = (day) => {
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const handleDateClick = (day) => {
    const clickedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    onDateSelect?.(clickedDate);
  };

  const days = [];

  for (let i = 0; i < startingDay; i++) {
    days.push(<div key={`empty-${i}`} className="w-10 h-10" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const isSelected =
      selectedDate &&
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth();
    days.push(
      <button
        key={day}
        onClick={() => handleDateClick(day)}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm transition-all relative
          ${isToday(day) ? "bg-[#163B72] text-white font-bold" : ""}
          ${
            isSelected && !isToday(day)
              ? "bg-[#EDB843] text-[#163B72] font-bold"
              : ""
          }
          ${!isToday(day) && !isSelected ? "hover:bg-gray-100" : ""}
        `}
      >
        {day}
        {hasEvent(day) && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#EDB843] rounded-full" />
        )}
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => onTabChange?.("upcoming")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "upcoming"
              ? "bg-[#163B72] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => onTabChange?.("past")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "past"
              ? "bg-[#163B72] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Past
        </button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() =>
            setCurrentMonth((prev) => {
              const newDate = new Date(prev);
              newDate.setMonth(newDate.getMonth() - 1);
              return newDate;
            })
          }
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="font-semibold text-[#163B72]">
          {currentMonth.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </span>
        <button
          onClick={() =>
            setCurrentMonth((prev) => {
              const newDate = new Date(prev);
              newDate.setMonth(newDate.getMonth() + 1);
              return newDate;
            })
          }
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div
            key={d}
            className="w-10 h-8 flex items-center justify-center text-xs text-gray-500 font-medium"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">{days}</div>

      {/* Clear Filter */}
      {selectedDate && (
        <button
          onClick={() => onDateSelect?.(null)}
          className="mt-4 w-full text-sm text-[#163B72] hover:underline"
        >
          Clear date filter
        </button>
      )}
    </div>
  );
}
