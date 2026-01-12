import { useState, useRef, useEffect } from "react";

// Chevron Down SVG Icon
const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 4.5L6 7.5L9 4.5" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CustomDropdown = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select option",
  disabled = false,
  name = "",
  error = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Get display label
  const selectedOption = options.find(opt => opt.value === value);
  const displayText = selectedOption?.label || placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div 
      className={`dropdown-wrapper ${error ? 'invalid' : ''}`} 
      ref={dropdownRef}
      data-name={name}
    >
      <div 
        className={`dropdown-selected ${isOpen ? 'open' : ''}`}
        onClick={handleToggle}
        style={{ 
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: value ? '#000' : '#999'
        }}
      >
        <span>{displayText}</span>
        <ChevronDown />
      </div>
      <ul className={`dropdown-options ${isOpen ? 'show' : ''}`}>
        {options.filter(opt => opt.value !== "").map((option) => (
          <li 
            key={option.value} 
            onClick={() => handleSelect(option)}
          >
            {option.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CustomDropdown;
