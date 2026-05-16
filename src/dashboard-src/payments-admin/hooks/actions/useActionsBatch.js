import { paymentsAdminApi } from "../../../../api/paymentsAdminApi";

export function useActionsBatch(state) {
  const {
    batchForm,
    setBatchForm,
    refreshBatches,
    setError,
    loadTabData,
    year,
    month,
    lifecycleModal,
    setLifecycleModal,
    setUpdatingBatchEnrollmentId,
  } = state;

  async function handleCreateBatch() {
    if (!batchForm.name.trim()) return;
    try {
      await paymentsAdminApi.createBatch({
        batch_name: batchForm.name.trim(),
        description: batchForm.description.trim(),
      });
      setBatchForm({ name: "", description: "" });
      await refreshBatches();
    } catch (err) {
      setError(err?.response?.data?.msg || "Create batch failed");
    }
  }

  async function handleUpdateBatch(batch) {
    const name = window.prompt("Update batch name", batch.batch_name);
    if (!name) return;
    try {
      await paymentsAdminApi.updateBatch(batch.batch_id, {
        batch_name: name,
        description: batch.description || "",
      });
      await refreshBatches();
    } catch (err) {
      setError(err?.response?.data?.msg || "Update batch failed");
    }
  }

  async function handleDeleteBatch(batchId) {
    if (!window.confirm("Delete this batch?")) return;
    try {
      await paymentsAdminApi.deleteBatch(batchId);
      await refreshBatches();
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Delete batch failed");
    }
  }

  async function handleChangeCandidateBatch(enrollmentId, batchId) {
    setUpdatingBatchEnrollmentId(enrollmentId);
    try {
      await paymentsAdminApi.updateEnrollment(enrollmentId, {
        batch_id: batchId || null,
      });
      await loadTabData();
      await refreshBatches();
    } catch (err) {
      setError(err?.response?.data?.msg || "Batch update failed");
    } finally {
      setUpdatingBatchEnrollmentId("");
    }
  }

  function openLifecycleModal(action, row) {
    setLifecycleModal({
      open: true,
      action,
      enrollmentId: row.enrollment_id,
      year,
      month,
      studentName: row.student_name || "Candidate",
    });
  }

  async function handleLifecycleSubmit() {
    const enrollmentId = lifecycleModal?.enrollmentId;
    const action = lifecycleModal?.action;
    if (!enrollmentId || !action) return;
    const selectedYear = Number(lifecycleModal.year || year);
    const selectedMonth = Number(lifecycleModal.month || month);
    try {
      if (action === "hold") {
        await paymentsAdminApi.holdEnrollment(enrollmentId, {
          hold_start_year: selectedYear,
          hold_start_month: selectedMonth,
        });
      } else if (action === "unhold") {
        await paymentsAdminApi.unholdEnrollment(enrollmentId, {
          resume_year: selectedYear,
          resume_month: selectedMonth,
        });
      } else if (action === "drop") {
        await paymentsAdminApi.dropEnrollment(enrollmentId, {
          dropped_from_year: selectedYear,
          dropped_from_month: selectedMonth,
        });
      } else if (action === "undrop") {
        await paymentsAdminApi.undropEnrollment(enrollmentId, {
          undropped_from_year: selectedYear,
          undropped_from_month: selectedMonth,
        });
      }
      setLifecycleModal((prev) => ({ ...prev, open: false }));
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed lifecycle update");
    }
  }

  return {
    handleCreateBatch,
    handleUpdateBatch,
    handleDeleteBatch,
    handleChangeCandidateBatch,
    openLifecycleModal,
    handleLifecycleSubmit,
  };
}
