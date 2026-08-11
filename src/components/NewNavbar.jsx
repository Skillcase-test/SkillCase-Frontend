import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { images } from "../assets/images.js";
import { isB1PracticeLevel } from "../utils/b1Progress";
import { hapticLight, hapticMedium } from "../utils/haptics";
import { Gem, Gift } from "lucide-react";

export default function Navbar({ disableNavigation = false }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const isJobScreeningParam = queryParams.get("source") === "job_screening";
  const cachedMode = localStorage.getItem("lg_preferred_mode");
  // B1/B2 users own the mode switcher (Exam & Practice / Jobs): their saved
  // mode may stay job_screening while they browse the practice hub, so the
  // white job-screening chrome must be path-based for them, not mode-based.
  const isB1User =
    isAuthenticated && user && isB1PracticeLevel(user?.user_prof_level);
  // B1/B2 users own the navy mode-switcher shell everywhere — including the
  // job-screening pipeline, where the switcher flips between Exam & Practice
  // and Jobs. Only legacy (non-B1) job-screening candidates get the white
  // pipeline chrome. An explicit ?source=job_screening query param still
  // forces white chrome for shared flows (e.g. emailed terms links).
  const isJobScreening =
    isJobScreeningParam ||
    (isAuthenticated &&
      !isB1User &&
      (location.pathname.startsWith("/job-screening") ||
        ((user?.german_preference === "3" ||
          user?.lg_preferred_mode === "job_screening") &&
          cachedMode !== "practice" &&
          cachedMode !== "learn")));

  if (isJobScreening) {
    return <JobScreeningNavbar disableNavigation={disableNavigation} />;
  }

  const rawLevel = user?.user_prof_level || "A1";
  const displayLevel = isB1PracticeLevel(rawLevel) ? "B1" : rawLevel;
  const isPremium = user?.autopay_enabled === true;

  const renderAvatar = () => (
    <Link to="/profile" id="profile-nav-link" className="flex-shrink-0">
      {user?.profile_pic_url ? (
        <img
          src={user.profile_pic_url}
          alt="Profile"
          className="w-7 h-7 rounded-full object-cover"
        />
      ) : (
        <svg viewBox="0 0 100 100" className="w-7 h-7 rounded-full" fill="none">
          <circle cx="50" cy="50" r="50" fill="#D1D5DB" />
          <circle cx="50" cy="38" r="16" fill="#9CA3AF" />
          <ellipse cx="50" cy="78" rx="28" ry="20" fill="#9CA3AF" />
        </svg>
      )}
    </Link>
  );

  return (
    <header
      className={`bg-[#002856] sticky top-0 z-50 ${
        disableNavigation ? "pointer-events-none" : ""
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      aria-disabled={disableNavigation}
    >
      <div className="h-16 w-full max-w-7xl mx-auto px-4 flex items-center justify-between gap-3">
        {/* Level title */}
        <div className="min-w-0 flex flex-col justify-center">
          <h1 className="text-white text-base font-semibold leading-5 font-['Inter'] truncate">
            {displayLevel} German Level
          </h1>
          <p className="text-white/70 text-xs leading-4 font-['Inter'] truncate">
            B1 level is minimum for German jobs
          </p>
        </div>

        {/* Right side items */}
        <div className="flex items-center gap-3 shrink-0">
          {isAuthenticated ? (
            <>
              {["admin", "super_admin"].includes(user?.role) && (
                <Link
                  to="/admin"
                  className="bg-white/10 text-white px-3 py-1.5 rounded-lg hover:bg-white/20 transition font-semibold text-xs"
                >
                  Admin
                </Link>
              )}

              {/* Plan pill — amber diamond + Premium once activated, gift + Free Plan otherwise */}
              {isPremium ? (
                <div
                  className="flex items-center gap-1.5 pl-1 pr-2 py-1 bg-white/10 rounded-[200px]"
                  title="Premium Plan"
                >
                  <span className="p-1 bg-amber-300 rounded-3xl flex items-center justify-center shrink-0">
                    <Gem className="w-3.5 h-3.5 text-blue-950" />
                  </span>
                  <span className="text-white text-[10px] font-medium leading-3">
                    Premium
                  </span>
                </div>
              ) : (
                <div
                  className="flex items-center gap-1 pl-1 pr-2 py-1 bg-white/10 rounded-[200px]"
                  title="Free Plan"
                >
                  <span className="w-6 h-6 bg-[#002856] rounded-full flex items-center justify-center shrink-0">
                    <Gift className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span className="text-white text-[10px] font-medium leading-3">
                    Free Plan
                  </span>
                </div>
              )}

              {renderAvatar()}
            </>
          ) : (
            <Link
              to="/login"
              className="bg-[#edb843] text-[#002856] px-4 py-1.5 rounded-lg hover:bg-[#d4a53c] transition font-semibold text-xs"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function JobScreeningNavbar({ disableNavigation = false }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const renderSimpleAvatar = () => {
    return (
      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 border border-[#e9eaeb] flex items-center justify-center">
        {user?.profile_pic_url ? (
          <img
            src={user.profile_pic_url}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
            <circle cx="50" cy="50" r="50" fill="#D1D5DB" />
            <circle cx="50" cy="38" r="16" fill="#9CA3AF" />
            <ellipse cx="50" cy="78" rx="28" ry="20" fill="#9CA3AF" />
          </svg>
        )}
      </div>
    );
  };

  return (
    <header
      className={`bg-white border-b border-[#efefef] sticky top-0 z-50 ${
        disableNavigation ? "pointer-events-none" : ""
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      aria-disabled={disableNavigation}
    >
      <div className="h-[55px] lg:h-[72px] flex items-center justify-between px-4 lg:px-8 max-w-7xl mx-auto">
        <Link
          to="/job-screening"
          className="flex-shrink-0"
          onClick={hapticMedium}
        >
          <img
            src={images.skillcaseLogo}
            alt="Skillcase"
            className="h-4 w-26 lg:h-6 lg:w-38"
          />
        </Link>

        <div className="flex items-center gap-3 md:gap-4">
          {isAuthenticated ? (
            <>
              {["admin", "super_admin"].includes(user?.role) && (
                <Link
                  to="/admin/job-screening"
                  className="bg-[#002856] text-white px-3.5 py-1.5 md:px-4 md:py-2 rounded-lg hover:bg-[#003d83] transition font-semibold text-xs md:text-sm shadow-2xs"
                >
                  Admin
                </Link>
              )}
              <Link
                to="/profile"
                id="profile-nav-link"
                className="flex-shrink-0"
                onClick={hapticLight}
              >
                {renderSimpleAvatar()}
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="bg-[#edb843] text-[#002856] px-4 py-1.5 md:px-5 md:py-2 rounded-lg hover:bg-[#d4a53c] transition font-semibold text-xs md:text-sm"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
