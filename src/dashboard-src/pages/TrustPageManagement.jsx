import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Upload,
  FileText,
  Check,
  Video,
  Eye,
  Star,
  ChevronDown,
} from "lucide-react";
import {
  fetchTrustPageContent,
  getPresignedUploadUrl,
  saveCandidate,
  deleteCandidate,
  saveLearningComponent,
  deleteLearningComponent,
  saveVideo,
  deleteVideo,
  saveLanguageNote,
  deleteLanguageNote,
  saveReview,
  deleteReview,
  saveScreenshot,
  deleteScreenshot,
  saveHeroContent,
  saveFaq,
  deleteFaq,
} from "../../api/trustPageApi";

export default function TrustPageManagement() {
  const [activeTab, setActiveTab] = useState("hero");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    hero: null,
    candidates: [],
    learning_components: [],
    videos: [],
    language_notes: [],
    reviews: [],
    screenshots: [],
    faqs: [],
  });

  const [heroForm, setHeroForm] = useState({
    title: "",
    subheading: "",
    description: "",
    cta_text: "",
  });

  const [faqForm, setFaqForm] = useState({
    id: null,
    question: "",
    answer: "",
    display_order: 0,
  });

  // State for uploads
  const [uploadProgress, setUploadProgress] = useState("");

  // CRUD Forms State
  const [candidateForm, setCandidateForm] = useState({
    id: null,
    name: "",
    state: "",
    experience: "",
    level: "",
    image_url: "",
    image_key: "",
    section_type: "grid",
    display_order: 0,
  });

  const [learningForm, setLearningForm] = useState({
    id: null,
    heading: "",
    video_url: "",
    video_key: "",
    short_description: "",
    display_order: 0,
  });

  const [videoForm, setVideoForm] = useState({
    id: null,
    title: "",
    description: "",
    video_url: "",
    video_key: "",
    type: "student_applying",
    display_order: 0,
  });

  const [noteForm, setNoteForm] = useState({
    id: null,
    language: "English",
    title: "",
    short_description: "",
    pdf_url: "",
    pdf_key: "",
    display_order: 0,
  });

  const [reviewForm, setReviewForm] = useState({
    id: null,
    author_name: "",
    rating: 5,
    review_text: "",
    avatar_url: "",
    display_order: 0,
  });

  const [screenshotForm, setScreenshotForm] = useState({
    image_url: "",
    image_key: "",
    display_order: 0,
  });

  // Fetch all trust page content
  const loadContent = () => {
    setLoading(true);
    fetchTrustPageContent()
      .then((res) => {
        setData(res.data);
        if (res.data.hero) {
          setHeroForm({
            title: res.data.hero.title || "",
            subheading: res.data.hero.subheading || "",
            description: res.data.hero.description || "",
            cta_text: res.data.hero.cta_text || "",
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading trust page items:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadContent();
  }, []);

  // Submit Hero Content
  const handleHeroSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveHeroContent(heroForm);
      alert("Hero Section updated successfully!");
      loadContent();
    } catch (err) {
      console.error("Failed to save hero section:", err);
      alert("Error saving Hero Section.");
    } finally {
      setSaving(false);
    }
  };

  // Submit FAQ Content
  const handleFaqSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveFaq(faqForm, faqForm.id);
      alert(faqForm.id ? "FAQ updated successfully!" : "FAQ created successfully!");
      setFaqForm({ id: null, question: "", answer: "", display_order: 0 });
      loadContent();
    } catch (err) {
      console.error("Failed to save FAQ:", err);
      alert("Error saving FAQ.");
    } finally {
      setSaving(false);
    }
  };

  const handleFaqDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this FAQ?")) return;
    try {
      await deleteFaq(id);
      loadContent();
    } catch (err) {
      console.error("Failed to delete FAQ:", err);
      alert("Error deleting FAQ.");
    }
  };

  // S3 upload helper
  const uploadToS3 = async (file, category) => {
    if (!file) return null;
    setUploadProgress("Generating signature...");
    try {
      const res = await getPresignedUploadUrl(file.name, file.type, category);
      const { uploadUrl, key } = res.data;

      setUploadProgress("Uploading file to S3...");
      await axios.put(uploadUrl, file, {
        headers: { "Content-Type": file.type },
      });

      const bucketUrl = "https://skillcase-payment-docs.s3.ap-south-1.amazonaws.com";
      const fileUrl = res.data.downloadUrl || `${bucketUrl}/${key}`;

      setUploadProgress("");
      return { fileUrl, key };
    } catch (err) {
      console.error("S3 upload failed:", err);
      setUploadProgress("Upload failed.");
      alert("S3 upload failed. Check AWS credentials.");
      return null;
    }
  };

  // Submit Candidates
  const handleCandidateSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Enforce max 4 grid candidates limit
    const isChangingToGrid = candidateForm.section_type === "grid" && 
      (!candidateForm.id || data.candidates.find(c => c.id === candidateForm.id)?.section_type !== "grid");
    
    if (isChangingToGrid) {
      const gridCount = data.candidates.filter(c => c.section_type === "grid").length;
      if (gridCount >= 4) {
        alert("You can only have up to 4 candidates in the Grid section. To add a new one, please delete an existing grid candidate first.");
        setSaving(false);
        return;
      }
    }

    try {
      await saveCandidate(candidateForm, candidateForm.id);
      setCandidateForm({
        id: null,
        name: "",
        state: "",
        experience: "",
        level: "",
        image_url: "",
        image_key: "",
        section_type: "grid",
        display_order: 0,
      });
      loadContent();
    } catch (err) {
      console.error(err);
      alert("Failed to save candidate");
    } finally {
      setSaving(false);
    }
  };

  // Submit Learning stack
  const handleLearningSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveLearningComponent(learningForm, learningForm.id);
      setLearningForm({
        id: null,
        heading: "",
        video_url: "",
        video_key: "",
        short_description: "",
        display_order: 0,
      });
      loadContent();
    } catch (err) {
      console.error(err);
      alert("Failed to save learning component");
    } finally {
      setSaving(false);
    }
  };

  // Submit Videos
  const handleVideoSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveVideo(videoForm, videoForm.id);
      setVideoForm({
        id: null,
        title: "",
        description: "",
        video_url: "",
        video_key: "",
        type: "student_applying",
        display_order: 0,
      });
      loadContent();
    } catch (err) {
      console.error(err);
      alert("Failed to save video");
    } finally {
      setSaving(false);
    }
  };

  // Submit Language Notes
  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveLanguageNote(noteForm, noteForm.id);
      setNoteForm({
        id: null,
        language: "English",
        title: "",
        short_description: "",
        pdf_url: "",
        pdf_key: "",
        display_order: 0,
      });
      loadContent();
    } catch (err) {
      console.error(err);
      alert("Failed to save language note");
    } finally {
      setSaving(false);
    }
  };

  // Submit Reviews
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveReview(reviewForm, reviewForm.id);
      setReviewForm({
        id: null,
        author_name: "",
        rating: 5,
        review_text: "",
        avatar_url: "",
        display_order: 0,
      });
      loadContent();
    } catch (err) {
      console.error(err);
      alert("Failed to save review");
    } finally {
      setSaving(false);
    }
  };

  // Submit Screenshots
  const handleScreenshotSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveScreenshot(screenshotForm);
      setScreenshotForm({
        image_url: "",
        image_key: "",
        display_order: 0,
      });
      loadContent();
    } catch (err) {
      console.error(err);
      alert("Failed to save screenshot");
    } finally {
      setSaving(false);
    }
  };

  // Deletions
  const handleDelete = async (id, type) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      if (type === "candidate") await deleteCandidate(id);
      if (type === "learning") await deleteLearningComponent(id);
      if (type === "video") await deleteVideo(id);
      if (type === "note") await deleteLanguageNote(id);
      if (type === "review") await deleteReview(id);
      if (type === "screenshot") await deleteScreenshot(id);
      loadContent();
    } catch (err) {
      console.error(err);
      alert("Deletion failed");
    }
  };

  const renderLivePreview = () => {
    switch (activeTab) {
      case "candidates":
        return (
          <div className="bg-[#002856] p-6 rounded-3xl flex flex-col items-center justify-center text-center text-white min-h-[300px]">
            <p className="text-[10px] text-yellow-300 font-extrabold uppercase tracking-widest mb-4">
              Preview ({candidateForm.section_type})
            </p>
            {candidateForm.section_type === "grid" ? (
              <div className="bg-white rounded-3xl p-6 text-slate-800 w-full max-w-xs shadow-md border border-slate-100 flex flex-col gap-4 text-left">
                <div className="relative aspect-video rounded-2xl overflow-hidden shrink-0 bg-slate-100">
                  {candidateForm.image_url ? (
                    <img
                      src={candidateForm.image_url}
                      className="w-full h-full object-cover"
                      alt="preview"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
                      No Image Uploaded
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-extrabold text-lg text-[#002856] truncate">
                    {candidateForm.name || "Candidate Name"}
                  </h4>
                  <p className="text-xs text-slate-500 font-semibold">
                    From {candidateForm.state || "State"}
                  </p>
                  <hr className="my-3 border-slate-100" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] uppercase text-slate-400 font-bold">
                        Experience
                      </p>
                      <p className="text-xs font-bold text-slate-700 mt-0.5">
                        {candidateForm.experience || "3 Years (ICU)"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-slate-400 font-bold">
                        Language Level
                      </p>
                      <p className="text-xs font-bold text-slate-700 mt-0.5">
                        {candidateForm.level || "B2 Cleared"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#001836] border border-slate-800 rounded-full px-5 py-3 flex items-center gap-3 w-full max-w-xs shadow-inner">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-700 shrink-0">
                  {candidateForm.image_url ? (
                    <img
                      src={candidateForm.image_url}
                      className="w-full h-full object-cover"
                      alt="preview"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-600" />
                  )}
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-xs text-white truncate">
                    {candidateForm.name || "Candidate Name"}
                  </h4>
                  <p className="text-[9px] text-[#F9C53D] font-extrabold uppercase tracking-wider">
                    {candidateForm.level || "B2 Cleared"}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      case "learning":
        return (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col gap-4 text-left">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
              Preview
            </p>
            {learningForm.heading && (
              <h2 className="text-xl font-extrabold text-[#002856] tracking-tight">
                {learningForm.heading}
              </h2>
            )}
            <div className="border-l-4  bg-slate-50/50 p-5 rounded-r-2xl border-y border-r border-slate-100 flex flex-col gap-3">
              <div className="aspect-video rounded-xl bg-slate-900 overflow-hidden relative">
                {learningForm.video_url ? (
                  <video
                    key={learningForm.video_url}
                    src={learningForm.video_url}
                    className="w-full h-full object-cover"
                    controls
                    preload="auto"
                    playsInline
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5 p-3 text-center">
                    <Video className="w-8 h-8 text-slate-500" />
                    <span>No Video Preview Uploaded</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {learningForm.short_description ||
                  "Detailed class description text..."}
              </p>
            </div>
          </div>
        );
      case "videos":
        return (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col gap-4 text-left">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
              Preview
            </p>
            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xs relative w-full max-w-xs mx-auto">
              <div className="aspect-video bg-slate-950 relative w-full overflow-hidden flex items-center justify-center">
                {videoForm.video_url ? (
                  <video
                    key={videoForm.video_url}
                    src={videoForm.video_url}
                    className="w-full h-full object-cover"
                    controls
                    preload="auto"
                    playsInline
                  />
                ) : (
                  <div className="text-slate-400 text-xs flex flex-col items-center gap-1">
                    <Video className="w-6 h-6" />
                    <span>No Video File</span>
                  </div>
                )}
              </div>
              <div className="p-4 flex flex-col gap-1">
                <h4 className="font-bold text-xs text-[#002856] truncate">
                  {videoForm.title || "Video Title"}
                </h4>
                <p className="text-[10px] text-slate-500 line-clamp-2">
                  {videoForm.description || "Video description..."}
                </p>
              </div>
            </div>
          </div>
        );
      case "notes":
        return (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col gap-4 text-left">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
              Preview
            </p>
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 w-full max-w-xs mx-auto flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#F9C53D] tracking-wider">
                  {noteForm.language}
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <h4 className="font-extrabold text-sm text-white">
                {noteForm.title || "Dativ vs Akkusativ"}
              </h4>
              <p className="text-[10px] text-slate-300 line-clamp-3 leading-relaxed">
                {noteForm.short_description ||
                  "Clinical note overview description..."}
              </p>
              {noteForm.pdf_url && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-yellow-300 font-semibold border-t border-slate-800 pt-3">
                  <FileText className="w-4 h-4" /> PDF Document Linked
                </div>
              )}
            </div>
          </div>
        );
      case "reviews":
        return (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col gap-4 text-left">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
              Preview
            </p>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs w-full max-w-xs mx-auto">
              <h4 className="font-extrabold text-sm text-[#002856]">
                {reviewForm.author_name || "Author Name"}
              </h4>
              <div className="flex gap-0.5 mt-1">
                {Array.from({ length: reviewForm.rating || 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-3.5 h-3.5 text-[#F9C53D] fill-current"
                  />
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-3 italic leading-relaxed">
                "
                {reviewForm.review_text ||
                  "I had an amazing experience learning with Skillcase..."}
                "
              </p>
            </div>
          </div>
        );
      case "screenshots":
        return (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col gap-4 text-left">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
              Preview
            </p>
            <div className="w-40 aspect-[9/19] rounded-[1.5rem] bg-slate-950 p-1.5 border border-slate-700 shadow-lg mx-auto">
              <div className="w-full h-full bg-slate-800 rounded-[1.1rem] overflow-hidden relative">
                {screenshotForm.image_url ? (
                  <img
                    src={screenshotForm.image_url}
                    className="w-full h-full object-cover"
                    alt="screenshot"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                    No Mockup
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case "faqs":
        return (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col gap-4 text-left">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
              Live Accordion Preview
            </p>
            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs w-full max-w-xs mx-auto">
              <div className="w-full px-4 py-3.5 flex items-center justify-between text-left font-bold text-slate-800 text-xs gap-4 border-b border-slate-50 bg-slate-50/10">
                <span>{faqForm.question || "Accordion Question?"}</span>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 rotate-180 text-[#002856]" />
              </div>
              <div className="px-4 py-3.5 text-slate-600 text-[10px] leading-relaxed bg-slate-50/20 whitespace-pre-line">
                {faqForm.answer || "Accordion answer details description text..."}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const inputCls =
    "w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#004E92] focus:border-transparent transition";

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-[#004E92]" />
        Loading Trust Page configuration...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-[#002856]">
            Trust Page Management
          </h2>
          <p className="text-xs text-gray-500">
            Configure candidates, learning, videos, regional notes, and curated
            reviews on the /start-now page.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto gap-4">
        {[
          { id: "hero", label: "Hero Section" },
          { id: "candidates", label: "Candidates" },
          { id: "learning", label: "Learning Stack" },
          { id: "videos", label: "Videos" },
          { id: "notes", label: "Language Notes" },
          { id: "reviews", label: "Reviews" },
          { id: "screenshots", label: "Screenshots" },
          { id: "faqs", label: "FAQs" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === tab.id
                ? "border-[#004E92] text-[#004E92]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {uploadProgress && (
        <div className="mb-4 p-3 bg-amber-50 text-amber-700 rounded-xl text-xs font-semibold animate-pulse">
          {uploadProgress}
        </div>
      )}

      {/* Content Form and Grid Layout */}
      <div className="w-full">
        {/* 0. HERO TAB */}
        {activeTab === "hero" && (
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <form
                onSubmit={handleHeroSubmit}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-4"
              >
                <h3 className="font-extrabold text-[#004E92] text-sm">
                  Edit Hero Section Text
                </h3>
                
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Hero Title *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={heroForm.title}
                    onChange={(e) =>
                      setHeroForm({
                        ...heroForm,
                        title: e.target.value,
                      })
                    }
                    className={`${inputCls} resize-none`}
                    placeholder="e.g. 250+ nurses on board. Every one with a story."
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Use newlines (Enter) to format how titles break on screen.
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Hero Subheading
                  </label>
                  <textarea
                    rows={2}
                    value={heroForm.subheading}
                    onChange={(e) =>
                      setHeroForm({
                        ...heroForm,
                        subheading: e.target.value,
                      })
                    }
                    className={`${inputCls} resize-none`}
                    placeholder="e.g. Every one with a story."
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Hero Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={heroForm.description}
                    onChange={(e) =>
                      setHeroForm({
                        ...heroForm,
                        description: e.target.value,
                      })
                    }
                    className={`${inputCls} resize-none`}
                    placeholder="Join the elite circle of healthcare professionals..."
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    CTA Button Text *
                  </label>
                  <input
                    type="text"
                    required
                    value={heroForm.cta_text}
                    onChange={(e) =>
                      setHeroForm({
                        ...heroForm,
                        cta_text: e.target.value,
                      })
                    }
                    className={inputCls}
                    placeholder="e.g. Start your journey"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#004E92] hover:bg-[#003b6f] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Hero Content
                  </button>
                </div>
              </form>

              {/* Live Preview */}
              <div className="bg-[#001836] p-8 rounded-3xl text-left text-white border border-slate-800 shadow-xl flex flex-col gap-6 justify-between min-h-[380px] relative overflow-hidden">
                {/* Background watermarked image */}
                <div className="absolute inset-0 bg-[url('/hero.webp')] bg-cover bg-center opacity-10 z-0 pointer-events-none" />
                
                <div className="relative z-10 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-4 border-b border-slate-800 pb-2">
                      Live Start-Now Page Hero Preview
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold leading-snug tracking-tight text-white whitespace-pre-line mb-1">
                      {heroForm.title || "250+ nurses on board."}
                    </h1>
                    {heroForm.subheading && (
                      <h2 className="text-base sm:text-lg font-bold text-[#F9C53D] whitespace-pre-line mb-3">
                        {heroForm.subheading}
                      </h2>
                    )}
                    <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-line max-w-md">
                      {heroForm.description || "Join the elite circle..."}
                    </p>
                  </div>
                  <div className="mt-8">
                    <button className="bg-[#F9C53D] text-[#002856] font-extrabold px-6 py-3 rounded-xl text-xs shadow-md pointer-events-none">
                      {heroForm.cta_text || "Start your journey"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1. CANDIDATES TAB */}
        {activeTab === "candidates" && (
          <div className="flex flex-col gap-8">
            {/* Top row: Form and Live Preview side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <form
                onSubmit={handleCandidateSubmit}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-4"
              >
                <h3 className="font-extrabold text-[#004E92] text-sm">
                  {candidateForm.id ? "Edit Candidate" : "Add Candidate"}
                </h3>
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Candidate Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={candidateForm.name}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        name: e.target.value,
                      })
                    }
                    className={inputCls}
                    placeholder="e.g. Sneha Kurian"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 font-bold block mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={candidateForm.state}
                      onChange={(e) =>
                        setCandidateForm({
                          ...candidateForm,
                          state: e.target.value,
                        })
                      }
                      className={inputCls}
                      placeholder="Kerala"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-bold block mb-1">
                      Experience
                    </label>
                    <input
                      type="text"
                      value={candidateForm.experience}
                      onChange={(e) =>
                        setCandidateForm({
                          ...candidateForm,
                          experience: e.target.value,
                        })
                      }
                      className={inputCls}
                      placeholder="3 Years (ICU)"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 font-bold block mb-1">
                      German Level
                    </label>
                    <input
                      type="text"
                      value={candidateForm.level}
                      onChange={(e) =>
                        setCandidateForm({
                          ...candidateForm,
                          level: e.target.value,
                        })
                      }
                      className={inputCls}
                      placeholder="B2 Cleared"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-bold block mb-1">
                      Section Assignment
                    </label>
                    <select
                      value={candidateForm.section_type}
                      onChange={(e) =>
                        setCandidateForm({
                          ...candidateForm,
                          section_type: e.target.value,
                        })
                      }
                      className={inputCls}
                    >
                      <option value="grid">Candidate Grid (Max 4)</option>
                      <option value="marquee">Scrolling Marquee</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={candidateForm.display_order}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        display_order: parseInt(e.target.value) || 0,
                      })
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Candidate Image Link / S3 Upload *
                  </label>
                  <input
                    type="text"
                    required
                    value={candidateForm.image_url}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        image_url: e.target.value,
                        image_key: "",
                      })
                    }
                    className={inputCls}
                    placeholder="https://example.com/image.jpg"
                  />
                  <div className="my-2 flex items-center gap-2">
                    <span className="text-[9px] text-gray-400 font-bold">
                      OR UPLOAD FILE
                    </span>
                    <hr className="flex-1 border-gray-100" />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const res = await uploadToS3(file, "images");
                        if (res) {
                          setCandidateForm({
                            ...candidateForm,
                            image_url: res.fileUrl,
                            image_key: res.key,
                          });
                        }
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  />
                  {candidateForm.image_url && (
                    <img
                      src={candidateForm.image_url}
                      alt="Preview"
                      className="mt-2 h-20 w-auto rounded-lg object-cover border"
                    />
                  )}
                </div>
                <button
                  type="submit"
                  disabled={saving || !candidateForm.image_url}
                  className="w-full bg-[#004E92] hover:bg-blue-900 text-white font-bold text-xs py-3 rounded-xl disabled:opacity-50 transition"
                >
                  {saving ? "Saving..." : "Save Candidate"}
                </button>
              </form>
              <div className="flex flex-col gap-3">
                <h3 className="font-extrabold text-[#002856] text-xs uppercase tracking-wider">
                  Live Card Preview
                </h3>
                {renderLivePreview()}
              </div>
            </div>

            {/* Bottom Section: Stored list */}
            <div className="flex flex-col gap-8 border-t border-gray-100 pt-6">
              
              {/* Grid Candidates sub-section */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-[#002856] text-sm">
                    Stored Grid Candidates
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                    {data.candidates.filter((c) => c.section_type === "grid").length} / 4 Slots Used
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.candidates
                    .filter((c) => c.section_type === "grid")
                    .map((c) => (
                      <div
                        key={c.id}
                        className="bg-white p-4 rounded-2xl border-l-4 border-l-amber-400 border-y border-r border-gray-100 shadow-xs flex justify-between items-start gap-4"
                      >
                        <div className="flex gap-3">
                          <img
                            src={c.image_url}
                            alt={c.name}
                            className="w-16 h-16 rounded-xl object-cover"
                          />
                          <div>
                            <h4 className="font-extrabold text-sm text-[#002856]">
                              {c.name}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {c.state} • {c.experience}
                            </p>
                            <p className="text-xs font-semibold text-[#004E92] mt-0.5">
                              {c.level}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCandidateForm(c)}
                            className="p-2 bg-slate-50 hover:bg-slate-100 text-[#004E92] rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, "candidate")}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  {data.candidates.filter((c) => c.section_type === "grid").length === 0 && (
                    <div className="col-span-full py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                      No grid candidates added yet. Add one above!
                    </div>
                  )}
                </div>
              </div>

              {/* Marquee Candidates sub-section */}
              <div className="flex flex-col gap-3">
                <h3 className="font-extrabold text-[#002856] text-sm">
                  Stored Scrolling Marquee Candidates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.candidates
                    .filter((c) => c.section_type === "marquee")
                    .map((c) => (
                      <div
                        key={c.id}
                        className="bg-white p-4 rounded-2xl border-l-4 border-l-blue-500 border-y border-r border-gray-100 shadow-xs flex justify-between items-start gap-4"
                      >
                        <div className="flex gap-3">
                          <img
                            src={c.image_url}
                            alt={c.name}
                            className="w-16 h-16 rounded-xl object-cover"
                          />
                          <div>
                            <h4 className="font-extrabold text-sm text-[#002856]">
                              {c.name}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {c.state} • {c.experience}
                            </p>
                            <p className="text-xs font-semibold text-[#004E92] mt-0.5">
                              {c.level}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCandidateForm(c)}
                            className="p-2 bg-slate-50 hover:bg-slate-100 text-[#004E92] rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, "candidate")}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  {data.candidates.filter((c) => c.section_type === "marquee").length === 0 && (
                    <div className="col-span-full py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                      No scrolling marquee candidates added yet. Add one above!
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 2. LEARNING STACK TAB */}
        {activeTab === "learning" && (
          <div className="flex flex-col gap-8">
            {/* Top row: Form and Live Preview side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <form
                onSubmit={handleLearningSubmit}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-4"
              >
                <h3 className="font-extrabold text-[#004E92] text-sm">
                  {learningForm.id ? "Edit Component" : "Add Component"}
                </h3>
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Section Heading
                  </label>
                  <input
                    type="text"
                    value={learningForm.heading}
                    onChange={(e) =>
                      setLearningForm({
                        ...learningForm,
                        heading: e.target.value,
                      })
                    }
                    className={inputCls}
                    placeholder="e.g. Learning is Simple"
                  />
                </div>
                {/* Title removed */}
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Short Description
                  </label>
                  <textarea
                    rows={3}
                    value={learningForm.short_description}
                    onChange={(e) =>
                      setLearningForm({
                        ...learningForm,
                        short_description: e.target.value,
                      })
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Playable S3 Video
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const res = await uploadToS3(file, "videos");
                        if (res) {
                          setLearningForm({
                            ...learningForm,
                            video_url: res.fileUrl,
                            video_key: res.key,
                          });
                        }
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-[#004E92] hover:bg-blue-900 text-white font-bold text-xs py-3 rounded-xl disabled:opacity-50 transition"
                >
                  Save Component
                </button>
              </form>
              <div className="flex flex-col gap-3">
                <h3 className="font-extrabold text-[#002856] text-xs uppercase tracking-wider">
                  Live Card Preview
                </h3>
                {renderLivePreview()}
              </div>
            </div>

            {/* Bottom Section: Stored list */}
            <div className="flex flex-col gap-4 border-t border-gray-100 pt-6">
              <h3 className="font-extrabold text-[#002856] text-sm">
                Stored Components
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.learning_components.map((l) => (
                  <div
                    key={l.id}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex justify-between items-start gap-4"
                  >
                    <div className="flex-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400">
                        {l.heading || "No Heading"}
                      </span>
                      {/* Title removed */}
                      <p className="text-xs text-gray-600 mt-2">
                        {l.short_description}
                      </p>
                      {l.video_url && (
                        <div className="mt-3 flex items-center gap-1.5 text-[#004E92] text-xs font-bold">
                          <Video className="w-4 h-4" /> Video Uploaded
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setLearningForm(l)}
                        className="p-2 bg-slate-50 hover:bg-slate-100 text-[#004E92] rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(l.id, "learning")}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. VIDEOS TAB */}
        {activeTab === "videos" && (
          <div className="flex flex-col gap-8">
            {/* Top row: Form and Live Preview side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <form
                onSubmit={handleVideoSubmit}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-4"
              >
                <h3 className="font-extrabold text-[#004E92] text-sm">
                  {videoForm.id ? "Edit Video" : "Add Video"}
                </h3>
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={videoForm.title}
                    onChange={(e) =>
                      setVideoForm({ ...videoForm, title: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Description / Subtitle
                  </label>
                  <input
                    type="text"
                    value={videoForm.description}
                    onChange={(e) =>
                      setVideoForm({
                        ...videoForm,
                        description: e.target.value,
                      })
                    }
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 font-bold block mb-1">
                      Video Type
                    </label>
                    <select
                      value={videoForm.type}
                      onChange={(e) =>
                        setVideoForm({ ...videoForm, type: e.target.value })
                      }
                      className={inputCls}
                    >
                      <option value="student_applying">
                        Student Applying (16:9)
                      </option>
                      <option value="guest_lecture">
                        Guest Lecture (16:9)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-bold block mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={videoForm.display_order}
                      onChange={(e) =>
                        setVideoForm({
                          ...videoForm,
                          display_order: parseInt(e.target.value) || 0,
                        })
                      }
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    S3 Video file *
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const res = await uploadToS3(file, "videos");
                        if (res) {
                          setVideoForm({
                            ...videoForm,
                            video_url: res.fileUrl,
                            video_key: res.key,
                          });
                        }
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving || !videoForm.video_url}
                  className="w-full bg-[#004E92] hover:bg-blue-900 text-white font-bold text-xs py-3 rounded-xl disabled:opacity-50 transition"
                >
                  Save Video
                </button>
              </form>
              <div className="flex flex-col gap-3">
                <h3 className="font-extrabold text-[#002856] text-xs uppercase tracking-wider">
                  Live Video Card Preview
                </h3>
                {renderLivePreview()}
              </div>
            </div>

            {/* Bottom Section: Stored list */}
            <div className="flex flex-col gap-4 border-t border-gray-100 pt-6">
              <h3 className="font-extrabold text-[#002856] text-sm">
                Stored Videos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.videos.map((v) => (
                  <div
                    key={v.id}
                    className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex justify-between items-start gap-4"
                  >
                    <div>
                      <h4 className="font-extrabold text-sm text-[#002856] line-clamp-1">
                        {v.title || "Untitled Video"}
                      </h4>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                        {v.description}
                      </p>
                      <span className="inline-block mt-3 px-2 py-0.5 text-[9px] font-bold bg-[#004E92]/10 text-[#004E92] rounded-md">
                        {v.type === "guest_lecture"
                          ? "GUEST LECTURE (16:9)"
                          : "STUDENT APPLYING (16:9)"}
                      </span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setVideoForm(v)}
                        className="p-2 bg-slate-50 hover:bg-slate-100 text-[#004E92] rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(v.id, "video")}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. LANGUAGE NOTES TAB */}
        {activeTab === "notes" && (
          <div className="flex flex-col gap-8">
            {/* Top row: Form and Live Preview side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <form
                onSubmit={handleNoteSubmit}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-4"
              >
                <h3 className="font-extrabold text-[#004E92] text-sm">
                  {noteForm.id ? "Edit Note" : "Add Language Note"}
                </h3>
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Language Option *
                  </label>
                  <select
                    value={noteForm.language}
                    onChange={(e) =>
                      setNoteForm({ ...noteForm, language: e.target.value })
                    }
                    className={inputCls}
                  >
                    <option value="English">English</option>
                    <option value="Malayalam">Malayalam</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Kannada">Kannada</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Note Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={noteForm.title}
                    onChange={(e) =>
                      setNoteForm({ ...noteForm, title: e.target.value })
                    }
                    className={inputCls}
                    placeholder="e.g. Dativ vs Akkusativ"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Short Description
                  </label>
                  <textarea
                    rows={3}
                    value={noteForm.short_description}
                    onChange={(e) =>
                      setNoteForm({
                        ...noteForm,
                        short_description: e.target.value,
                      })
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    S3 PDF document *
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const res = await uploadToS3(file, "pdfs");
                        if (res) {
                          setNoteForm({
                            ...noteForm,
                            pdf_url: res.fileUrl,
                            pdf_key: res.key,
                          });
                        }
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving || !noteForm.pdf_url}
                  className="w-full bg-[#004E92] hover:bg-blue-900 text-white font-bold text-xs py-3 rounded-xl disabled:opacity-50 transition"
                >
                  Save Note
                </button>
              </form>
              <div className="flex flex-col gap-3">
                <h3 className="font-extrabold text-[#002856] text-xs uppercase tracking-wider">
                  Live Notes Preview
                </h3>
                {renderLivePreview()}
              </div>
            </div>

            {/* Bottom Section: Stored list */}
            <div className="flex flex-col gap-4 border-t border-gray-100 pt-6">
              <h3 className="font-extrabold text-[#002856] text-sm">
                Stored Language Notes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.language_notes.map((n) => (
                  <div
                    key={n.id}
                    className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex justify-between items-start gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#004E92]" />
                        <span className="text-[10px] uppercase font-bold text-gray-400">
                          {n.language}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-[#002856] mt-1">
                        {n.title}
                      </h4>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                        {n.short_description}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setNoteForm(n)}
                        className="p-2 bg-slate-50 hover:bg-slate-100 text-[#004E92] rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(n.id, "note")}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. REVIEWS TAB */}
        {activeTab === "reviews" && (
          <div className="flex flex-col gap-8">
            {/* Top row: Form and Live Preview side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <form
                onSubmit={handleReviewSubmit}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-4"
              >
                <h3 className="font-extrabold text-[#004E92] text-sm">
                  {reviewForm.id ? "Edit Review" : "Add Curated Review"}
                </h3>
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Author Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewForm.author_name}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        author_name: e.target.value,
                      })
                    }
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 font-bold block mb-1">
                      Stars Rating
                    </label>
                    <select
                      value={reviewForm.rating}
                      onChange={(e) =>
                        setReviewForm({
                          ...reviewForm,
                          rating: parseInt(e.target.value) || 5,
                        })
                      }
                      className={inputCls}
                    >
                      <option value={5}>5 Stars (Excellent)</option>
                      <option value={4}>4 Stars (Good)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-bold block mb-1">
                      Order
                    </label>
                    <input
                      type="number"
                      value={reviewForm.display_order}
                      onChange={(e) =>
                        setReviewForm({
                          ...reviewForm,
                          display_order: parseInt(e.target.value) || 0,
                        })
                      }
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Review text *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={reviewForm.review_text}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        review_text: e.target.value,
                      })
                    }
                    className={inputCls}
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-[#004E92] hover:bg-blue-900 text-white font-bold text-xs py-3 rounded-xl disabled:opacity-50 transition"
                >
                  Save Review
                </button>
              </form>
              <div className="flex flex-col gap-3">
                <h3 className="font-extrabold text-[#002856] text-xs uppercase tracking-wider">
                  Live Review Card Preview
                </h3>
                {renderLivePreview()}
              </div>
            </div>

            {/* Bottom Section: Stored list */}
            <div className="flex flex-col gap-4 border-t border-gray-100 pt-6">
              <h3 className="font-extrabold text-[#002856] text-sm">
                Stored Reviews
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.reviews.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex justify-between items-start gap-4"
                  >
                    <div>
                      <h4 className="font-extrabold text-sm text-[#002856]">
                        {r.author_name}
                      </h4>
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star
                            key={i}
                            className="w-3.5 h-3.5 text-[#F9C53D] fill-current"
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 mt-2 italic">
                        "{r.review_text}"
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setReviewForm(r)}
                        className="p-2 bg-slate-50 hover:bg-slate-100 text-[#004E92] rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id, "review")}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 6. SCREENSHOTS TAB */}
        {activeTab === "screenshots" && (
          <div className="flex flex-col gap-8">
            {/* Top row: Form and Live Preview side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <form
                onSubmit={handleScreenshotSubmit}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-4"
              >
                <h3 className="font-extrabold text-[#004E92] text-sm">
                  Add App Screenshot
                </h3>
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={screenshotForm.display_order}
                    onChange={(e) =>
                      setScreenshotForm({
                        ...screenshotForm,
                        display_order: parseInt(e.target.value) || 0,
                      })
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    App Mock Screenshot Link / S3 Upload *
                  </label>
                  <input
                    type="text"
                    required
                    value={screenshotForm.image_url}
                    onChange={(e) =>
                      setScreenshotForm({
                        ...screenshotForm,
                        image_url: e.target.value,
                        image_key: "",
                      })
                    }
                    className={inputCls}
                    placeholder="https://example.com/screenshot.jpg"
                  />
                  <div className="my-2 flex items-center gap-2">
                    <span className="text-[9px] text-gray-400 font-bold">
                      OR UPLOAD FILE
                    </span>
                    <hr className="flex-1 border-gray-100" />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const res = await uploadToS3(file, "images");
                        if (res) {
                          setScreenshotForm({
                            ...screenshotForm,
                            image_url: res.fileUrl,
                            image_key: res.key,
                          });
                        }
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  />
                  {screenshotForm.image_url && (
                    <img
                      src={screenshotForm.image_url}
                      alt="Preview"
                      className="mt-2 h-24 w-auto rounded-lg object-cover border"
                    />
                  )}
                </div>
                <button
                  type="submit"
                  disabled={saving || !screenshotForm.image_url}
                  className="w-full bg-[#004E92] hover:bg-blue-900 text-white font-bold text-xs py-3 rounded-xl disabled:opacity-50 transition"
                >
                  Save Screenshot
                </button>
              </form>
              <div className="flex flex-col gap-3">
                <h3 className="font-extrabold text-[#002856] text-xs uppercase tracking-wider">
                  Live Mockup Preview
                </h3>
                {renderLivePreview()}
              </div>
            </div>

            {/* Bottom Section: Stored list */}
            <div className="flex flex-col gap-4 border-t border-gray-100 pt-6">
              <h3 className="font-extrabold text-[#002856] text-sm">
                Stored Screenshots
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.screenshots.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white p-3 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between items-center gap-3 relative group"
                  >
                    <img
                      src={s.image_url}
                      alt="App mockup screenshot"
                      className="h-44 w-auto object-cover rounded-xl border border-slate-100"
                    />
                    <button
                      onClick={() => handleDelete(s.id, "screenshot")}
                      className="absolute top-2 right-2 p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-full opacity-90 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 7. FAQS TAB */}
        {activeTab === "faqs" && (
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <form
                onSubmit={handleFaqSubmit}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-4"
              >
                <h3 className="font-extrabold text-[#004E92] text-sm">
                  {faqForm.id ? "Edit FAQ" : "Add FAQ"}
                </h3>
                
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Question *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={faqForm.question}
                    onChange={(e) =>
                      setFaqForm({
                        ...faqForm,
                        question: e.target.value,
                      })
                    }
                    className={`${inputCls} resize-none`}
                    placeholder="e.g. What qualifications are needed to practice in Germany?"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Answer *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={faqForm.answer}
                    onChange={(e) =>
                      setFaqForm({
                        ...faqForm,
                        answer: e.target.value,
                      })
                    }
                    className={`${inputCls} resize-none`}
                    placeholder="Study guides, language courses, visa documents..."
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={faqForm.display_order}
                    onChange={(e) =>
                      setFaqForm({
                        ...faqForm,
                        display_order: parseInt(e.target.value) || 0,
                      })
                    }
                    className={inputCls}
                  />
                </div>

                <div className="flex justify-end gap-3 mt-2">
                  {faqForm.id && (
                    <button
                      type="button"
                      onClick={() =>
                        setFaqForm({ id: null, question: "", answer: "", display_order: 0 })
                      }
                      className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-xs font-bold transition hover:bg-gray-50"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#004E92] hover:bg-[#003b6f] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {faqForm.id ? "Update FAQ" : "Add FAQ"}
                  </button>
                </div>
              </form>

              {/* Live Preview */}
              {renderLivePreview()}
            </div>

            {/* Stored FAQs List */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-4 text-left">
              <h3 className="font-extrabold text-[#002856] text-sm">
                Stored FAQs ({data.faqs ? data.faqs.length : 0})
              </h3>
              
              {!data.faqs || data.faqs.length === 0 ? (
                <p className="text-slate-400 text-xs py-4 text-center">
                  No FAQs stored yet. Create one above.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {data.faqs.map((faq) => (
                    <div
                      key={faq.id}
                      className="border border-slate-100 rounded-xl p-4 flex items-start justify-between gap-4 bg-slate-50/20 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            Order: {faq.display_order}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-800">
                          {faq.question}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setFaqForm(faq)}
                          className="p-2 text-slate-500 hover:text-[#004E92] hover:bg-slate-100 rounded-xl transition"
                          title="Edit FAQ"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleFaqDelete(faq.id)}
                          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition"
                          title="Delete FAQ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
