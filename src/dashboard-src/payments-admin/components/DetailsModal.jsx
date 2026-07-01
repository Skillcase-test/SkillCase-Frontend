import { useState, useEffect } from "react";
import { paymentsAdminApi } from "../../../api/paymentsAdminApi";
import { CONTROL_BASE, ControlButton, ControlSelect } from "./controls";

/** @param {{editDraft:any,setEditDraft:Function,batches:any[],handleSaveEnrollmentEdit:Function,savingEnrollmentId:string}} props */
export function DetailsModal({
  editDraft,
  setEditDraft,
  batches,
  handleSaveEnrollmentEdit,
  savingEnrollmentId,
}) {
  const [selfieUrl, setSelfieUrl] = useState("");

  useEffect(() => {
    if (editDraft?.selfie_key) {
      paymentsAdminApi
        .getPaymentDocumentDownloadUrl(editDraft.selfie_key)
        .then((res) => {
          if (res.data?.downloadUrl) {
            setSelfieUrl(res.data.downloadUrl);
          }
        })
        .catch((err) => {
          console.error("Failed to load selfie url:", err);
        });
    } else {
      setSelfieUrl("");
    }
  }, [editDraft?.selfie_key]);

  if (!editDraft) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            {selfieUrl ? (
              <img
                src={selfieUrl}
                alt="Selfie"
                className="h-12 w-full max-w-[48px] rounded-full border border-slate-200 object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Candidate Details / Edit
              </h3>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Profile picture (selfie) uploaded via details form
              </span>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {editDraft.student_phone || "No phone"}
          </span>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          {[
            ["student_name", "Name"],
            ["student_phone", "Phone"],
            ["student_email", "Email"],
            ["candidate_id", "Candidate ID"],
            ["total_fee_inr", "Total Amount (INR)"],
            ["monthly_fee_inr", "Monthly Amount (INR)"],
            ["alternate_number", "Alternate Number"],
            ["nationality", "Nationality"],
            ["current_location_city", "Current Location (City)"],
            ["state", "State"],
            ["educational_qualification", "Educational Qualification"],
            ["year_of_passing", "Year of Passing"],
            ["shift_pattern", "Shift Pattern"],
            ["first_shift_timing", "First Shift Timing"],
            ["second_shift_timing", "Second Shift Timing"],
            ["third_shift_timing", "Third Shift Timing"],
            ["daily_shift_timing", "Daily Shift Timing"],
            ["passport_gdrive_link", "Passport (GDrive Link)"],
            [
              "degree_certificate_gdrive_link",
              "Degree Certificate (GDrive Link)",
            ],
            ["updated_resume_gdrive_link", "Updated Resume (GDrive Link)"],
            ["lead_owner", "Lead Owner"],
          ].map(([key, label]) => (
            <input
              key={key}
              value={editDraft[key] || ""}
              onChange={(e) =>
                setEditDraft((p) => ({ ...p, [key]: e.target.value }))
              }
              placeholder={label}
              className={CONTROL_BASE}
            />
          ))}

          <select
            value={editDraft.batch_id || ""}
            onChange={(e) =>
              setEditDraft((p) => ({ ...p, batch_id: e.target.value || null }))
            }
            className={CONTROL_BASE}
          >
            <option value="">No batch</option>
            {batches.map((b) => (
              <option key={b.batch_id} value={b.batch_id}>
                {b.batch_name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={editDraft.dob || ""}
            onChange={(e) =>
              setEditDraft((p) => ({ ...p, dob: e.target.value }))
            }
            className={CONTROL_BASE}
          />

          <ControlSelect
            value={editDraft.gender || ""}
            onChange={(e) =>
              setEditDraft((p) => ({ ...p, gender: e.target.value }))
            }
            className="w-full"
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </ControlSelect>

          <select
            value={editDraft.terms_ack_status || ""}
            onChange={(e) =>
              setEditDraft((p) => ({ ...p, terms_ack_status: e.target.value }))
            }
            className={CONTROL_BASE}
          >
            <option value="">Terms Acknowledgement</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="have_doubts">I have doubts</option>
          </select>
        </div>
        <div className="mt-4 flex gap-2">
          <ControlButton
            onClick={handleSaveEnrollmentEdit}
            disabled={savingEnrollmentId === editDraft.enrollment_id}
            variant="primary"
            className="h-10 px-4 text-xs"
          >
            Save Details
          </ControlButton>
          <ControlButton
            onClick={() => setEditDraft(null)}
            variant="secondary"
            className="h-10 px-4 text-xs"
          >
            Close
          </ControlButton>
        </div>
      </div>
    </div>
  );
}
