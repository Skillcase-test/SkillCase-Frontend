import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { termsApi } from "../../api/termsApi";
import { checkAgreement } from "../../api/jobScreeningApi";
import mayaShocked from "../../assets/onboarding/mayaShocked.webp";
import "./JobScreeningTermsSignPage.css";

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
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 3;
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
    <div className="w-full">
      <canvas
        ref={canvasRef}
        width={900}
        height={320}
        className="h-40 w-full rounded-lg border border-slate-300 bg-white"
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
        Clear Drawing
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
  handleUploadSignature,
  submitting,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && signatureMode === "typed" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, signatureMode]);

  if (!isOpen) return null;

  const isSignatureEmpty =
    signatureMode === "typed" ? !typedSignature.trim() : !signatureImage;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden p-6 flex flex-col justify-start items-center gap-5">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 bg-black/5 hover:bg-black/10 rounded-full flex justify-center items-center cursor-pointer transition-colors"
        >
          <svg
            className="w-5 h-5 text-black"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="flex flex-col justify-start items-center gap-3">
          <div className="text-center text-[#002856] text-base font-semibold  leading-5">
            Sign Document
          </div>
        </div>

        {/* Tab Controls */}
        <div className="p-1 bg-gray-100 rounded-[33px] inline-flex justify-start items-center w-full max-w-xs">
          {["typed", "drawn", "uploaded"].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSignatureMode(mode)}
              className={`flex-1 px-3 py-1.5 text-sm font-medium  rounded-[39px] transition-all cursor-pointer ${
                signatureMode === mode
                  ? "bg-[#002856] text-white shadow-sm"
                  : "text-[#002856] hover:bg-black/5"
              }`}
            >
              {mode === "typed" ? "Type" : mode === "drawn" ? "Draw" : "Upload"}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="self-stretch">
          {signatureMode === "typed" && (
            <div className="self-stretch flex flex-col justify-start items-start gap-4">
              <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
                <div className="text-slate-600 text-sm font-medium  leading-5">
                  Type your name
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  className="self-stretch px-3.5 py-2.5 bg-white rounded-lg shadow-sm border border-slate-300 text-black text-base font-normal  leading-6 focus:border-[#002856] focus:outline-none"
                  placeholder="Enter full name"
                />
              </div>

              <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
                <div className="text-slate-600 text-sm font-medium  leading-5">
                  Signature preview
                </div>
                <div className="self-stretch h-32 px-3.5 py-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-center items-center overflow-hidden">
                  {typedSignature ? (
                    <div className="flex-1 text-center text-black text-5xl font-normal font-inspiration leading-relaxed truncate">
                      {typedSignature}
                    </div>
                  ) : (
                    <div className="text-slate-400 text-sm font-medium">
                      Your signature preview
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {signatureMode === "drawn" && (
            <div className="self-stretch flex flex-col justify-start items-start gap-3">
              <div className="text-slate-600 text-sm font-medium  leading-5">
                Draw your signature
              </div>
              <SignaturePad onChange={setSignatureImage} />
            </div>
          )}

          {signatureMode === "uploaded" && (
            <div className="self-stretch flex flex-col justify-start items-start gap-4">
              {!signatureImage ? (
                <label className="self-stretch p-6 rounded-lg border border-dashed border-slate-300 flex flex-col justify-start items-center gap-4 bg-slate-50 hover:bg-slate-100/50 cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleUploadSignature}
                    className="hidden"
                  />
                  <div className="w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-slate-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col justify-start items-center gap-1">
                    <div className="text-slate-700 text-sm font-semibold  leading-5">
                      Click to upload
                    </div>
                    <div className="opacity-70 text-black/60 text-xs font-normal  leading-4">
                      Supported files: PDF, JPG, PNG
                    </div>
                  </div>
                </label>
              ) : (
                <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
                  <div className="text-slate-600 text-sm font-medium  leading-5">
                    Uploaded signature preview
                  </div>
                  <div className="self-stretch h-32 p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-center items-center relative overflow-hidden">
                    <img
                      src={signatureImage}
                      alt="Signature Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                    <button
                      onClick={() => setSignatureImage("")}
                      className="absolute bottom-2 right-2 p-1.5 bg-black/5 hover:bg-black/10 rounded-sm flex justify-center items-center cursor-pointer transition-colors"
                      title="Remove signature image"
                    >
                      <svg
                        className="w-4 h-4 text-black"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Buttons */}
        <div className="self-stretch flex flex-col justify-start items-start gap-2 w-full mt-2">
          <button
            onClick={onSubmit}
            disabled={submitting || isSignatureEmpty}
            className="self-stretch px-4 py-3 bg-[#002856] hover:bg-[#001c3d] text-white rounded-lg font-semibold text-base flex justify-center items-center shadow-md transition-colors cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="animate-spin h-5 w-5 text-white" />
                Submitting Sign...
              </span>
            ) : (
              "Submit Sign"
            )}
          </button>

          <button
            onClick={onClose}
            className="self-stretch px-4 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-[#002856] rounded-lg font-semibold text-base flex justify-center items-center transition-colors cursor-pointer"
          >
            Back
          </button>

          {signatureImage && signatureMode === "uploaded" && (
            <button
              onClick={() => setSignatureImage("")}
              className="self-stretch px-4 py-2 text-center text-[#002856] font-semibold text-sm hover:underline cursor-pointer"
            >
              Re-upload
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JobScreeningTermsSignPage() {
  const { token } = useParams();
  const navigate = useNavigate();

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
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const viewerRef = useRef(null);
  const inputRefMap = useRef(new Map());
  const hasAutoFocusedRef = useRef(false);
  const signaturePanelRef = useRef(null);
  const signatureSubmitButtonRef = useRef(null);
  const desktopSignatureInputRef = useRef(null);
  const [viewerWidth, setViewerWidth] = useState(900);

  const renderWidth = useMemo(() => {
    const maxWidth = windowWidth - 32;
    if (isMobile) {
      return clamp(Math.floor(Math.min(viewerWidth - 10, maxWidth)), 180, 480);
    }
    return clamp(Math.floor(Math.min(viewerWidth - 24, maxWidth)), 320, 1120);
  }, [isMobile, viewerWidth, windowWidth]);

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
            field.field_type !== "label" &&
            field.field_type !== "signature",
        )
        .sort((a, b) => {
          const pageDiff =
            Number(a.page_number || 1) - Number(b.page_number || 1);
          if (pageDiff !== 0) return pageDiff;
          return Number(a.field_order || 0) - Number(b.field_order || 0);
        }),
    [fields],
  );

  const fillableFields = useMemo(
    () =>
      fields
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
    if (typeof ResizeObserver === "undefined") {
      setViewerWidth(node.clientWidth || 900);
      return undefined;
    }
    const observer = new ResizeObserver(() => {
      setViewerWidth(node.clientWidth || 900);
    });
    observer.observe(node);
    setViewerWidth(node.clientWidth || 900);
    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = window.setTimeout(() => {
      setToastMessage("");
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

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
        if (mounted) {
          setError(
            requestError?.response?.data?.msg || "Failed to load signing link.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchInvite();
    return () => {
      mounted = false;
    };
  }, [token]);

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
      setShowSignatureModal(true);
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

  function handleOpenSignatureModal() {
    const missing = getMissingRequiredFieldIds();
    if (missing.length > 0) {
      showToast("Please fill all required fields before signing.");
      jumpToFirstMissingRequiredField();
      setError("Please fill all required fields");
      return;
    }
    setError("");
    setShowSignatureModal(true);
  }

  function handleBottomNavNextOrSign() {
    if (getMissingRequiredFieldIds().length === 0) {
      handleOpenSignatureModal();
    } else {
      goToNextField();
    }
  }

  function goToNextField() {
    if (!fillableFields.length) return;
    const currentIndex = fillableFields.findIndex(
      (f) => String(f.field_id) === activeFieldId,
    );
    let nextIndex = currentIndex + 1;
    if (nextIndex >= fillableFields.length) {
      const missing = getMissingRequiredFieldIds();
      if (missing.length > 0) {
        showToast("Please fill all required fields before signing.");
        jumpToFirstMissingRequiredField();
        setError("Please fill all required fields");
      } else {
        handleOpenSignatureModal();
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
    const currentIndex = fillableFields.findIndex(
      (f) => String(f.field_id) === activeFieldId,
    );
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
    const isActive = activeFieldId === id;
    const value = getDisplayValue(field, fieldValues);
    const placeholder = getFieldPlaceholder(field);
    const showBubble = activeFieldId === id && field.field_type !== "checkbox";
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
            onClick={(e) => {
              if (typeof e.target.showPicker === "function") {
                try {
                  e.target.showPicker();
                } catch (err) {
                  console.warn("showPicker error:", err);
                }
              }
            }}
            className="terms-overlay-control terms-overlay-input"
          />
        </div>
      );
    }

    if (field.field_type === "signature") {
      return (
        <div
          className={`terms-overlay-control terms-overlay-signature ${isActive ? "active" : ""}`}
        >
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

  async function handleSubmit() {
    if (!token || !invite || !template) return;
    setError("");
    setSuccess("");
    const missing = validateRequiredFields();
    if (missing.length) {
      showToast("Please fill all required fields before signing.");
      jumpToFirstMissingRequiredField();
      setError(`Please fill all required fields`);
      setShowSignatureModal(false);
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
      setError("Please provide your signature.");
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

      // Render typed name into a canvas to get signature data URL
      const canvas = document.createElement("canvas");
      canvas.width = 1400;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#000000";
        ctx.font = "150px Inspiration";
        ctx.textBaseline = "middle";
        ctx.fillText(typedValue, 60, canvas.height / 2);
        signatureImageDataUrl = canvas.toDataURL("image/png");
      }

      if (!signatureImageDataUrl) {
        setError("Failed to render signature image. Please try again.");
        return;
      }
    } else if (requiresCandidateSignature) {
      signatureImageDataUrl = signatureImage;
    }

    setSubmitting(true);
    try {
      await termsApi.submitInvite(token, {
        field_values: payloadValues,
        signature_mode: signatureMode,
        signature_image_data_url: signatureImageDataUrl,
      });
      setShowSignatureModal(false);
      setJustSubmitted(true);
      setAlreadySigned(true);
      try {
        await checkAgreement();
      } catch (checkErr) {
        console.error(
          "Failed to auto-verify job screening agreement status",
          checkErr,
        );
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

  useEffect(() => {
    if (activeFieldId) {
      const el = inputRefMap.current.get(activeFieldId);
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeFieldId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#002856] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[#002856] text-xs font-semibold">
            Loading document details...
          </span>
        </div>
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="mx-auto max-w-md p-6">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 text-center font-medium">
          {error}
        </div>
      </div>
    );
  }

  // View 4: After successfully signing (Success Page)
  if (justSubmitted || alreadySigned) {
    return (
      <div className="w-full bg-white flex flex-col justify-start items-center overflow-hidden min-h-screen px-4 pb-10">
        {/* Back & Job Progress Subheader */}
        <div className="w-full max-w-md py-2.5 flex flex-col justify-start items-start gap-2.5">
          <div className="self-stretch inline-flex justify-between items-center">
            <div
              onClick={() => navigate("/job-screening")}
              className="flex justify-start items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 text-slate-800" />
              <div className="text-center justify-start text-slate-800 text-sm font-semibold  leading-6">
                Back
              </div>
            </div>
            <div className="text-center justify-start text-neutral-500 text-sm font-semibold  leading-6">
              Job Progress
            </div>
          </div>
        </div>

        {/* Success message view */}
        <div className="w-full max-w-md pt-4 pb-10 inline-flex justify-start items-center gap-2.5">
          <div className="flex-1 px-5 pt-10 pb-6 bg-gradient-to-b from-blue-100 to-blue-50 rounded-xl border border-blue-200/50 flex justify-start items-center gap-2.5">
            <div className="flex-1 inline-flex flex-col justify-start items-center gap-9">
              <div className="self-stretch flex flex-col justify-start items-center gap-5">
                {/* Visual Document Icon with Check */}
                <div className="size-12 relative bg-[#002856] rounded-xl overflow-hidden flex items-center justify-center text-white">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>

                <div className="self-stretch inline-flex justify-start items-center gap-6">
                  <div className="flex-1 inline-flex flex-col justify-start items-center gap-3">
                    <div className="self-stretch text-center justify-start text-[#002856] text-2xl font-bold ">
                      Agreement signed successfully
                    </div>
                    <div className="self-stretch text-center justify-start text-[#002856]/70 text-base font-medium  leading-5">
                      Your document has been verified and signed. You can now
                      move on to the next step.
                    </div>
                  </div>
                </div>

                {/* Maya Card Alert */}
                <div className="self-stretch pt-6 flex flex-col justify-start items-start gap-6">
                  <div className="w-full bg-white rounded-2xl flex items-center gap-3.5 shadow-sm text-left overflow-hidden">
                    <img
                      className="w-20 h-20 object-contain shrink-0 select-none"
                      src={mayaShocked}
                      alt="Maya"
                      draggable="false"
                    />
                    <div className="min-w-0 flex-1 pr-4 py-3">
                      <h5 className="text-[#002856] text-xs sm:text-sm font-bold">
                        Please note
                      </h5>
                      <p className="text-slate-500 text-[10px] sm:text-xs mt-0.5 leading-normal">
                        you can now proceed to next step.
                      </p>
                    </div>
                  </div>

                  {/* Return Button */}
                  <button
                    onClick={() => navigate("/job-screening")}
                    className="self-stretch px-4 py-3 bg-[#002856] hover:bg-[#001c3d] text-white rounded-lg shadow-md font-semibold text-base flex justify-center items-center transition-colors cursor-pointer"
                  >
                    Move to next step
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // View 1: Lobby Screen (Lobby Screen - First Page)
  if (!hasStarted) {
    return (
      <div className="w-full bg-white flex flex-col justify-start items-center overflow-hidden min-h-screen px-4 pb-10">
        {/* Back & Job Progress Subheader */}
        <div className="w-full max-w-md py-2.5 flex flex-col justify-start items-start gap-2.5">
          <div className="self-stretch inline-flex justify-between items-center">
            <div
              onClick={() => navigate("/job-screening")}
              className="flex justify-start items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 text-slate-800" />
              <div className="text-center justify-start text-slate-800 text-sm font-semibold  leading-6">
                Back
              </div>
            </div>
            <div className="text-center justify-start text-neutral-500 text-sm font-semibold  leading-6">
              Job Progress
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <div className="w-full max-w-md pt-6 pb-8 flex flex-col justify-start items-start gap-2.5">
          <div className="self-stretch inline-flex justify-start items-center gap-6">
            <div className="flex-1 inline-flex flex-col justify-start items-start gap-3">
              <div className="self-stretch justify-start text-[#002856] text-2xl font-bold ">
                Sign job registration form
              </div>
              <div className="self-stretch justify-start text-[#002856]/70 text-base font-medium  leading-5">
                {template?.description ||
                  "Please review the document details and complete the signature step below."}
              </div>
            </div>
          </div>
        </div>

        {/* Pending Card with Document Preview */}
        <div className="w-full max-w-md pb-10 flex flex-col justify-start items-start gap-2.5">
          <div className="w-full px-4 pt-5 pb-5 bg-white rounded-xl border border-zinc-200 flex flex-col justify-start items-center gap-6 overflow-hidden shadow-sm">
            <div className="self-stretch flex flex-col justify-center items-center gap-4">
              <div className="self-stretch flex flex-col justify-start items-center gap-4">
                <div className="self-stretch inline-flex justify-between items-start">
                  <div className="flex-1 flex justify-between items-center gap-2">
                    <div className="justify-start text-slate-900 text-base font-bold  leading-6 truncate">
                      {template?.title || "B1 & B2 registration form"}
                    </div>
                    <div className="px-2 bg-amber-100/60 rounded-[40px] border border-amber-200 flex justify-center items-center gap-1.5 flex-shrink-0">
                      <div className="text-center justify-start text-amber-600 text-xs font-semibold  leading-5">
                        pending
                      </div>
                    </div>
                  </div>
                </div>
                <div className="self-stretch inline-flex justify-start items-start gap-0.5">
                  <div className="flex-1 justify-start text-slate-500 text-sm font-medium  leading-5">
                    Ready for your candidate signature. Complete fields on all
                    pages.
                  </div>
                </div>

                {/* PDF Page 1 cover rendering */}
                <div className="self-stretch h-56 bg-zinc-100 rounded-md overflow-hidden relative border border-zinc-200 flex justify-center items-center pointer-events-none select-none">
                  <div className="scale-[0.4] origin-center absolute">
                    <Document
                      file={template?.source_pdf_url || ""}
                      loading={
                        <div className="text-xs text-slate-400">
                          Loading preview...
                        </div>
                      }
                    >
                      <Page
                        pageNumber={1}
                        width={343}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </Document>
                  </div>
                  <div className="absolute inset-0 bg-black/5" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger Button */}
          <div className="self-stretch pt-6 flex flex-col justify-start items-start gap-2">
            <div className="self-stretch flex flex-col justify-start items-start gap-4">
              <button
                onClick={handleStart}
                className="w-full px-4 py-3 bg-[#002856] hover:bg-[#001c3d] text-white rounded-lg shadow-md font-semibold text-base flex justify-center items-center transition-colors cursor-pointer"
              >
                Read &amp; Sign
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // View 2: Interactive Document Sign Page (Second Page)
  return (
    <div className="w-full bg-white min-h-screen px-4 pt-3 pb-28 flex flex-col items-center overflow-x-hidden">
      <div className="w-full max-w-4xl flex flex-col" ref={viewerRef}>
        {/* Back and Breadcrumb Header */}
        <div className="w-full flex justify-between items-center mb-4">
          <div
            onClick={() => setHasStarted(false)}
            className="flex justify-start items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 text-slate-800" />
            <div className="text-center justify-start text-slate-900 text-sm font-semibold  leading-6">
              Back
            </div>
          </div>
          <div className="text-center justify-start text-neutral-500 text-sm font-semibold  leading-6">
            Job Progress
          </div>
        </div>

        {error && (
          <div className="w-full rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 text-center font-medium">
            {error}
          </div>
        )}

        {/* PDF View Frame */}
        <div className="w-full flex flex-col">
          <Document
            file={template?.source_pdf_url || ""}
            loading={
              <div className="text-sm text-slate-500 py-6 text-center">
                Rendering Document...
              </div>
            }
            onLoadSuccess={({ numPages }) => setDocPages(numPages)}
          >
            <div className="w-full flex flex-col gap-10">
              {Array.from({ length: docPages || 1 }).map((_, idx) => {
                const pageNumber = idx + 1;
                const pageFields = (groupedFields.get(pageNumber) || []).filter(
                  (field) => isFieldVisibleToCandidate(field),
                );
                return (
                  <div
                    key={pageNumber}
                    className="relative flex flex-col items-start w-full gap-3"
                  >
                    <div className="w-full text-left text-[#002856]/70 text-base font-medium  leading-5">
                      Page {pageNumber}
                    </div>
                    <div className="w-full flex justify-center">
                      {/* Crop wrapper to center the zoomed document and crop left/right A4 margins */}
                      <div
                        className="overflow-hidden rounded-md border border-zinc-400 bg-slate-50 shadow-sm flex justify-center"
                        style={{ width: renderWidth }}
                      >
                        <div
                          className="terms-pdf-frame relative inline-block flex-shrink-0"
                          style={{ width: Math.floor(renderWidth * 1.16) }}
                        >
                          <Page
                            pageNumber={pageNumber}
                            width={Math.floor(renderWidth * 1.16)}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                          />
                          <div className="terms-overlay-layer">
                            {pageFields.map((field) => {
                              const isRightSide = Number(field.x || 0) > 0.55;
                              return (
                                <div
                                  key={field.field_id}
                                  className={`terms-overlay-field ${activeFieldId === String(field.field_id) ? "active" : ""} ${isRightSide ? "expand-left" : "expand-right"}`}
                                  style={getFieldBoxStyle(field, isMobile)}
                                >
                                  {renderOverlayFieldControl(field)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Document>
        </div>
      </div>

      {/* Interactive signature modal overlay */}
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
        handleUploadSignature={handleUploadSignature}
        submitting={submitting}
      />

      {toastMessage && <div className="terms-toast">{toastMessage}</div>}

      {/* Bottom Sticky Form Navigation Bar */}
      <div className="terms-bottom-nav" style={nextButtonStyle}>
        {!activeFieldId ? (
          <button
            onClick={() => goToNextField()}
            className="self-stretch w-full px-4 py-3 bg-[#002856] hover:bg-[#001c3d] text-white text-base font-semibold  leading-6 rounded-lg flex justify-center items-center shadow-md cursor-pointer transition-colors"
          >
            Read &amp; Sign
          </button>
        ) : (
          <div className="flex justify-between items-center w-full max-w-md mx-auto gap-4">
            <button
              onClick={goToPreviousField}
              className="terms-bottom-nav-btn terms-bottom-nav-btn-outline cursor-pointer disabled:opacity-50"
              disabled={
                fillableFields.findIndex(
                  (f) => String(f.field_id) === activeFieldId,
                ) <= 0
              }
            >
              Previous
            </button>
            <button
              onClick={handleBottomNavNextOrSign}
              className="terms-bottom-nav-btn terms-bottom-nav-btn-primary cursor-pointer"
            >
              {getMissingRequiredFieldIds().length === 0
                ? "Sign Document"
                : "Next"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
