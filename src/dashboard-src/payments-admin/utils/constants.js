export const TABS = [
  { key: "all", label: "All View" },
  { key: "month", label: "Month View" },
  { key: "batch", label: "Batch View" },
  { key: "fee", label: "Total Fee View" },
  { key: "discounts", label: "Discounts View" },
  { key: "payments", label: "Payment View" },
  { key: "rawlogs", label: "Raw Logs" },
  { key: "invoice", label: "Invoice Send" },
];

export const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const monthNameToNumber = Object.fromEntries(
  MONTH_NAMES.map((x, i) => [String(x).toLowerCase(), i]),
);
