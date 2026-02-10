import React, { useState } from "react";
import {
  Upload,
  FileText,
  Image,
  CheckCircle,
  AlertCircle,
  Loader,
  Download,
} from "lucide-react";
import { uploadA2Reading, getA2Template } from "../../../../api/a2Api";
export default function A2ReadingAdd() {
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
      setJsonFile(null);
      setJsonFileName("");
    }
  };
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file?.type.startsWith("image/")) {
      setImageFile(file);
      setImageFileName(file.name);
    } else {
      setUploadStatus("error:Invalid image");
      setImageFile(null);
      setImageFileName("");
    }
  };
  const handleSubmit = async () => {
    if (!jsonFile) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", jsonFile);
      if (imageFile) formData.append("image", imageFile);
      await uploadA2Reading(formData);
      setUploadStatus("success:Uploaded!");
      setTimeout(() => {
        setJsonFile(null);
        setImageFile(null);
        setJsonFileName("");
        setImageFileName("");
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
      const res = await getA2Template("reading");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "a2_reading_template.json";
      a.click();
    } catch (err) {}
  };
  return (
    <div className="px-4 py-8 max-w-9xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Add A2 Reading Content</h1>
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
            id="json-upload"
          />
          <label
            htmlFor="json-upload"
            className="flex items-center justify-center w-full py-6 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50"
          >
            <div className="text-center">
              <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p>{jsonFileName || "Upload JSON"}</p>
            </div>
          </label>
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800 font-medium">
            📌 Important: Story Image
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Story-type content <strong>requires</strong> an image upload. Other
            content types (article, dialogue) do not need images.
          </p>
        </div>
        <div>
          <label className="block font-semibold mb-2">
            Hero Image (For stories, optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
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
