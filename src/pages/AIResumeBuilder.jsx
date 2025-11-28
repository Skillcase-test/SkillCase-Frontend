import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft, ArrowRight } from "lucide-react";
import api from "../api/axios";
// Import extracted components
import UploadScreen from "../components/resume/UploadScreen";
import ProcessingScreen from "../components/resume/ProcessingScreen";
import ExtractedScreen from "../components/resume/ExtractedScreen";
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
export default function AIResumeBuilder() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [step, setStep] = useState("upload");
  const [editStep, setEditStep] = useState(1);
  const [file, setFile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!user) navigate("/Login");
  }, [user, navigate]);
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Please upload a PDF file only");
        setFile(null);
      }
    }
  };
  const extractResumeData = async () => {
    if (!file) return;
    setStep("processing");
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/resume/extract", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResumeData(response.data.data);
      setStep("extracted");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to extract resume data");
      setStep("upload");
    } finally {
      setLoading(false);
    }
  };
  const saveResume = async () => {
    try {
      setLoading(true);
      await api.post("/resume/save", { resumeData });
      toast.success("Resume saved successfully!");
      navigate("/resume/my-resumes");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save resume");
    } finally {
      setLoading(false);
    }
  };
  const updateResumeData = (field, value) => {
    setResumeData((prev) => ({ ...prev, [field]: value }));
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
  // Render different screens based on step
  if (step === "upload") {
    return (
      <UploadScreen
        file={file}
        error={error}
        onFileChange={handleFileChange}
        onExtract={extractResumeData}
        onBack={() => navigate("/resume")}
        loading={loading}
      />
    );
  }
  if (step === "processing") {
    return <ProcessingScreen />;
  }
  if (step === "extracted") {
    return (
      <ExtractedScreen
        resumeData={resumeData}
        onEdit={() => setStep("editing")}
        onPreview={() => setStep("preview")}
      />
    );
  }
  if (step === "editing") {
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
              <h1 className="text-2xl font-bold text-[#1976D2]">
                Review & Edit Data
              </h1>
              <p className="text-slate-600">Make any necessary corrections</p>
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
                className="flex items-center px-6 py-3 bg-[#1976D2] text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Saving..." : "Save Resume"}
              </button>
            ) : (
              <button
                onClick={() => setEditStep(editStep + 1)}
                className="flex items-center px-6 py-3 bg-[#1976D2] text-white rounded-lg font-semibold hover:bg-blue-700 transition cursor-pointer"
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
  if (step === "preview") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto py-6 px-4">
            <h1 className="text-2xl font-bold text-[#1976D2]">Your Resume</h1>
            <p className="text-slate-600">Review and save your resume</p>
          </div>
        </div>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <ResumePreview data={resumeData} />

            <div className="flex gap-4 mt-8 pt-8 border-t">
              <button
                onClick={() => setStep("editing")}
                className="flex-1 border-2 border-slate-300 text-slate-700 py-3 rounded-lg font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Edit Resume
              </button>
              <button
                onClick={saveResume}
                disabled={loading}
                className="flex-1 bg-[#1976D2] text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Saving..." : "Save Resume"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
