import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { images } from "../assets/images.js";
import { isB1PracticeLevel } from "../utils/b1Progress";
import { hapticLight, hapticMedium } from "../utils/haptics";
import { Gem, Gift, GraduationCap } from "lucide-react";
import { isPremiumUser, isTrialActive, trialDaysLeft } from "../utils/premium";
import { isScholarshipRoute } from "../utils/shellRoutes";

export default function Navbar({ disableNavigation = false }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const isJobScreeningParam = queryParams.get("source") === "job_screening";
  const cachedMode = localStorage.getItem("lg_preferred_mode");

  // Auth pages get logo-only chrome: a "Get Started" CTA pointing at /login is
  // pointless on /login, and "A1 German Level" is a lie before sign-in.
  if (location.pathname === "/login" || location.pathname === "/signup") {
    return (
      <header
        className="bg-white border-b border-[#efefef] sticky top-0 z-50"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="h-[55px] lg:h-[72px] max-w-7xl mx-auto px-4 lg:px-8 flex items-center">
          <img
            src={images.skillcaseLogo}
            alt="Skillcase"
            className="h-4 w-26 lg:h-6 lg:w-38"
          />
        </div>
      </header>
    );
  }
  // Scholarship exam hub gets its own navy chrome (exam-only context) — the
  // mode switcher tab states "Scholarship Exam" regardless of saved mode.
  if (isScholarshipRoute(location.pathname)) {
    return <ScholarshipNavbar disableNavigation={disableNavigation} />;
  }

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
  const isPremium = isPremiumUser(user);
  const isTrial = !isPremium && isTrialActive(user);
  const daysLeft = trialDaysLeft(user);

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
        {/* Level title — tappable brand entry, same as the old logo: goes home */}
        <Link
          to="/"
          onClick={hapticLight}
          className="min-w-0 flex flex-col justify-center transition-opacity hover:opacity-80 cursor-pointer"
          aria-label="Go to home"
        >
          <h1 className="text-white text-base font-semibold leading-5 truncate">
            {displayLevel} German Level
          </h1>
          <p className="text-white/70 text-xs leading-4 truncate">
            B1 level is minimum for German jobs
          </p>
        </Link>

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

              {/* Plan pill — three states: premium (amber diamond), active trial
                  (days-left countdown badge), free (gift) */}
              {isPremium ? (
                <div
                  className="flex items-center gap-1.5 pl-1 pr-2 py-1 bg-white/10 rounded-[200px]"
                  title="Premium Plan"
                >
                  <span className="p-1 bg-amber-300 rounded-3xl flex items-center justify-center shrink-0">
                    <Gem className="w-3.5 h-3.5 text-[#002856]" />
                  </span>
                  <span className="text-white text-[10px] font-medium leading-3">
                    Premium
                  </span>
                </div>
              ) : isTrial ? (
                <div
                  className="flex items-center gap-1 pl-0.5 pr-2 py-0.5 bg-white/10 rounded-[200px]"
                  title={`${daysLeft} days left in Premium Trial`}
                >
                  <span className="relative w-6 h-6 shrink-0">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 -rotate-90">
                      <circle
                        cx="12"
                        cy="12"
                        r="9.5"
                        fill="none"
                        stroke="#002856"
                        strokeWidth="3"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="9.5"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray={59.69}
                        strokeDashoffset={
                          59.69 * (1 - Math.min(1, daysLeft / 7))
                        }
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-semibold leading-3 tabular-nums">
                      {String(daysLeft).padStart(2, "0")}
                    </span>
                  </span>
                  <span className="text-white text-[10px] font-medium leading-3">
                    days left
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

function ScholarshipNavbar({ disableNavigation = false }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const renderAvatar = () => (
    <Link to="/profile" id="profile-nav-link" className="flex-shrink-0">
      {user?.profile_pic_url ? (
        <img
          src={user.profile_pic_url}
          alt="Profile"
          className="w-8 h-8 rounded-full object-cover"
        />
      ) : (
        <svg viewBox="0 0 100 100" className="w-8 h-8 rounded-full" fill="none">
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
        {/* Brand title — tappable, returns to the scholarship hub */}
        <Link
          to="/scholarship"
          onClick={hapticLight}
          className="min-w-0 flex items-center gap-2 transition-opacity hover:opacity-80 cursor-pointer"
          aria-label="Go to Scholarship Exam"
        >
          <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4 text-[#edb843]" />
          </span>
          <span className="flex flex-col justify-center min-w-0">
            <h1 className="text-white text-base font-semibold leading-5 truncate">
              Scholarship Exam
            </h1>
            <p className="text-white/70 text-xs leading-4 truncate">
              One attempt • Results announced later
            </p>
          </span>
        </Link>

        {/* Right side items */}
        <div className="flex items-center gap-3 shrink-0">
          {isAuthenticated ? (
            <>
              {["admin", "super_admin"].includes(user?.role) && (
                <Link
                  to="/admin/scholarship-exam"
                  className="bg-white/10 text-white px-3 py-1.5 rounded-lg hover:bg-white/20 transition font-semibold text-xs"
                >
                  Admin
                </Link>
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
