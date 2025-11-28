import { useEffect } from "react";
import { FileText, Upload, FolderOpen } from "lucide-react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

export default function ResumePage() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  useEffect(() => {
    if (!user) {
      navigate("/Login");
    }
  }, [user, navigate]);
  const resumeOptions = [
    {
      icon: <Upload className="w-12 h-12 sm:w-16 sm:h-16" />,
      title: "AI Resume Parser",
      description: "Upload your PDF resume and let AI extract all information",
      color: "bg-[#1976D2]",
      link: "/resume/ai-builder",
    },
    {
      icon: <FileText className="w-12 h-12 sm:w-16 sm:h-16" />,
      title: "Manual Builder",
      description: "Create your resume from scratch by filling in the details",
      color: "bg-[#FFD54F]",
      link: "/resume/manual-builder",
    },
    {
      icon: <FolderOpen className="w-12 h-12 sm:w-16 sm:h-16" />,
      title: "My Resumes",
      description: "View and edit your previously saved resumes",
      color: "bg-[#81D4FA]",
      link: "/resume/my-resumes",
    },
  ];
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white w-screen">
      <section className="w-full px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="container mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-4">
              Resume Builder
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Create professional resumes with AI assistance or build manually
              from scratch
            </p>
          </div>
          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {resumeOptions.map((option, index) => (
              <Link
                key={index}
                to={option.link}
                className={`${option.color} rounded-2xl p-8 flex flex-col items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group min-h-[280px]`}
              >
                <div className="text-white mb-4 group-hover:scale-110 transition-transform">
                  {option.icon}
                </div>
                <div className="text-center text-white">
                  <div className="text-xl sm:text-2xl font-bold mb-3">
                    {option.title}
                  </div>
                  <div className="text-sm sm:text-base opacity-90 leading-relaxed">
                    {option.description}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
