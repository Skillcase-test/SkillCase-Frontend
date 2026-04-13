import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, PhoneCall } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../redux/auth/authSlice";
import { images } from "../assets/images.js";
import { hapticMedium } from "../utils/haptics";

export default function Navbar({ minimal = false, disableNavigation = false }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (disableNavigation) setIsMenuOpen(false);
  }, [disableNavigation]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  // Get user's proficiency level for dynamic links
  const profLevel = user?.user_prof_level || "A1";

  // In minimal mode, only show links if authenticated
  const showNavLinks = !minimal || isAuthenticated;

  return (
    <header
      className={`bg-white border-b border-[#efefef] sticky top-0 z-50 shadow-sm ${
        disableNavigation ? "pointer-events-none" : ""
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      aria-disabled={disableNavigation}
    >
      <div className="h-[55px] lg:h-[72px] flex items-center justify-between px-4 lg:px-8 max-w-7xl mx-auto">
        {/* Logo */}
        <Link to="/" className="flex-shrink-0" onClick={hapticMedium}>
          <img
            src={images.skillcaseLogo}
            alt="Skillcase"
            className="h-4 w-26 lg:h-6 lg:w-38"
          />
        </Link>

        {/* Desktop Menu - Hidden on mobile, also hidden in minimal mode if not authenticated */}
        {showNavLinks && (
          <nav className="hidden lg:flex items-center gap-6">
            {profLevel === "A2" ? (
              <>
                <Link
                  to="/a2/flashcard"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Flashcards
                </Link>
                <Link
                  to="/a2/grammar"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Grammar
                </Link>
                <Link
                  to="/a2/listening"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Listening
                </Link>
                <Link
                  to="/a2/reading"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Reading
                </Link>
                <Link
                  to="/a2/speaking"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Speaking
                </Link>
                <Link
                  to="/a2/test"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Test
                </Link>
              </>
            ) : profLevel === "A1" ? (
              <>
                <Link
                  to="/a1/flashcard"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Flashcards
                </Link>
                <Link
                  to="/a1/grammar"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Grammar
                </Link>
                <Link
                  to="/a1/listening"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Listening
                </Link>
                <Link
                  to="/a1/reading"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Reading
                </Link>
                <Link
                  to="/a1/speaking"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Speaking
                </Link>
                <Link
                  to="/a1/test"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Test
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={`/practice/${profLevel}`}
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Flashcards
                </Link>
                <Link
                  to={`/pronounce/${profLevel}`}
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Pronounce
                </Link>
                <Link
                  to={`/test/${profLevel}`}
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Test
                </Link>
                <Link
                  to="/stories"
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Stories
                </Link>
                <Link
                  to={`/conversation/${profLevel}`}
                  className="text-[#414651] hover:text-[#002856] transition font-medium text-sm"
                >
                  Listener
                </Link>
              </>
            )}

            {/* Auth Buttons - Desktop */}
            {isAuthenticated ? (
              <div className="flex items-center gap-4 ml-4">
                {user?.role === "admin" && (
                  <Link
                    to="/admin"
                    className="bg-[#002856] text-white px-4 py-2 rounded-lg hover:bg-[#003d83] transition font-semibold text-sm"
                  >
                    Admin
                  </Link>
                )}

                <Link to="/profile" className="flex-shrink-0">
                  {user?.profile_pic_url ? (
                    <img
                      src={user.profile_pic_url}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover border border-[#e9eaeb] hover:border-[#002856] transition-colors"
                    />
                  ) : (
                    <svg
                      viewBox="0 0 100 100"
                      className="w-8 h-8 rounded-full"
                      fill="none"
                    >
                      <circle cx="50" cy="50" r="50" fill="#D1D5DB" />
                      <circle cx="50" cy="38" r="16" fill="#9CA3AF" />
                      <ellipse cx="50" cy="78" rx="28" ry="20" fill="#9CA3AF" />
                    </svg>
                  )}
                </Link>

                <button
                  onClick={handleLogout}
                  className="bg-[#edb843] text-[#002856] px-4 py-2 rounded-lg hover:bg-[#d4a53c] transition font-semibold text-sm cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="block bg-[#edb843] text-[#002856] px-5 py-2 rounded-lg hover:bg-[#d4a53c] transition font-semibold text-sm ml-4"
              >
                Get Started
              </Link>
            )}
          </nav>
        )}

        {/* Mobile Right */}
        {showNavLinks && (
          <div className="lg:hidden flex items-center gap-3">
            {/* Mobile Profile Avatar */}
            {isAuthenticated && (
              <Link to="/profile" className="flex-shrink-0">
                {user?.profile_pic_url ? (
                  <img
                    src={user.profile_pic_url}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover border border-[#e9eaeb]"
                  />
                ) : (
                  <svg
                    viewBox="0 0 100 100"
                    className="w-8 h-8 rounded-full"
                    fill="none"
                  >
                    <circle cx="50" cy="50" r="50" fill="#D1D5DB" />
                    <circle cx="50" cy="38" r="16" fill="#9CA3AF" />
                    <ellipse cx="50" cy="78" rx="28" ry="20" fill="#9CA3AF" />
                  </svg>
                )}
              </Link>
            )}

            {/* Mobile Burger Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-[#414651]" />
              ) : (
                <Menu className="w-6 h-6 text-[#414651]" />
              )}
            </button>
          </div>
        )}

        {/* Call Us Button */}
        {!showNavLinks && (
          <a
            href="tel:9731462667"
            className="flex items-center gap-2 px-4 py-2 border border-[#bab9b9]/40 rounded-full text-[#414651] hover:bg-gray-50 transition font-bold text-sm"
          >
            <PhoneCall className="w-4 h-4" />
            Call Us
          </a>
        )}
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div
          className="lg:hidden absolute left-0 right-0 bg-white border-b border-[#efefef] shadow-lg z-40"
          style={{ top: "calc(55px + env(safe-area-inset-top))" }}
        >
          <nav className="px-4 py-4 space-y-1">
            <Link
              to="/"
              className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            {profLevel === "A2" ? (
              <>
                <Link
                  to="/a2/flashcard"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Flashcards
                </Link>
                <Link
                  to="/a2/grammar"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Grammar
                </Link>
                <Link
                  to="/a2/listening"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Listening
                </Link>
                <Link
                  to="/a2/reading"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Reading
                </Link>
                <Link
                  to="/a2/speaking"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Speaking
                </Link>
                <Link
                  to="/a2/test"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Test
                </Link>
              </>
            ) : profLevel === "A1" ? (
              <>
                <Link
                  to="/a1/flashcard"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Flashcards
                </Link>
                <Link
                  to="/a1/grammar"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Grammar
                </Link>
                <Link
                  to="/a1/listening"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Listening
                </Link>
                <Link
                  to="/a1/reading"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Reading
                </Link>
                <Link
                  to="/a1/speaking"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Speaking
                </Link>
                <Link
                  to="/a1/test"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Test
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={`/practice/${profLevel}`}
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Flashcards
                </Link>
                <Link
                  to={`/pronounce/${profLevel}`}
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pronounce
                </Link>
                <Link
                  to={`/test/${profLevel}`}
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Test
                </Link>
                <Link
                  to="/stories"
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Stories
                </Link>
                <Link
                  to={`/conversation/${profLevel}`}
                  className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Listener
                </Link>
              </>
            )}

            {/* Global Features */}
            <div className="border-t border-[#efefef] my-2"></div>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                if (location.pathname !== "/") {
                  navigate("/", { state: { openLeaderboard: true } });
                } else {
                  document.dispatchEvent(new CustomEvent("openLeaderboard"));
                }
              }}
              className="group relative w-full flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-[#fff8e8] via-[#fff2cf] to-[#ffe8c2] border border-[#f2cc7a] shadow-[0_8px_24px_rgba(240,155,35,0.16)] hover:shadow-[0_12px_28px_rgba(240,155,35,0.24)] transition-all duration-200 active:scale-[0.98] overflow-hidden"
            >
              <div className="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-orange-200/40 to-transparent pointer-events-none" />

              <span className="flex items-center gap-3 text-left relative z-10">
                <span className="w-9 h-9 rounded-xl bg-white/80 border border-[#f4d187] flex items-center justify-center shadow-sm shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-orange-600"
                  >
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                  </svg>
                </span>
                <span>
                  <span className="block text-[10px] font-semibold tracking-wide uppercase text-[#9a6a06]">
                    Daily Streak
                  </span>
                  <span className="block text-sm font-extrabold text-[#5f4306] leading-tight">
                    Check Your Rank
                  </span>
                </span>
              </span>

              <span className="relative z-10 flex items-center gap-2 text-xs font-extrabold text-[#7a5100] bg-white/85 border border-[#f4d187] rounded-full px-3 py-1.5 shrink-0 group-hover:bg-white transition-colors">
                Top 5
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
            </button>

            {/* Divider */}

            {/* Auth Section - Mobile */}
            {isAuthenticated ? (
              <>
                {user?.role === "admin" && (
                  <Link
                    to="/admin"
                    className="block px-4 py-3 rounded-lg bg-[#002856] text-white font-semibold text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Admin Tools
                  </Link>
                )}
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 rounded-lg bg-[#edb843] text-[#002856] font-semibold text-center"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="block bg-[#edb843] text-[#002856] px-5 py-2 rounded-lg hover:bg-[#d4a53c] transition font-semibold text-sm ml-4"
              >
                Get Started
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
