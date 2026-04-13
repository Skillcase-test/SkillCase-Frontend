import React, { useState } from "react";
import {
  Upload,
  FileText,
  Music,
  Image,
  CheckCircle,
  AlertCircle,
  Loader,
  Download,
} from "lucide-react";
import { uploadA1Listening, getA1Template } from "../../../../api/a1Api";
export default function A1ListeningAdd() {
  const [jsonFile, setJsonFile] = useState(null);
  const [chapterAudioFiles, setChapterAudioFiles] = useState([]);
  const [itemAudioFiles, setItemAudioFiles] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [jsonFileName, setJsonFileName] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const handleJsonChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/json") {
      setJsonFile(file);
      setJsonFileName(file.name);
      setUploadStatus("");
    } else {
      setUploadStatus("error:Please select a valid JSON file");
      setJsonFile(null);
      setJsonFileName("");
    }
  };
  const handleAudioChange = (e) => {
    const files = Array.from(e.target.files || []);
    const invalid = files.find((file) => !file.type.startsWith("audio/"));
    if (invalid) {
      setUploadStatus("error:Only audio files are allowed for chapter audio");
      setChapterAudioFiles([]);
      return;
    }
    setChapterAudioFiles(files);
    setUploadStatus("");
  };
  const handleItemAudioChange = (e) => {
    const files = Array.from(e.target.files || []);
    const invalid = files.find((file) => !file.type.startsWith("audio/"));
    if (invalid) {
      setUploadStatus("error:Only audio files are allowed for item audio");
      setItemAudioFiles([]);
      return;
    }
    setItemAudioFiles(files);
    setUploadStatus("");
  };
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const invalid = files.find((file) => !file.type.startsWith("image/"));
    if (invalid) {
      setUploadStatus("error:Only image files are allowed");
      setImageFiles([]);
      return;
    }
    setImageFiles(files);
    setUploadStatus("");
  };
  const handleSubmit = async () => {
    if (!jsonFile) {
      setUploadStatus("error:Please select a JSON file");
      return;
    }
    setIsUploading(true);
    setUploadStatus("uploading:Uploading files...");
    try {
      const formData = new FormData();
      formData.append("file", jsonFile);
      chapterAudioFiles.forEach((file) => formData.append("audio", file));
      itemAudioFiles.forEach((file) => formData.append("itemAudios", file));
      imageFiles.forEach((file) => formData.append("images", file));
      await uploadA1Listening(formData);
      setUploadStatus("success:Upload successful!");
      setTimeout(() => {
        setJsonFile(null);
        setChapterAudioFiles([]);
        setItemAudioFiles([]);
        setImageFiles([]);
        setJsonFileName("");
        setUploadStatus("");
      }, 2000);
    } catch (err) {
      setUploadStatus(
        "error:" + (err.response?.data?.error || "Upload failed"),
      );
    } finally {
      setIsUploading(false);
    }
  };
  const handleDownloadTemplate = async () => {
    try {
      const res = await getA1Template("listening");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "a1_listening_template.json";
      a.click();
    } catch (err) {
      console.error(err);
    }
  };
  const getStatusInfo = () => {
    if (!uploadStatus) return null;
    const [type, message] = uploadStatus.split(":");
    const config = {
      success: {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-700",
        icon: CheckCircle,
      },
      error: {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        icon: AlertCircle,
      },
      uploading: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        icon: Loader,
      },
    };
    return { type, message, config: config[type] };
  };
  const statusInfo = getStatusInfo();
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-800 font-bold">
          Add A1 Listening Content
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Upload JSON + optional chapter audios, item audios, and images
        </p>
      </div>
      <div className="bg-white shadow-xs rounded-xl">
        <div className="p-6 space-y-6">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>

          {/* JSON Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              JSON File (Required)
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleJsonChange}
              className="hidden"
              id="json-upload"
            />
            <label
              htmlFor="json-upload"
              className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 bg-gray-50"
            >
              <div className="text-center">
                <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm">
                  {jsonFileName || "Click to upload JSON"}
                </p>
              </div>
            </label>
          </div>
          {/* Audio Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Chapter Audios (Optional, Multiple)
            </label>
            <input
              type="file"
              accept="audio/*"
              multiple
              onChange={handleAudioChange}
              className="hidden"
              id="audio-upload"
            />
            <label
              htmlFor="audio-upload"
              className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:border-green-500 bg-green-50"
            >
              <div className="text-center">
                <Music className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-green-700">
                  {chapterAudioFiles.length > 0
                    ? `${chapterAudioFiles.length} chapter audio file(s) selected`
                    : "Click to upload chapter audios"}
                </p>
              </div>
            </label>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Item Audios (Optional, Multiple)
            </label>
            <input
              type="file"
              accept="audio/*"
              multiple
              onChange={handleItemAudioChange}
              className="hidden"
              id="item-audio-upload"
            />
            <label
              htmlFor="item-audio-upload"
              className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:border-green-500 bg-green-50"
            >
              <div className="text-center">
                <Music className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-green-700">
                  {itemAudioFiles.length > 0
                    ? `${itemAudioFiles.length} item audio file(s) selected`
                    : "Click to upload item audios"}
                </p>
              </div>
            </label>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Images For Listening Tasks (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="hidden"
              id="listening-images-upload"
            />
            <label
              htmlFor="listening-images-upload"
              className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:border-purple-500 bg-purple-50"
            >
              <div className="text-center">
                <Image className="w-10 h-10 text-purple-400 mx-auto mb-2" />
                <p className="text-sm text-purple-700">
                  {imageFiles.length > 0
                    ? `${imageFiles.length} image file(s) selected`
                    : "Click to upload images"}
                </p>
              </div>
            </label>
          </div>
          {statusInfo && (
            <div
              className={`flex items-center gap-3 p-4 rounded-lg border ${statusInfo.config.bg} ${statusInfo.config.border}`}
            >
              <statusInfo.config.icon
                className={`w-5 h-5 ${statusInfo.config.text} ${
                  statusInfo.type === "uploading" ? "animate-spin" : ""
                }`}
              />
              <span className={`text-sm font-medium ${statusInfo.config.text}`}>
                {statusInfo.message}
              </span>
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={isUploading || !jsonFile}
            className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload Content
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
