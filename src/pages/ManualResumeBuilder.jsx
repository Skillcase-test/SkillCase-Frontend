import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft, ArrowRight } from "lucide-react";
import api from "../api/axios";
// Import extracted components
import StepIndicator from "../components/resume/StepIndicator";
import PersonalInfoForm from "../components/resume/forms/PersonalInfoForm";
import EducationForm from "../components/resume/forms/EducationForm";
import ExperienceForm from "../components/resume/forms/ExperienceForm";
import SkillsLanguagesForm from "../components/resume/forms/SkillsLanguagesForm";
import ResumePreview from "../components/resume/ResumePreview";

import { toast } from "react-hot-toast";

const EDIT_STEPS = [
  { id: 1, title: "Personal Info" },
  { id: 2, title: "Education" },
  { id: 3, title: "Experience" },
  { id: 4, title: "Skills & Languages" },
  { id: 5, title: "Preview" },
];
const EMPTY_RESUME = {
  personalInfo: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    linkedin: "",
    address: "",
    aboutMe: "",
  },
  education: [],
  experience: [],
  skills: { technical: [], soft: [] },
  languages: [],
  hobbies: "",
};
export default function ManualResumeBuilder() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();

  const [editStep, setEditStep] = useState(1);
  const [resumeData, setResumeData] = useState(EMPTY_RESUME);
  const [resumeId, setResumeId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) navigate("/Login");

    // Check if we're editing an existing resume
    if (location.state?.resumeData) {
      setResumeData(location.state.resumeData);
      setResumeId(location.state.resumeId);
      setIsEditing(location.state.isEditing);

      if (location.state.startAtPreview) {
        setEditStep(5);
      }
    }
  }, [user, navigate, location.state]);

  const updateResumeData = (field, value) => {
    setResumeData((prev) => ({ ...prev, [field]: value }));
  };
  const saveResume = async () => {
    try {
      setLoading(true);

      if (isEditing && resumeId) {
        // Update existing resume
        await api.put(`/resume/${resumeId}`, { resumeData });
        toast.success("Resume updated successfully!");
      } else {
        // Create new resume
        await api.post("/resume/save", { resumeData });
        toast.success("Resume saved successfully!");
      }

      navigate("/resume/my-resumes");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save resume");
    } finally {
      setLoading(false);
    }
  };
  const renderEditForm = () => {
    switch (editStep) {
      case 1:
        return (
          <PersonalInfoForm data={resumeData} onUpdate={updateResumeData} />
        );
      case 2:
        return <EducationForm data={resumeData} onUpdate={updateResumeData} />;
      case 3:
        return <ExperienceForm data={resumeData} onUpdate={updateResumeData} />;
      case 4:
        return (
          <SkillsLanguagesForm data={resumeData} onUpdate={updateResumeData} />
        );
      case 5:
        return <ResumePreview data={resumeData} />;
      default:
        return null;
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto py-6 px-4">
          <button
            onClick={() => navigate("/resume")}
            className="flex items-center text-slate-600 hover:text-slate-900 mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#FFD54F]">
              Manual Resume Builder
            </h1>
            <p className="text-slate-600">Create your resume from scratch</p>
          </div>

          <StepIndicator
            steps={EDIT_STEPS}
            currentStep={editStep}
            onStepClick={setEditStep}
          />
        </div>
      </div>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {renderEditForm()}
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <div className="flex justify-between gap-4">
          <button
            onClick={() => setEditStep(Math.max(1, editStep - 1))}
            disabled={editStep === 1}
            className="flex items-center px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Previous
          </button>

          {editStep === 5 ? (
            <button
              onClick={saveResume}
              disabled={loading}
              className="flex items-center px-6 py-3 bg-[#FFD54F] text-white rounded-lg font-semibold hover:bg-yellow-600 transition cursor-pointer"
            >
              {loading ? "Saving..." : "Save Resume"}
            </button>
          ) : (
            <button
              onClick={() => setEditStep(editStep + 1)}
              className="flex items-center px-6 py-3 bg-[#FFD54F] text-white rounded-lg font-semibold hover:bg-yellow-600 transition cursor-pointer"
            >
              {editStep === 4 ? "Preview" : "Next"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
