import React, { useState } from "react";
import { Upload, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { uploadB2Exercise } from "../../../../api/b2Api";
import toast, { Toaster } from "react-hot-toast";

const MODULE_LABEL = {
  reading: "Reading",
  listening: "Listening",
  speaking: "Speaking",
  writing: "Writing",
};

export default function ExerciseUploadForm({ module }) {
  const [jsonFile, setJsonFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const moduleLabel = MODULE_LABEL[module] || module;

  const handleJsonChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/json") {
      setJsonFile(file);
      setUploadStatus("");
      return;
    }
    setUploadStatus("error:Please select a valid JSON file");
    setJsonFile(null);
  };

  const handleZipChange = (e) => {
    const file = e.target.files?.[0];
    if (
      file &&
      (file.type === "application/zip" ||
        file.type === "application/x-zip-compressed" ||
        file.name.endsWith(".zip"))
    ) {
      setZipFile(file);
      setUploadStatus("");
      return;
    }
    setUploadStatus(
      "error:Please select a valid ZIP archive containing media files",
    );
    setZipFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jsonFile) {
      toast.error("JSON metadata file is required.");
      return;
    }

    // Guard: a conflicting module in the JSON is rejected; a missing one
    // defaults to this page's module and is injected before upload.
    let parsed;
    try {
      parsed = JSON.parse(await jsonFile.text());
    } catch {
      toast.error("Invalid JSON file — could not parse.");
      setUploadStatus("error:Invalid JSON file.");
      return;
    }
    if (parsed.module && parsed.module !== module) {
      const actual = MODULE_LABEL[parsed.module] || parsed.module || "unknown";
      toast.error(
        `This JSON is a "${actual}" exercise — upload it under B2 ${actual}.`,
      );
      setUploadStatus(
        `error:Wrong module — JSON says "${parsed.module}", this page is "${module}".`,
      );
      return;
    }

    let fileToUpload = jsonFile;
    if (!parsed.module) {
      parsed.module = module;
      fileToUpload = new File([JSON.stringify(parsed, null, 2)], jsonFile.name, {
        type: "application/json",
      });
    }

    setIsUploading(true);
    setUploadStatus(`uploading:Uploading ${moduleLabel} exercise...`);

    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);
      if (zipFile) {
        formData.append("imagesZip", zipFile);
      }

      const res = await uploadB2Exercise(formData);
      if (res.data?.success) {
        toast.success(`Successfully uploaded B2 ${moduleLabel} exercise!`);
        setUploadStatus("success:Upload successful!");
        setJsonFile(null);
        setZipFile(null);

        const jsonInput = document.getElementById("json-file-input");
        if (jsonInput) jsonInput.value = "";
        const zipInput = document.getElementById("zip-file-input");
        if (zipInput) zipInput.value = "";
      } else {
        toast.error("Upload failed.");
        setUploadStatus("error:Upload failed.");
      }
    } catch (err) {
      console.error(err);
      const errMsg =
        err.response?.data?.error || err.message || "Error uploading content.";
      toast.error(errMsg);
      setUploadStatus("error:" + errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusInfo = () => {
    if (!uploadStatus) return null;
    const parts = uploadStatus.split(":");
    const type = parts[0];
    const message = parts.slice(1).join(":");

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
      <Toaster position="top-center" />
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-800 font-bold">
          Add B2 {moduleLabel} Exercise
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Upload a JSON config with tag (all | telc | goethe), title and
          content.blocks, plus an optional ZIP of media assets. The module
          defaults to "{module}" if the JSON doesn't specify one.
        </p>
      </div>

      <div className="bg-white shadow-sm border border-slate-100 rounded-xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              JSON Configuration File (Required)
            </label>
            <input
              id="json-file-input"
              type="file"
              accept="application/json"
              onChange={handleJsonChange}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#002856] hover:file:bg-blue-100 border border-slate-150 rounded-lg p-1.5 bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              ZIP of Media (Images & Audio - Optional)
            </label>
            <input
              id="zip-file-input"
              type="file"
              accept=".zip"
              onChange={handleZipChange}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#002856] hover:file:bg-blue-100 border border-slate-150 rounded-lg p-1.5 bg-slate-50/50"
            />
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

          <button
            type="submit"
            disabled={isUploading || !jsonFile}
            className="w-full bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-lg transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Upload {moduleLabel} Exercise</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
