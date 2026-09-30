import { images } from '../assets/images';

// Use the supplied artwork unchanged; each variant keeps its native proportions.
export default function SkillcaseLogo({ onDark = false, width = 132, className = '' }) {
  const ratio = onDark ? 30 / 198 : 27 / 190;
  return (
    <img
      src={onDark ? images.skillcaseLogoOnDark : images.skillcaseLogo}
      alt="Skillcase"
      width={width}
      height={Number((width * ratio).toFixed(2))}
      className={`skillcase-logo block h-auto max-w-full shrink-0 ${className}`}
      draggable={false}
    />
  );
}
