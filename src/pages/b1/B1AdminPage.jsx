import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  getB1Chapters,
  reorderB1Chapters,
  deleteB1Chapter,
  uploadB1Reading,
  getB1DescribeSpeakChaptersAdmin,
  reorderB1DescribeSpeakChapters,
  deleteB1DescribeSpeakChapter,
  uploadB1DescribeSpeak,
  uploadB1ExamPaper,
  getB1ExamPapersAdmin,
  deleteB1ExamPaper,
  uploadB1Flashcard,
  getB1VideosAdmin,
  initB1VideoUpload,
  completeB1VideoUpload,
  deleteB1Video,
} from "../../api/b1Api";
import toast, { Toaster } from "react-hot-toast";

export default function B1AdminPage() {
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);
  const canManageB1 = ["admin", "super_admin"].includes(user?.role);

  const [activeModule, setActiveModule] = useState("news");
  const [topics, setTopics] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // Upload fields
  const [jsonFile, setJsonFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);

  useEffect(() => {
    if (token && !user) return;

    if (!user) {
      navigate("/login");
      return;
    }
    if (!canManageB1) {
      navigate("/");
      return;
    }
    fetchTopics();
  }, [user, token, canManageB1, activeModule, navigate]);

  if (token && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white w-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  const fetchTopics = async () => {
    setLoadingList(true);
    try {
      let res;
      if (activeModule === "describe-speak") {
        res = await getB1DescribeSpeakChaptersAdmin();
      } else if (activeModule === "exam-papers") {
        res = await getB1ExamPapersAdmin();
      } else if (activeModule === "video") {
        res = await getB1VideosAdmin();
      } else {
        res = await getB1Chapters(activeModule);
      }
      setTopics(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error loading B1 topics:", err);
      toast.error("Failed to load topic list.");
    } finally {
      setLoadingList(false);
    }
  };

  const handleJsonChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setJsonFile(e.target.files[0]);
    }
  };

  const handleZipChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setZipFile(e.target.files[0]);
    }
  };

  const handleImagesChange = (e) => {
    if (e.target.files) {
      setImageFiles(Array.from(e.target.files));
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!jsonFile) {
      toast.error("JSON metadata file is required.");
      return;
    }

    setUploading(true);

    try {
      if (activeModule === "video") {
        if (!videoFile) {
          toast.error("Video file is required.");
          setUploading(false);
          return;
        }

        // 1. Read JSON file to parse metadata details
        const metadata = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              resolve(JSON.parse(event.target.result));
            } catch (err) {
              reject(new Error("Invalid JSON file format."));
            }
          };
          reader.onerror = () => reject(new Error("Failed to read JSON file."));
          reader.readAsText(jsonFile);
        });

        // 2. Initialize upload with backend
        const initRes = await initB1VideoUpload({
          title: metadata.title || jsonFile.name,
          contentType: videoFile.type || "video/mp4",
        });

        if (!initRes.data?.success) {
          throw new Error("Failed to initialize video upload with server.");
        }

        const { upload_url, s3_key } = initRes.data.data;

        // 3. Direct upload to AWS S3 using standard fetch PUT
        const uploadResponse = await fetch(upload_url, {
          method: "PUT",
          body: videoFile,
          headers: {
            "Content-Type": videoFile.type || "video/mp4",
          },
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload video file directly to S3.");
        }

        // 4. Complete upload with backend metadata & thumbnail file
        // video_duration is auto-read from the file; all other metadata comes from the JSON
        const completeData = new FormData();
        completeData.append("s3_key", s3_key);
        completeData.append("title", metadata.title || jsonFile.name);
        completeData.append("transcript", metadata.transcript || "");
        completeData.append("video_duration", videoDuration || 0);
        completeData.append("display_order", metadata.display_order || 0);
        completeData.append("questions", JSON.stringify(metadata.questions || []));
        completeData.append("difficulty", metadata.difficulty || "Medium");
        if (thumbnailFile) {
          completeData.append("thumbnail", thumbnailFile);
        }

        const completeRes = await completeB1VideoUpload(completeData);
        if (completeRes.data?.success) {
          toast.success("Successfully uploaded video and metadata!");
          setJsonFile(null);
          setVideoFile(null);
          setThumbnailFile(null);
          setVideoDuration(0);
          document.getElementById("json-file-input").value = "";
          const vidInput = document.getElementById("video-file-input");
          if (vidInput) vidInput.value = "";
          const thumbInput = document.getElementById("thumb-file-input");
          if (thumbInput) thumbInput.value = "";
          fetchTopics();
        } else {
          toast.error("Failed to save video metadata on backend.");
        }
      } else {
        const formData = new FormData();
        formData.append("file", jsonFile);
        if (zipFile) {
          formData.append("imagesZip", zipFile);
        }
        imageFiles.forEach((file) => {
          formData.append("images", file);
        });

        let res;
        if (activeModule === "describe-speak") {
          res = await uploadB1DescribeSpeak(formData);
        } else if (activeModule === "exam-papers") {
          res = await uploadB1ExamPaper(formData);
        } else if (activeModule === "flashcard") {
          res = await uploadB1Flashcard(formData);
        } else {
          res = await uploadB1Reading(formData);
        }
        if (res.data?.success) {
          toast.success(
            `Successfully uploaded ${res.data.itemsInserted} items!`,
          );
          setJsonFile(null);
          setZipFile(null);
          setImageFiles([]);
          // Reset file inputs
          document.getElementById("json-file-input").value = "";
          const zipInput = document.getElementById("zip-file-input");
          if (zipInput) zipInput.value = "";
          const imgInput = document.getElementById("images-file-input");
          if (imgInput) imgInput.value = "";
          fetchTopics();
        } else {
          toast.error("Upload failed.");
        }
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(
        err.response?.data?.error || err.message || "Error uploading content.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    const itemType =
      activeModule === "exam-papers"
        ? "exam paper"
        : activeModule === "video"
        ? "video"
        : "topic";
    if (
      !window.confirm(
        `Are you sure you want to delete this ${itemType} permanently?`,
      )
    ) {
      return;
    }

    try {
      let res;
      if (activeModule === "describe-speak") {
        res = await deleteB1DescribeSpeakChapter(id);
      } else if (activeModule === "exam-papers") {
        res = await deleteB1ExamPaper(id);
      } else if (activeModule === "video") {
        res = await deleteB1Video(id);
      } else {
        res = await deleteB1Chapter(activeModule, id);
      }
      if (res.data?.success) {
        toast.success(
          `${
            itemType.charAt(0).toUpperCase() + itemType.slice(1)
          } deleted successfully.`,
        );
        fetchTopics();
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete topic.");
    }
  };

  const handleMove = async (index, direction) => {
    if (activeModule === "exam-papers" || activeModule === "video") return; // exam papers and videos use display_order / fixed index
    const nextIdx = direction === "up" ? index - 1 : index + 1;
    if (nextIdx < 0 || nextIdx >= topics.length) return;

    const listCopy = [...topics];
    const temp = listCopy[index];
    listCopy[index] = listCopy[nextIdx];
    listCopy[nextIdx] = temp;

    setTopics(listCopy);

    const orderedIds = listCopy.map((t) => t.id);
    try {
      if (activeModule === "describe-speak") {
        await reorderB1DescribeSpeakChapters(orderedIds);
      } else {
        await reorderB1Chapters(activeModule, orderedIds);
      }
      toast.success("Order updated.");
    } catch (err) {
      console.error("Reorder error:", err);
      toast.error("Failed to update order.");
      fetchTopics(); // Revert list
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-screen pb-12">
      <Toaster position="top-center" />

      {/* Header bar */}
      <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-slate-100">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-slate-600 font-semibold text-sm cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Home</span>
        </button>
        <span className="font-extrabold text-[#002856] text-lg">
          B1 Content Console
        </span>
        <span className="w-16" />
      </div>

      <div className="max-w-4xl mx-auto w-full px-6 py-8 grid md:grid-cols-5 gap-8">
        {/* Left Column: Uploader */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-black text-[#002856] mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" />
              <span>Upload Content</span>
            </h2>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Module selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Module Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveModule("news")}
                    className={`py-2 px-3 rounded-xl font-bold text-[10px] border transition-all ${
                      activeModule === "news"
                        ? "bg-[#002856] text-white border-[#002856] shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    News
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModule("article")}
                    className={`py-2 px-3 rounded-xl font-bold text-[10px] border transition-all ${
                      activeModule === "article"
                        ? "bg-[#002856] text-white border-[#002856] shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Article
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModule("describe-speak")}
                    className={`py-2 px-3 rounded-xl font-bold text-[10px] border transition-all ${
                      activeModule === "describe-speak"
                        ? "bg-[#002856] text-white border-[#002856] shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Describe
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModule("exam-papers")}
                    className={`py-2 px-3 rounded-xl font-bold text-[10px] border transition-all ${
                      activeModule === "exam-papers"
                        ? "bg-[#002856] text-white border-[#002856] shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Exams
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModule("flashcard")}
                    className={`py-2 px-3 rounded-xl font-bold text-[10px] border transition-all ${
                      activeModule === "flashcard"
                        ? "bg-[#002856] text-white border-[#002856] shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Flashcard
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModule("video")}
                    className={`py-2 px-3 rounded-xl font-bold text-[10px] border transition-all ${
                      activeModule === "video"
                        ? "bg-[#002856] text-white border-[#002856] shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Video
                  </button>
                </div>
              </div>

              {/* JSON file */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  JSON Config File
                </label>
                <input
                  id="json-file-input"
                  type="file"
                  accept="application/json"
                  onChange={handleJsonChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#002856] hover:file:bg-blue-100 border border-slate-100 rounded-xl p-1 bg-slate-50/50"
                />
              </div>

              {/* Zip file */}
              {activeModule !== "flashcard" && activeModule !== "video" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    {activeModule === "exam-papers"
                      ? "ZIP Media (Images & Audio - Optional)"
                      : "ZIP Images (Optional)"}
                  </label>
                  <input
                    id="zip-file-input"
                    type="file"
                    accept=".zip"
                    onChange={handleZipChange}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#002856] hover:file:bg-blue-100 border border-slate-100 rounded-xl p-1 bg-slate-50/50"
                  />
                </div>
              )}

              {/* Loose files */}
              {activeModule !== "exam-papers" &&
                activeModule !== "flashcard" &&
                activeModule !== "video" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      Loose Image Files (Optional)
                    </label>
                    <input
                      id="images-file-input"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImagesChange}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#002856] hover:file:bg-blue-100 border border-slate-100 rounded-xl p-1 bg-slate-50/50"
                    />
                    {imageFiles.length > 0 && (
                      <p className="text-[10px] text-slate-400 mt-1.5 font-semibold">
                        {imageFiles.length} files selected
                      </p>
                    )}
                  </div>
                )}

              {/* Video Specific Upload Inputs */}
              {activeModule === "video" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      Video File (.mp4)
                    </label>
                    <input
                      id="video-file-input"
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setVideoFile(file);
                        // Auto-read duration from the video file
                        const tempUrl = URL.createObjectURL(file);
                        const vid = document.createElement("video");
                        vid.preload = "metadata";
                        vid.onloadedmetadata = () => {
                          setVideoDuration(Math.round(vid.duration));
                          URL.revokeObjectURL(tempUrl);
                        };
                        vid.src = tempUrl;
                      }}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#002856] hover:file:bg-blue-100 border border-slate-100 rounded-xl p-1 bg-slate-50/50"
                    />
                    {videoDuration > 0 && (
                      <p className="text-[10px] text-green-700 font-semibold mt-1.5">
                        Duration detected: {Math.floor(videoDuration / 60)}m{" "}
                        {videoDuration % 60}s
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      Thumbnail Image (Optional)
                    </label>
                    <input
                      id="thumb-file-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setThumbnailFile(e.target.files[0]);
                        }
                      }}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#002856] hover:file:bg-blue-100 border border-slate-100 rounded-xl p-1 bg-slate-50/50"
                    />
                  </div>
                </>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={uploading}
                className={`w-full mt-4 bg-[#002856] text-white hover:bg-[#003c82] font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                  uploading ? "opacity-75 cursor-wait" : ""
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload Content</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: List & Reordering */}
        <div className="md:col-span-3 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col h-[520px]">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="text-lg font-black text-[#002856] capitalize">
                {activeModule === "exam-papers"
                  ? "Exam Papers"
                  : `${activeModule.replace("-", " ")} Topics`}{" "}
                ({topics.length})
              </h2>
              <button
                onClick={fetchTopics}
                className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
              >
                Refresh
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingList ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-[#002856]" />
                </div>
              ) : topics.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <AlertCircle className="w-8 h-8 mb-2" />
                  <p className="text-xs font-semibold">
                    No items uploaded yet.
                  </p>
                </div>
              ) : (
                topics.map((t, idx) => {
                  const isVid = activeModule === "video";
                  const id = isVid ? t.video_id : t.id;
                  const thumb = isVid
                    ? t.thumbnail_url
                    : t.hero_image_url || t.prompt_image_url;
                  const level = isVid
                    ? t.proficiency_level || "B1"
                    : t.level_tag || "B1-B2";

                  return (
                    <div
                      key={id ?? idx}
                      className="flex items-center gap-3 p-3 border border-slate-100 rounded-2xl hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[10px] font-black uppercase text-slate-400">
                            {activeModule === "exam-papers"
                              ? t.exam_type?.substring(0, 3)
                              : "B1"}
                          </div>
                        )}
                      </div>

                      {/* Title & Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[13px] font-bold text-slate-700 truncate pr-2">
                          {t.title}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 rounded text-slate-500 font-bold uppercase">
                            {activeModule === "exam-papers"
                              ? t.exam_type
                              : level}
                          </span>
                          {activeModule === "flashcard" ? (
                            <span className="text-[9px] px-1.5 py-0.2 bg-blue-50 text-[#002856] rounded font-bold capitalize">
                              Flashcard
                            </span>
                          ) : activeModule === "video" ? (
                            <span className="text-[9px] px-1.5 py-0.2 bg-blue-50 text-[#002856] rounded font-bold capitalize">
                              Video ({Math.round(t.video_duration / 60) || 1}{" "}
                              mins)
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 bg-blue-50 text-[#002856] rounded font-bold capitalize">
                              {activeModule === "exam-papers"
                                ? `${t.question_count} Qs`
                                : t.difficulty_tag || "Easy"}
                            </span>
                          )}
                          {activeModule === "exam-papers" && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-amber-50 text-amber-800 rounded font-bold uppercase">
                              {t.difficulty_tag || "Medium"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {activeModule !== "exam-papers" &&
                          activeModule !== "video" && (
                            <>
                              <button
                                onClick={() => handleMove(idx, "up")}
                                disabled={idx === 0}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer"
                                title="Move Up"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleMove(idx, "down")}
                                disabled={idx === topics.length - 1}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer"
                                title="Move Down"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        <button
                          onClick={() => handleDelete(id)}
                          className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors ml-1 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
