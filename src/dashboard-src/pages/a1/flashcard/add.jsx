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
import { uploadA1Flashcard, getA1Template } from "../../../../api/a1Api";

export default function A1FlashcardAdd() {
  const [selectedModuleNumber, setSelectedModuleNumber] = useState("1");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedImagesZip, setSelectedImagesZip] = useState(null);
  const [fileName, setFileName] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadSummary, setUploadSummary] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/json") {
      setSelectedFile(file);
      setFileName(file.name);
      setUploadStatus("");
      setUploadSummary(null);
      return;
    }

    setUploadStatus("error:Please select a valid JSON file");
    setSelectedFile(null);
    setFileName("");
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const invalid = files.find((file) => !file.type.startsWith("image/"));

    if (invalid) {
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
    if (!selectedModuleNumber) {
      setUploadStatus("error:Please select module number");
      return;
    }

    if (!selectedFile) {
      setUploadStatus("error:Please select a JSON file");
      return;
    }

    setIsUploading(true);
    setUploadStatus("uploading:Uploading files...");
    setUploadSummary(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("moduleNumber", selectedModuleNumber);
      selectedImages.forEach((imageFile) => {
        formData.append("images", imageFile);
      });
      if (selectedImagesZip) {
        formData.append("imagesZip", selectedImagesZip);
      }

      const res = await uploadA1Flashcard(formData);
      setUploadStatus("success:Upload successful!");
      setUploadSummary(res.data);
      setIsUploading(false);

      setTimeout(() => {
        setSelectedFile(null);
        setSelectedModuleNumber("1");
        setSelectedImages([]);
        setSelectedImagesZip(null);
        setFileName("");
      }, 2000);
    } catch (err) {
      console.error(err);
      setUploadStatus(
        "error:" +
          (err.response?.data?.error || "Upload failed. Please try again."),
      );
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await getA1Template("flashcard");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "a1_flashcard_template.json";
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
          Add A1 Flashcard Set
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Upload one JSON file and optional local images mapped with image_name
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
              Module Slot (Required)
            </label>
            <select
              value={selectedModuleNumber}
              onChange={(e) => {
                setSelectedModuleNumber(e.target.value);
                setUploadStatus("");
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                <option key={num} value={String(num)}>
                  Module {num}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              This controls unlock slot only. Display name remains the
              chapter_name from your JSON.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Upload JSON File
            </label>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
              id="a1-flashcard-json-upload"
            />
            <label
              htmlFor="a1-flashcard-json-upload"
              className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition bg-gray-50"
            >
              <div className="text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  {fileName || "Click to upload JSON file"}
                </p>
                <p className="text-xs text-gray-500 mt-1">JSON only</p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Upload Images (Optional, Multiple)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="hidden"
              id="a1-flashcard-images-upload"
            />
            <label
              htmlFor="a1-flashcard-images-upload"
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
                  Names must match image_name from JSON
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Upload Images ZIP (Optional)
            </label>
            <input
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={handleZipChange}
              className="hidden"
              id="a1-flashcard-images-zip-upload"
            />
            <label
              htmlFor="a1-flashcard-images-zip-upload"
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
                  ZIP entries are mapped by filename to image_name
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

          {uploadSummary && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-semibold mb-2">Upload Diagnostics</p>
              <div>Cards inserted: {uploadSummary.cardsInserted ?? 0}</div>
              <div>Images resolved: {uploadSummary.imagesResolved ?? 0}</div>
              <div>
                Missing image mappings:{" "}
                {(uploadSummary.imagesMissing || []).length}
              </div>
              <div>
                Unreferenced uploads:{" "}
                {(uploadSummary.unreferencedUploads || []).length}
              </div>
              <div>
                ZIP images processed: {uploadSummary.zipImagesProcessed ?? 0}
              </div>
              <div>
                Unreferenced ZIP images:{" "}
                {(uploadSummary.unreferencedZipImages || []).length}
              </div>
              <div>
                Skipped ZIP entries:{" "}
                {(uploadSummary.zipSkippedEntries || []).length}
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isUploading || !selectedFile || !selectedModuleNumber}
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
                <span>Upload Content</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-semibold mb-1">JSON Format Requirements:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600">
              <li>Select target module slot (1 to 12) before upload</li>
              <li>chapter_name: string (required)</li>
              <li>cards: array of card objects (required)</li>
              <li>Each card: word, meaning, sample_sentence, image_name</li>
              <li>image_name must match image filename exactly</li>
              <li>Supports either multiple image files or one ZIP file</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
