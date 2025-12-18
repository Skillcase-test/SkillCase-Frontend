/* Reusable Badge Component */
export default function Badge({
  variant = "neutral",
  dot = false,
  children,
  className = "",
}) {
  const variants = {
    success: "bg-[#cdf5db] text-[#019035]",
    warning: "bg-[#ffebbe] text-[#c48b0e]",
    neutral: "bg-gray-100 text-gray-600",
  };
  const dotColors = {
    success: "bg-[#019035]",
    warning: "bg-[#c48b0e]",
    neutral: "bg-gray-400",
  };
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2 py-0.5 rounded-full
        text-[10px] font-medium whitespace-nowrap
        shadow-sm
        ${variants[variant]}
        ${className}
      `}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          <span
            className={`
              animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
              ${dotColors[variant]}
            `}
          />
          <span
            className={`
              relative inline-flex rounded-full h-2 w-2
              ${dotColors[variant]}
            `}
          />
        </span>
      )}
      {children}
    </span>
  );
}
