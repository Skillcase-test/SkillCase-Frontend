import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FileText,
  Trash2,
  Edit,
  Download,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import api from "../api/axios";

import { toast } from "react-hot-toast";

export default function MyResumes() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!user) {
      navigate("/Login");
      return;
    }
    fetchResumes();
  }, [user, navigate]);
  const fetchResumes = async () => {
    try {
      setLoading(true);
      const response = await api.get("/resume/list");
      setResumes(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load resumes");
    } finally {
      setLoading(false);
    }
  };
  const deleteResume = async (resumeId) => {
    if (!confirm("Are you sure you want to delete this resume?")) return;

    try {
      await api.delete(`/resume/${resumeId}`);
      setResumes(resumes.filter((r) => r.resume_id !== resumeId));
      toast.success("Resume deleted successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete resume");
    }
  };
  const editResume = async (resumeId) => {
    try {
      // Fetch the resume data
      const response = await api.get(`/resume/${resumeId}`);
      const resumeData = response.data.data;

      // Navigate to Manual Builder with pre-filled data
      navigate("/resume/manual-builder", {
        state: {
          resumeData: resumeData.resume_data,
          resumeId: resumeId,
          isEditing: true,
          startAtPreview: true,
        },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load resume");
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate("/resume")}
          className="flex items-center text-slate-600 hover:text-slate-900 mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Resume Options
        </button>
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">My Resumes</h1>
          <p className="text-slate-600">
            {resumes.length} resume{resumes.length !== 1 ? "s" : ""} saved
          </p>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        {resumes.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No resumes yet
            </h3>
            <p className="text-slate-600 mb-6">
              Create your first resume to get started
            </p>
            <button
              onClick={() => navigate("/resume")}
              className="bg-[#1976D2] text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition cursor-pointer"
            >
              Create Resume
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume) => (
              <div
                key={resume.resume_id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <FileText className="w-12 h-12 text-blue-600" />
                    <span className="text-xs text-slate-500">
                      {new Date(resume.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">
                    {resume.resume_name}
                  </h3>

                  <p className="text-sm text-slate-600 mb-4">
                    Last updated:{" "}
                    {new Date(resume.updated_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editResume(resume.resume_id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteResume(resume.resume_id)}
                      className="flex items-center justify-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg hover:bg-red-100 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
