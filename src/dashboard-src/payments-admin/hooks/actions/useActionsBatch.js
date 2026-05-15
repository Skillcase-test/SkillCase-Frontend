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

  async function handleHold(enrollmentId) {
    try {
      await paymentsAdminApi.holdEnrollment(enrollmentId, {
        hold_start_year: year,
        hold_start_month: month,
      });
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to set hold");
    }
  }

  async function handleUnhold(enrollmentId) {
    try {
      await paymentsAdminApi.unholdEnrollment(enrollmentId, {
        resume_year: year,
        resume_month: month,
      });
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to end hold");
    }
  }

  async function handleDrop(enrollmentId) {
    if (!window.confirm("Drop this student from current month onward?")) return;
    try {
      await paymentsAdminApi.dropEnrollment(enrollmentId, {
        dropped_from_year: year,
        dropped_from_month: month,
      });
      await loadTabData();
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to drop student");
    }
  }

  return {
    handleCreateBatch,
    handleUpdateBatch,
    handleDeleteBatch,
    handleChangeCandidateBatch,
    handleHold,
    handleUnhold,
    handleDrop,
  };
}
