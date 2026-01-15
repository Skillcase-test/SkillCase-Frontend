import { useState, useEffect } from "react";

import { X, CheckCircle } from "lucide-react";

import { useSelector } from "react-redux";

import api from "../../../api/axios.js";

export default function RegistrationModal({
  event,
  isOpen,
  onClose,
  onSuccess,
  instanceDate,
}) {
  const { user } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [phoneError, setPhoneError] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.username || "",
        email: "",
        phone: user.number || "",
      });
    }
  }, [user]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSuccess(false);
      setError(null);
      setPhoneError(null);
    }
  }, [isOpen]);

  if (!isOpen || !event) return null;

  const validatePhone = (phone) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      return "Phone number must be exactly 10 digits";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setPhoneError(null);

    // Validate phone
    const phoneValidationError = validatePhone(formData.phone);
    if (phoneValidationError) {
      setPhoneError(phoneValidationError);
      return;
    }

    setLoading(true);

    try {
      await api.post(`/events/${event.slug}/register`, {
        ...formData,
        instance_date: instanceDate || null,
      });
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.msg || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (e) => {
    // Only allow digits, max 10
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);

    setFormData({ ...formData, phone: value });

    if (phoneError) setPhoneError(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Format instanceDate for display
  const eventDateDisplay = instanceDate
    ? new Date(instanceDate).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-[450px] w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
        >
          <X size={20} />
        </button>
        {!success ? (
          <>
            <h2 className="text-xl font-bold text-[#163B72] mb-1">
              Register for Event
            </h2>
            <p className="text-sm text-gray-600 mb-1">{event.title}</p>
            {eventDateDisplay && (
              <p className="text-sm text-[#163B72] font-medium mb-4">
                {eventDateDisplay}
              </p>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163B72]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163B72]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number * (10 digits)
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 py-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-600 text-sm">
                    +91
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    required
                    maxLength={10}
                    pattern="[0-9]{10}"
                    inputMode="numeric"
                    placeholder="9876543210"
                    className={`w-full px-4 py-3 border rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[#163B72] ${
                      phoneError ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                </div>
                {phoneError && (
                  <p className="text-red-600 text-sm mt-1">{phoneError}</p>
                )}
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#163B72] text-white py-3 rounded-lg font-semibold hover:bg-[#0f2d5a] transition disabled:opacity-50"
              >
                {loading ? "Registering..." : "Register"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-6">
            <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">
              Registration Successful!
            </h2>
            <p className="text-gray-600 mb-4">
              Check your email and WhatsApp for the meeting link and details.
            </p>
            <button
              onClick={onClose}
              className="bg-[#163B72] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#0f2d5a] transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
