import { useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import api from "../../../api/axios";

export default function PersonalInfoForm({ data, onUpdate }) {
  const personalInfo = data?.personalInfo || {};
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleChange = (field, value) => {
    onUpdate("personalInfo", { ...personalInfo, [field]: value });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size must be less than 5MB");
      return;
    }
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Only image files are allowed");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const response = await api.post("/upload/profile-photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      handleChange("profilePhoto", response.data.url);
    } catch (error) {
      setUploadError(error.response?.data?.error || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = () => {
    handleChange("profilePhoto", "");
  };
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">
        Personal Information
      </h2>

      {/* Profile Photo Upload Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Profile Photo
        </label>
        <div className="flex items-center gap-4">
          {personalInfo.profilePhoto ? (
            <div className="relative">
              <img
                src={personalInfo.profilePhoto}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-2 border-slate-300"
              />
              <button
                onClick={removePhoto}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
              <Upload className="w-8 h-8 text-slate-400" />
            </div>
          )}

          <div className="flex-1">
            <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photo
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
            <p className="text-xs text-slate-500 mt-2">
              Max size: 5MB. Formats: JPG, PNG, GIF
            </p>
            {uploadError && (
              <p className="text-xs text-red-600 mt-1">{uploadError}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            First Name
          </label>
          <input
            type="text"
            value={personalInfo.firstName || ""}
            onChange={(e) => handleChange("firstName", e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="John"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Last Name
          </label>
          <input
            type="text"
            value={personalInfo.lastName || ""}
            onChange={(e) => handleChange("lastName", e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Doe"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={personalInfo.email || ""}
            onChange={(e) => handleChange("email", e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="john@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Phone
          </label>
          <input
            type="tel"
            value={personalInfo.phone || ""}
            onChange={(e) => handleChange("phone", e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="+1234567890"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            LinkedIn
          </label>
          <input
            type="url"
            value={personalInfo.linkedin || ""}
            onChange={(e) => handleChange("linkedin", e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://linkedin.com/in/johndoe"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Address
          </label>
          <input
            type="text"
            value={personalInfo.address || ""}
            onChange={(e) => handleChange("address", e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="City, Country"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            About Me
          </label>
          <textarea
            value={personalInfo.aboutMe || ""}
            onChange={(e) => handleChange("aboutMe", e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Brief introduction about yourself..."
          />
        </div>
      </div>
    </div>
  );
}
