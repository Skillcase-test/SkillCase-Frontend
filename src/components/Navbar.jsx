import React from "react";
import { Menu, X } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../redux/auth/authSlice";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            to="/"
            className="text-2xl font-bold text-slate-800 flex items-center gap-2"
          >
            <img
              src="/mainlogo.png"
              alt="Logo"
              className="w-30 sm:w-30 md:w-30 lg:w-40 h-auto pt-1"
            />
          </Link>
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to={
                user?.user_prof_level
                  ? `/practice/${user.user_prof_level}`
                  : "/practice/test"
              }
              className="text-slate-600 hover:text-slate-900 transition font-medium"
            >
              Flashcard
            </Link>
            <Link
              to={
                user?.user_prof_level
                  ? `/pronounce/${user.user_prof_level}`
                  : "/pronounce/test"
              }
              className="text-slate-600 hover:text-slate-900 transition font-medium"
            >
              Pronounce
            </Link>
            <Link
              to={
                user?.user_prof_level
                  ? `/test/${user.user_prof_level}`
                  : "/test/test"
              }
              className="text-slate-600 hover:text-slate-900 transition font-medium"
            >
              Test
            </Link>
            <Link
              to="/stories"
              className="text-slate-600 hover:text-slate-900 transition font-medium"
            >
              Stories
            </Link>
            {/* <Link
              to="/resume"
              className="text-slate-700 hover:text-[#1976D2] transition font-medium"
            >
              Resume Builder
            </Link> */}

            <Link
              to="/conversation/A1"
              className="text-slate-700 hover:text-[#1976D2] transition font-medium"
            >
              Listener
            </Link>

            {isAuthenticated ? (
              <>
                {user?.role === "admin" && (
                  <Link
                    to="/admin"
                    className="bg-[#153A71] text-white px-6 py-2 rounded-lg hover:bg-[#153A50] transition font-semibold"
                  >
                    Admin Tools
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="bg-[#F9C235] text-white px-6 py-2 rounded-lg hover:bg-amber-600 transition font-semibold cursor-pointer"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-[#F9C235] text-white px-6 py-2 rounded-lg hover:bg-amber-600 transition font-semibold"
              >
                Get Started
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-600 hover:text-slate-900"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-3">
            <Link
              to="/"
              className="block text-slate-600 hover:text-slate-900 font-medium"
            >
              Home
            </Link>
            <Link
              to={
                user?.user_prof_level
                  ? `/practice/${user.user_prof_level}`
                  : "/practice/test"
              }
              className="block text-slate-600 hover:text-slate-900 font-medium"
            >
              Flashcard
            </Link>
            <Link
              to={
                user?.user_prof_level
                  ? `/pronounce/${user.user_prof_level}`
                  : "/pronounce/test"
              }
              className="block text-slate-600 hover:text-slate-900 font-medium"
            >
              Pronounce
            </Link>
            <Link
              to={
                user?.user_prof_level
                  ? `/test/${user.user_prof_level}`
                  : "/test/test"
              }
              className="block text-slate-600 hover:text-slate-900 font-medium"
            >
              Test
            </Link>
            <Link
              to={
                user?.user_prof_level
                  ? `/interview/${user.user_prof_level}`
                  : "/interview/test"
              }
              className="block text-slate-600 hover:text-slate-900 font-medium"
            >
              Interview
            </Link>

            <Link
              to="/stories"
              className="block text-slate-600 hover:text-slate-900 font-medium"
            >
              Stories
            </Link>
            {/* <Link
              to="/resume"
              className="block text-slate-600 hover:text-slate-900 font-medium"
            >
              Resume Builder
            </Link> */}

            <Link
              to="/conversation/A1"
              className="block text-slate-700 hover:text-[#1976D2] transition font-medium"
            >
              Listener
            </Link>

            {isAuthenticated ? (
              <>
                {user?.role === "admin" && (
                  <Link
                    to="/admin"
                    className="block w-full bg-[#153A71] text-white px-6 py-2 rounded-lg text-center font-semibold hover:bg-[#153A50] transition"
                  >
                    Admin Tools
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full bg-[#F9C235] text-white px-6 py-2 rounded-lg text-center font-semibold hover:bg-amber-600 transition cursor-pointer"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="block w-full bg-amber-500 text-white px-6 py-2 rounded-lg text-center font-semibold hover:bg-amber-600 transition"
              >
                Get Started
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
