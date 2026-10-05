import { Link } from "react-router-dom";
import { useState } from "react";
import Badge from "../../../components/ui/Badge";
import FeatureStatusChip from "../../../components/ui/FeatureStatusChip";
import { hapticLight } from "../../../utils/haptics";
import { useUsageLimits } from "../../../hooks/useUsageLimits";

export default function FeatureCard({
  title,
  description,
  image,
  link,
  enabled,
  comingSoon,
  tourId,
  moduleInfo,
}) {
  const { eligible, getState } = useUsageLimits();
  const moduleState = moduleInfo
    ? getState(moduleInfo.level, moduleInfo.module_key)
    : null;
  const isLocked = Boolean(moduleState?.locked);

  const clickable = enabled && !isLocked;
  const CardWrapper = clickable ? Link : "div";
  const [isPressed, setIsPressed] = useState(false);

  const openLockModal = () => {
    if (!isLocked || !moduleState) return;
    window.dispatchEvent(
      new CustomEvent("skillcase:usage-limit", {
        detail: {
          locked: true,
          reason: "usage_limit",
          module_key: moduleInfo.module_key,
          level: moduleInfo.level,
          limit_value: moduleState.limit_value,
          periods: moduleState.periods,
          reset_at: moduleState.reset_at,
          msg: moduleState.hard_locked
            ? "This feature is currently locked."
            : "Your limit for this feature has been reached.",
        },
      }),
    );
  };

  return (
    <CardWrapper
      id={tourId}
      to={clickable ? link : undefined}
      onClick={isLocked ? openLockModal : undefined}
      onTouchStart={() => {
        if (clickable) {
          setIsPressed(true);
          hapticLight();
        }
      }}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => clickable && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={`
        relative bg-white rounded-lg p-0.5 card-shadow flex flex-col
        transition-all duration-150
        ${
          clickable
            ? "hover:scale-105 cursor-pointer"
            : isLocked
              ? "cursor-pointer"
              : "opacity-60 cursor-not-allowed"
        }
        ${isPressed ? "scale-[0.85] shadow-inner" : ""}
        ${!enabled && "bg-[#e5e5e5]"}
      `}
    >
      {/* Image */}
      <div
        className="h-16 md:h-40 rounded-md overflow-hidden"
      >
        <img
          src={image}
          alt={title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="p-1.5 pb-1.5 flex-1 flex flex-col justify-start items-start">
        <h3 className="text-[10px] md:text-xl font-medium text-black mb-1">
          {title}
        </h3>
        {comingSoon ? (
          <Badge variant="warning">Coming soon</Badge>
        ) : (
          <>
            <p className="text-[8px] md:text-[14px] text-black opacity-60 leading-[1.3]">
              {description}
            </p>
            {/* Usage-state chip — pinned to the bottom-left of every card so
                it stays consistent regardless of description length. */}
            {eligible && (
              <div className="mt-auto pt-1 self-stretch">
                <FeatureStatusChip state={moduleState} />
              </div>
            )}
          </>
        )}
      </div>
    </CardWrapper>
  );
}
