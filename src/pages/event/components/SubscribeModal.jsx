import { useState } from "react";

import { X, Bell, CheckCircle } from "lucide-react";

import api from "../../../api/axios.js";

export default function SubscribeModal({ isOpen, onClose }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/events/subscribe", { email });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setEmail("");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.msg || "Subscription failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl max-w-md w-full p-6 relative"
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
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[#EDB843] rounded-full flex items-center justify-center">
                  <Bell className="text-[#163B72]" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#163B72]">
                    Subscribe to Events
                  </h2>
                  <p className="text-sm text-gray-600">
                    Get notified about new events
                  </p>
                </div>
              </div>
              <form onSubmit={handleSubmit}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-[#163B72]"
                />
                {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#163B72] text-white py-3 rounded-lg font-semibold hover:bg-[#0f2d5a] transition disabled:opacity-50"
                >
                  {loading ? "Subscribing..." : "Subscribe"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-[#163B72]">Subscribed!</h2>
              <p className="text-gray-600">
                You'll receive notifications for new events.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
