import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import api from "../../api/axios.js";

export default function FeaturedEventPage() {
  const [event, setEvent] = useState(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const { user } = useSelector((state) => state.auth);

  const navigate = useNavigate();

  useEffect(() => {
    fetchFeaturedEvent();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.username || "",
        email: "",
        phone: user.number || "",
      });
    }
  }, [user]);

  const fetchFeaturedEvent = async () => {
    try {
      setLoading(true);
      const res = await api.get("/events/featured");
      setEvent(res.data.event);
    } catch (err) {
      if (err.response?.status === 404) {
        setEvent(null);
      } else {
        setError("Failed to load event");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/events/${event.slug}/register`, formData);
      setRegistered(true);
    } catch (err) {
      setError(
        err.response?.data?.msg || "Registration failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center text-xl">Loading featured event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            No Featured Event
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            There's no featured event at the moment.
          </p>
          <button
            onClick={() => navigate("/events")}
            className="bg-[#163B72] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#0f2d5a] transition"
          >
            Browse All Events
          </button>
        </div>
      </div>
    );
  }

  const eventDate = event.start_datetime
    ? new Date(event.start_datetime).toLocaleString("en-IN", {
        timeZone: event.timezone || "Asia/Kolkata",
        dateStyle: "full",
        timeStyle: "short",
      })
    : "Date TBA";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Featured Badge */}
      <div className="inline-block bg-[#EDB843] text-[#163B72] px-5 py-2 rounded-full font-bold mb-6">
        ⭐ Featured Event
      </div>

      {/* Cover Image */}
      {event.cover_image_url && (
        <div className="w-full max-h-96 rounded-xl overflow-hidden mb-8">
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold text-[#163B72]">
          {event.title}
        </h1>
        <p className="text-xl text-gray-600">📅 {eventDate}</p>
        <div className="text-lg leading-relaxed text-gray-700">
          {event.description || "Join us for this exciting workshop!"}
        </div>

        {/* Registration Section */}
        {!registered ? (
          <div className="bg-gray-50 p-8 rounded-xl">
            <h3 className="text-2xl font-bold text-[#163B72] mb-6">
              Register Now
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#163B72] mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163B72]"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#163B72] mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163B72]"
                  placeholder="your.email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#163B72] mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163B72]"
                  placeholder="+91 XXXXXXXXXX"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#163B72] text-white px-6 py-4 rounded-lg text-lg font-semibold hover:bg-[#0f2d5a] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Registering..." : "Register for Event"}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 p-8 rounded-xl text-center">
            <h2 className="text-2xl font-bold text-green-700 mb-4">
              ✅ Registration Successful!
            </h2>
            <p className="text-lg mb-2">
              You're registered for <strong>{event.title}</strong>
            </p>
            <p className="text-gray-600 mb-6">
              Check your email for the meeting link and calendar invite.
            </p>
            <a
              href={event.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-[#EDB843] text-[#163B72] px-6 py-3 rounded-lg font-bold hover:bg-[#d9a63a] transition"
            >
              Join Google Meet
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
