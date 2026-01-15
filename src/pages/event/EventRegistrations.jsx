import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import api from "../../api/axios.js";

import { Download, ArrowLeft } from "lucide-react";

export default function EventRegistrations() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { event_id } = useParams();

  const navigate = useNavigate();

  useEffect(() => {
    fetchRegistrations();
  }, [event_id]);

  const fetchRegistrations = async () => {
    try {
      const res = await api.get(`/admin/events/${event_id}/registrations`);
      setRegistrations(res.data.registrations || []);
    } catch (err) {
      console.error("Error fetching registrations:", err);
      alert("Failed to load registrations");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Registered At",
      "Confirmation Sent",
      "User ID",
    ];

    const rows = registrations.map((reg) => [
      reg.name,
      reg.email,
      reg.phone,
      new Date(reg.registered_at).toLocaleString(),
      reg.confirmation_sent ? "Yes" : "No",
      reg.user_id || "Guest",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `event-${event_id}-registrations.csv`;
    a.click();
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  const eventTitle = registrations[0]?.event_title || "Event";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[#004E92]">
              Event Registrations
            </h1>
            <p className="text-gray-600 mt-1">{eventTitle}</p>
          </div>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition shadow-md"
        >
          <Download size={20} />
          Export CSV
        </button>
      </div>

      {/* Registrations Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                Name
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                Email
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                Phone
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                Registered At
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                Confirmed
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                User ID
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {registrations.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  No registrations yet
                </td>
              </tr>
            ) : (
              registrations.map((reg) => (
                <tr
                  key={reg.registration_id}
                  className="hover:bg-gray-50 transition"
                >
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {reg.name}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{reg.email}</td>
                  <td className="px-6 py-4 text-gray-600">{reg.phone}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(reg.registered_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        reg.confirmation_sent
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {reg.confirmation_sent ? "✅ Yes" : "❌ No"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {reg.user_id || (
                      <span className="text-gray-400">Guest</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Total Registrations:</strong> {registrations.length}
        </p>
      </div>
    </div>
  );
}
