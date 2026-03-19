import { useState, useEffect } from "react";
import { Save, Upload, Link2, Copy } from "lucide-react";
import {
  fetchSectionsByLevel,
  saveDemoClass,
  saveSalaryInfo,
  saveTalkToTeam,
  uploadSectionImage,
} from "../../api/landingPageApi";

// ---- Shared UI ----

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <h3 className="text-base font-semibold text-[#004E92] mb-5 pb-3 border-b border-gray-100">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-600 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#004E92] focus:border-transparent transition";

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputCls}
    />
  );
}

function TextareaInput({ value, onChange, placeholder }) {
  return (
    <textarea
      rows={3}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputCls}
    />
  );
}

function ImageInput({ label, value, onChange, onUpload }) {
  const [mode, setMode] = useState("url");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await onUpload(file);
      onChange(res.data.url);
      setFile(null);
    } catch {
      alert("Upload failed. Try a public URL instead.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <FieldRow label={label}>
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition ${
            mode === "url"
              ? "bg-[#004E92] text-white border-[#004E92]"
              : "border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          <Link2 className="w-3 h-3" /> Public URL
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition ${
            mode === "upload"
              ? "bg-[#004E92] text-white border-[#004E92]"
              : "border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          <Upload className="w-3 h-3" /> Upload from device
        </button>
      </div>

      {mode === "url" ? (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className={inputCls}
        />
      ) : (
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0] || null)}
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gray-100 file:text-gray-700"
          />
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !file}
            className="bg-[#004E92] text-white text-sm px-4 py-2 rounded-xl disabled:opacity-50 whitespace-nowrap hover:bg-blue-900 transition"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      )}

      {value && (
        <img
          src={value}
          alt="Current"
          className="mt-3 h-28 w-auto rounded-xl object-cover border border-gray-100"
        />
      )}
    </FieldRow>
  );
}

function ActionButtons({ onSave, onCopy, saving, copying, otherLevel }) {
  return (
    <div className="flex gap-3 mt-2 flex-wrap">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-2 bg-[#004E92] text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-blue-900 transition"
      >
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : "Save Changes"}
      </button>
      <button
        type="button"
        onClick={onCopy}
        disabled={copying}
        className="flex items-center gap-2 border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition"
      >
        <Copy className="w-4 h-4" />
        {copying ? "Copying..." : `Apply same to ${otherLevel}`}
      </button>
    </div>
  );
}

// ---- Inline Previews ----

function DemoPreview({ d }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200">
      <div className="flex min-h-[140px]">
        <div className="bg-[#002856] p-4 w-[55%]">
          <p className="text-white font-semibold text-sm leading-snug mb-1">
            {d.heading}
          </p>
          <p className="text-white text-xs opacity-70 mb-2">{d.subtitle}</p>
          <div className="flex flex-wrap gap-3 mb-3">
            {[d.check_item_1, d.check_item_2].map((item, i) => (
              <span
                key={i}
                className="flex items-center gap-1 text-white text-xs opacity-80"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-[#003D83] flex items-center justify-center text-[#edb843] font-bold text-[9px]">
                  ✓
                </span>
                {item}
              </span>
            ))}
          </div>
          <div className="bg-[#F9C235] text-white text-xs text-center rounded-lg py-1 px-2 mb-1">
            {d.button_text}
          </div>
          <p className="text-[#edb843] text-[10px] text-center">
            {d.badge_text}
          </p>
        </div>
        <div className="w-[45%] bg-gray-100 flex items-center justify-center">
          {d.image_url ? (
            <img
              src={d.image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-gray-400 text-xs">No image set</span>
          )}
        </div>
      </div>
    </div>
  );
}

function SalaryPreview({ d }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex flex-row-reverse min-h-[140px]">
        <div className="w-[40%] bg-gray-100 flex items-center justify-center">
          {d.image_url ? (
            <img
              src={d.image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-gray-400 text-xs">No image set</span>
          )}
        </div>
        <div className="w-[60%] p-4">
          <p className="font-semibold text-sm leading-snug mb-1">{d.heading}</p>
          <p className="text-gray-500 text-xs mb-2">{d.subtitle}</p>
          <ul className="list-disc pl-4 text-xs text-gray-600 space-y-0.5 mb-2">
            {[d.benefit_1, d.benefit_2, d.benefit_3, d.benefit_4].map(
              (b, i) => b && <li key={i}>{b}</li>,
            )}
          </ul>
          <div className="bg-[#F9C235] text-white text-xs text-center rounded-lg py-1 px-2 max-w-[120px]">
            {d.button_text}
          </div>
        </div>
      </div>
    </div>
  );
}

function TalkPreview({ d }) {
  return (
    <div className="rounded-xl bg-[rgba(237,184,67,0.15)] p-4">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
          {d.avatar_image_url ? (
            <img
              src={d.avatar_image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-gray-400 text-[10px]">Avatar</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm mb-1">{d.heading}</p>
          {[d.feature_1, d.feature_2, d.feature_3].map(
            (f, i) =>
              f && (
                <p key={i} className="text-xs text-gray-600">
                  • {f}
                </p>
              ),
          )}
        </div>
        <div className="text-center flex-shrink-0">
          <div className="bg-gray-900 text-white text-xs rounded-full py-1.5 px-3 mb-1 whitespace-nowrap">
            {d.button_text}
          </div>
          <p className="text-[10px] text-gray-600">{d.phone_display_text}</p>
        </div>
      </div>
    </div>
  );
}

// ---- Constants ----
const LEVEL_TABS = ["A1", "A2"];
const SECTION_TABS = [
  { id: "demo_class", label: "Demo Class" },
  { id: "salary_info", label: "Salary Info" },
  { id: "talk_to_team", label: "Talk to Team" },
];

// ---- Main Component ----
export default function LandingPageManagement() {
  const [activeLevel, setActiveLevel] = useState("A1");
  const [activeSection, setActiveSection] = useState("demo_class");
  // Store data per level: { A1: { demo_class: {}, ... }, A2: { demo_class: {}, ... } }
  const [allData, setAllData] = useState({ A1: null, A2: null });
  const [loadingLevel, setLoadingLevel] = useState({ A1: false, A2: false });
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);

  const loadLevel = (level) => {
    if (allData[level]) return; // already loaded
    setLoadingLevel((p) => ({ ...p, [level]: true }));
    fetchSectionsByLevel(level)
      .then((res) => setAllData((p) => ({ ...p, [level]: res.data })))
      .catch(() => {})
      .finally(() => setLoadingLevel((p) => ({ ...p, [level]: false })));
  };

  useEffect(() => {
    loadLevel("A1");
  }, []);

  const handleLevelChange = (level) => {
    setActiveLevel(level);
    loadLevel(level);
  };

  const set = (section, field, value) => {
    setAllData((prev) => ({
      ...prev,
      [activeLevel]: {
        ...prev[activeLevel],
        [section]: {
          ...(prev[activeLevel]?.[section] || {}),
          [field]: value,
        },
      },
    }));
  };

  const otherLevel = activeLevel === "A1" ? "A2" : "A1";

  const handleSave = async () => {
    const d = allData[activeLevel];
    if (!d) return;
    setSaving(true);
    try {
      if (activeSection === "demo_class")
        await saveDemoClass(activeLevel, d.demo_class);
      if (activeSection === "salary_info")
        await saveSalaryInfo(activeLevel, d.salary_info);
      if (activeSection === "talk_to_team")
        await saveTalkToTeam(activeLevel, d.talk_to_team);
      alert(`${activeLevel} — Saved successfully.`);
    } catch {
      alert("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Copy current section data to the other level and save both
  const handleCopyToOther = async () => {
    const d = allData[activeLevel];
    if (!d) return;
    setCopying(true);
    try {
      const sectionData = d[activeSection];
      // Mirror into other level's local state
      setAllData((prev) => ({
        ...prev,
        [otherLevel]: {
          ...(prev[otherLevel] || {}),
          [activeSection]: { ...sectionData },
        },
      }));
      // Save current level first, then other level
      const saveFn =
        activeSection === "demo_class"
          ? saveDemoClass
          : activeSection === "salary_info"
            ? saveSalaryInfo
            : saveTalkToTeam;
      await saveFn(activeLevel, sectionData);
      await saveFn(otherLevel, sectionData);
      alert(`Saved to both ${activeLevel} and ${otherLevel}.`);
    } catch {
      alert("Copy failed. Please try again.");
    } finally {
      setCopying(false);
    }
  };

  const currentData = allData[activeLevel];
  const isLoading = loadingLevel[activeLevel];

  const dc = currentData?.demo_class || {};
  const si = currentData?.salary_info || {};
  const tt = currentData?.talk_to_team || {};

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#004E92] mb-5">
        Landing Page Sections
      </h2>

      {/* Level tabs (A1 / A2) */}
      <div className="flex gap-2 mb-5">
        {LEVEL_TABS.map((lvl) => (
          <button
            key={lvl}
            onClick={() => handleLevelChange(lvl)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition border ${
              activeLevel === lvl
                ? "bg-[#004E92] text-white border-[#004E92]"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {lvl}
          </button>
        ))}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {SECTION_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeSection === tab.id
                ? "border-[#004E92] text-[#004E92]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Loading {activeLevel} data...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Left: Form */}
          <div>
            {activeSection === "demo_class" && (
              <SectionCard title={`Demo Class — ${activeLevel}`}>
                <FieldRow label="Heading">
                  <TextInput
                    value={dc.heading}
                    onChange={(v) => set("demo_class", "heading", v)}
                    placeholder="Free Demo Class..."
                  />
                </FieldRow>
                <FieldRow label="Subtitle">
                  <TextareaInput
                    value={dc.subtitle}
                    onChange={(v) => set("demo_class", "subtitle", v)}
                  />
                </FieldRow>
                <FieldRow label="Check Item 1 (e.g. Today)">
                  <TextInput
                    value={dc.check_item_1}
                    onChange={(v) => set("demo_class", "check_item_1", v)}
                    placeholder="Today"
                  />
                </FieldRow>
                <FieldRow label="Check Item 2 (e.g. 9:00 PM)">
                  <TextInput
                    value={dc.check_item_2}
                    onChange={(v) => set("demo_class", "check_item_2", v)}
                    placeholder="9:00 PM"
                  />
                </FieldRow>
                <FieldRow label="Button Text">
                  <TextInput
                    value={dc.button_text}
                    onChange={(v) => set("demo_class", "button_text", v)}
                  />
                </FieldRow>
                <FieldRow label="Button Link">
                  <TextInput
                    value={dc.button_link}
                    onChange={(v) => set("demo_class", "button_link", v)}
                    placeholder="https://..."
                  />
                </FieldRow>
                <FieldRow label="Badge Text (below button)">
                  <TextInput
                    value={dc.badge_text}
                    onChange={(v) => set("demo_class", "badge_text", v)}
                  />
                </FieldRow>
                <ImageInput
                  label="Section Image"
                  value={dc.image_url}
                  onChange={(v) => set("demo_class", "image_url", v)}
                  onUpload={(file) =>
                    uploadSectionImage("demo_class", activeLevel, file)
                  }
                />
                <ActionButtons
                  onSave={handleSave}
                  onCopy={handleCopyToOther}
                  saving={saving}
                  copying={copying}
                  otherLevel={otherLevel}
                />
              </SectionCard>
            )}

            {activeSection === "salary_info" && (
              <SectionCard title={`Salary Info — ${activeLevel}`}>
                <FieldRow label="Heading">
                  <TextInput
                    value={si.heading}
                    onChange={(v) => set("salary_info", "heading", v)}
                    placeholder="Salary, Expenses..."
                  />
                </FieldRow>
                <FieldRow label="Subtitle">
                  <TextInput
                    value={si.subtitle}
                    onChange={(v) => set("salary_info", "subtitle", v)}
                  />
                </FieldRow>
                <FieldRow label="Benefit 1">
                  <TextInput
                    value={si.benefit_1}
                    onChange={(v) => set("salary_info", "benefit_1", v)}
                  />
                </FieldRow>
                <FieldRow label="Benefit 2">
                  <TextInput
                    value={si.benefit_2}
                    onChange={(v) => set("salary_info", "benefit_2", v)}
                  />
                </FieldRow>
                <FieldRow label="Benefit 3">
                  <TextInput
                    value={si.benefit_3}
                    onChange={(v) => set("salary_info", "benefit_3", v)}
                  />
                </FieldRow>
                <FieldRow label="Benefit 4">
                  <TextInput
                    value={si.benefit_4}
                    onChange={(v) => set("salary_info", "benefit_4", v)}
                  />
                </FieldRow>
                <FieldRow label="Button Text">
                  <TextInput
                    value={si.button_text}
                    onChange={(v) => set("salary_info", "button_text", v)}
                  />
                </FieldRow>
                <FieldRow label="Button Link">
                  <TextInput
                    value={si.button_link}
                    onChange={(v) => set("salary_info", "button_link", v)}
                    placeholder="https://..."
                  />
                </FieldRow>
                <ImageInput
                  label="Section Image"
                  value={si.image_url}
                  onChange={(v) => set("salary_info", "image_url", v)}
                  onUpload={(file) =>
                    uploadSectionImage("salary_info", activeLevel, file)
                  }
                />
                <ActionButtons
                  onSave={handleSave}
                  onCopy={handleCopyToOther}
                  saving={saving}
                  copying={copying}
                  otherLevel={otherLevel}
                />
              </SectionCard>
            )}

            {activeSection === "talk_to_team" && (
              <SectionCard title={`Talk to Team — ${activeLevel}`}>
                <FieldRow label="Heading">
                  <TextInput
                    value={tt.heading}
                    onChange={(v) => set("talk_to_team", "heading", v)}
                    placeholder="Talk to our team"
                  />
                </FieldRow>
                <FieldRow label="Feature 1">
                  <TextInput
                    value={tt.feature_1}
                    onChange={(v) => set("talk_to_team", "feature_1", v)}
                  />
                </FieldRow>
                <FieldRow label="Feature 2">
                  <TextInput
                    value={tt.feature_2}
                    onChange={(v) => set("talk_to_team", "feature_2", v)}
                  />
                </FieldRow>
                <FieldRow label="Feature 3">
                  <TextInput
                    value={tt.feature_3}
                    onChange={(v) => set("talk_to_team", "feature_3", v)}
                  />
                </FieldRow>
                <FieldRow label="Button Text">
                  <TextInput
                    value={tt.button_text}
                    onChange={(v) => set("talk_to_team", "button_text", v)}
                  />
                </FieldRow>
                <FieldRow label="Phone Link (e.g. tel:9731462667)">
                  <TextInput
                    value={tt.phone_link}
                    onChange={(v) => set("talk_to_team", "phone_link", v)}
                    placeholder="tel:XXXXXXXXXX"
                  />
                </FieldRow>
                <FieldRow label="Phone Display Text">
                  <TextInput
                    value={tt.phone_display_text}
                    onChange={(v) =>
                      set("talk_to_team", "phone_display_text", v)
                    }
                  />
                </FieldRow>
                <FieldRow label="Badge Text (e.g. Online)">
                  <TextInput
                    value={tt.badge_text}
                    onChange={(v) => set("talk_to_team", "badge_text", v)}
                  />
                </FieldRow>
                <ImageInput
                  label="Avatar Image"
                  value={tt.avatar_image_url}
                  onChange={(v) => set("talk_to_team", "avatar_image_url", v)}
                  onUpload={(file) =>
                    uploadSectionImage("talk_to_team", activeLevel, file)
                  }
                />
                <ActionButtons
                  onSave={handleSave}
                  onCopy={handleCopyToOther}
                  saving={saving}
                  copying={copying}
                  otherLevel={otherLevel}
                />
              </SectionCard>
            )}
          </div>

          {/* Right: Live Preview */}
          <div>
            <p className="text-sm font-medium text-gray-600 mb-3">
              Live Preview —{" "}
              <span className="text-[#004E92] font-semibold">
                {activeLevel}
              </span>
            </p>
            <div className="sticky top-4">
              {activeSection === "demo_class" && <DemoPreview d={dc} />}
              {activeSection === "salary_info" && <SalaryPreview d={si} />}
              {activeSection === "talk_to_team" && <TalkPreview d={tt} />}
              <p className="text-xs text-gray-400 mt-2 text-center">
                Updates as you type
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
