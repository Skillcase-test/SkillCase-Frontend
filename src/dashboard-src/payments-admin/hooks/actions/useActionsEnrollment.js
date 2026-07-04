import { paymentsAdminApi } from "../../../../api/paymentsAdminApi";

export function useActionsEnrollment(state) {
  const {
    setError,
    setNotice,
    setSavingEnrollmentId,
    setSendingAgreementEnrollmentId,
    setCopyLinkModal,
    loadTabData,
    editDraft,
    setEditDraft,
  } = state;

  async function handleFinalize(row) {
    const enrollmentId = row?.enrollment_id;
    if (!enrollmentId) return;

    const agreementState = String(row?.agreement_state || "not_sent");
    const agreementSent = agreementState !== "not_sent";
    if (!agreementSent) {
      const confirmed = window.confirm(
        "This candidate has not been sent the agreement yet. Are you sure you want to finalize?",
      );
      if (!confirmed) return;
    }

    const notesObj = (row?.notes && typeof row.notes === "object") ? row.notes : {};
    const fullCandidate = {
      ...row,
      ...notesObj,
    };

    const requiredChecks = [
      { key: "student_name", label: "Name" },
      { key: "student_phone", label: "Phone Number" },
      { key: "student_email", label: "Email" },
      { key: "batch_id", label: "Batch" },
      { key: "dob", label: "DOB" },
      { key: "gender", label: "Gender" },
      { key: "nationality", label: "Nationality" },
      { key: "current_location_city", label: "Current Location" },
      { key: "state", label: "State" },
      { key: "educational_qualification", label: "Educational Qualification" },
      { key: "terms_ack_status", label: "Terms Acknowledgement" },
    ];

    const missing = requiredChecks
      .filter((x) => !String(fullCandidate?.[x.key] ?? "").trim())
      .map((x) => x.label);

    if (missing.length) {
      setError(`Cannot finalize. Please fill required fields in Details: ${missing.join(", ")}`);
      return;
    }

    setSavingEnrollmentId(enrollmentId);
    try {
      const res = await paymentsAdminApi.finalizeEnrollment(enrollmentId);
      const warning = res?.data?.candidate_id_warning;
      if (warning) {
        setNotice?.(`Finalized. ${warning}`);
      }
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Finalize failed");
    } finally {
      setSavingEnrollmentId("");
    }
  }

  async function handleDeleteCandidate(enrollmentId) {
    setSavingEnrollmentId(enrollmentId);
    try {
      await paymentsAdminApi.deleteEnrollment(enrollmentId);
      setNotice?.("Candidate deleted successfully.");
      setEditDraft(null);
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Delete failed");
    } finally {
      setSavingEnrollmentId("");
    }
  }

  async function handleSaveEnrollmentEdit() {
    if (!editDraft) return;
    const requiredChecks = [
      { key: "student_name", label: "Name" },
      { key: "student_phone", label: "Phone Number" },
      { key: "student_email", label: "Email" },
    ];
    const missing = requiredChecks
      .filter((x) => !String(editDraft?.[x.key] ?? "").trim())
      .map((x) => x.label);
    if (missing.length) {
      setError(`Please fill required fields: ${missing.join(", ")}`);
      return;
    }
    const expectedRows = Array.isArray(editDraft.expected_payments)
      ? editDraft.expected_payments
      : [];
    const invalidExpected = expectedRows.some((row) => {
      const expectedDate = String(row.expected_date || row.date || "").slice(0, 10);
      const actualDate = String(row.actual_date || row.date || "").slice(0, 10);
      const expectedRaw = row.expected_payment_inr ?? row.expected_amount_inr ?? "";
      const actualRaw = row.actual_payment_inr ?? "";
      const hasExpected = String(expectedRaw).trim() !== "" && Number(expectedRaw) !== 0;
      const hasActual = String(actualRaw).trim() !== "" && Number(actualRaw) !== 0;
      const expected = Number(expectedRaw || 0);
      const actual = Number(actualRaw || 0);
      return (
        (hasExpected && !expectedDate) ||
        (hasActual && !actualDate) ||
        (hasExpected && (!Number.isFinite(expected) || expected < 0)) ||
        (hasActual && (!Number.isFinite(actual) || actual < 0))
      );
    });
    if (invalidExpected) {
      setError("Payment rows need valid expected/actual dates and non-negative amounts.");
      return;
    }
    const savingKey = editDraft.enrollment_id || "manual-create";
    setSavingEnrollmentId(savingKey);
    const payload = {
      student_name: editDraft.student_name,
      student_email: editDraft.student_email,
      student_phone: editDraft.student_phone,
      batch_id: editDraft.batch_id || null,
      notes: editDraft.notes || "",
      status: editDraft.status,
      expected_payment_start_date: editDraft.expected_payment_start_date || "",
      created_at: editDraft.created_at || undefined,
      enforce_profile_validation: false,
      notify_discord: true,
      candidate_id: editDraft.candidate_id || "",
      total_fee_inr: editDraft.total_fee_inr || "",
      monthly_fee_inr: editDraft.monthly_fee_inr || "",
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
      expected_payments: expectedRows.map((row) => ({
        schedule_id: row.schedule_id || undefined,
        payment_id: row.payment_id || undefined,
        manual_payment_id: row.manual_payment_id || undefined,
        manual_payment_key: row.manual_payment_key || undefined,
        expected_date: String(row.expected_date || row.date || "").slice(0, 10),
        actual_date: String(row.actual_date || row.date || "").slice(0, 10),
        expected_payment_inr: Number(row.expected_payment_inr ?? row.expected_amount_inr ?? 0),
        actual_payment_inr: row.actual_payment_inr === "" || row.actual_payment_inr == null
          ? undefined
          : Number(row.actual_payment_inr),
        actual_payment_touched: Boolean(row.actual_payment_touched),
        row_kind: row.row_kind || undefined,
        notes: row.notes || "",
        source_type: row.source_type || "admin",
      })),
    };
    try {
      if (editDraft.is_manual_create || !editDraft.enrollment_id) {
        await paymentsAdminApi.createManualEnrollment(payload);
        setNotice?.("Manual candidate created as pending.");
      } else {
        await paymentsAdminApi.updateEnrollment(editDraft.enrollment_id, payload);
        setNotice?.("Candidate details saved.");
      }
      setEditDraft(null);
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Save failed");
    } finally {
      setSavingEnrollmentId("");
    }
  }

  function handleStartManualCandidate() {
    setError("");
    setNotice?.("");
    setEditDraft({
      is_manual_create: true,
      status: "pending",
      student_name: "",
      student_phone: "",
      student_email: "",
      batch_id: "",
      candidate_id: "",
      alternate_number: "-",
      dob: "",
      gender: "",
      nationality: "-",
      current_location_city: "-",
      state: "",
      educational_qualification: "",
      year_of_passing: "",
      shift_pattern: "",
      first_shift_timing: "-",
      second_shift_timing: "-",
      third_shift_timing: "-",
      daily_shift_timing: "-",
      passport_gdrive_link: "",
      degree_certificate_gdrive_link: "",
      updated_resume_gdrive_link: "",
      terms_ack_status: "",
      lead_owner: "-",
      internal_remark: "-",
      total_fee_inr: 60000,
      monthly_fee_inr: 6000,
      expected_payments: [],
    });
  }

  async function handleSendAgreement(row) {
    const enrollmentId = row?.enrollment_id;
    if (!enrollmentId) return;
    const email = String(row?.student_email || "").trim();
    if (!email) {
      setError("candidate email is required before sending agreement");
      return;
    }
    if (/@razorpay/i.test(email)) {
      setError("Cannot send agreements to razorpay email addresses. A valid candidate email is required.");
      return;
    }
    if (String(row?.student_name || "").trim().startsWith("#")) {
      setError("Cannot send agreements to candidates with placeholder names starting with '#'. Please update the candidate name first.");
      return;
    }
    const confirmed = window.confirm(
      `Send agreement to ${row.student_name || "this candidate"} at ${row.student_email}?`,
    );
    if (!confirmed) return;
    setError("");
    setNotice?.("");
    setSendingAgreementEnrollmentId?.(enrollmentId);
    try {
      const res = await paymentsAdminApi.sendAgreement(enrollmentId);
      const signingUrl = res.data?.envelope?.signing_url;
      if (signingUrl) {
        try {
          await navigator.clipboard.writeText(signingUrl);
          setNotice?.("Agreement link copied to clipboard!");
        } catch (clipErr) {
          console.error("Clipboard copy failed:", clipErr);
        }
        setCopyLinkModal?.({
          open: true,
          url: signingUrl,
          studentName: row.student_name || "Candidate",
        });
      } else {
        setNotice?.(`Agreement sent to ${row.student_email}.`);
      }
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Agreement send failed");
    } finally {
      setSendingAgreementEnrollmentId?.("");
    }
  }

  async function handleTagRecruitment(enrollmentId, studentName) {
    if (!enrollmentId) return;
    const confirmed = window.confirm(
      `Are you sure you want to tag candidate "${studentName || ""}" as Recruitment? This will move them to the Recruitment View.`,
    );
    if (!confirmed) return;
    setError("");
    setNotice?.("");
    setSavingEnrollmentId(enrollmentId);
    try {
      await paymentsAdminApi.updateEnrollment(enrollmentId, {
        candidate_type: "recruitment",
      });
      setNotice?.(`Candidate "${studentName || ""}" tagged as Recruitment successfully.`);
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Tag recruitment failed");
    } finally {
      setSavingEnrollmentId("");
    }
  }

  return {
    handleFinalize,
    handleDeleteCandidate,
    handleSaveEnrollmentEdit,
    handleStartManualCandidate,
    handleSendAgreement,
    handleTagRecruitment,
  };
}
