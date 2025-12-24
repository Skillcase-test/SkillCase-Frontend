import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../redux/auth/authSlice";
import { images } from "../assets/images.js";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    dispatch(logout());
    window.location.href = "https://skillcase.in/userlogout";
  };

  // Get user's proficiency level for dynamic links
  const profLevel = user?.user_prof_level || "A1";

  return (
    <header className="bg-white border-b border-[#efefef] sticky top-0 z-50">
      <div className="h-[55px] lg:h-[72px] flex items-center justify-between px-4 lg:px-8 max-w-7xl mx-auto">
        {/* Logo */}
        <Link to="/" className="flex-shrink-0">
          <img
            src={images.skillcaseLogo}
            alt="Skillcase"
            className="h-4 w-26 lg:h-6 lg:w-38"
          />
        </Link>

        {/* Desktop Menu - Hidden on mobile */}
        <nav className="hidden lg:flex items-center gap-6">
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

              <button
                onClick={handleLogout}
                className="bg-[#edb843] text-[#002856] px-4 py-2 rounded-lg hover:bg-[#d4a53c] transition font-semibold text-sm cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <a
              href="https://skillcase.in/login?redirect=https%3A%2F%2Flearner.skillcase.in%2Fopen-app"
              className="block bg-[#edb843] text-[#002856] px-5 py-2 rounded-lg hover:bg-[#d4a53c] transition font-semibold text-sm ml-4"
            >
              Get Started
            </a>
          )}
        </nav>

        {/* Mobile Right Side */}
        <div className="lg:hidden flex items-center gap-3">
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
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="lg:hidden absolute top-[55px] left-0 right-0 bg-white border-b border-[#efefef] shadow-lg z-40">
          <nav className="px-4 py-4 space-y-1">
            <Link
              to="/"
              className="block px-4 py-3 rounded-lg hover:bg-gray-50 text-[#414651] font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
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

            {/* Divider */}
            <div className="border-t border-[#efefef] my-2"></div>

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
              <a
                href="https://skillcase.in/login?redirect=https%3A%2F%2Flearner.skillcase.in%2Fopen-app"
                className="block bg-[#edb843] text-[#002856] px-5 py-2 rounded-lg hover:bg-[#d4a53c] transition font-semibold text-sm ml-4"
              >
                Get Started
              </a>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
