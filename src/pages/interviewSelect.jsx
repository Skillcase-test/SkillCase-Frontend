import { useState, useEffect } from "react";
import { 
  BookOpen, Clock, BarChart3, Layers, Award, 
  BarChart2, Play, FileText, Target, ChevronRight, Trophy,Video
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";

export default function InterviewSelect() {
  const { prof_level } = useParams();
  const navigate = useNavigate();
  const [finalTest, setFinalTest] = useState(null);
  const [chapterTests, setChapterTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getTests = async () => {
      try {
        const res = await api.get(`/interview/get/${prof_level}`);
        setChapterTests(res.data.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    getTests();
  }, [prof_level]);

  const getDifficultyStyles = (difficulty) => {
    const styles = {
      Easy: {
        gradient: 'from-green-500 to-emerald-600',
        sectionBg: 'from-slate-800 to-slate-900',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        badge: 'bg-green-400 text-green-900',
        buttonBg: 'bg-green-500 hover:bg-green-600'
      },
      Medium: {
        gradient: 'from-amber-500 to-orange-600',
        sectionBg: 'from-slate-800 to-slate-900',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        badge: 'bg-amber-400 text-amber-900',
        buttonBg: 'bg-amber-500 hover:bg-amber-600'
      },
      Hard: {
        gradient: 'from-red-500 to-rose-600',
        sectionBg: 'from-slate-800 to-slate-900',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        badge: 'bg-red-400 text-red-900',
        buttonBg: 'bg-red-500 hover:bg-red-600'
      }
    };
    return styles[difficulty] || styles.Easy;
  };

  if (loading) {
    return (
      <section className="w-screen min-h-screen flex flex-col md:flex-row p-5 bg-blue-50 gap-4" aria-label="Loading interviews">
        <div className="w-full md:w-1/3 flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-3 animate-pulse">
            <div className="h-6 w-32 bg-slate-200 rounded-md" />
            <div className="h-4 w-48 bg-slate-100 rounded" />
            <div className="h-10 w-full bg-slate-200 rounded-xl mt-4" />
          </div>
        </div>
        <div className="w-full md:w-2/3 flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm flex items-center justify-between animate-pulse">
              <div className="flex flex-col gap-2">
                <div className="h-5 w-40 bg-slate-200 rounded" />
                <div className="h-4 w-28 bg-slate-100 rounded" />
              </div>
              <div className="h-10 w-24 bg-slate-200 rounded-xl" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const difficulty = finalTest?.difficulty || 'Easy';
  const styles = getDifficultyStyles(difficulty);

  return (
    <section className="w-screen min-h-screen flex flex-col md:flex-row p-5 bg-blue-50">
      {/* Left column */}
      <div className="w-full md:w-1/3 flex flex-col gap-4 md:m-2 md:h-screen md:sticky md:top-0">
        {/* Test Info Block - Takes 50% height on desktop */}
        <div className="bg-slate-900 text-white rounded-3xl p-10 space-y-6 md:flex-1 md:flex md:flex-col md:justify-center">
          <div className="text-5xl md:text-3xl font-bold">{prof_level.toUpperCase()} Interviews</div>
        </div>
      </div>

      {/* Right column - Chapter Tests */}
      <div className="w-full md:w-2/3 mt-5 md:mt-2 max-h-screen overflow-y-auto hide-scrollbar">
        {/* Desktop View - List */}
        <div className="hidden md:block space-y-4">
          {chapterTests.map((test) => {
            const testStyles = getDifficultyStyles(test.difficulty);
            return (
              <div 
                key={test.test_id}
                onClick={() => window.open(test.interview_link, '_blank')}
                className={`flex items-center justify-between p-4 rounded-lg cursor-pointer bg-gradient-to-r ${testStyles.sectionBg} hover:opacity-90 transition-all border border-gray-700/50`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 ${testStyles.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Video className={`w-5 h-5 ${testStyles.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg md:text-xl font-semibold text-white truncate">
                      {test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1)}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${testStyles.badge}`}>
                        Click to begin.
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/60 flex-shrink-0 ml-2" />
              </div>
            );
          })}
        </div>

        {/* Mobile View - Grid */}
        <div className="md:hidden grid grid-cols-3 gap-3">
          {chapterTests.map((test) => {
            const testStyles = getDifficultyStyles(test.difficulty);
            return (
              <div 
                key={test.test_id}
                onClick={() => window.open(test.test_link, '_blank')}
                className={`bg-gradient-to-br ${testStyles.sectionBg} rounded-xl p-4 cursor-pointer transition-all active:scale-95 shadow-md border border-gray-700/50 flex flex-col justify-between min-h-[120px] hover:opacity-90`}
              >
                <div className="flex flex-col h-full">
                  <div className={`w-8 h-8 ${testStyles.iconBg} rounded-lg flex items-center justify-center mb-2`}>
                    <Video className={`w-5 h-5 ${testStyles.iconColor}`} />
                    
                  </div>
                   <h3 className="text-lg md:text-xl font-semibold text-white truncate">
                      {test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1)}
                    </h3>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </section>
  );
}