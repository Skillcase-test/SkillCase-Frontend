import React, { useState } from "react";
import { Upload, FileText, Download, Loader } from "lucide-react";
import { uploadA2Test, getA2Template } from "../../../../api/a2Api";
export default function A2TestAdd() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file?.type === "application/json") {
      setSelectedFile(file);
      setFileName(file.name);
    }
  };
  const handleSubmit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      await uploadA2Test(formData);
      setUploadStatus("success:Uploaded!");
      setTimeout(() => {
        setSelectedFile(null);
        setFileName("");
        setUploadStatus("");
      }, 2000);
    } catch (err) {
      setUploadStatus("error:Failed");
    } finally {
      setIsUploading(false);
    }
  };
  const handleDownloadTemplate = async () => {
    try {
      const res = await getA2Template("test");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "a2_test_template.json";
      a.click();
    } catch (err) {}
  };
  return (
    <div className="px-4 py-8 max-w-9xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Add A2 Test Topic</h1>
      <div className="bg-white rounded-xl shadow-xs p-6 space-y-6">
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg"
        >
          <Download className="w-4 h-4" />
          Download Template
        </button>
        <input
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
          id="json-upload"
        />
        <label
          htmlFor="json-upload"
          className="flex items-center justify-center w-full py-8 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50"
        >
          <div className="text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p>{fileName || "Upload JSON"}</p>
          </div>
        </label>
        {uploadStatus && (
          <div
            className={`p-4 rounded-lg ${
              uploadStatus.startsWith("success")
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {uploadStatus.split(":")[1]}
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={isUploading || !selectedFile}
          className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {isUploading ? "Uploading..." : "Upload Content"}
        </button>
      </div>
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="font-semibold text-blue-700 mb-2">Test JSON Structure:</p>
        <ul className="text-sm text-blue-600 list-disc list-inside">
          <li>chapter_name, prerequisites (array)</li>
          <li>
            levels: array with level (1-5), sets: array with set_number (1-3),
            questions
          </li>
        </ul>
      </div>
    </div>
  );
}
