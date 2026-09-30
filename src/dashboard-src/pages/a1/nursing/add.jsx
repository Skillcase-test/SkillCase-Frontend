import React, { useState } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader,
  Download,
  Image,
} from "lucide-react";
import {
  uploadNursingChapter,
  getNursingTemplate,
} from "../../../../api/a1NursingApi";

export default function A1NursingAdd() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedImagesZip, setSelectedImagesZip] = useState(null);
  const [fileName, setFileName] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadSummary, setUploadSummary] = useState(null);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (
      file &&
      (file.type === "application/json" ||
        file.name.toLowerCase().endsWith(".json"))
    ) {
      setSelectedFile(file);
      setFileName(file.name);
      setUploadStatus("");
      setUploadSummary(null);
      setUploadErrors([]);
      return;
    }
    setUploadStatus("error:Please select a valid JSON file");
    setSelectedFile(null);
    setFileName("");
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.find((f) => !f.type.startsWith("image/"))) {
      setUploadStatus("error:Only image files are allowed in image upload");
      setSelectedImages([]);
      return;
    }
    setSelectedImages(files);
    setUploadStatus("");
    setUploadSummary(null);
  };

  const handleZipChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setSelectedImagesZip(null);
      return;
    }
    const lowerName = (file.name || "").toLowerCase();
    const isZipMime =
      file.type === "application/zip" ||
      file.type === "application/x-zip-compressed";
    if (!isZipMime && !lowerName.endsWith(".zip")) {
      setUploadStatus("error:Please select a valid ZIP file");
      setSelectedImagesZip(null);
      return;
    }
    setSelectedImagesZip(file);
    setUploadStatus("");
    setUploadSummary(null);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setUploadStatus("error:Please select a chapter JSON file");
      return;
    }

    setIsUploading(true);
    setUploadStatus("uploading:Uploading chapter...");
    setUploadSummary(null);
    setUploadErrors([]);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      selectedImages.forEach((imageFile) => {
        formData.append("images", imageFile);
      });
      if (selectedImagesZip) {
        formData.append("imagesZip", selectedImagesZip);
      }

      const res = await uploadNursingChapter(formData);
      setUploadStatus(
        res.data?.replaced
          ? `success:Chapter ${res.data.chapter_number} replaced successfully!`
          : `success:Chapter ${res.data?.chapter_number} uploaded successfully!`,
      );
      setUploadSummary(res.data);
      setIsUploading(false);

      setTimeout(() => {
        setSelectedFile(null);
        setSelectedImages([]);
        setSelectedImagesZip(null);
        setFileName("");
      }, 2000);
    } catch (err) {
      console.error(err);
      setUploadErrors(err.response?.data?.details || []);
      setUploadStatus(
        "error:" +
          (err.response?.data?.error || "Upload failed. Please try again."),
      );
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await getNursingTemplate();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "a1_nursing_chapter_template.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download template:", err);
    }
  };

  const getStatusInfo = () => {
    if (!uploadStatus) return null;
    const [type, message] = uploadStatus.split(":");
    const statusConfig = {
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
    return { type, message, config: statusConfig[type] };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-800 font-bold">
          Add A1 Nursing German Chapter
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Upload one chapter JSON plus its images (files or one ZIP)
        </p>
      </div>

      <div className="bg-white shadow-xs rounded-xl">
        <div className="p-6 space-y-6">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition"
          >
            <Download className="w-4 h-4" />
            <span>Download JSON Template</span>
          </button>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Chapter JSON File (Required)
            </label>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
              id="a1-nursing-json-upload"
            />
            <label
              htmlFor="a1-nursing-json-upload"
              className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition bg-gray-50"
            >
              <div className="text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  {fileName || "Click to upload chapter JSON"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  One chapter per upload — chapter_number inside the JSON
                  decides the slot
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Images (Multiple)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="hidden"
              id="a1-nursing-images-upload"
            />
            <label
              htmlFor="a1-nursing-images-upload"
              className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition bg-gray-50"
            >
              <div className="text-center">
                <Image className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  {selectedImages.length > 0
                    ? `${selectedImages.length} image(s) selected`
                    : "Click to upload image files"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Filenames must match the image field in the JSON
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Images ZIP (Alternative)
            </label>
            <input
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={handleZipChange}
              className="hidden"
              id="a1-nursing-images-zip-upload"
            />
            <label
              htmlFor="a1-nursing-images-zip-upload"
              className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition bg-gray-50"
            >
              <div className="text-center">
                <Image className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  {selectedImagesZip
                    ? selectedImagesZip.name
                    : "Click to upload images ZIP"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ZIP entries are mapped by filename
                </p>
              </div>
            </label>
          </div>

          {statusInfo && (
            <div
              className={`flex items-center gap-3 p-4 rounded-lg border ${statusInfo.config.bg} ${statusInfo.config.border}`}
            >
              <statusInfo.config.icon
                className={`w-5 h-5 flex-shrink-0 ${statusInfo.config.text} ${
                  statusInfo.type === "uploading" ? "animate-spin" : ""
                }`}
              />
              <span className={`text-sm font-medium ${statusInfo.config.text}`}>
                {statusInfo.message}
              </span>
            </div>
          )}

          {uploadErrors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold mb-2">Validation failed:</p>
              <ul className="list-disc list-inside space-y-1 max-h-48 overflow-y-auto">
                {uploadErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {uploadSummary && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-semibold mb-2">Upload Diagnostics</p>
              <div>Chapter: {uploadSummary.chapter_number}</div>
              <div>Cards inserted: {uploadSummary.cards_inserted ?? 0}</div>
              <div>
                Questions inserted: {uploadSummary.questions_inserted ?? 0}
              </div>
              <div>Images uploaded: {uploadSummary.images_uploaded ?? 0}</div>
              <div>
                Unreferenced uploads:{" "}
                {(uploadSummary.unreferenced_images || []).join(", ") || "0"}
              </div>
              <div>
                Skipped ZIP entries:{" "}
                {(uploadSummary.skipped_zip_entries || []).length}
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isUploading || !selectedFile}
            className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Upload Chapter</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-semibold mb-1">Package Requirements:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600">
              <li>module: "nursing_german", schema_version: 1, cefr: "A1"</li>
              <li>chapter_number: 1–22 — re-uploading replaces that chapter</li>
              <li>cards[] and questions[] with stable ids (ch01-c01 / ch01-q001)</li>
              <li>Every question's card_id must exist in cards</li>
              <li>Every answer must be one of its options</li>
              <li>Every referenced image must be uploaded — missing files reject the whole chapter</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
