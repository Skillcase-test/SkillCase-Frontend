import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { termsApi } from "../../api/termsApi";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Text Area" },
  { value: "date", label: "Date" },
  { value: "checkbox", label: "Checkbox" },
  { value: "signature", label: "Signature" },
  { value: "initials", label: "Initials" },
  { value: "label", label: "Read-only Label" },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalizeField(field, index) {
  return {
    field_id: field.field_id || `tmp-${index}`,
    field_key: String(field.field_key || `field_${index + 1}`),
    field_type: String(field.field_type || "text"),
    label: String(field.label || ""),
    placeholder: String(field.placeholder || ""),
    required: Boolean(field.required),
    page_number: Number(field.page_number || 1),
    x: Number(field.x || 0),
    y: Number(field.y || 0),
    width: Number(field.width || 0.2),
    height: Number(field.height || 0.04),
    field_order: Number(field.field_order ?? index),
    style_json: field.style_json || {},
    config_json: field.config_json || {},
  };
}

function createField(type, pageNumber, index) {
  return {
    field_id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    field_key: `${type}_${index + 1}`,
    field_type: type,
    label: type === "label" ? "Label" : "",
    placeholder: "",
    required: type !== "label",
    page_number: pageNumber,
    x: 0.08,
    y: 0.08,
    width: type === "checkbox" ? 0.06 : type === "signature" ? 0.3 : 0.24,
    height: type === "textarea" ? 0.08 : type === "signature" ? 0.08 : 0.04,
    field_order: index,
    style_json: {},
    config_json: {
      default_value: type === "checkbox" ? false : "",
      default_signature_image_data_url: "",
      locked: false,
    },
  };
}

function sanitizeFieldKey(value, fallback) {
  const normalized = String(value || fallback || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || String(fallback || "field");
}

export default function TermsManager() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [fields, setFields] = useState([]);
  const [envelopes, setEnvelopes] = useState([]);

  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingFields, setSavingFields] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const [viewingEnvelopeId, setViewingEnvelopeId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [docPages, setDocPages] = useState(0);
  const [newFieldType, setNewFieldType] = useState("text");
  const [selectedFieldId, setSelectedFieldId] = useState("");

  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    file: null,
  });
  const [inviteForm, setInviteForm] = useState({
    recipient_email: "",
    recipient_name: "",
    recipient_phone: "",
  });

  const pageRefs = useRef({});
  const viewerRef = useRef(null);
  const [viewerWidth, setViewerWidth] = useState(1200);
  const [dragState, setDragState] = useState(null);
  const [resizeState, setResizeState] = useState(null);

  const selectedField = useMemo(
    () => fields.find((item) => item.field_id === selectedFieldId) || null,
    [fields, selectedFieldId],
  );

  const groupedFields = useMemo(() => {
    const map = new Map();
    fields.forEach((field) => {
      const page = Number(field.page_number || 1);
      if (!map.has(page)) map.set(page, []);
      map.get(page).push(field);
    });
    map.forEach((list) =>
      list.sort(
        (a, b) => Number(a.field_order || 0) - Number(b.field_order || 0),
      ),
    );
    return map;
  }, [fields]);

  const filteredEnvelopes = useMemo(() => {
    if (!searchQuery.trim()) return envelopes;
    const lowerQ = searchQuery.toLowerCase();
    return envelopes.filter((env) => 
      (env.recipient_name || "").toLowerCase().includes(lowerQ) ||
      (env.recipient_email || "").toLowerCase().includes(lowerQ) ||
      (env.recipient_phone || "").toLowerCase().includes(lowerQ) ||
      (env.envelope_id || "").toLowerCase().includes(lowerQ) ||
      (env.document_id || "").toLowerCase().includes(lowerQ)
    );
  }, [envelopes, searchQuery]);

  const renderWidth = useMemo(
    () => clamp(Math.floor(viewerWidth - 40), 400, 750),
    [viewerWidth],
  );

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (!selectedTemplateId) return;
    loadTemplateDetail(selectedTemplateId);
    loadEnvelopes(selectedTemplateId);
  }, [selectedTemplateId]);

  useEffect(() => {
    const node = viewerRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(() => {
      setViewerWidth(node.clientWidth || 1200);
    });
    observer.observe(node);
    setViewerWidth(node.clientWidth || 1200);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!dragState && !resizeState) return undefined;

    const onMove = (event) => {
      const activeState = dragState || resizeState;
      const overlay = pageRefs.current[activeState.pageNumber];
      if (!overlay) return;
      const rect = overlay.getBoundingClientRect();
      const deltaX = (event.clientX - activeState.startClientX) / rect.width;
      const deltaY = (event.clientY - activeState.startClientY) / rect.height;

      setFields((prev) =>
        prev.map((field) => {
          if (field.field_id !== activeState.fieldId) return field;
          if (dragState) {
            return {
              ...field,
              x: clamp(activeState.originX + deltaX, 0, 1 - field.width),
              y: clamp(activeState.originY + deltaY, 0, 1 - field.height),
            };
          }
          return {
            ...field,
            width: clamp(activeState.originWidth + deltaX, 0.04, 1 - field.x),
            height: clamp(activeState.originHeight + deltaY, 0.02, 1 - field.y),
          };
        }),
      );
    };

    const onUp = () => {
      setDragState(null);
      setResizeState(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragState, resizeState]);

  async function loadTemplates() {
    setLoadingTemplates(true);
    try {
      const response = await termsApi.listTemplates();
      const list = response.data?.templates || [];
      setTemplates(list);
      if (!selectedTemplateId && list.length) {
        setSelectedTemplateId(list[0].template_id);
      }
    } catch {
      setErrorMessage("Failed to load templates.");
    } finally {
      setLoadingTemplates(false);
    }
  }

  async function loadTemplateDetail(templateId) {
    setLoadingDetail(true);
    try {
      const response = await termsApi.getTemplateDetail(templateId);
      const template = response.data?.template || null;
      const mappedFields = (response.data?.fields || []).map(normalizeField);
      setSelectedTemplate(template);
      setFields(mappedFields);
      setDocPages(Number(template?.page_count || 0));
      setSelectedFieldId(mappedFields[0]?.field_id || "");
    } catch {
      setErrorMessage("Failed to load template details.");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function loadEnvelopes(templateId) {
    try {
      const response = await termsApi.listEnvelopes({
        template_id: templateId,
      });
      setEnvelopes(response.data?.envelopes || []);
    } catch {
      setEnvelopes([]);
    }
  }

  async function handleCreateTemplate(event) {
    event.preventDefault();
    if (!uploadForm.title.trim() || !uploadForm.file) {
      setErrorMessage("Template title and PDF file are required.");
      return;
    }
    setUploading(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const formData = new FormData();
      formData.append("title", uploadForm.title.trim());
      formData.append("description", uploadForm.description);
      formData.append("file", uploadForm.file);
      const response = await termsApi.createTemplate(formData);
      const templateId = response.data?.template?.template_id;
      await loadTemplates();
      if (templateId) setSelectedTemplateId(templateId);
      setUploadForm({ title: "", description: "", file: null });
      setStatusMessage("Template created.");
    } catch {
      setErrorMessage("Failed to create template.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!selectedTemplateId) return;
    const ok = window.confirm(
      "Delete this template? Templates with sent invites cannot be deleted.",
    );
    if (!ok) return;
    setDeletingTemplate(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      await termsApi.deleteTemplate(selectedTemplateId);
      const currentId = selectedTemplateId;
      const next =
        templates.find((item) => item.template_id !== currentId)?.template_id ||
        "";
      setSelectedTemplateId(next);
      setSelectedTemplate(null);
      setFields([]);
      setDocPages(0);
      setEnvelopes([]);
      await loadTemplates();
      setStatusMessage("Template deleted.");
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.msg || "Failed to delete template.",
      );
    } finally {
      setDeletingTemplate(false);
    }
  }

  function handleAddField(pageNumber) {
    const next = createField(newFieldType, pageNumber, fields.length);
    setFields((prev) => [...prev, next]);
    setSelectedFieldId(next.field_id);
  }

  function handleFieldUpdate(fieldId, patch) {
    setFields((prev) =>
      prev.map((field) =>
        field.field_id === fieldId ? { ...field, ...patch } : field,
      ),
    );
  }

  function handleDeleteField(fieldId) {
    setFields((prev) => prev.filter((field) => field.field_id !== fieldId));
    if (selectedFieldId === fieldId) setSelectedFieldId("");
  }

  function handlePrefillSignatureUpload(fieldId, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) return;
      handleFieldUpdate(fieldId, {
        config_json: {
          ...(fields.find((f) => f.field_id === fieldId)?.config_json || {}),
          default_signature_image_data_url: dataUrl,
        },
      });
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveFields() {
    if (!selectedTemplateId) return;
    setSavingFields(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const seenKeys = new Set();
      const payload = fields.map((field, index) => ({
        ...field,
        field_key: sanitizeFieldKey(
          field.field_key,
          `${field.field_type || "field"}_${index + 1}`,
        ),
        field_order: index,
      }));
      // Duplicate keys are now allowed to support auto-filling identical fields.
      setFields(payload);
      await termsApi.saveTemplateFields(selectedTemplateId, payload);
      setStatusMessage("Field mapping saved.");
      await loadTemplateDetail(selectedTemplateId);
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.msg ||
          error?.message ||
          "Failed to save field mapping.",
      );
    } finally {
      setSavingFields(false);
    }
  }

  async function handleStatusChange(status) {
    if (!selectedTemplateId) return;
    setUpdatingStatus(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      await termsApi.updateTemplateStatus(selectedTemplateId, status);
      await loadTemplates();
      await loadTemplateDetail(selectedTemplateId);
      setStatusMessage(`Template set to ${status}.`);
    } catch {
      setErrorMessage("Failed to update template status.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleSendInvite(event) {
    event.preventDefault();
    if (!selectedTemplateId) return;
    if (!inviteForm.recipient_email.trim()) {
      setErrorMessage("Recipient email is required.");
      return;
    }
    setSendingInvite(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      await termsApi.sendInvite(selectedTemplateId, inviteForm);
      setInviteForm({
        recipient_email: "",
        recipient_name: "",
        recipient_phone: "",
      });
      await loadEnvelopes(selectedTemplateId);
      setStatusMessage("Invite sent.");
    } catch (error) {
      setErrorMessage(error?.response?.data?.msg || "Failed to send invite.");
    } finally {
      setSendingInvite(false);
    }
  }

  async function handleViewSignedPdf(item) {
    if (!item?.envelope_id) return;
    if (item.status !== "signed") {
      setErrorMessage("Signed PDF is available only after the document is signed.");
      return;
    }
    setViewingEnvelopeId(item.envelope_id);
    setErrorMessage("");
    try {
      const response = await termsApi.getEnvelopeDetail(item.envelope_id);
      const signedPdfUrl = response.data?.envelope?.signed_pdf_url || "";
      if (!signedPdfUrl) {
        setErrorMessage("Signed PDF is not available yet.");
        return;
      }
      window.open(signedPdfUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setErrorMessage(error?.response?.data?.msg || "Failed to open signed PDF.");
    } finally {
      setViewingEnvelopeId("");
    }
  }

  const templateStatus = selectedTemplate?.status || "draft";

  // Step 1: List view
  if (!selectedTemplateId) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Templates</h1>
          <p className="mt-2 text-slate-600">
            Manage and create signing templates.
          </p>
        </div>

        {statusMessage ? (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {statusMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Upload/Create PDF Card */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Create Template
            </h2>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <input
                type="text"
                value={uploadForm.title}
                onChange={(e) =>
                  setUploadForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Template title"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <textarea
                rows={4}
                value={uploadForm.description}
                onChange={(e) =>
                  setUploadForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Description (optional)"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <label className="block rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm">
                <span className="mb-2 block font-medium text-slate-900">
                  PDF File
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) =>
                    setUploadForm((prev) => ({
                      ...prev,
                      file: e.target.files?.[0] || null,
                    }))
                  }
                  className="w-full text-sm text-slate-600"
                />
              </label>
              <button
                type="submit"
                disabled={uploading}
                className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {uploading ? "Uploading..." : "Create Template"}
              </button>
            </form>
          </div>

          {/* Templates List */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Templates
            </h2>
            {loadingTemplates ? (
              <p className="text-sm text-slate-500">Loading templates...</p>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <button
                    key={template.template_id}
                    onClick={() => setSelectedTemplateId(template.template_id)}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 p-4 text-left transition hover:bg-white hover:border-slate-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">
                          {template.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {template.source_pdf_filename}
                        </p>
                      </div>
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {template.status}
                      </span>
                    </div>
                  </button>
                ))}
                {!templates.length ? (
                  <p className="text-sm text-slate-500">No templates yet.</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Detail view
  return (
    <div className="p-6">
      {statusMessage ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {statusMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {/* Header with Back Button */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <button
          onClick={() => setSelectedTemplateId("")}
          className="text-sm font-semibold text-slate-900 hover:text-slate-700"
        >
          Back to Templates
        </button>
        <h1 className="flex-1 text-2xl font-bold text-slate-900">
          {selectedTemplate?.title || "Template"}
        </h1>
      </div>

      {loadingDetail ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Loading template details...</p>
        </div>
      ) : (
        <>
          {/* Top Toolbar */}
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
            <button
              onClick={() => handleStatusChange("draft")}
              disabled={updatingStatus || templateStatus === "draft"}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50"
            >
              Draft
            </button>
            <button
              onClick={() => handleStatusChange("published")}
              disabled={updatingStatus || templateStatus === "published"}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
            >
              Publish
            </button>
            <button
              onClick={() => handleStatusChange("archived")}
              disabled={updatingStatus || templateStatus === "archived"}
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              Archive
            </button>
            <button
              onClick={handleDeleteTemplate}
              disabled={deletingTemplate}
              className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-100 disabled:opacity-50"
            >
              {deletingTemplate ? "Deleting..." : "Delete"}
            </button>
            <div className="ml-auto">
              <button
                onClick={handleSaveFields}
                disabled={savingFields}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {savingFields ? "Saving..." : "Save Mapping"}
              </button>
            </div>
          </div>

          {/* Main Grid: PDF Viewer + Side Panel */}
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
            {/* PDF Viewer - Maximum Width */}
            <div
              ref={viewerRef}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                  >
                    {FIELD_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                    Pages: {docPages || selectedTemplate?.page_count || 0}
                  </span>
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                    Fields: {fields.length}
                  </span>
                </div>
              </div>

              {selectedTemplate?.source_pdf_url ? (
                <Document
                  file={selectedTemplate.source_pdf_url}
                  loading={
                    <p className="text-sm text-slate-500">Rendering PDF...</p>
                  }
                  onLoadSuccess={({ numPages }) => setDocPages(numPages)}
                >
                  {Array.from({ length: docPages || 1 }).map((_, index) => {
                    const pageNumber = index + 1;
                    const pageFields = groupedFields.get(pageNumber) || [];
                    return (
                      <div key={pageNumber} className="mb-8">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="text-sm font-semibold text-slate-700">
                            Page {pageNumber}
                          </h3>
                          <button
                            type="button"
                            onClick={() => handleAddField(pageNumber)}
                            className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-100"
                          >
                            Add Field
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <div className="mx-auto w-fit rounded-lg border border-slate-200 bg-white p-3">
                            <div
                              className="relative inline-block overflow-hidden shadow-sm rounded-md border border-slate-200 bg-slate-50"
                              style={{ width: renderWidth }}
                            >
                              <Page
                                pageNumber={pageNumber}
                                width={renderWidth}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                              />
                              <div
                                ref={(node) => {
                                  if (node) pageRefs.current[pageNumber] = node;
                                }}
                                className="absolute inset-0"
                              >
                                {pageFields.map((field) => (
                                  <div
                                    key={field.field_id}
                                    onPointerDown={(event) => {
                                      event.preventDefault();
                                      setSelectedFieldId(field.field_id);
                                      setDragState({
                                        fieldId: field.field_id,
                                        pageNumber,
                                        startClientX: event.clientX,
                                        startClientY: event.clientY,
                                        originX: Number(field.x),
                                        originY: Number(field.y),
                                      });
                                    }}
                                    className={`absolute cursor-move rounded-md border-2 px-1 text-[10px] sm:text-xs font-bold leading-none ${
                                      selectedFieldId === field.field_id
                                        ? "border-slate-900 bg-slate-900 text-white"
                                        : "border-blue-400 bg-blue-100 text-blue-900"
                                    }`}
                                    style={{
                                      left: `${field.x * 100}%`,
                                      top: `${field.y * 100}%`,
                                      width: `${field.width * 100}%`,
                                      height: `${field.height * 100}%`,
                                      display: "flex",
                                      alignItems: "center",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div className="flex w-full items-center justify-between gap-1">
                                      <span className="truncate">
                                        {field.field_key}
                                      </span>
                                      <button
                                        type="button"
                                        onPointerDown={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          setResizeState({
                                            fieldId: field.field_id,
                                            pageNumber,
                                            startClientX: event.clientX,
                                            startClientY: event.clientY,
                                            originWidth: Number(field.width),
                                            originHeight: Number(field.height),
                                          });
                                        }}
                                        className="shrink-0 rounded-md border border-slate-300 bg-white px-1 text-[9px] text-slate-700 hover:bg-slate-50"
                                      >
                                        ⤡
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </Document>
              ) : (
                <p className="text-sm text-slate-500">
                  PDF preview unavailable.
                </p>
              )}
            </div>

            {/* Side Panel: Field Editor + Invite */}
            <div className="sticky top-6 space-y-6">
              {/* Field Properties */}
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="mb-4 font-semibold text-slate-900">
                  Field Properties
                </h3>
                {!selectedField ? (
                  <p className="text-sm text-slate-500">
                    Select a field on the PDF to edit.
                  </p>
                ) : (
                  <div className="space-y-3 text-sm">
                    <input
                      value={selectedField.field_key}
                      onChange={(e) =>
                        handleFieldUpdate(selectedField.field_id, {
                          field_key: e.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
                      placeholder="Field key"
                    />
                    <input
                      value={selectedField.label}
                      onChange={(e) =>
                        handleFieldUpdate(selectedField.field_id, {
                          label: e.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
                      placeholder="Label"
                    />
                    <input
                      value={selectedField.placeholder}
                      onChange={(e) =>
                        handleFieldUpdate(selectedField.field_id, {
                          placeholder: e.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
                      placeholder="Placeholder"
                    />
                    <select
                      value={selectedField.field_type}
                      onChange={(e) =>
                        handleFieldUpdate(selectedField.field_id, {
                          field_type: e.target.value,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
                    >
                      {FIELD_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedField.required}
                        onChange={(e) =>
                          handleFieldUpdate(selectedField.field_id, {
                            required: e.target.checked,
                          })
                        }
                      />
                      <span className="text-sm text-slate-700">Required</span>
                    </label>
                    <div className="rounded-md border border-slate-300 bg-white px-3 py-2">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Admin Prefill
                      </p>
                      {selectedField.field_type === "checkbox" ? (
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedField.config_json?.default_value)}
                            onChange={(e) =>
                              handleFieldUpdate(selectedField.field_id, {
                                config_json: {
                                  ...(selectedField.config_json || {}),
                                  default_value: e.target.checked,
                                },
                              })
                            }
                          />
                          Default checked
                        </label>
                      ) : selectedField.field_type === "signature" ? (
                        <div className="space-y-2">
                          <input
                            value={String(selectedField.config_json?.default_value || "")}
                            onChange={(e) =>
                              handleFieldUpdate(selectedField.field_id, {
                                config_json: {
                                  ...(selectedField.config_json || {}),
                                  default_value: e.target.value,
                                },
                              })
                            }
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
                            placeholder="Default signature text (optional)"
                          />
                          <label className="block cursor-pointer rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
                            Upload stamp/signature image
                            <input
                              type="file"
                              accept="image/png,image/jpeg"
                              className="hidden"
                              onChange={(e) =>
                                handlePrefillSignatureUpload(selectedField.field_id, e)
                              }
                            />
                          </label>
                          {selectedField.config_json?.default_signature_image_data_url ? (
                            <div className="rounded-md border border-slate-300 bg-slate-50 p-2">
                              <img
                                src={selectedField.config_json.default_signature_image_data_url}
                                alt="Default stamp"
                                className="h-20 w-full object-contain"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleFieldUpdate(selectedField.field_id, {
                                    config_json: {
                                      ...(selectedField.config_json || {}),
                                      default_signature_image_data_url: "",
                                    },
                                  })
                                }
                                className="mt-2 w-full rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                              >
                                Remove stamp image
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : selectedField.field_type === "date" ? (
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={Boolean(selectedField.config_json?.use_today)}
                              onChange={(e) =>
                                handleFieldUpdate(selectedField.field_id, {
                                  config_json: {
                                    ...(selectedField.config_json || {}),
                                    use_today: e.target.checked,
                                    default_value: e.target.checked ? "" : selectedField.config_json?.default_value || "",
                                  },
                                })
                              }
                            />
                            Use submission date (Today)
                          </label>
                          {!selectedField.config_json?.use_today ? (
                            <input
                              type="date"
                              value={String(selectedField.config_json?.default_value || "")}
                              onChange={(e) =>
                                handleFieldUpdate(selectedField.field_id, {
                                  config_json: {
                                    ...(selectedField.config_json || {}),
                                    default_value: e.target.value,
                                  },
                                })
                              }
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
                            />
                          ) : null}
                        </div>
                      ) : (
                        <input
                          value={String(selectedField.config_json?.default_value || "")}
                          onChange={(e) =>
                            handleFieldUpdate(selectedField.field_id, {
                              config_json: {
                                ...(selectedField.config_json || {}),
                                default_value: e.target.value,
                              },
                            })
                          }
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
                          placeholder="Default value shown to candidate"
                        />
                      )}
                      <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedField.config_json?.locked)}
                          onChange={(e) =>
                            handleFieldUpdate(selectedField.field_id, {
                              config_json: {
                                ...(selectedField.config_json || {}),
                                locked: e.target.checked,
                              },
                            })
                          }
                        />
                        Lock this field (read-only for candidate)
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteField(selectedField.field_id)}
                      className="w-full rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900 hover:bg-rose-100"
                    >
                      Delete Field
                    </button>
                  </div>
                )}
              </div>

              {/* Send Invite */}
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="mb-4 font-semibold text-slate-900">
                  Send Invite
                </h3>
                <form onSubmit={handleSendInvite} className="space-y-3">
                  <input
                    type="email"
                    value={inviteForm.recipient_email}
                    onChange={(e) =>
                      setInviteForm((prev) => ({
                        ...prev,
                        recipient_email: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                    placeholder="Email"
                  />
                  <input
                    value={inviteForm.recipient_name}
                    onChange={(e) =>
                      setInviteForm((prev) => ({
                        ...prev,
                        recipient_name: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                    placeholder="Name (optional)"
                  />
                  <input
                    value={inviteForm.recipient_phone}
                    onChange={(e) =>
                      setInviteForm((prev) => ({
                        ...prev,
                        recipient_phone: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                    placeholder="Phone (optional)"
                  />
                  <button
                    type="submit"
                    disabled={sendingInvite || templateStatus !== "published"}
                    className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {sendingInvite ? "Sending..." : "Send Invite"}
                  </button>
                  {templateStatus !== "published" ? (
                    <p className="text-xs text-amber-700">
                      Publish template to send invites.
                    </p>
                  ) : null}
                </form>
              </div>
            </div>
          </div>

          {/* Envelope Activity Table */}
          {envelopes.length > 0 ? (
            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <h3 className="font-semibold text-slate-900">
                  Envelope Activity
                </h3>
                <input
                  type="text"
                  placeholder="Search name, phone, or doc ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
                />
              </div>
              <div className="overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-3 py-2 font-semibold text-slate-900">
                        Recipient
                      </th>
                      <th className="px-3 py-2 font-semibold text-slate-900">
                        Status
                      </th>
                      <th className="px-3 py-2 font-semibold text-slate-900">
                        Sent
                      </th>
                      <th className="px-3 py-2 font-semibold text-slate-900">
                        Signed
                      </th>
                      <th className="px-3 py-2 font-semibold text-slate-900">
                        Document
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEnvelopes.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-3 py-4 text-center text-slate-500">
                          No envelopes found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredEnvelopes.map((item) => (
                        <tr
                          key={item.envelope_id}
                        className="border-b border-slate-100"
                      >
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-900">
                            {item.recipient_name || "Recipient"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.recipient_email}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-xs font-semibold text-slate-600">
                          {item.status}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600">
                          {formatDate(item.sent_at)}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600">
                          {formatDate(item.signed_at)}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600">
                          <button
                            type="button"
                            onClick={() => handleViewSignedPdf(item)}
                            disabled={item.status !== "signed" || viewingEnvelopeId === item.envelope_id}
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {viewingEnvelopeId === item.envelope_id
                              ? "Opening..."
                              : "View Signed PDF"}
                          </button>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

