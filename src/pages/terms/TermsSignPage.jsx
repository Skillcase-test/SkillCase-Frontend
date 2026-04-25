import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import { termsApi } from "../../api/termsApi";
import "./TermsSignPage.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function useWindowWidth() {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 1200 : window.innerWidth,
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return width;
}

function hashString(input) {
  const value = String(input || "");
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function createTypedSignatureImageDataUrl(signatureText, fontFamily) {
  const text = String(signatureText || "").trim();
  if (!text) return "";
  if (typeof document === "undefined") return "";

  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#101828";
  let fontSize = 150;
  const maxTextWidth = canvas.width - 120;

  while (fontSize > 48) {
    ctx.font = `${fontSize}px ${fontFamily}`;
    const measured = ctx.measureText(text).width;
    if (measured <= maxTextWidth) break;
    fontSize -= 6;
  }

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 60, canvas.height / 2);
  return canvas.toDataURL("image/png");
}

function getFieldBoxStyle(field, isMobile) {
  const minWidth = isMobile ? 0.02 : 0.01;
  const minHeight = isMobile ? 0.015 : 0.01;
  return {
    left: `${clamp(Number(field.x || 0), 0, 1) * 100}%`,
    top: `${clamp(Number(field.y || 0), 0, 1) * 100}%`,
    width: `${clamp(Number(field.width || 0.2), minWidth, 1) * 100}%`,
    height: `${clamp(Number(field.height || 0.04), minHeight, 1) * 100}%`,
  };
}

function getPrefilledValue(field) {
  const config = field?.config_json || {};
  if (!Object.prototype.hasOwnProperty.call(config, "default_value")) {
    return field?.field_type === "checkbox" ? false : "";
  }
  if (field?.field_type === "checkbox") {
    return Boolean(config.default_value);
  }
  return String(config.default_value || "");
}

function isFieldLocked(field) {
  return Boolean(field?.config_json?.locked);
}

function isFieldVisibleToCandidate(field) {
  if (!field || field.field_type === "signature") return false;
  if (isFieldLocked(field)) return false;
  return true;
}

function getFieldPlaceholder(field) {
  const explicit = String(field?.placeholder || "").trim();
  if (explicit) return explicit;
  const label = String(field?.label || "").trim();
  if (label) return label;
  return String(field?.field_key || "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function getDisplayValue(field, fieldValues) {
  const key = String(field?.field_key || "");
  const inputValue = key ? fieldValues[key] : "";
  if (field?.field_type === "checkbox") {
    if (typeof inputValue === "boolean") return inputValue;
    return Boolean(getPrefilledValue(field));
  }
  const normalized = String(inputValue || "").trim();
  if (normalized) return normalized;
  return String(getPrefilledValue(field) || "");
}

function isSignatureField(field) {
  return field?.field_type === "signature";
}

function isUserRequiredSignatureField(field) {
  if (!isSignatureField(field) || !field?.required) return false;
  const config = field?.config_json || {};
  const locked = Boolean(config.locked);
  const defaultText = String(config.default_value || "").trim();
  const defaultImage = String(
    config.default_signature_image_data_url || "",
  ).trim();
  return !(locked && (defaultText || defaultImage));
}

function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  function toLocalPoint(event) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const point = toLocalPoint(event);
    drawingRef.current = true;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    event.preventDefault();
  }

  function move(event) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const point = toLocalPoint(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    onChange(canvas.toDataURL("image/png"));
    event.preventDefault();
  }

  function end(event) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL("image/png"));
    }
    event.preventDefault();
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={900}
        height={200}
        className="h-40 w-full rounded-md border border-slate-300 bg-white"
        style={{ touchAction: "none" }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <button
        type="button"
        onClick={clear}
        className="mt-2 rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
      >
        Clear Signature
      </button>
    </div>
  );
}

function SignatureModal({
  isOpen,
  onClose,
  onSubmit,
  signatureMode,
  setSignatureMode,
  typedSignature,
  setTypedSignature,
  signatureImage,
  setSignatureImage,
  typedFont,
  handleUploadSignature,
  submitting,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/50 p-4"
      onWheel={(event) => event.preventDefault()}
      onTouchMove={(event) => event.preventDefault()}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6"
        onWheel={(event) => event.preventDefault()}
        onTouchMove={(event) => event.preventDefault()}
      >
        <h2 className="mb-6 text-xl font-bold text-slate-900">Sign Document</h2>

        <div className="mb-6 space-y-4">
          <div className="flex gap-2">
            {["typed", "drawn", "uploaded"].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSignatureMode(mode)}
                className={`rounded-md border px-4 py-2 text-sm font-semibold ${
                  signatureMode === mode
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {mode === "typed"
                  ? "Type"
                  : mode === "drawn"
                    ? "Draw"
                    : "Upload"}
              </button>
            ))}
          </div>

          {signatureMode === "typed" ? (
            <div className="space-y-3">
              <input
                type="text"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
                placeholder="Type your full name"
              />
              <div
                className="rounded-md border border-slate-200 bg-slate-50 px-4 py-6 text-3xl text-slate-900"
                style={{ fontFamily: typedFont }}
              >
                {typedSignature || "Signature preview"}
              </div>
            </div>
          ) : null}

          {signatureMode === "drawn" ? (
            <SignaturePad onChange={setSignatureImage} />
          ) : null}

          {signatureMode === "uploaded" ? (
            <div className="space-y-3">
              <label className="block rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleUploadSignature}
                  className="hidden"
                />
                <p className="text-sm text-slate-600">
                  Click to upload signature image
                </p>
              </label>
              {signatureImage ? (
                <img
                  src={signatureImage}
                  alt="Signature"
                  className="h-24 w-full rounded-md border border-slate-200 object-contain"
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="flex-1 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2 rounded-full"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Submitting...
              </>
            ) : "Sign & Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TermsSignPage() {
  const { token } = useParams();
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const [invite, setInvite] = useState(null);
  const [template, setTemplate] = useState(null);
  const [fields, setFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [docPages, setDocPages] = useState(0);

  const [signatureMode, setSignatureMode] = useState("typed");
  const [typedSignature, setTypedSignature] = useState("");
  const [signatureImage, setSignatureImage] = useState("");
  const [mobileStep, setMobileStep] = useState("document");
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const viewerRef = useRef(null);
  const inputRefMap = useRef(new Map());
  const hasAutoFocusedRef = useRef(false);
  const signaturePanelRef = useRef(null);
  const signatureSubmitButtonRef = useRef(null);
  const [viewerWidth, setViewerWidth] = useState(900);

  const renderWidth = useMemo(
    () =>
      isMobile
        ? clamp(
            Math.floor(Math.min(viewerWidth - 20, windowWidth - 28)),
            180,
            390,
          )
        : clamp(Math.floor(viewerWidth - 24), 420, 1120),
    [isMobile, viewerWidth, windowWidth],
  );

  const groupedFields = useMemo(() => {
    const map = new Map();
    fields.forEach((field) => {
      const page = Number(field.page_number || 1);
      if (!map.has(page)) map.set(page, []);
      map.get(page).push(field);
    });
    return map;
  }, [fields]);

  const fillableRequiredFields = useMemo(
    () =>
      fields
        .filter(
          (field) =>
            isFieldVisibleToCandidate(field) &&
            field.required &&
            field.field_type !== "label",
        )
        .sort((a, b) => {
          const pageDiff =
            Number(a.page_number || 1) - Number(b.page_number || 1);
          if (pageDiff !== 0) return pageDiff;
          return Number(a.field_order || 0) - Number(b.field_order || 0);
        }),
    [fields],
  );

  const firstFillableFieldId = useMemo(() => {
    const firstField = fields
      .filter(
        (field) =>
          isFieldVisibleToCandidate(field) &&
          field.field_type !== "label" &&
          field.field_type !== "signature",
      )
      .sort((a, b) => {
        const pageDiff =
          Number(a.page_number || 1) - Number(b.page_number || 1);
        if (pageDiff !== 0) return pageDiff;
        return Number(a.field_order || 0) - Number(b.field_order || 0);
      })[0];

    return String(firstField?.field_id || "");
  }, [fields]);

  const fillableFields = useMemo(
    () =>
      fields
        .filter(
          (field) =>
            isFieldVisibleToCandidate(field) &&
            field.field_type !== "label",
        )
        .sort((a, b) => {
          const pageDiff =
            Number(a.page_number || 1) - Number(b.page_number || 1);
          if (pageDiff !== 0) return pageDiff;
          return Number(a.field_order || 0) - Number(b.field_order || 0);
        }),
    [fields],
  );

  const requiresCandidateSignature = useMemo(
    () =>
      fields.some((field) => {
        if (field.field_type !== "signature" || !field.required) return false;
        const locked = Boolean(field?.config_json?.locked);
        const defaultText = String(
          field?.config_json?.default_value || "",
        ).trim();
        const defaultImage = String(
          field?.config_json?.default_signature_image_data_url || "",
        ).trim();
        return !(locked && (defaultText || defaultImage));
      }),
    [fields],
  );

  const candidateSignatureFieldKeys = useMemo(
    () =>
      fields
        .filter((field) => isUserRequiredSignatureField(field))
        .map((field) => String(field.field_key || "").trim())
        .filter(Boolean),
    [fields],
  );

  const typedFont = useMemo(() => {
    const variants = [
      '"Brush Script MT", "Segoe Script", cursive',
      '"Lucida Handwriting", "Segoe Script", cursive',
      '"Palatino Linotype", "Times New Roman", serif',
    ];
    const nameSeed =
      typedSignature ||
      invite?.recipient_name ||
      fieldValues.full_name ||
      fieldValues.name ||
      "";
    return variants[hashString(nameSeed) % variants.length];
  }, [
    typedSignature,
    invite?.recipient_name,
    fieldValues.full_name,
    fieldValues.name,
  ]);

  const handleSignatureModeChange = (nextMode) => {
    setSignatureMode(nextMode);
    if (nextMode === "typed") {
      setSignatureImage("");
    }
  };

  const showToast = (message) => {
    setToastMessage(String(message || ""));
  };

  useEffect(() => {
    const node = viewerRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(() => {
      setViewerWidth(node.clientWidth || 900);
    });
    observer.observe(node);
    setViewerWidth(node.clientWidth || 900);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = window.setTimeout(() => {
      setToastMessage("");
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!alreadySigned) return undefined;
    const timer = window.setTimeout(() => {
      window.location.href = "https://skillcase.in";
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [alreadySigned]);

  useEffect(() => {
    if (!showSignatureModal) return undefined;
    if (typeof document === "undefined") return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousHtmlTouchAction = document.documentElement.style.touchAction;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.documentElement.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      document.documentElement.style.touchAction = previousHtmlTouchAction;
    };
  }, [showSignatureModal]);

  useEffect(() => {
    if (!isMobile) {
      setKeyboardOffset(0);
      return undefined;
    }
    if (typeof window === "undefined") return undefined;

    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    const updateKeyboardOffset = () => {
      const occluded = Math.max(
        0,
        Math.round(window.innerHeight - (viewport.height + viewport.offsetTop)),
      );
      // Ignore tiny viewport changes (browser UI bars), react only to keyboard-size shifts.
      setKeyboardOffset(occluded > 80 ? occluded : 0);
    };

    updateKeyboardOffset();
    viewport.addEventListener("resize", updateKeyboardOffset);
    viewport.addEventListener("scroll", updateKeyboardOffset);

    return () => {
      viewport.removeEventListener("resize", updateKeyboardOffset);
      viewport.removeEventListener("scroll", updateKeyboardOffset);
      setKeyboardOffset(0);
    };
  }, [isMobile]);

  const nextButtonStyle = isMobile
    ? { "--terms-kb-offset": `${keyboardOffset}px` }
    : undefined;

  useEffect(() => {
    if (!token) return;
    hasAutoFocusedRef.current = false;
    let mounted = true;

    async function fetchInvite() {
      setLoading(true);
      setError("");
      try {
        const response = await termsApi.resolveInvite(token);
        if (!mounted) return;
        const envelope = response.data?.envelope || null;
        const templateData = response.data?.template || null;
        const mappedFields = response.data?.fields || [];
        setJustSubmitted(false);
        setInvite(envelope);
        setTemplate(templateData);
        setFields(mappedFields);
        setDocPages(Number(templateData?.page_count || 0));
        setAlreadySigned(envelope?.status === "signed");

        const defaults = {};
        mappedFields.forEach((field) => {
          if (field.field_type === "date" && field.config_json?.use_today) {
            defaults[field.field_key] = new Date().toISOString().split("T")[0];
          } else {
            defaults[field.field_key] = getPrefilledValue(field);
          }
        });
        setFieldValues(defaults);
      } catch (requestError) {
        setError(
          requestError?.response?.data?.msg || "Failed to load signing link.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchInvite();
    return () => {
      mounted = false;
    };
  }, [token]);

  // Auto-focus has been intentionally removed so that the user can review the document first.
  // They must explicitly click 'Start Document' in the bottom nav to focus the first field.

  // Write to fieldValues by field_key. Because duplicate-key fields share the
  // same entry in fieldValues, every field rendered with that key will
  // automatically display the updated value — this is the auto-fill mechanism.
  function setValue(fieldKey, nextValue) {
    setFieldValues((prev) => ({ ...prev, [fieldKey]: nextValue }));
  }

  function handleUploadSignature(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setSignatureImage(result);
    };
    reader.readAsDataURL(file);
  }

  function getMissingRequiredFieldIds() {
    return fillableRequiredFields
      .map((field) => {
        const key = String(field.field_key || "");
        const value = fieldValues[key];
        if (field.field_type === "checkbox") {
          return value === true ? null : String(field.field_id);
        }
        return String(value || "").trim() ? null : String(field.field_id);
      })
      .filter(Boolean);
  }

  function focusFieldById(fieldId) {
    const target = inputRefMap.current.get(String(fieldId || ""));
    if (!target || typeof target.focus !== "function") return false;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.focus({ preventScroll: true });
    if (
      target.tagName === "INPUT" &&
      String(target.type || "").toLowerCase() === "date"
    ) {
      if (typeof target.showPicker === "function") {
        try {
          target.showPicker();
        } catch {
          target.click();
        }
      } else {
        target.click();
      }
    }
    setActiveFieldId(String(fieldId));
    return true;
  }

  function focusFieldByIdWithRetry(fieldId, maxAttempts = 8) {
    const id = String(fieldId || "");
    if (!id) return false;
    let attemptsLeft = Math.max(1, Number(maxAttempts || 1));

    const attempt = () => {
      const focused = focusFieldById(id);
      if (focused) {
        hasAutoFocusedRef.current = true;
        return;
      }
      attemptsLeft -= 1;
      if (attemptsLeft <= 0) return;
      window.setTimeout(attempt, 140);
    };

    attempt();
    return true;
  }

  function goToFirstMissingRequiredField() {
    const missing = getMissingRequiredFieldIds();
    if (!missing.length) return false;
    return focusFieldById(missing[0]);
  }

  function jumpToFirstMissingRequiredField() {
    const missing = getMissingRequiredFieldIds();
    if (!missing.length) return true;
    const targetId = missing[0];
    const focusedNow = focusFieldById(targetId);
    if (!focusedNow) {
      focusFieldByIdWithRetry(targetId, 8);
    }
    return focusedNow;
  }

  function goToNextMissingRequiredField() {
    const missing = getMissingRequiredFieldIds();
    if (!missing.length) {
      if (isMobile) {
        setShowSignatureModal(true);
      } else {
        signaturePanelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        signatureSubmitButtonRef.current?.focus?.({ preventScroll: true });
      }
      return;
    }
    const currentIndex = missing.findIndex((id) => id === activeFieldId);
    const nextId =
      currentIndex >= 0 ? missing[currentIndex + 1] || missing[0] : missing[0];
    const focusedNow = focusFieldById(nextId);
    if (!focusedNow) {
      focusFieldByIdWithRetry(nextId, 8);
    }
  }

  function handleBottomNavNextOrSign() {
    if (getMissingRequiredFieldIds().length === 0) {
      if (isMobile) {
        setShowSignatureModal(true);
      } else {
        signaturePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        signatureSubmitButtonRef.current?.focus?.({ preventScroll: true });
      }
    } else {
      goToNextField();
    }
  }

  function goToNextField() {
    if (!fillableFields.length) return;
    const currentIndex = fillableFields.findIndex((f) => String(f.field_id) === activeFieldId);
    let nextIndex = currentIndex + 1;
    if (nextIndex >= fillableFields.length) {
      const missing = getMissingRequiredFieldIds();
      if (missing.length > 0) {
        showToast("Please fill all required fields before signing.");
        jumpToFirstMissingRequiredField();
      } else {
        if (isMobile) {
          setShowSignatureModal(true);
        } else {
          signaturePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          signatureSubmitButtonRef.current?.focus?.({ preventScroll: true });
        }
      }
      return;
    }
    const nextId = fillableFields[nextIndex].field_id;
    const focusedNow = focusFieldById(nextId);
    if (!focusedNow) {
      focusFieldByIdWithRetry(nextId, 8);
    }
  }

  function goToPreviousField() {
    if (!fillableFields.length) return;
    const currentIndex = fillableFields.findIndex((f) => String(f.field_id) === activeFieldId);
    if (currentIndex <= 0) return;
    const prevId = fillableFields[currentIndex - 1].field_id;
    const focusedNow = focusFieldById(prevId);
    if (!focusedNow) {
      focusFieldByIdWithRetry(prevId, 8);
    }
  }

  function handleStart() {
    setHasStarted(true);
  }

  function validateRequiredFields() {
    return getMissingRequiredFieldIds();
  }

  function renderOverlayFieldControl(field) {
    if (!isFieldVisibleToCandidate(field)) return null;
    const id = String(field.field_id || "");
    const key = String(field.field_key || "");
    const locked = isFieldLocked(field);
    const value = getDisplayValue(field, fieldValues);
    const placeholder = getFieldPlaceholder(field);
    const showBubble =
      activeFieldId === id &&
      field.field_type !== "checkbox" &&
      String(value || "").trim().length > 0;
    const signatureImageUrl =
      field?.config_json?.default_signature_image_data_url || "";

    if (field.field_type === "label") {
      return (
        <div className="terms-overlay-control terms-overlay-label">
          {field.label || ""}
        </div>
      );
    }

    if (locked) {
      if (field.field_type === "checkbox") {
        return (
          <div className="terms-overlay-control terms-overlay-readonly terms-overlay-checkbox-readonly">
            {value === true ? "✓" : ""}
          </div>
        );
      }
      if (field.field_type === "signature") {
        if (signatureImageUrl) {
          return (
            <div className="terms-overlay-control terms-overlay-signature-static">
              <img
                src={signatureImageUrl}
                alt="Stamp"
                className="terms-overlay-signature-image"
              />
            </div>
          );
        }
        return (
          <div className="terms-overlay-control terms-overlay-readonly terms-overlay-signature-static">
            {String(value || "Signed")}
          </div>
        );
      }
      return (
        <div className="terms-overlay-control terms-overlay-readonly">
          {String(value || "")}
        </div>
      );
    }

    if (field.field_type === "textarea") {
      return (
        <div className="terms-overlay-input-wrap">
          {showBubble ? (
            <div className="terms-overlay-placeholder-bubble">
              {placeholder}
            </div>
          ) : null}
          <textarea
            ref={(node) => {
              // Key by field_id so each field gets its own ref slot even when
              // two fields share the same field_key (duplicate auto-fill).
              if (node) inputRefMap.current.set(id, node);
              else inputRefMap.current.delete(id);
            }}
            value={fieldValues[key] || ""}
            onChange={(e) => setValue(key, e.target.value)}
            onFocus={() => setActiveFieldId(id)}
            placeholder={placeholder}
            className="terms-overlay-control terms-overlay-input terms-overlay-textarea"
          />
        </div>
      );
    }

    if (field.field_type === "checkbox") {
      return (
        <label className="terms-overlay-control terms-overlay-checkbox-wrap">
          <input
            ref={(node) => {
              if (node) inputRefMap.current.set(id, node);
              else inputRefMap.current.delete(id);
            }}
            type="checkbox"
            checked={Boolean(fieldValues[key])}
            onChange={(e) => setValue(key, e.target.checked)}
            onFocus={() => setActiveFieldId(id)}
          />
        </label>
      );
    }

    if (field.field_type === "date") {
      return (
        <div className="terms-overlay-input-wrap">
          {showBubble ? (
            <div className="terms-overlay-placeholder-bubble">
              {placeholder}
            </div>
          ) : null}
          <input
            ref={(node) => {
              if (node) inputRefMap.current.set(id, node);
              else inputRefMap.current.delete(id);
            }}
            type="date"
            value={fieldValues[key] || ""}
            onChange={(e) => setValue(key, e.target.value)}
            onFocus={() => setActiveFieldId(id)}
            className="terms-overlay-control terms-overlay-input"
          />
        </div>
      );
    }

    if (field.field_type === "signature") {
      return (
        <div className="terms-overlay-control terms-overlay-signature">
          Sign
        </div>
      );
    }

    return (
      <div className="terms-overlay-input-wrap">
        {showBubble ? (
          <div className="terms-overlay-placeholder-bubble">{placeholder}</div>
        ) : null}
        <input
          ref={(node) => {
            if (node) inputRefMap.current.set(id, node);
            else inputRefMap.current.delete(id);
          }}
          value={fieldValues[key] || ""}
          onChange={(e) => setValue(key, e.target.value)}
          onFocus={() => setActiveFieldId(id)}
          placeholder={placeholder}
          className="terms-overlay-control terms-overlay-input"
        />
      </div>
    );
  }

  function handleOpenSignatureModal() {
    const missing = validateRequiredFields();
    if (missing.length) {
      showToast("Please fill all required fields before signing.");
      jumpToFirstMissingRequiredField();
      setError(`Please fill all required fields: ${missing.join(", ")}`);
      return;
    }
    setShowSignatureModal(true);
  }

  async function handleSubmit() {
    if (!token || !invite || !template) return;
    setError("");
    setSuccess("");
    const missing = validateRequiredFields();
    if (missing.length) {
      showToast("Please fill all required fields before signing.");
      jumpToFirstMissingRequiredField();
      setError(`Please fill all required fields: ${missing.join(", ")}`);
      return;
    }
    if (
      requiresCandidateSignature &&
      signatureMode === "typed" &&
      !typedSignature.trim()
    ) {
      setError("Please enter your typed signature.");
      return;
    }
    if (
      requiresCandidateSignature &&
      (signatureMode === "drawn" || signatureMode === "uploaded") &&
      !signatureImage
    ) {
      setError("Please provide your signature image.");
      return;
    }

    const payloadValues = { ...fieldValues };
    let signatureImageDataUrl = "";
    if (requiresCandidateSignature && signatureMode === "typed") {
      const typedValue = typedSignature.trim();
      payloadValues.signature = typedValue;
      if (candidateSignatureFieldKeys.length) {
        candidateSignatureFieldKeys.forEach((key) => {
          payloadValues[key] = typedValue;
        });
      }
      signatureImageDataUrl = createTypedSignatureImageDataUrl(
        typedValue,
        typedFont,
      );
      if (!signatureImageDataUrl) {
        setError("Failed to render typed signature image. Please try again.");
        return;
      }
    } else if (requiresCandidateSignature) {
      signatureImageDataUrl = signatureImage;
    }

    setSubmitting(true);
    try {
      const response = await termsApi.submitInvite(token, {
        field_values: payloadValues,
        signature_mode: signatureMode,
        signature_image_data_url: signatureImageDataUrl,
      });
      const signedUrl = response.data?.signed_pdf_url || "";
      setSuccess(
        "Signature completed successfully. Thank you. You will be redirected to Skillcase.",
      );
      setShowSignatureModal(false);
      setJustSubmitted(true);
      setAlreadySigned(true);
      if (signedUrl) {
        window.open(signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (requestError) {
      setError(
        requestError?.response?.data?.msg ||
          "Failed to submit signed document.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <p className="text-slate-600">Loading document...</p>
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      </div>
    );
  }

  if (justSubmitted) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center">
          <h2 className="text-xl font-bold text-emerald-900">
            Signature submitted successfully
          </h2>
          <p className="mt-2 text-sm text-emerald-800">
            Thank you. Your document has been signed and submitted.
          </p>
          <p className="mt-3 text-xs text-emerald-700">
            Redirecting you to Skillcase...
          </p>
        </div>
      </div>
    );
  }

  if (alreadySigned) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center">
          <h2 className="text-xl font-bold text-emerald-900">
            Document already signed
          </h2>
          <p className="mt-2 text-sm text-emerald-800">
            This document has already been signed and submitted by you.
          </p>
          <p className="mt-3 text-xs text-emerald-700">
            Redirecting you to Skillcase...
          </p>
        </div>
      </div>
    );
  }

  // Mobile: Two-step flow
  if (isMobile) {
    return (
      <div className="min-h-screen bg-white p-4">
        {mobileStep === "document" ? (
          !hasStarted ? (
            <div className="flex items-center justify-center min-h-[70vh]">
              <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-5 text-center">
                  <h2 className="text-xl font-bold text-slate-900">{template?.title || "Document Signature"}</h2>
                  <p className="text-sm text-slate-500 mt-1">Please review and sign the document</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between pb-3 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-500">Document</span>
                    <span className="text-sm font-semibold text-slate-900 text-right">{template?.title}</span>
                  </div>
                  <div className="flex justify-between pb-3 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-500">Sender</span>
                    <span className="text-sm font-semibold text-slate-900 text-right">Skillcase</span>
                  </div>
                  <div className="flex justify-between pb-3 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-500">Receiver</span>
                    <span className="text-sm font-semibold text-slate-900 text-right">{invite?.recipient_name || invite?.recipient_email}</span>
                  </div>
                  <div className="flex justify-between pb-3">
                    <span className="text-sm font-medium text-slate-500">Date</span>
                    <span className="text-sm font-semibold text-slate-900 text-right">{new Date(invite?.sent_at || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
          <div
            ref={viewerRef}
            className="rounded-lg border border-slate-200 bg-white p-3 pb-24"
          >
            <Document
              file={template?.source_pdf_url || ""}
              loading={
                <p className="text-sm text-slate-500">Rendering PDF...</p>
              }
              onLoadSuccess={({ numPages }) => setDocPages(numPages)}
            >
              {Array.from({ length: docPages || 1 }).map((_, idx) => {
                const pageNumber = idx + 1;
                const pageFields = (groupedFields.get(pageNumber) || []).filter(
                  (field) => isFieldVisibleToCandidate(field),
                );
                return (
                  <div key={pageNumber} className="mb-4">
                    <h2 className="mb-2 px-1 text-xs font-semibold text-slate-700">
                      Page {pageNumber}
                    </h2>
                    <div className="flex justify-center">
                      <div
                        className="terms-pdf-frame relative inline-block overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                        style={{ width: renderWidth }}
                      >
                          <Page
                          pageNumber={pageNumber}
                          width={renderWidth}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                        <div className="terms-overlay-layer">
                          {pageFields.map((field) => (
                            <div
                              key={field.field_id}
                              className="terms-overlay-field"
                              style={getFieldBoxStyle(field, true)}
                            >
                              {renderOverlayFieldControl(field)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Document>

          </div>
          )
        ) : null}

        <SignatureModal
          isOpen={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onSubmit={handleSubmit}
          signatureMode={signatureMode}
          setSignatureMode={handleSignatureModeChange}
          typedSignature={typedSignature}
          setTypedSignature={setTypedSignature}
          signatureImage={signatureImage}
          setSignatureImage={setSignatureImage}
          typedFont={typedFont}
          handleUploadSignature={handleUploadSignature}
          submitting={submitting}
        />

        {toastMessage ? (
          <div className="terms-toast">{toastMessage}</div>
        ) : null}

        <div className="terms-bottom-nav" style={nextButtonStyle}>
          {!hasStarted ? (
            <button onClick={handleStart} className="terms-bottom-nav-btn terms-bottom-nav-btn-primary w-full max-w-md mx-auto">
              Proceed to Document
            </button>
          ) : !activeFieldId ? (
            <button onClick={() => goToNextField()} className="terms-bottom-nav-btn terms-bottom-nav-btn-primary w-full max-w-md mx-auto">
              Start Document
            </button>
          ) : (
            <>
              <button
                onClick={goToPreviousField}
                className="terms-bottom-nav-btn terms-bottom-nav-btn-outline"
                disabled={fillableFields.findIndex((f) => String(f.field_id) === activeFieldId) <= 0}
              >
                Previous
              </button>
              <button
                onClick={handleBottomNavNextOrSign}
                className="terms-bottom-nav-btn terms-bottom-nav-btn-primary"
              >
                {getMissingRequiredFieldIds().length === 0 ? "Sign Document" : "Next"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Desktop: One-step flow
  return (
    <div className="min-h-screen bg-white p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">{template?.title}</h1>
        <p className="mt-2 text-slate-600">{template?.description}</p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {!hasStarted ? (
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-5 text-center">
              <h2 className="text-xl font-bold text-slate-900">{template?.title || "Document Signature"}</h2>
              <p className="text-sm text-slate-500 mt-1">Please review and sign the document</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between pb-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-500">Document</span>
                <span className="text-sm font-semibold text-slate-900 text-right">{template?.title}</span>
              </div>
              <div className="flex justify-between pb-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-500">Sender</span>
                <span className="text-sm font-semibold text-slate-900 text-right">Skillcase</span>
              </div>
              <div className="flex justify-between pb-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-500">Receiver</span>
                <span className="text-sm font-semibold text-slate-900 text-right">{invite?.recipient_name || invite?.recipient_email}</span>
              </div>
              <div className="flex justify-between pb-3">
                <span className="text-sm font-medium text-slate-500">Date</span>
                <span className="text-sm font-semibold text-slate-900 text-right">{new Date(invite?.sent_at || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] pb-24">
        {/* PDF Viewer + Fields */}
        <div
          ref={viewerRef}
          className="rounded-lg border border-slate-200 bg-white p-4"
        >
          <Document
            file={template?.source_pdf_url || ""}
            loading={<p className="text-sm text-slate-500">Rendering PDF...</p>}
            onLoadSuccess={({ numPages }) => setDocPages(numPages)}
          >
            {Array.from({ length: docPages || 1 }).map((_, idx) => {
              const pageNumber = idx + 1;
              const pageFields = (groupedFields.get(pageNumber) || []).filter(
                (field) => isFieldVisibleToCandidate(field),
              );
              return (
                <div key={pageNumber} className="mb-6">
                  <h2 className="mb-2 text-sm font-semibold text-slate-700">
                    Page {pageNumber}
                  </h2>
                  <div className="flex justify-center">
                    <div
                      className="terms-pdf-frame relative inline-block rounded-lg border border-slate-200 bg-slate-50"
                      style={{ width: renderWidth }}
                    >
                      <Page
                        pageNumber={pageNumber}
                        width={renderWidth}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                      <div className="terms-overlay-layer">
                        {pageFields.map((field) => (
                          <div
                            key={field.field_id}
                            className="terms-overlay-field"
                            style={getFieldBoxStyle(field, false)}
                          >
                            {renderOverlayFieldControl(field)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </Document>
        </div>

        {/* Signature Panel */}
        <div
          ref={signaturePanelRef}
          className="rounded-lg border border-slate-200 bg-white p-4"
        >
          <h3 className="mb-4 font-semibold text-slate-900">Your Signature</h3>
          <div className="mb-4 space-y-3">
            <div className="flex gap-2">
              {["typed", "drawn", "uploaded"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleSignatureModeChange(mode)}
                  className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                    signatureMode === mode
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {mode === "typed"
                    ? "Type"
                    : mode === "drawn"
                      ? "Draw"
                      : "Upload"}
                </button>
              ))}
            </div>

            {signatureMode === "typed" ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                  placeholder="Type your name"
                />
                <div
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-2xl text-slate-900"
                  style={{ fontFamily: typedFont }}
                >
                  {typedSignature || "Signature"}
                </div>
              </div>
            ) : null}

            {signatureMode === "drawn" ? (
              <SignaturePad onChange={setSignatureImage} />
            ) : null}

            {signatureMode === "uploaded" ? (
              <div className="space-y-2">
                <label className="block rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-sm text-slate-600 cursor-pointer hover:bg-slate-100">
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleUploadSignature}
                    className="hidden"
                  />
                  Click to upload signature
                </label>
                {signatureImage ? (
                  <img
                    src={signatureImage}
                    alt="Signature"
                    className="h-20 w-full rounded-md border border-slate-200 object-contain"
                  />
                ) : null}
              </div>
            ) : null}
          </div>

          <button
            ref={signatureSubmitButtonRef}
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Submitting...
              </>
            ) : "Sign & Submit"}
          </button>
        </div>
      </div>
      )}

      {toastMessage ? <div className="terms-toast">{toastMessage}</div> : null}

        <div className="terms-bottom-nav" style={nextButtonStyle}>
          {!hasStarted ? (
            <button onClick={handleStart} className="terms-bottom-nav-btn terms-bottom-nav-btn-primary w-full max-w-md mx-auto">
              Proceed to Document
            </button>
          ) : !activeFieldId ? (
            <button onClick={() => goToNextField()} className="terms-bottom-nav-btn terms-bottom-nav-btn-primary w-full max-w-md mx-auto">
              Start Document
            </button>
          ) : (
            <>
              <button
                onClick={goToPreviousField}
                className="terms-bottom-nav-btn terms-bottom-nav-btn-outline"
                disabled={fillableFields.findIndex((f) => String(f.field_id) === activeFieldId) <= 0}
              >
                Previous
              </button>
              <button
                onClick={handleBottomNavNextOrSign}
                className="terms-bottom-nav-btn terms-bottom-nav-btn-primary"
              >
                {getMissingRequiredFieldIds().length === 0 ? "Sign Document" : "Next"}
              </button>
            </>
          )}
        </div>
    </div>
  );
}
