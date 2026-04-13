import React, { useState } from "react";
import { FileText, Download } from "lucide-react";
import { uploadA1Test, getA1Template } from "../../../../api/a1Api";

export default function A1TestAdd() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file?.type === "application/json") {
      setSelectedFile(file);
      setFileName(file.name);
      setUploadStatus("");
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      await uploadA1Test(formData);
      setUploadStatus("success:Uploaded!");
      setTimeout(() => {
        setSelectedFile(null);
        setFileName("");
        setUploadStatus("");
      }, 2000);
    } catch (err) {
      setUploadStatus("error:" + (err.response?.data?.error || "Failed"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await getA1Template("test");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "a1_test_template.json";
      a.click();
    } catch (err) {
      setUploadStatus("error:Could not download template");
    }
  };

  return (
    <div className="px-4 py-8 max-w-9xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Add A1 Test Topic</h1>
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
          id="a1-test-upload"
        />
        <label
          htmlFor="a1-test-upload"
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
    </div>
  );
}
