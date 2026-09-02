import React, { useState, useEffect, useRef } from "react";
import { X, Image as ImageIcon, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { btn, inputCls, labelCls } from "./ui/buttons";

export default function PathwayModal({ pathway = null, onClose, onSave, saving = false }) {
  const isEdit = Boolean(pathway?.id);
  const [form, setForm] = useState({
    title: "",
    description: "",
    badge: "",
    is_active: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (pathway) {
      setForm({
        title: pathway.title || "",
        description: pathway.description || "",
        badge: pathway.badge || "",
        is_active: pathway.is_active !== undefined ? Boolean(pathway.is_active) : true,
      });
      setImageFile(null);
      setPreviewUrl(null);
    } else {
      setForm({
        title: "",
        description: "",
        badge: "",
        is_active: true,
      });
      setImageFile(null);
      setPreviewUrl(null);
    }
  }, [pathway]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onPickImage = (e) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        toast.error("Only JPG, PNG, or WEBP images are allowed.");
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be 5MB or smaller.");
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
    }
    setImageFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const handleClearImage = () => {
    setImageFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("description", form.description.trim());
    fd.append("badge", form.badge.trim());
    fd.append("is_active", String(Boolean(form.is_active)));
    if (imageFile) {
      fd.append("image", imageFile);
    }

    onSave(fd, pathway?.id);
  };

  const shownImage = previewUrl || pathway?.image_url || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {isEdit ? "Edit Exam Pathway" : "New Exam Pathway"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit
                ? "Update pathway presentation for candidate onboarding."
                : "Create a new onboarding pathway to host scholarship exams."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Pathway Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Nursing Scholarship, Tech Apprenticeship"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea
              rows={2}
              placeholder="Brief description shown to candidates on the onboarding selection card..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Card Image</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                {shownImage ? (
                  <img
                    src={shownImage}
                    alt="Pathway preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-300" />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={btn.secondary}
                >
                  <ImageIcon className="w-3.5 h-3.5" /> {shownImage ? "Change Image" : "Upload Image"}
                </button>
                {shownImage && (
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="text-xs text-slate-400 hover:text-red-600 text-left"
                  >
                    Clear selection
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={onPickImage}
                  className="hidden"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">PNG, JPG or WEBP format recommended.</p>
          </div>

          <div>
            <label className={labelCls}>Badge (Optional)</label>
            <input
              type="text"
              placeholder="e.g. popular, limited seats, new"
              value={form.badge}
              onChange={(e) => setForm({ ...form, badge: e.target.value })}
              className={inputCls}
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-700">Show in Onboarding</p>
              <p className="text-[11px] text-slate-400">Candidates will see this pathway during signup.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.is_active}
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
                form.is_active ? "bg-green-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.is_active ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={btn.secondary}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.title.trim()}
              className={btn.primary}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Pathway"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
