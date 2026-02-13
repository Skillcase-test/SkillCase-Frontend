import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setUser } from "../redux/auth/authSlice";
import api from "../api/axios";

const DEFAULT_AVATAR = (
  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
    <circle cx="50" cy="50" r="50" fill="#D1D5DB" />
    <circle cx="50" cy="38" r="16" fill="#9CA3AF" />
    <ellipse cx="50" cy="78" rx="28" ry="20" fill="#9CA3AF" />
  </svg>
);

const QUALIFICATION_OPTIONS = [
  { value: "", label: "Select your Qualification" },
  { value: "GNM Nursing", label: "GNM Nursing" },
  { value: "BSc Nursing", label: "BSc Nursing" },
  { value: "Post Basic BSc Nursing", label: "Post Basic BSc Nursing" },
  { value: "MSc Nursing", label: "MSc Nursing" },
  { value: "ANM Nursing", label: "ANM Nursing" },
  { value: "Physiotherapist", label: "Physiotherapist" },
  { value: "Doctors", label: "Doctors" },
  { value: "Pharmacists", label: "Pharmacists" },
  { value: "Dentists", label: "Dentists" },
  { value: "Others", label: "Others" },
];

const LANGUAGE_LEVEL_OPTIONS = [
  { value: "", label: "Select your Language" },
  { value: "Yet to Start Learning", label: "Yet to Start Learning" },
  { value: "A1 Completed", label: "A1 Completed" },
  { value: "A2 Completed", label: "A2 Completed" },
  { value: "B1 – in progress", label: "B1 – in progress" },
  { value: "B1 Completed", label: "B1 Completed" },
  { value: "B2 – in progress", label: "B2 – in progress" },
  { value: "B2 Completed", label: "B2 Completed" },
];

const EXPERIENCE_OPTIONS = [
  { value: "", label: "Select your Experience" },
  { value: "Fresher", label: "Fresher" },
  { value: "Less than 1 year", label: "Less than 1 year" },
  { value: "1-2 years", label: "1-2 years" },
  { value: "2-3 years", label: "2-3 years" },
  { value: "3-5 years", label: "3-5 years" },
  { value: "5-10 years", label: "5-10 years" },
  { value: "10+ years", label: "10+ years" },
];

export default function ProfilePage() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    fullname: "",
    email: "",
    dob: "",
    gender: "",
    qualification: "",
    language_level: "",
    experience: "",
  });

  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [isProfileOpen, setIsProfileOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileStatus, setProfileStatus] = useState(0);
  const [toast, setToast] = useState({ show: false, msg: "", type: "" });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchProfile();
  }, [isAuthenticated]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get("/user/profile");
      const p = res.data.profile;
      setForm({
        fullname: p.fullname || "",
        email: p.email || "",
        dob: p.dob ? p.dob.split("T")[0] : "",
        gender: p.gender || "",
        qualification: p.qualification || "",
        language_level: p.language_level || "",
        experience: p.experience || "",
      });
      setProfilePicUrl(p.profile_pic_url || "");
      setPhoneNumber(p.number || "");
      setCountryCode(p.countrycode || "+91");
      setProfileStatus(p.status || 0);
    } catch (err) {
      console.error("Error fetching profile:", err);
      showToast("Failed to load profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.fullname.trim()) {
      showToast("Full name is required", "error");
      return;
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      showToast("Please enter a valid email address", "error");
      return;
    }

    try {
      setSaving(true);
      const res = await api.put("/user/profile", form);
      const updatedProfile = res.data.profile;
      setProfileStatus(updatedProfile.status || 0);

      // Update Redux user state so navbar reflects changes
      dispatch(
        setUser({
          ...user,
          fullname: updatedProfile.fullname,
          profile_pic_url: updatedProfile.profile_pic_url,
        }),
      );

      showToast("Profile updated successfully", "success");
    } catch (err) {
      const errMsg = err.response?.data?.msg || "Failed to update profile";
      showToast(errMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be less than 5MB", "error");
      return;
    }

    const formData = new FormData();
    formData.append("photo", file);

    try {
      setUploading(true);
      const res = await api.post("/upload/user-profile-photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        setProfilePicUrl(res.data.url);
        // Update Redux so navbar updates immediately
        dispatch(setUser({ ...user, profile_pic_url: res.data.url }));
        showToast("Profile photo updated", "success");
      }
    } catch (err) {
      showToast("Failed to upload photo", "error");
    } finally {
      setUploading(false);
    }
  };

  const showToast = (msg, type) => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: "", type: "" }), 3000);
  };

  const displayName = form.fullname || user?.username || "User";
  const displayEmail = form.email || "";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-3 border-[#002856] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${
            toast.type === "success" ? "bg-[#019035]" : "bg-red-500"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white border-b border-[#efefef]">
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full rounded-full overflow-hidden border-2 border-[#e9eaeb] hover:border-[#002856] transition-colors cursor-pointer"
                disabled={uploading}
              >
                {profilePicUrl ? (
                  <img
                    src={profilePicUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  DEFAULT_AVATAR
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
              {!uploading && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full border border-[#d5d7da] flex items-center justify-center shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5 text-[#535862]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />

            {/* Name, Email, Phone */}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#181d27] truncate">
                {displayName}
              </h1>
              {displayEmail && (
                <p className="text-base text-[#535862] truncate">
                  {displayEmail}
                </p>
              )}
              <p className="text-base text-[#535862]">
                {countryCode} {phoneNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form Card */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border border-[#e9eaeb] shadow-sm">
          {/* Card Header */}
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-base font-semibold text-[#181d27]">
                Profile
              </span>

              <span
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                  profileStatus === 1
                    ? "bg-[#cdf5db] text-[#019035]"
                    : "bg-[#ffebbe] text-[#c48b0e]"
                }`}
              >
                {profileStatus === 1 ? "Complete" : "Incomplete"}
              </span>
            </div>
            <svg
              className={`w-5 h-5 text-[#535862] transition-transform duration-200 ${
                isProfileOpen ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Form Fields */}
          {isProfileOpen && (
            <form onSubmit={handleSubmit} className="px-5 pb-6 space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-base font-medium text-[#181d27] mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullname"
                  value={form.fullname}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3.5 rounded-lg border border-[#d5d7da] text-[#181d27] text-base focus:outline-none focus:border-[#002856] focus:ring-1 focus:ring-[#002856] transition-colors"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-base font-medium text-[#181d27] mb-1.5">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dob"
                  value={form.dob}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 rounded-lg border border-[#d5d7da] text-[#181d27] text-base focus:outline-none focus:border-[#002856] focus:ring-1 focus:ring-[#002856] transition-colors"
                />
              </div>

              {/* Phone Number (read-only) */}
              <div>
                <label className="block text-base font-medium text-[#181d27] mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center px-4 py-3.5 rounded-lg border border-[#e9eaeb] bg-[#f5f5f5] text-base text-[#717680]">
                  <span className="flex items-center gap-2 border-r border-[#d5d7da] pr-3 mr-3">
                    <svg viewBox="0 0 36 24" className="w-6 h-4 flex-shrink-0 rounded-sm overflow-hidden">
                      <rect width="36" height="8" fill="#FF9933" />
                      <rect y="8" width="36" height="8" fill="#FFFFFF" />
                      <rect y="16" width="36" height="8" fill="#138808" />
                      <circle cx="18" cy="12" r="2.5" fill="#000080" />
                    </svg>
                    <span className="text-[#414651] font-medium">{countryCode}</span>
                    <svg className="w-3 h-3 text-[#717680]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                  <span className="text-[#414651]">{phoneNumber}</span>
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-base font-medium text-[#181d27] mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3.5 rounded-lg border border-[#d5d7da] text-[#181d27] text-base focus:outline-none focus:border-[#002856] focus:ring-1 focus:ring-[#002856] transition-colors"
                />
              </div>

              {/* Educational Qualification */}
              <div>
                <label className="block text-base font-medium text-[#181d27] mb-1.5">
                  Educational Qualification{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="qualification"
                    value={form.qualification}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 rounded-lg border border-[#d5d7da] text-[#181d27] text-base focus:outline-none focus:border-[#002856] focus:ring-1 focus:ring-[#002856] transition-colors bg-white cursor-pointer appearance-none"
                  >
                    {QUALIFICATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#535862] pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              {/* German Language Proficiency */}
              <div>
                <label className="block text-base font-medium text-[#181d27] mb-1.5">
                  German Language Proficiency{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="language_level"
                    value={form.language_level}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 rounded-lg border border-[#d5d7da] text-[#181d27] text-base focus:outline-none focus:border-[#002856] focus:ring-1 focus:ring-[#002856] transition-colors bg-white cursor-pointer appearance-none"
                  >
                    {LANGUAGE_LEVEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#535862] pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              {/* Work Experience */}
              <div>
                <label className="block text-base font-medium text-[#181d27] mb-1.5">
                  Work Experience <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="experience"
                    value={form.experience}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 rounded-lg border border-[#d5d7da] text-[#181d27] text-base focus:outline-none focus:border-[#002856] focus:ring-1 focus:ring-[#002856] transition-colors bg-white cursor-pointer appearance-none"
                  >
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#535862] pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-base font-medium text-[#181d27] mb-2">
                  Gender <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="Male"
                      checked={form.gender === "Male"}
                      onChange={handleChange}
                      className="w-4 h-4 accent-[#c4320a]"
                    />
                    <span className="text-base text-[#181d27]">Male</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="Female"
                      checked={form.gender === "Female"}
                      onChange={handleChange}
                      className="w-4 h-4 accent-[#c4320a]"
                    />
                    <span className="text-base text-[#181d27]">Female</span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 rounded-lg bg-[#002856] text-white font-bold text-base hover:bg-[#003d83] transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {saving ? "Updating..." : "Update Details"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
