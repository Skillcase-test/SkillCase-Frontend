import React from "react";
import { FileText, ArrowRight } from "lucide-react";
import api from "../api/axios";

export default function AddFlashSet() {
  const [selectedFile, setSelectedFile] = React.useState(null);
  const [fileName, setFileName] = React.useState("");
  const [chapterName, setChapterName] = React.useState("");
  const [language, setLanguage] = React.useState("");
  const [proficiency, setProficiency] = React.useState("");
  const [uploadStatus, setUploadStatus] = React.useState("");

  const proficiencyLevels = ["A1", "A2", "B1", "B2", "C1", "C2", "Test"];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "text/csv") {
      setSelectedFile(file);
      setFileName(file.name);
      setUploadStatus("");
    } else {
      setUploadStatus("Please select a valid CSV file");
      setSelectedFile(null);
      setFileName("");
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !chapterName || !proficiency) {
      setUploadStatus("Please fill in all fields");
      return;
    }

    setUploadStatus("checking...");

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
          "The chapter already exists please delete it in order to insert new set"
        );
        return;
      } else {
        setUploadStatus("Uploading....");
      }

      await api.post("/admin/addFlashCardSet", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadStatus("Upload successful!");

      // Reset form
      setSelectedFile(null);
      setFileName("");
      setChapterName("");
      setProficiency("");
    } catch (err) {
      console.error(err);
      setUploadStatus("Upload failed. Please try again.");
    }
  };
  return (
    // <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white w-screen">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-slate-600">
            Upload learning materials and manage content
          </p>
        </div>

        <div className="space-y-6">
          {/* CSV Upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
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
                className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-amber-500 transition bg-slate-50"
              >
                <div className="text-center">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700">
                    {fileName || "Click to upload CSV file"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">CSV files only</p>
                </div>
              </label>
            </div>
          </div>

          {/* Proficiency Level */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Proficiency Level
            </label>
            <select
              value={proficiency}
              onChange={(e) => setProficiency(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition bg-white"
            >
              <option value="">Select a proficiency level</option>
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
          {uploadStatus && (
            <div
              className={`p-4 rounded-lg ${
                uploadStatus.includes("successful")
                  ? "bg-emerald-100 text-emerald-700"
                  : uploadStatus.includes("Uploading")
                  ? "bg-blue-100 text-blue-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {uploadStatus}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="w-full bg-amber-500 text-white px-8 py-4 rounded-lg hover:bg-amber-600 transition font-semibold text-lg flex items-center justify-center space-x-2 group"
          >
            <span>Upload Content</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
          </button>
        </div>

        {/* Recent Uploads */}
      </div>
    </div>
    // </div>
  );
}
