import { paymentsAdminApi } from "../../../../api/paymentsAdminApi";

export function useActionsEnrollment(state) {
  const {
    SESSION_UNLOCK_KEY,
    password,
    setPassword,
    setAuthorized,
    setError,
    setSavingEnrollmentId,
    loadTabData,
    editDraft,
    setEditDraft,
  } = state;

  async function handleStepUp() {
    setError("");
    try {
      await paymentsAdminApi.verifyStepUp(password);
      setAuthorized(true);
      try {
        sessionStorage.setItem(SESSION_UNLOCK_KEY, "1");
      } catch {
        // ignore storage errors
      }
      setPassword("");
    } catch (err) {
      setError(err?.response?.data?.msg || "Invalid password");
    }
  }

  async function handleFinalize(enrollmentId) {
    setSavingEnrollmentId(enrollmentId);
    try {
      await paymentsAdminApi.finalizeEnrollment(enrollmentId);
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Finalize failed");
    } finally {
      setSavingEnrollmentId("");
    }
  }

  async function handleReject(enrollmentId) {
    setSavingEnrollmentId(enrollmentId);
    try {
      await paymentsAdminApi.rejectEnrollment(enrollmentId);
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Reject failed");
    } finally {
      setSavingEnrollmentId("");
    }
  }

  async function handleSaveEnrollmentEdit() {
    if (!editDraft?.enrollment_id) return;
    const requiredChecks = [
      { key: "student_name", label: "Name" },
      { key: "student_phone", label: "Phone Number" },
      { key: "student_email", label: "Email" },
      { key: "batch_id", label: "Batch" },
      { key: "candidate_id", label: "Candidate ID" },
      { key: "dob", label: "DOB" },
      { key: "gender", label: "Gender" },
      { key: "nationality", label: "Nationality" },
      { key: "current_location_city", label: "Current Location" },
      { key: "state", label: "State" },
      { key: "educational_qualification", label: "Educational Qualification" },
      { key: "terms_ack_status", label: "Acknowledgement" },
    ];
    const missing = requiredChecks
      .filter((x) => !String(editDraft?.[x.key] ?? "").trim())
      .map((x) => x.label);
    if (missing.length) {
      setError(`Please fill required fields: ${missing.join(", ")}`);
      return;
    }
    setSavingEnrollmentId(editDraft.enrollment_id);
    try {
      await paymentsAdminApi.updateEnrollment(editDraft.enrollment_id, {
        student_name: editDraft.student_name,
        student_email: editDraft.student_email,
        student_phone: editDraft.student_phone,
        batch_id: editDraft.batch_id || null,
        notes: editDraft.notes || "",
        enforce_profile_validation: true,
        candidate_id: editDraft.candidate_id || "",
        alternate_number: editDraft.alternate_number || "",
        dob: editDraft.dob || "",
        gender: editDraft.gender || "",
        nationality: editDraft.nationality || "",
        current_location_city: editDraft.current_location_city || "",
        state: editDraft.state || "",
        educational_qualification: editDraft.educational_qualification || "",
        year_of_passing: editDraft.year_of_passing || "",
        shift_pattern: editDraft.shift_pattern || "",
        first_shift_timing: editDraft.first_shift_timing || "",
        second_shift_timing: editDraft.second_shift_timing || "",
        third_shift_timing: editDraft.third_shift_timing || "",
        daily_shift_timing: editDraft.daily_shift_timing || "",
        passport_gdrive_link: editDraft.passport_gdrive_link || "",
        degree_certificate_gdrive_link:
          editDraft.degree_certificate_gdrive_link || "",
        updated_resume_gdrive_link: editDraft.updated_resume_gdrive_link || "",
        terms_ack_status: editDraft.terms_ack_status || "",
        lead_owner: editDraft.lead_owner || "",
        internal_remark: editDraft.internal_remark || "",
      });
      setEditDraft(null);
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Save failed");
    } finally {
      setSavingEnrollmentId("");
    }
  }

  return {
    handleStepUp,
    handleFinalize,
    handleReject,
    handleSaveEnrollmentEdit,
  };
}
