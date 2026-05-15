import { MONTH_NAMES } from "./constants";

export function formatInrFromPaise(paise) {
  const value = Number(paise || 0) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatIstDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  const day = get("day");
  const month = get("month");
  const year = get("year");
  const hour = get("hour");
  const minute = get("minute");
  const dayPeriod = get("dayPeriod").toUpperCase();
  return `${day} ${month} ${year} ${hour}:${minute} ${dayPeriod}`;
}

export function formatDiscountHistoryTooltip(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return "No month-wise discounts applied";
  }
  return history
    .map((item) => {
      const monthName =
        MONTH_NAMES[Number(item.target_month) || 0] || item.target_month;
      const reason = item.reason || "No reason";
      if (item.discount_type === "monthly") {
        return `${formatInrFromPaise(item.discount_value_paise || 0)} (${monthName}, monthly) - ${reason}`;
      }
      if (item.discount_type === "one_time") {
        return `${formatInrFromPaise(item.discount_value_paise || 0)} (${monthName}, one-time) - ${reason}`;
      }
      if (item.discount_type === "percentage") {
        return `${Number(item.discount_percent || 0)}% (${monthName}, percentage) - ${reason}`;
      }
      return `${monthName} ${item.target_year}: ${reason}`;
    })
    .join(" | ");
}
