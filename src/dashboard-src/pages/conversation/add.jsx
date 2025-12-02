import { useState } from "react";
import {
  Upload,
  FileAudio,
  FileJson,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import api from "../../../api/axios";
export default function AddConversation() {
  const [formData, setFormData] = useState({
    proficiency_level: "A1",
  });
  const [audioFile, setAudioFile] = useState(null);
  const [jsonFile, setJsonFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });
    if (!audioFile || !jsonFile) {
      setStatus({
        type: "error",
        message: "Both audio and JSON files are required",
      });
      setLoading(false);
      return;
    }
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("proficiency_level", formData.proficiency_level);
      formDataToSend.append("audio", audioFile);
      formDataToSend.append("json", jsonFile);
      const res = await api.post("/admin/conversation/create", formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setStatus({
        type: "success",
        message: `Conversation "${res.data.data.title}" created successfully!`,
      });
      // Reset form
      setFormData({ proficiency_level: "a1" });
      setAudioFile(null);
      setJsonFile(null);
      e.target.reset();
    } catch (err) {
      console.error("Error creating conversation:", err);
      setStatus({
        type: "error",
        message: err.response?.data?.message || "Failed to create conversation",
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Add New Conversation
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Proficiency Level */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Proficiency Level
          </label>
          <select
            value={formData.proficiency_level}
            onChange={(e) =>
              setFormData({ ...formData, proficiency_level: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            required
          >
            <option value="A1">A1 - Beginner</option>
            <option value="A2">A2 - Elementary</option>
            <option value="B1">B1 - Intermediate</option>
            <option value="B2">B2 - Upper Intermediate</option>
            <option value="C1">C1 - Advanced</option>
            <option value="C2">C2 - Proficient</option>
          </select>
        </div>
        {/* File Uploads */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          {/* Audio File */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Audio File (MP3)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition">
                <FileAudio className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {audioFile ? audioFile.name : "Choose MP3 file"}
                </span>
                <input
                  type="file"
                  accept=".mp3,audio/mpeg"
                  onChange={(e) => setAudioFile(e.target.files[0])}
                  className="hidden"
                  required
                />
              </label>
              {audioFile && (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              )}
            </div>
          </div>
          {/* JSON File */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timestamps JSON File
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition">
                <FileJson className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {jsonFile ? jsonFile.name : "Choose JSON file"}
                </span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => setJsonFile(e.target.files[0])}
                  className="hidden"
                  required
                />
              </label>
              {jsonFile && (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              )}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The JSON file should match the format in{" "}
              <code className="bg-blue-100 px-1 rounded">
                example_conversation_manual.json
              </code>
            </p>
          </div>
        </div>
        {/* Status Message */}
        {status.message && (
          <div
            className={`rounded-lg p-4 flex items-center gap-3 ${
              status.type === "success"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p
              className={`text-sm ${
                status.type === "success" ? "text-green-800" : "text-red-800"
              }`}
            >
              {status.message}
            </p>
          </div>
        )}
        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Upload className="w-5 h-5" />
          {loading ? "Creating..." : "Create Conversation"}
        </button>
      </form>
    </div>
  );
}
