import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoBack } from "../../hooks/useGoBack";

/**
 * BackNavigation - Reusable back button component for A2 pages
 * Matches A1 design language with consistent styling
 */
const BackNavigation = ({ 
  label = "Back", 
  to, 
  onClick, 
  rightLabel,
  className = "" 
}) => {
  const navigate = useNavigate();
  const goBack = useGoBack("/");

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      goBack();
    }
  };

  return (
    <div className={`px-4 py-3 flex items-center justify-between border-b border-[#E5E7EB] bg-white ${className}`}>
      <button
        onClick={handleClick}
        className="flex items-center gap-2 text-sm font-semibold text-[#181d27] hover:text-[#002856] transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>{label}</span>
      </button>
      {rightLabel && (
        <span className="text-sm font-semibold text-[#7b7b7b]">{rightLabel}</span>
      )}
    </div>
  );
};

export default BackNavigation;
