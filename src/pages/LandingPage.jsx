import { useEffect } from "react";
import {
  BookOpen,
  FileText,
  Video,
  ArrowRight,
  Mic,
  MessageCircle,
} from "lucide-react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";

export default function LandingPage() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/Login");
    }
  });
  const services = [
    {
      icon: <BookOpen className="w-12 h-12" />,
      title: "Practice via Flashcards",
      description:
        "Master concepts through interactive flashcards designed to reinforce your learning and improve retention.",
      color: "bg-blue-500",
      link: "#practice",
    },
    {
      icon: <FileText className="w-12 h-12" />,
      title: "Take Tests",
      description:
        "Assess your knowledge with comprehensive tests that track your progress and identify areas for improvement.",
      color: "bg-emerald-500",
      link: "#test",
    },
    {
      icon: <Video className="w-12 h-12" />,
      title: "Mock Interviews(Coming soon)",
      description:
        "Prepare for real interviews with AI-powered mock sessions that provide instant feedback and guidance.",
      color: "bg-amber-500",
      link: "#interview",
    },
    {
      icon: <Mic className="w-12 h-12" />,
      title: "Pronounce",
      description:
        "Practice pronunciation with voice recording and get feedback on your speaking skills.",
      color: "bg-purple-500",
      link: "#pronounce",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white w-screen">
      {user && (
        <section
          id="home"
          className="w-full px-4 sm:px-6 lg:px-8 py-12 lg:py-20"
        >
          <div className="container mx-auto grid lg:grid-cols-2 gap-8 xl:gap-12 items-center">
            <div className="space-y-6">
              {user ? (
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight ">
                  Welcome,{" "}
                  {user.username.slice(0, 1).toUpperCase() +
                    user.username.slice(1, user.username.length + 1)}
                </h1>
              ) : (
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                  To Skillcase — a platform where you can learn,
                  practice, and grow.
                </h1>
              )}
              <p className="text-lg text-slate-600 leading-relaxed">
                To Skillcase — a platform where you can learn,
                practice, and grow.
              </p>

              {!user?.user_id && (
                <Link
                  to="/login"
                  className="bg-[#F9C235] text-white px-8 py-4 rounded-lg hover:bg-amber-600 transition items-center space-x-2 text-lg font-semibold group inline-flex"
                >
                  <span>Start Learning</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                </Link>
              )}
            </div>

            <div className="relative w-full">
              <div id="feature-cards-grid" className="grid grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                <Link
                  id="flashcard-card"
                  to={
                    user?.user_prof_level
                      ? `/practice/${user?.user_prof_level}`
                      : "practice/test"
                  }
                  className="bg-[#FFD54F] rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
                >
                  <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-white mb-3 sm:mb-4 group-hover:scale-110 transition-transform" />
                  <div className="text-center text-white">
                    <div className="text-lg sm:text-xl font-bold mb-1">
                      Flashcards
                    </div>
                    <div className="text-xs sm:text-sm opacity-90">
                      Practice
                    </div>
                  </div>
                </Link>

                <Link
                  id="test-card"
                  to={
                    user?.user_prof_level
                      ? `/test/${user?.user_prof_level}`
                      : "test/test"
                  }
                  className="bg-[#1976D2] rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
                >
                  <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-white mb-3 sm:mb-4 group-hover:scale-110 transition-transform" />
                  <div className="text-center text-white">
                    <div className="text-lg sm:text-xl font-bold mb-1">
                      Take Test
                    </div>
                    <div className="text-xs sm:text-sm opacity-90">
                      Assessments
                    </div>
                  </div>
                </Link>

                <Link
                  id="listener-card"
                  to={
                    user?.user_prof_level
                      ? `/conversation/${user?.user_prof_level}`
                      : "conversation/A1"
                  }
                  className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
                >
                  <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 text-white mb-3 sm:mb-4 group-hover:scale-110 transition-transform" />
                  <div className="text-center text-white">
                    <div className="text-lg sm:text-xl font-bold mb-1">
                      Listener
                    </div>
                    <div className="text-xs sm:text-sm opacity-90">
                      Listen & Learn
                    </div>
                  </div>
                </Link>

                <Link
                  id="pronunciation-card"
                  to={
                    user?.user_prof_level
                      ? `/pronounce/${user?.user_prof_level}`
                      : "pronounce/test"
                  }
                  className="bg-[#81D4FA] rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
                >
                  <Mic className="w-12 h-12 sm:w-16 sm:h-16 text-white mb-3 sm:mb-4 group-hover:scale-110 transition-transform" />
                  <div className="text-center text-white">
                    <div className="text-lg sm:text-xl font-bold mb-1">
                      Pronounce
                    </div>
                    <div className="text-xs sm:text-sm opacity-90">
                      Voice Practice
                    </div>
                  </div>
                </Link>

                <Link
                  id="stories-card"
                  to="/stories"
                  className="col-span-1 bg-[#FF6B6B] rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
                >
                  <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-white mb-3 sm:mb-4 group-hover:scale-110 transition-transform" />
                  <div className="text-center text-white">
                    <div className="text-lg sm:text-xl font-bold mb-1">
                      Short Stories
                    </div>
                    <div className="text-xs sm:text-sm opacity-90">
                      Read & Learn
                    </div>
                  </div>
                </Link>

                {/* <Link
                  to="/resume"
                  className="bg-[#4CAF50] rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
                >
                  <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-white mb-3 sm:mb-4 group-hover:scale-110 transition-transform" />
                  <div className="text-center text-white">
                    <div className="text-lg sm:text-xl font-bold mb-1">
                      Resume Builder
                    </div>
                    <div className="text-xs sm:text-sm opacity-90">
                      Create & Edit
                    </div>
                  </div>
                </Link> */}

                <Link
                  to={
                    user?.user_prof_level
                      ? `/interview/${user?.user_prof_level}`
                      : "interview/test"
                  }
                  className="bg-gray-500 to-amber-600 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group pointer-events-none cursor-not-allowed opacity-60"
                >
                  <Video className="w-12 h-12 sm:w-16 sm:h-16 text-white mb-3 sm:mb-4 group-hover:scale-110 transition-transform" />
                  <div className="text-center text-white">
                    <div className="text-lg sm:text-xl font-bold mb-1">
                      Mock Interview
                    </div>
                    <div className="text-xs sm:text-sm opacity-90">
                      Coming Soon
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
