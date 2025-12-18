import { Link } from "react-router-dom";

/* Reusable Button Component */
export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  rounded = false,
  to,
  href,
  onClick,
  children,
  icon,
  className = "",
  disabled = false,
  ...props
}) {
  // Base styles
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-semibold transition-all duration-200
    border-2 border-transparent cursor-pointer
    disabled:opacity-50 disabled:cursor-not-allowed
  `;
  // Size variants
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-5 py-3 text-base",
    lg: "px-6 py-4 text-lg",
  };
  // Color variants
  const variants = {
    primary: `
      bg-[#edb843] text-[#002856] border-[rgba(255,255,255,0.12)]
      hover:bg-[#d4a53c] active:bg-[#c48b0e]
      shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)]
    `,
    secondary: `
      bg-white text-[#083262] border-[#002856]
      hover:bg-gray-50 active:bg-gray-100
      shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)]
    `,
    dark: `
      bg-[#002856] text-white border-[rgba(255,255,255,0.12)]
      hover:bg-[#003d83] active:bg-[#001d40]
      shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)]
    `,
    outline: `
      bg-transparent text-[#002856] border-[#002856]
      hover:bg-[#002856] hover:text-white
    `,
  };
  // Border radius
  const radiusStyle = rounded ? "rounded-full" : "rounded-lg";
  // Width style
  const widthStyle = fullWidth ? "w-full" : "";
  // Combine all styles
  const combinedStyles = `
    ${baseStyles}
    ${sizes[size]}
    ${variants[variant]}
    ${radiusStyle}
    ${widthStyle}
    ${className}
  `.trim();

  // Render as Link if 'to' prop is provided
  if (to) {
    return (
      <Link to={to} className={combinedStyles} {...props}>
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
      </Link>
    );
  }

  // Render as anchor if 'href' prop is provided
  if (href) {
    return (
      <a href={href} className={combinedStyles} {...props}>
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
      </a>
    );
  }

  // Render as button
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={combinedStyles}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
