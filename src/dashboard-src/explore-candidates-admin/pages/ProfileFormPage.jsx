import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Save,
  FileText,
  Video,
  User,
  GraduationCap,
  Briefcase,
  FileCheck,
  Image as ImageIcon,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
  Lock,
  Sparkles,
} from "lucide-react";
import { exploreCandidatesAdminApi } from "../../../api/exploreCandidatesAdminApi";
import {
  PageCard,
  Spinner,
} from "../components/common";
import {
  PrimaryButton,
  SecondaryButton,
  ActionButton,
  ControlDropdown,
  DynamicDropdownField,
} from "../components/controls";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { EuropassGeneratorModal } from "../components/europass/EuropassGeneratorModal";
import { INITIAL_PROFILE_FORM } from "../utils/constants";
import {
  normalizeDateForInput,
  calculateAgeFromDob,
  getStoredAssetLabel,
  openAssetInline,
  pickPdfOrReset,
} from "../utils/formatters";

const LANGUAGE_OPTIONS = [
  { value: "Yet to start", label: "Yet to start" },
  { value: "A1", label: "A1" },
  { value: "A2", label: "A2" },
  { value: "B1", label: "B1" },
  { value: "B2", label: "B2" },
  { value: "C1", label: "C1" },
  { value: "C2", label: "C2" },
];

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Others", label: "Others" },
];

export function ProfileFormPage({ mode }) {
  const navigate = useNavigate();
  const { profileId } = useParams();
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get("accountId") || "";
  const [form, setForm] = useState(INITIAL_PROFILE_FORM);
  const [initialForm, setInitialForm] = useState(mode === "edit" ? null : INITIAL_PROFILE_FORM);
  const [fieldOptions, setFieldOptions] = useState({
    qualification: [],
    experience: [],
    specialization: [],
  });
  const [videos, setVideos] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [newVideo, setNewVideo] = useState({
    title: "",
    display_order: 0,
    file: null,
  });
  const [newDoc, setNewDoc] = useState({
    title: "",
    display_order: 0,
    file: null,
  });
  const [createVideos, setCreateVideos] = useState([]);
  const [createDocs, setCreateDocs] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [videoUploadState, setVideoUploadState] = useState({});
  const [videoViewState, setVideoViewState] = useState({});
  const [docInputKey, setDocInputKey] = useState(0);
  const [videoInputKey, setVideoInputKey] = useState(0);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    description: "",
    onConfirm: null,
    loading: false,
  });
  const [europassModalOpen, setEuropassModalOpen] = useState(false);

  const isMainPhpReadOnly =
    mode === "edit" && String(profileId || "").startsWith("main_php:");
  // Age is stored only on local profiles; bridge sources (explore_php etc.)
  // can't persist it, so the field is hidden there instead of silently dropped.
  // profileId arrives as a source uid like "local:5" / "explore_php:5"; a bare
  // numeric id means local.
  const profileSource = String(profileId || "").includes(":")
    ? String(profileId).split(":")[0]
    : "local";
  const canEditAge = mode === "create" || profileSource === "local";

  const activeVideoList = mode === "edit" ? videos : createVideos;
  const nextVideoOrder = useMemo(
    () =>
      activeVideoList.reduce(
        (max, v) => Math.max(max, Number(v.display_order) || 0),
        -1,
      ) + 1,
    [activeVideoList],
  );

  // Keep the "new video" order default one above the current max. Skipped while
  // the admin has already started filling the row so we never clobber input.
  useEffect(() => {
    setNewVideo((v) =>
      v.title || v.file ? v : { ...v, display_order: nextVideoOrder },
    );
  }, [nextVideoOrder]);

  const isDirty = useMemo(() => {
    if (isMainPhpReadOnly) return false;
    if (mode === "create") {
      const hasFieldChange = Object.entries(form).some(([k, v]) => {
        const init = INITIAL_PROFILE_FORM[k] || "";
        if (v instanceof File) return true;
        return String(v || "").trim() !== String(init || "").trim();
      });
      return hasFieldChange || createDocs.length > 0 || createVideos.length > 0;
    }
    // mode === "edit"
    if (!initialForm) return false;
    return Object.entries(form).some(([k, v]) => {
      const init = initialForm[k] || "";
      if (v instanceof File) return true;
      return String(v || "").trim() !== String(init || "").trim();
    });
  }, [form, initialForm, mode, isMainPhpReadOnly, createDocs, createVideos]);

  const loadFieldOptions = async () => {
    try {
      const res = await exploreCandidatesAdminApi.getFieldOptions();
      setFieldOptions(
        res.data.data || {
          qualification: [],
          experience: [],
          specialization: [],
        },
      );
    } catch (e) {
      console.warn("Failed to load field options:", e.message);
    }
  };

  useEffect(() => {
    loadFieldOptions();
  }, []);

  const handleAddOption = async (fieldName, optionValue) => {
    await exploreCandidatesAdminApi.addFieldOption(fieldName, optionValue);
    await loadFieldOptions();
  };

  const handleUpdateOption = async (id, optionValue) => {
    await exploreCandidatesAdminApi.updateFieldOption(id, optionValue);
    await loadFieldOptions();
  };

  const handleDeleteOption = async (id) => {
    await exploreCandidatesAdminApi.deleteFieldOption(id);
    await loadFieldOptions();
  };

  async function refreshProfileDetails() {
    if (mode !== "edit") return;
    const res = await exploreCandidatesAdminApi.getProfileById(profileId);
    const data = res.data.data || {};
    setVideos(data.videos || []);
    setDocuments(data.documents || []);
  }

  useEffect(() => {
    if (mode !== "edit") {
      setInitialForm(INITIAL_PROFILE_FORM);
      return;
    }
    exploreCandidatesAdminApi.getProfileById(profileId).then((res) => {
      const data = res.data.data || {};
      const profile = data.profile || {};
      const loaded = {
        ...INITIAL_PROFILE_FORM,
        ...profile,
        dob: normalizeDateForInput(profile.dob),
      };
      // Older profiles may have dob but no stored age yet -- prefill it so a
      // save persists it without the admin re-entering anything.
      if (!String(loaded.age || "").trim() && loaded.dob) {
        loaded.age = calculateAgeFromDob(loaded.dob);
      }
      setForm(loaded);
      setInitialForm(loaded);
      setVideos(data.videos || []);
      setDocuments(data.documents || []);
    });
  }, [mode, profileId]);

  const handleSaveProfile = async () => {
    if (isMainPhpReadOnly || savingProfile) return;
    if (!form.fullname || !String(form.fullname).trim()) {
      toast.error("Full Name is required");
      return;
    }
    setSavingProfile(true);
    try {
      const payload = {
        fullname: form.fullname,
        email: form.email,
        countrycode: form.countrycode,
        phone: form.phone,
        dob: form.dob,
        age: form.age,
        gender: form.gender,
        expected_level: form.expected_level,
        qualification: form.qualification,
        experience: form.experience,
        language: form.language,
        specialization: form.specialization,
        photo: form.photo,
        resume: form.resume,
        degcert: form.degcert,
        workcert: form.workcert,
        langcert: form.langcert,
      };

      let profile;
      if (mode === "edit") {
        const res = await exploreCandidatesAdminApi.updateProfile(
          profileId,
          payload,
        );
        profile = res.data.data;
        setInitialForm({ ...form });
      } else {
        const res = await exploreCandidatesAdminApi.createProfile(payload);
        profile = res.data.data;
        for (const d of createDocs) {
          if (!d.title || !d.file) continue;
          await exploreCandidatesAdminApi.addProfileDocument(
            profile.id,
            {
              title: d.title,
              display_order: d.display_order || 0,
              document_file_upload: d.file,
            },
          );
        }
        for (const v of createVideos) {
          if (!v.title || !v.file) continue;
          await exploreCandidatesAdminApi.addProfileVideo(
            profile.id,
            {
              title: v.title,
              display_order: v.display_order || 0,
              video_file_upload: v.file,
            },
          );
        }
      }

      if (accountId && profile?.id) {
        await exploreCandidatesAdminApi.assignProfile(
          accountId,
          profile.id,
          0,
        );
        toast.success("Profile saved and assigned successfully");
        navigate(
          `/admin/explore-candidates/accounts/${accountId}/profiles`,
        );
        return;
      }
      toast.success(mode === "edit" ? "Profile updated successfully" : "Profile created successfully");
      navigate("/admin/explore-candidates/library");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Could not save profile",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const title =
    mode === "edit" ? "Edit Candidate Profile" : "Create Candidate Profile";

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <PageCard
        title={title}
        description={
          isMainPhpReadOnly
            ? "This profile is synced from the main platform database and is read-only here."
            : "Fill out the candidate's personal details, qualifications, certificates, and video introductions."
        }
        actions={
          <div className="flex gap-2">
            <Link
              to={
                accountId
                  ? `/admin/explore-candidates/accounts/${accountId}/profiles`
                  : "/admin/explore-candidates/library"
              }
            >
              <SecondaryButton icon={ArrowLeft}>Back</SecondaryButton>
            </Link>
          </div>
        }
      >
        {isMainPhpReadOnly && (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-800">
            <Lock className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              This record is synced directly from the main website and cannot be modified here.
            </span>
          </div>
        )}

        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <User className="h-4 w-4 text-[#083262]" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
              1. Basic & Contact Information
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["fullname", "Full Name *", "e.g. John Doe"],
              ["email", "Email Address", "e.g. candidate@example.com"],
              ["countrycode", "Country Code", "e.g. +91"],
              ["phone", "Phone Number", "e.g. 9876543210"],
              ["expected_level", "Expected Level", "e.g. B2 / Senior"],
            ].map(([field, label, placeholder]) => (
              <div key={field} className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {label}
                </label>
                <input
                  disabled={isMainPhpReadOnly}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] transition disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder={placeholder}
                  value={form[field] || ""}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, [field]: e.target.value }))
                  }
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Language Proficiency
              </label>
              <ControlDropdown
                disabled={isMainPhpReadOnly}
                value={form.language || ""}
                onChange={(val) => setForm((v) => ({ ...v, language: val }))}
                options={LANGUAGE_OPTIONS}
                placeholder="Select language level..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Date of Birth
              </label>
              <input
                disabled={isMainPhpReadOnly}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] transition disabled:bg-slate-100"
                type="date"
                value={form.dob || ""}
                onChange={(e) => {
                  const dob = e.target.value;
                  const computedAge = calculateAgeFromDob(dob);
                  setForm((v) => ({
                    ...v,
                    dob,
                    age: computedAge || v.age,
                  }));
                }}
              />
            </div>

            {canEditAge ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Age
                </label>
                <input
                  disabled={isMainPhpReadOnly}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] transition disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="e.g. 28"
                  value={form.age || ""}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, age: e.target.value }))
                  }
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Gender
              </label>
              <ControlDropdown
                disabled={isMainPhpReadOnly}
                value={form.gender || ""}
                onChange={(val) => setForm((v) => ({ ...v, gender: val }))}
                options={GENDER_OPTIONS}
                placeholder="Select gender..."
              />
            </div>
          </div>
        </div>

        {/* Section 2: Qualifications & Specialization */}
        <div className="space-y-4 pt-6">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <GraduationCap className="h-4 w-4 text-[#083262]" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
              2. Professional Qualifications & Track
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <DynamicDropdownField
              label="Qualification"
              field="qualification"
              value={form.qualification || ""}
              options={fieldOptions.qualification || []}
              onChange={(val) => setForm((v) => ({ ...v, qualification: val }))}
              onAddOption={handleAddOption}
              onUpdateOption={handleUpdateOption}
              onDeleteOption={handleDeleteOption}
              readOnly={isMainPhpReadOnly}
              placeholder="e.g. BSc Nursing, BPT..."
            />

            <DynamicDropdownField
              label="Experience Range"
              field="experience"
              value={form.experience || ""}
              options={fieldOptions.experience || []}
              onChange={(val) => setForm((v) => ({ ...v, experience: val }))}
              onAddOption={handleAddOption}
              onUpdateOption={handleUpdateOption}
              onDeleteOption={handleDeleteOption}
              readOnly={isMainPhpReadOnly}
              placeholder="e.g. 1-2 years, Fresher..."
            />

            <DynamicDropdownField
              label="Specialization / Domain"
              field="specialization"
              value={form.specialization || ""}
              options={fieldOptions.specialization || []}
              onChange={(val) => setForm((v) => ({ ...v, specialization: val }))}
              onAddOption={handleAddOption}
              onUpdateOption={handleUpdateOption}
              onDeleteOption={handleDeleteOption}
              readOnly={isMainPhpReadOnly}
              placeholder="e.g. ICU / Critical Care..."
            />
          </div>
        </div>

        {/* Section 3: Core Certificates & Documents (PDF) */}
        <div className="space-y-4 pt-6">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <FileCheck className="h-4 w-4 text-[#083262]" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
              3. Verification Documents & Certificates (PDF)
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["resume", "Resume / CV (PDF)"],
              ["degcert", "Degree Certificate (PDF)"],
              ["workcert", "Experience / Work Certificate (PDF)"],
              ["langcert", "Language Certificate (PDF)"],
            ].map(([field, label]) => (
              <div
                key={field}
                className="space-y-2 rounded-2xl border border-slate-200 p-4 bg-slate-50/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {label}
                  </label>
                  {field === "resume" && (
                    <button
                      type="button"
                      onClick={() => setEuropassModalOpen(true)}
                      disabled={isMainPhpReadOnly}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-[#083262] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#083262]" />
                      1-Click Europass Generator
                    </button>
                  )}
                </div>
                <input
                  disabled={isMainPhpReadOnly}
                  className="w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#083262] file:text-white file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-[#052243] transition cursor-pointer disabled:opacity-50"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) =>
                    setForm((v) => ({
                      ...v,
                      [field]: pickPdfOrReset(
                        e.target.files?.[0] || null,
                        e.target,
                      ),
                    }))
                  }
                />
                <div className="text-xs text-slate-600 flex items-center justify-between pt-1">
                  <span className="truncate max-w-[220px]">
                    {typeof File !== "undefined" && form[field] instanceof File
                      ? form[field].name
                      : form[field]
                        ? getStoredAssetLabel(
                            form[field],
                            `${label.replace(/\s*\(PDF\)\s*/i, "")}.pdf`,
                          )
                        : "No document selected"}
                  </span>
                  {!(
                    typeof File !== "undefined" && form[field] instanceof File
                  ) &&
                    form[field] && (
                      <ActionButton
                        variant="primary"
                        icon={Eye}
                        onClick={() => openAssetInline(form[field])}
                      >
                        View PDF
                      </ActionButton>
                    )}
                </div>
              </div>
            ))}
          </div>

          {/* Profile Photo */}
          <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50 max-w-lg space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
              Candidate Profile Photo (Image)
            </label>
            <input
              disabled={isMainPhpReadOnly}
              className="w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#083262] file:text-white file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-[#052243] transition cursor-pointer disabled:opacity-50"
              type="file"
              accept="image/*"
              onChange={(e) =>
                setForm((v) => ({ ...v, photo: e.target.files?.[0] || null }))
              }
            />
            <div className="text-xs text-slate-600 flex items-center gap-3 pt-1">
              <span className="truncate max-w-[240px]">
                {typeof File !== "undefined" && form.photo instanceof File
                  ? form.photo.name
                  : form.photo
                    ? getStoredAssetLabel(form.photo, "Profile photo")
                    : "No photo chosen"}
              </span>
              {typeof form.photo === "string" && form.photo && (
                <img
                  src={form.photo}
                  alt="Profile"
                  className="h-10 w-10 rounded-lg object-cover border border-slate-200 cursor-pointer shadow-xs"
                  onClick={() => window.open(form.photo, "_blank", "noopener,noreferrer")}
                />
              )}
            </div>
          </div>
        </div>


      </PageCard>

      {/* Additional Documents Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <FileText className="h-5 w-5 text-[#083262]" />
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Additional Documents
            </h2>
            <p className="text-xs text-slate-500">
              Attach transcripts, additional accreditations, or training certificates.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          {(mode === "edit" ? documents : createDocs).map((doc, idx) => (
            <div
              key={doc.id || `new-doc-${idx}`}
              className="flex flex-col md:flex-row md:items-end gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50"
            >
              {mode === "edit" ? (
                <>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Title
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] transition"
                      defaultValue={doc.title}
                      onBlur={async (e) => {
                        await exploreCandidatesAdminApi.updateProfileDocument(
                          doc.id,
                          {
                            title: e.target.value,
                          },
                        );
                      }}
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Order
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] transition"
                      type="number"
                      defaultValue={doc.display_order || 0}
                      onBlur={async (e) => {
                        await exploreCandidatesAdminApi.updateProfileDocument(
                          doc.id,
                          {
                            display_order: Number(e.target.value || 0),
                          },
                        );
                        await refreshProfileDetails();
                      }}
                    />
                  </div>
                  <div className="flex-[2] space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                      File{" "}
                      {doc.document_file && (
                        <span
                          className="text-[#083262] truncate ml-2 max-w-[150px]"
                          title={doc.document_file}
                        >
                          {getStoredAssetLabel(
                            doc.document_file,
                            `${doc.title || "Document"}.pdf`,
                          )}
                        </span>
                      )}
                    </label>
                    <input
                      className="w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-slate-300 transition cursor-pointer"
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={async (e) => {
                        const f = pickPdfOrReset(
                          e.target.files?.[0] || null,
                          e.target,
                        );
                        if (!f) return;
                        await exploreCandidatesAdminApi.updateProfileDocument(
                          doc.id,
                          {
                            document_file_upload: f,
                          },
                        );
                      }}
                    />
                  </div>
                  {doc.document_file && (
                    <ActionButton
                      variant="primary"
                      icon={Eye}
                      onClick={() => openAssetInline(doc.document_file)}
                    >
                      View
                    </ActionButton>
                  )}
                  <ActionButton
                    variant="danger"
                    icon={Trash2}
                    onClick={() => {
                      setConfirmModal({
                        open: true,
                        title: "Delete Document",
                        description: `Are you sure you want to delete "${doc.title || "this document"}"? This action cannot be undone.`,
                        onConfirm: async () => {
                          try {
                            setConfirmModal((v) => ({ ...v, loading: true }));
                            await exploreCandidatesAdminApi.deleteProfileDocument(
                              doc.id,
                            );
                            await refreshProfileDetails();
                            toast.success("Document deleted");
                            setConfirmModal({ open: false, title: "", description: "", onConfirm: null, loading: false });
                          } catch (err) {
                            toast.error(err?.response?.data?.message || "Failed to delete document");
                            setConfirmModal((v) => ({ ...v, loading: false }));
                          }
                        },
                      });
                    }}
                  >
                    Delete
                  </ActionButton>
                </>
              ) : (
                <>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Title
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] transition"
                      value={doc.title}
                      onChange={(e) => {
                        const next = [...createDocs];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setCreateDocs(next);
                      }}
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Order
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] transition"
                      type="number"
                      value={doc.display_order || 0}
                      onChange={(e) => {
                        const next = [...createDocs];
                        next[idx] = {
                          ...next[idx],
                          display_order: Number(e.target.value || 0),
                        };
                        setCreateDocs(next);
                      }}
                    />
                  </div>
                  <div className="flex-[2] flex items-center justify-between text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-3.5 py-2">
                    <span className="truncate">
                      {doc.file?.name || "No file attached"}
                    </span>
                    <ActionButton
                      variant="danger"
                      icon={Trash2}
                      onClick={() => {
                        const next = createDocs.filter((_, i) => i !== idx);
                        setCreateDocs(next);
                      }}
                    >
                      Remove
                    </ActionButton>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Add Document Row */}
          <div className="flex flex-col md:flex-row md:items-end gap-3 p-4 rounded-2xl border border-dashed border-slate-300 bg-white">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                New Document Title
              </label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] transition"
                placeholder="e.g. Recommendation Letter"
                value={newDoc.title}
                onChange={(e) =>
                  setNewDoc((v) => ({ ...v, title: e.target.value }))
                }
              />
            </div>
            <div className="w-24 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Order
              </label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] transition"
                type="number"
                value={newDoc.display_order}
                onChange={(e) =>
                  setNewDoc((v) => ({
                    ...v,
                    display_order: Number(e.target.value || 0),
                  }))
                }
              />
            </div>
            <div className="flex-[2] space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                File (PDF)
              </label>
              <input
                key={`new-doc-file-${docInputKey}`}
                className="w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-slate-300 transition cursor-pointer"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) =>
                  setNewDoc((v) => ({
                    ...v,
                    file: pickPdfOrReset(
                      e.target.files?.[0] || null,
                      e.target,
                    ),
                  }))
                }
              />
            </div>
            <SecondaryButton
              disabled={!newDoc.title || !newDoc.file}
              icon={Plus}
              onClick={async () => {
                if (!newDoc.title || !newDoc.file) return;
                if (mode === "edit") {
                  await exploreCandidatesAdminApi.addProfileDocument(
                    profileId,
                    {
                      title: newDoc.title,
                      display_order: newDoc.display_order,
                      document_file_upload: newDoc.file,
                    },
                  );
                } else {
                  setCreateDocs((prev) => [...prev, { ...newDoc }]);
                }
                setNewDoc({ title: "", display_order: 0, file: null });
                setDocInputKey((v) => v + 1);
                if (mode === "edit") await refreshProfileDetails();
              }}
            >
              Add Document
            </SecondaryButton>
          </div>
        </div>
      </div>

      {/* Videos Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Video className="h-5 w-5 text-[#083262]" />
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Video Introductions
            </h2>
            <p className="text-xs text-slate-500">
              Upload candidate self-introduction videos, language speech tests, or demonstration clips.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          {(mode === "edit" ? videos : createVideos).map((video, idx) => (
            <div
              key={video.id || `new-video-${idx}`}
              className="flex flex-col md:flex-row md:items-end gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50"
            >
              {mode === "edit" ? (
                <>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Title
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] transition"
                      defaultValue={video.title}
                      onBlur={async (e) => {
                        await exploreCandidatesAdminApi.updateProfileVideo(
                          video.id,
                          {
                            title: e.target.value,
                          },
                        );
                      }}
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Order
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] transition"
                      type="number"
                      defaultValue={video.display_order || 0}
                      onBlur={async (e) => {
                        await exploreCandidatesAdminApi.updateProfileVideo(
                          video.id,
                          {
                            display_order: Number(e.target.value || 0),
                          },
                        );
                        await refreshProfileDetails();
                      }}
                    />
                  </div>
                  <div className="flex-[2] space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                      <span>Video File</span>
                      {videoUploadState[video.id] ? (
                        <span className="text-[#083262] font-bold">
                          Uploading video...
                        </span>
                      ) : video.video_file ? (
                        <span
                          className="text-[#083262] truncate ml-2 max-w-[150px]"
                          title={video.video_file}
                        >
                          {getStoredAssetLabel(
                            video.video_file,
                            `${video.title || "Video"}`,
                          )}
                        </span>
                      ) : null}
                    </label>
                    <input
                      className="w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-slate-300 transition cursor-pointer"
                      type="file"
                      accept="video/*"
                      disabled={Boolean(videoUploadState[video.id])}
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setVideoUploadState((state) => ({
                          ...state,
                          [video.id]: true,
                        }));
                        try {
                          await exploreCandidatesAdminApi.updateProfileVideo(
                            video.id,
                            {
                              video_file_upload: f,
                            },
                          );
                          await refreshProfileDetails();
                          toast.success("Video updated");
                        } catch (error) {
                          toast.error(
                            error?.response?.data?.message ||
                              "Could not upload video",
                          );
                        } finally {
                          setVideoUploadState((state) => ({
                            ...state,
                            [video.id]: false,
                          }));
                          e.target.value = "";
                        }
                      }}
                    />
                  </div>
                  {video.video_file && (
                    <ActionButton
                      variant="primary"
                      icon={Eye}
                      disabled={Boolean(videoViewState[video.id])}
                      onClick={async () => {
                        setVideoViewState((state) => ({ ...state, [video.id]: true }));
                        try {
                          await openAssetInline(video.video_file);
                        } finally {
                          setVideoViewState((state) => ({ ...state, [video.id]: false }));
                        }
                      }}
                    >
                      {videoViewState[video.id] ? "Opening..." : "Play Video"}
                    </ActionButton>
                  )}
                  <ActionButton
                    variant="danger"
                    icon={Trash2}
                    onClick={() => {
                      setConfirmModal({
                        open: true,
                        title: "Delete Video",
                        description: `Are you sure you want to delete "${video.title || "this video"}"? This action cannot be undone.`,
                        onConfirm: async () => {
                          try {
                            setConfirmModal((v) => ({ ...v, loading: true }));
                            await exploreCandidatesAdminApi.deleteProfileVideo(
                              video.id,
                            );
                            await refreshProfileDetails();
                            toast.success("Video deleted");
                            setConfirmModal({ open: false, title: "", description: "", onConfirm: null, loading: false });
                          } catch (err) {
                            toast.error(err?.response?.data?.message || "Failed to delete video");
                            setConfirmModal((v) => ({ ...v, loading: false }));
                          }
                        },
                      });
                    }}
                  >
                    Delete
                  </ActionButton>
                </>
              ) : (
                <>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Title
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] transition"
                      value={video.title}
                      onChange={(e) => {
                        const next = [...createVideos];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setCreateVideos(next);
                      }}
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Order
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] transition"
                      type="number"
                      value={video.display_order || 0}
                      onChange={(e) => {
                        const next = [...createVideos];
                        next[idx] = {
                          ...next[idx],
                          display_order: Number(e.target.value || 0),
                        };
                        setCreateVideos(next);
                      }}
                    />
                  </div>
                  <div className="flex-[2] flex items-center justify-between text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-3.5 py-2">
                    <span className="truncate">
                      {video.file?.name || "No file attached"}
                    </span>
                    <ActionButton
                      variant="danger"
                      icon={Trash2}
                      onClick={() => {
                        const next = createVideos.filter((_, i) => i !== idx);
                        setCreateVideos(next);
                      }}
                    >
                      Remove
                    </ActionButton>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Add Video Row */}
          <div className="flex flex-col md:flex-row md:items-end gap-3 p-4 rounded-2xl border border-dashed border-slate-300 bg-white">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                New Video Title
              </label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] transition"
                placeholder="e.g. Self Introduction (German B2)"
                value={newVideo.title}
                onChange={(e) =>
                  setNewVideo((v) => ({ ...v, title: e.target.value }))
                }
              />
            </div>
            <div className="w-24 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Order
              </label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#083262] focus:outline-none focus:ring-1 focus:ring-[#083262] transition"
                type="number"
                value={newVideo.display_order}
                onChange={(e) =>
                  setNewVideo((v) => ({
                    ...v,
                    display_order: Number(e.target.value || 0),
                  }))
                }
              />
            </div>
            <div className="flex-[2] space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                File (Video)
              </label>
              <input
                key={`new-video-file-${videoInputKey}`}
                className="w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-slate-300 transition cursor-pointer"
                type="file"
                accept="video/*"
                onChange={(e) =>
                  setNewVideo((v) => ({
                    ...v,
                    file: e.target.files?.[0] || null,
                  }))
                }
              />
            </div>
            <SecondaryButton
              disabled={
                !newVideo.title ||
                !newVideo.file ||
                Boolean(videoUploadState.new)
              }
              icon={Plus}
              onClick={async () => {
                if (!newVideo.title || !newVideo.file) return;
                if (mode === "edit") {
                  setVideoUploadState((state) => ({ ...state, new: true }));
                  try {
                    await exploreCandidatesAdminApi.addProfileVideo(
                      profileId,
                      {
                        title: newVideo.title,
                        display_order: newVideo.display_order,
                        video_file_upload: newVideo.file,
                      },
                    );
                    setNewVideo({ title: "", display_order: 0, file: null });
                    setVideoInputKey((v) => v + 1);
                    toast.success("Video uploaded");
                    await refreshProfileDetails();
                  } catch (error) {
                    toast.error(
                      error?.response?.data?.message ||
                        "Could not upload video",
                    );
                  } finally {
                    setVideoUploadState((state) => ({
                      ...state,
                      new: false,
                    }));
                  }
                  return;
                }
                setCreateVideos((prev) => [...prev, { ...newVideo }]);
                setNewVideo({ title: "", display_order: 0, file: null });
                setVideoInputKey((v) => v + 1);
              }}
            >
              {videoUploadState.new ? "Uploading..." : "Add Video"}
            </SecondaryButton>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmModal.open}
        title={confirmModal.title}
        description={confirmModal.description}
        loading={confirmModal.loading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ open: false, title: "", description: "", onConfirm: null, loading: false })}
      />

      {/* Mounted only while open so state re-seeds from the loaded profile each time */}
      {europassModalOpen && (
        <EuropassGeneratorModal
          isOpen
          onClose={() => setEuropassModalOpen(false)}
          candidateForm={form}
          currentResume={form.resume}
          onAttach={(file) => {
            setForm((v) => ({ ...v, resume: file }));
          }}
        />
      )}

      {/* Floating Save Changes Bar (appears only when unsaved changes exist) */}
      {isDirty && !isMainPhpReadOnly && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center pointer-events-none px-4 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-5 py-3 shadow-2xl backdrop-blur-md ring-1 ring-slate-900/10">
            <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-700">
                {mode === "edit" ? "Unsaved changes" : "New profile data"}
              </span>
            </div>
            {mode === "edit" && initialForm && (
              <SecondaryButton
                disabled={savingProfile}
                onClick={() => {
                  setForm({ ...initialForm });
                  toast.success("Changes discarded");
                }}
              >
                Discard
              </SecondaryButton>
            )}
            <PrimaryButton
              icon={Save}
              disabled={savingProfile || !form.fullname?.trim()}
              loading={savingProfile}
              onClick={handleSaveProfile}
            >
              {mode === "edit" ? "Save Changes" : "Create Profile"}
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}
