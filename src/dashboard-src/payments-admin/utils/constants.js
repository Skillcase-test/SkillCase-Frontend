export const TABS = [
  { key: "overall", label: "Overall View" },
  { key: "all", label: "All View" },
  { key: "month", label: "Month View" },
  { key: "batch", label: "Batch View" },
  { key: "fee", label: "Total Fee View" },
  { key: "discounts", label: "Discounts View" },
  { key: "payments", label: "Payment View" },
  { key: "rawlogs", label: "Raw Logs" },
  { key: "invoice", label: "Invoice Send" },
  { key: "recruitment", label: "Recruitment View" },
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

export const LEAD_OWNER_OPTIONS = [
  { value: "Fiza", label: "Fiza" },
  { value: "Rajith", label: "Rajith" },
  { value: "Avinash", label: "Avinash" },
  { value: "Swaraj", label: "Swaraj" },
  { value: "Yash", label: "Yash" },
  { value: "Harshita", label: "Harshita" },
  { value: "-", label: "None" },
];
