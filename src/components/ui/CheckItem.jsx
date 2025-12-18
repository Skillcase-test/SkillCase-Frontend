import { Check } from "lucide-react";

/* Check Item with icon and text */
export default function CheckItem({
  variant = "light",
  children,
  className = "",
}) {
  const iconBgVariants = {
    light: "bg-[#f5f5f5]",
    dark: "bg-[#003d83]",
    accent: "bg-[#f8f8f8]",
  };
  const iconColorVariants = {
    light: "text-[#002856]",
    dark: "text-[#edb843]",
    accent: "text-[#edb843]",
  };
  const textVariants = {
    light: "text-[#414651]",
    dark: "text-white opacity-80",
    accent: "text-[#535862]",
  };
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div
        className={`
          flex-shrink-0 w-5 h-5 rounded-full
          flex items-center justify-center
          ${iconBgVariants[variant]}
        `}
      >
        <Check className={`w-3 h-3 ${iconColorVariants[variant]}`} />
      </div>
      <p
        className={`text-[15px] leading-[1.4] font-semibold ${textVariants[variant]}`}
      >
        {children}
      </p>
    </div>
  );
}
