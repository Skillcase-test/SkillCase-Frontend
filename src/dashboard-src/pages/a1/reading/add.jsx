import React, { useState } from "react";
import { FileText, Image, Download } from "lucide-react";
import { uploadA1Reading, getA1Template } from "../../../../api/a1Api";

export default function A1ReadingAdd() {
  const [jsonFile, setJsonFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [jsonFileName, setJsonFileName] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleJsonChange = (e) => {
    const file = e.target.files[0];
    if (file?.type === "application/json") {
      setJsonFile(file);
      setJsonFileName(file.name);
    } else {
      setUploadStatus("error:Invalid JSON");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file?.type.startsWith("image/")) {
      setImageFile(file);
      setImageFileName(file.name);
    } else {
      setUploadStatus("error:Invalid image");
    }
  };

  const handleSubmit = async () => {
    if (!jsonFile) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", jsonFile);
      if (imageFile) formData.append("image", imageFile);
      await uploadA1Reading(formData);

      setUploadStatus("success:Uploaded!");
      setTimeout(() => {
        setJsonFile(null);
        setImageFile(null);
        setJsonFileName("");
        setImageFileName("");
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
      const res = await getA1Template("reading");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "a1_reading_template.json";
      a.click();
    } catch (err) {
      setUploadStatus("error:Could not download template");
    }
  };

  return (
    <div className="px-4 py-8 max-w-9xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Add A1 Reading Content</h1>
      <div className="bg-white rounded-xl shadow-xs p-6 space-y-6">
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg"
        >
          <Download className="w-4 h-4" />
          Download Template
        </button>

        <div>
          <label className="block font-semibold mb-2">
            JSON File (Required)
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleJsonChange}
            className="hidden"
            id="a1-reading-json-upload"
          />
          <label
            htmlFor="a1-reading-json-upload"
            className="flex items-center justify-center w-full py-6 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50"
          >
            <div className="text-center">
              <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p>{jsonFileName || "Upload JSON"}</p>
            </div>
          </label>
        </div>

        <div>
          <label className="block font-semibold mb-2">
            Hero Image (Optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            id="a1-reading-image-upload"
          />
          <label
            htmlFor="a1-reading-image-upload"
            className="flex items-center justify-center w-full py-6 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer bg-purple-50"
          >
            <div className="text-center">
              <Image className="w-10 h-10 text-purple-400 mx-auto mb-2" />
              <p className="text-purple-700">
                {imageFileName || "Upload Image"}
              </p>
            </div>
          </label>
        </div>

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
          disabled={isUploading || !jsonFile}
          className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {isUploading ? "Uploading..." : "Upload Content"}
        </button>
      </div>
    </div>
  );
}
