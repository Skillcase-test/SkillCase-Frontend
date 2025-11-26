import React from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader,
} from "lucide-react";
import api from "../../../api/axios";

export default function AddFlashSet() {
  const [selectedFile, setSelectedFile] = React.useState(null);
  const [fileName, setFileName] = React.useState("");
  const [chapterName, setChapterName] = React.useState("");
  const [language, setLanguage] = React.useState("");
  const [proficiency, setProficiency] = React.useState("");
  const [uploadStatus, setUploadStatus] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);

  const proficiencyLevels = ["A1", "A2", "B1", "B2", "C1", "C2", "Test"];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "text/csv") {
      setSelectedFile(file);
      setFileName(file.name);
      setUploadStatus("");
    } else {
      setUploadStatus("error:Please select a valid CSV file");
      setSelectedFile(null);
      setFileName("");
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !chapterName || !proficiency) {
      setUploadStatus("error:Please fill in all fields");
      return;
    }

    setIsUploading(true);
    setUploadStatus("checking:Checking if chapter exists...");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("set_name", chapterName);
      formData.append("proficiency_level", proficiency);

      const res = await api.post("/admin/check", {
        set_name: chapterName,
        proficiency_level: proficiency,
      });

      if (res.data.status === true) {
        setUploadStatus(
          "error:The chapter already exists. Please delete it first to insert a new set."
        );
        setIsUploading(false);
        return;
      } else {
        setUploadStatus("uploading:Uploading file...");
      }

      await api.post("/admin/addFlashCardSet", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadStatus("success:Upload successful!");
      setIsUploading(false);

      // Reset form
      setTimeout(() => {
        setSelectedFile(null);
        setFileName("");
        setChapterName("");
        setProficiency("");
        setUploadStatus("");
      }, 2000);
    } catch (err) {
      console.error(err);
      setUploadStatus("error:Upload failed. Please try again.");
      setIsUploading(false);
    }
  };

  const getStatusInfo = () => {
    if (!uploadStatus) return null;

    const [type, message] = uploadStatus.split(":");

    const statusConfig = {
      success: {
        bg: "bg-green-50 ",
        border: "border-green-200 ",
        text: "text-green-700 ",
        icon: CheckCircle,
      },
      error: {
        bg: "bg-red-50 ",
        border: "border-red-200 ",
        text: "text-red-700 ",
        icon: AlertCircle,
      },
      checking: {
        bg: "bg-blue-50 ",
        border: "border-blue-200 ",
        text: "text-blue-700 ",
        icon: Loader,
      },
      uploading: {
        bg: "bg-blue-50 ",
        border: "border-blue-200 ",
        text: "text-blue-700 ",
        icon: Loader,
      },
    };

    return { type, message, config: statusConfig[type] };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-800  font-bold">
          Add Flashcard Set
        </h1>
        <p className="text-sm text-gray-600  mt-1">
          Upload CSV files to create new flashcard learning sets
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-white  shadow-xs rounded-xl">
        <div className="p-6 space-y-6">
          {/* CSV Upload Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-800  mb-3">
              Upload CSV File
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300  rounded-lg cursor-pointer hover:border-blue-500  transition bg-gray-50 "
              >
                <div className="text-center">
                  <FileText className="w-12 h-12 text-gray-400  mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700 ">
                    {fileName || "Click to upload CSV file"}
                  </p>
                  <p className="text-xs text-gray-500  mt-1">
                    CSV files only (Max 10MB)
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Proficiency Level */}
          <div>
            <label className="block text-sm font-semibold text-gray-800  mb-3">
              Proficiency Level
            </label>
            <select
              value={proficiency}
              onChange={(e) => setProficiency(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300  rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white  text-gray-800 "
            >
              <option value="">Select proficiency level</option>
              {proficiencyLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          {/* Chapter Name */}
          {/* Chapter Name */}
          {proficiency && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Chapter Name
              </label>
              <input
                type="text"
                value={chapterName}
                onChange={(e) => setChapterName(e.target.value)}
                placeholder="Enter chapter name (e.g., Chapter 1, Lesson 1)"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
              />
            </div>
          )}

          {/* Upload Status */}
          {statusInfo && (
            <div
              className={`flex items-center gap-3 p-4 rounded-lg border ${statusInfo.config.bg} ${statusInfo.config.border}`}
            >
              <statusInfo.config.icon
                className={`w-5 h-5 flex-shrink-0 ${statusInfo.config.text} ${
                  statusInfo.type === "checking" ||
                  statusInfo.type === "uploading"
                    ? "animate-spin"
                    : ""
                }`}
              />
              <span className={`text-sm font-medium ${statusInfo.config.text}`}>
                {statusInfo.message}
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={
              isUploading || !selectedFile || !chapterName || !proficiency
            }
            className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
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

      {/* Info Card */}
      <div className="mt-6 bg-blue-50  border border-blue-200  rounded-xl p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600  flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 ">
            <p className="font-semibold mb-1">CSV Format Requirements:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600 ">
              <li>First row should contain column headers</li>
              <li>Include word, translation, and example columns</li>
              <li>Ensure all rows have consistent formatting</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
