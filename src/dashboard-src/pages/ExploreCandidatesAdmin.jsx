import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { exploreCandidatesAdminApi } from "../../api/exploreCandidatesAdminApi";

const initialProfileForm = {
  fullname: "",
  email: "",
  countrycode: "+91",
  phone: "",
  dob: "",
  gender: "",
  qualification: "",
  experience: "",
  language: "",
  photo: null,
  resume: null,
  degcert: null,
  workcert: null,
  langcert: null,
};

function Spinner({ size = "md" }) {
  const sz = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return (
    <svg className={`animate-spin ${sz} text-slate-400`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`${
        checked ? "bg-green-500" : "bg-slate-300"
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        aria-hidden="true"
        className={`${
          checked ? "translate-x-5" : "translate-x-0"
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  );
}

function PageCard({ title, description, children, actions }) {
  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
          {description && <p className="mt-2 text-sm text-slate-500 font-medium">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function TableWrapper({ children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm font-sans">
      <div className="overflow-x-auto">
        <table className="min-w-full">{children}</table>
      </div>
    </div>
  );
}

function TableHead({ children }) {
  return (
    <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200">
      {children}
    </thead>
  );
}

function TableBody({ children }) {
  return <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">{children}</tbody>;
}

function PrimaryButton({ children, ...props }) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#083262] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#052243] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      {...props}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, ...props }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      {...props}
    >
      {children}
    </button>
  );
}

function ActionButton({ children, variant = "default", ...props }) {
  const base = "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    default: "text-slate-700 hover:bg-slate-50",
    danger: "border-rose-200 text-rose-700 hover:bg-rose-50",
    primary: "text-[#083262] hover:bg-blue-50 border-[#083262]"
  };
  return <button type="button" className={`${base} ${variants[variant]}`} {...props}>{children}</button>;
}

function AccountsPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [toggling, setToggling] = useState({});
  const [form, setForm] = useState({
    email: "",
    password: "",
    partner_logo_file: null,
    status: 1,
  });

  async function load() {
    setLoading(true);
    try {
      const res = await exploreCandidatesAdminApi.listAccounts();
      setAccounts(res.data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8 font-sans">
      <PageCard
        title="Recruiter Accounts"
        description="Manage partner recruiter accounts and their shared profile assignments."
        actions={
          <Link to="/admin/explore-candidates/library">
            <SecondaryButton>Library</SecondaryButton>
          </Link>
        }
      >
        <div className="grid gap-4 md:grid-cols-4 items-end">
          <div className="space-y-1">
             <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Email</label>
             <input
               className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
               placeholder="Enter email"
               value={form.email}
               onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
             />
          </div>
          <div className="space-y-1">
             <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Password</label>
             <input
               className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
               placeholder="Enter password"
               value={form.password}
               onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))}
             />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Partner Logo</label>
            <input
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 transition"
              type="file"
              accept="image/*"
              onChange={(e) =>
                setForm((v) => ({ ...v, partner_logo_file: e.target.files?.[0] || null }))
              }
            />
          </div>
          <PrimaryButton
            disabled={savingAccount || !form.email || !form.password}
            onClick={async () => {
              setSavingAccount(true);
              await exploreCandidatesAdminApi.upsertAccount(form);
              setForm({ email: "", password: "", partner_logo_file: null, status: 1 });
              await load();
              setSavingAccount(false);
            }}
          >
            {savingAccount && <Spinner size="sm" />}
            Save Account
          </PrimaryButton>
        </div>
      </PageCard>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 px-1">All Accounts</h2>
        {loading ? (
          <div className="text-sm text-slate-500 px-1">Loading accounts...</div>
        ) : (
          <TableWrapper>
            <TableHead>
              <tr>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Profiles</th>
                <th className="px-6 py-4 text-center">Mask Contacts</th>
                <th className="px-6 py-4 text-center">Force Password</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </TableHead>
            <TableBody>
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-5 align-top">
                    <div className="font-bold text-slate-900">{account.email}</div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      {account.total_profiles || 0} Shared Profiles
                    </span>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex justify-center items-center gap-2">
                      <ToggleSwitch
                        checked={Boolean(account.mask_contacts_enabled)}
                        disabled={toggling[`mask-${account.id}`]}
                        onChange={async (val) => {
                          setToggling(prev => ({ ...prev, [`mask-${account.id}`]: true }));
                          await exploreCandidatesAdminApi.updateAccountSettings(account.id, {
                            mask_contacts_enabled: val,
                          });
                          await load();
                          setToggling(prev => ({ ...prev, [`mask-${account.id}`]: false }));
                        }}
                      />
                      {toggling[`mask-${account.id}`] && <Spinner size="sm" />}
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex justify-center items-center gap-2">
                      <ToggleSwitch
                        checked={Boolean(account.force_password_change)}
                        disabled={toggling[`force-${account.id}`]}
                        onChange={async (val) => {
                          setToggling(prev => ({ ...prev, [`force-${account.id}`]: true }));
                          await exploreCandidatesAdminApi.updateAccountSettings(account.id, {
                            force_password_change: val,
                          });
                          await load();
                          setToggling(prev => ({ ...prev, [`force-${account.id}`]: false }));
                        }}
                      />
                      {toggling[`force-${account.id}`] && <Spinner size="sm" />}
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex flex-wrap justify-end gap-2">
                      <ActionButton
                        onClick={() => navigate(`/admin/explore-candidates/accounts/${account.id}/profiles`)}
                      >
                        Manage Profiles
                      </ActionButton>
                      <ActionButton
                        onClick={async () => {
                          const res = await exploreCandidatesAdminApi.resetAccountPassword(account.id);
                          const generated = res?.data?.data?.generated_password || "";
                          if (generated && navigator.clipboard?.writeText) {
                            await navigator.clipboard.writeText(generated);
                          }
                          window.alert(`New password copied: ${generated}`);
                        }}
                      >
                        Reset Password
                      </ActionButton>
                      <ActionButton
                        variant="danger"
                        onClick={async () => {
                          if (window.confirm("Are you sure you want to delete this account?")) {
                            await exploreCandidatesAdminApi.deleteAccount(account.id);
                            await load();
                          }
                        }}
                      >
                        Delete
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </TableBody>
          </TableWrapper>
        )}
      </div>
    </div>
  );
}

function AccountProfilesPage() {
  const { accountId } = useParams();
  const [state, setState] = useState({ assigned: [], available: [] });
  const [pickId, setPickId] = useState("");

  async function load() {
    const assignRes = await exploreCandidatesAdminApi.getAccountProfiles(accountId);
    setState(assignRes.data.data || { assigned: [], available: [] });
  }

  useEffect(() => {
    load();
  }, [accountId]);

  return (
    <div className="space-y-8 font-sans">
      <PageCard
        title={`Profiles for Account #${accountId}`}
        description="Manage assigned candidate profiles for this partner."
        actions={
          <div className="flex gap-2">
            <Link to="/admin/explore-candidates/library">
              <SecondaryButton>Open Library</SecondaryButton>
            </Link>
            <Link to={`/admin/explore-candidates/profiles/new?accountId=${accountId}`}>
              <PrimaryButton>Add Profile</PrimaryButton>
            </Link>
            <Link to="/admin/explore-candidates">
              <SecondaryButton>Back</SecondaryButton>
            </Link>
          </div>
        }
      >
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="space-y-1 flex-1 max-w-sm">
             <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Assign existing profile</label>
             <select
               className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition bg-white"
               value={pickId}
               onChange={(e) => setPickId(e.target.value)}
             >
               <option value="">Select a shared profile...</option>
               {state.available.map((p) => (
                 <option key={p.id} value={p.id}>
                   {p.fullname}
                 </option>
               ))}
             </select>
          </div>
          <PrimaryButton
            disabled={!pickId}
            onClick={async () => {
              await exploreCandidatesAdminApi.assignProfile(accountId, pickId, 0);
              setPickId("");
              await load();
            }}
          >
            Assign Profile
          </PrimaryButton>
        </div>
      </PageCard>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 px-1">Assigned Profiles</h2>
        <TableWrapper>
          <TableHead>
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Display Order</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </TableHead>
          <TableBody>
            {state.assigned.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-5 align-middle">
                  <div className="font-bold text-slate-900">{p.fullname}</div>
                </td>
                <td className="px-6 py-5 align-middle">
                  <input
                    type="number"
                    defaultValue={p.display_order || 0}
                    className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                    onBlur={async (e) => {
                      await exploreCandidatesAdminApi.updateAssignmentOrder(
                        accountId,
                        p.id,
                        Number(e.target.value || 0),
                      );
                    }}
                  />
                </td>
                <td className="px-6 py-5 align-middle">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link to={`/admin/explore-candidates/profiles/${p.id}/edit?accountId=${accountId}`}>
                      <ActionButton>Edit</ActionButton>
                    </Link>
                    <ActionButton
                      variant="danger"
                      onClick={async () => {
                        if (window.confirm("Are you sure you want to unassign this profile?")) {
                          await exploreCandidatesAdminApi.unassignProfile(accountId, p.id);
                          await load();
                        }
                      }}
                    >
                      Unassign
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </TableBody>
        </TableWrapper>
      </div>
    </div>
  );
}

function LibraryPage() {
  const [profiles, setProfiles] = useState([]);

  async function load() {
    const res = await exploreCandidatesAdminApi.listLibraryProfiles();
    setProfiles(res.data.data || []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8 font-sans">
      <PageCard
        title="Shared Profile Library"
        description="Manage all master profiles that can be assigned to recruiter accounts."
        actions={
          <div className="flex gap-2">
            <Link to="/admin/explore-candidates/profiles/new">
              <PrimaryButton>Create Profile</PrimaryButton>
            </Link>
            <Link to="/admin/explore-candidates">
              <SecondaryButton>Back</SecondaryButton>
            </Link>
          </div>
        }
      />

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 px-1">Library Profiles</h2>
        <TableWrapper>
          <TableHead>
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Usage Count</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </TableHead>
          <TableBody>
            {profiles.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-5 align-middle">
                  <div className="font-bold text-slate-900">{p.fullname}</div>
                </td>
                <td className="px-6 py-5 align-middle">
                  <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                    Used {p.usage_count || 0} times
                  </span>
                </td>
                <td className="px-6 py-5 align-middle">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link to={`/admin/explore-candidates/profiles/${p.id}/edit`}>
                      <ActionButton>Edit</ActionButton>
                    </Link>
                    <ActionButton
                      variant="danger"
                      onClick={async () => {
                        if (window.confirm("Are you sure you want to delete this profile?")) {
                          await exploreCandidatesAdminApi.deleteProfile(p.id);
                          await load();
                        }
                      }}
                    >
                      Delete
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </TableBody>
        </TableWrapper>
      </div>
    </div>
  );
}

function ProfileFormPage({ mode }) {
  const navigate = useNavigate();
  const { profileId } = useParams();
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get("accountId") || "";
  const [form, setForm] = useState(initialProfileForm);
  const [videos, setVideos] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [newVideo, setNewVideo] = useState({ title: "", display_order: 0, file: null });
  const [newDoc, setNewDoc] = useState({ title: "", display_order: 0, file: null });
  const [createVideos, setCreateVideos] = useState([]);
  const [createDocs, setCreateDocs] = useState([]);

  const pickPdfOrReset = (file, inputEl) => {
    if (!file) return null;
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
    if (!isPdf) {
      window.alert("Only PDF files are allowed.");
      if (inputEl) inputEl.value = "";
      return null;
    }
    return file;
  };

  async function refreshProfileDetails() {
    if (mode !== "edit") return;
    const res = await exploreCandidatesAdminApi.getProfileById(profileId);
    const data = res.data.data || {};
    setVideos(data.videos || []);
    setDocuments(data.documents || []);
  }

  useEffect(() => {
    if (mode !== "edit") return;
    exploreCandidatesAdminApi.getProfileById(profileId).then((res) => {
      const data = res.data.data || {};
      const profile = data.profile || {};
      setForm((v) => ({ ...v, ...profile }));
      setVideos(data.videos || []);
      setDocuments(data.documents || []);
    });
  }, [mode, profileId]);

  const title = mode === "edit" ? "Edit Shared Profile" : "Create Shared Profile";

  return (
    <div className="space-y-8 font-sans pb-12">
      <PageCard
        title={title}
        description="Fill out the basic details, photo, and PDFs for this shared profile."
        actions={
          <div className="flex gap-2">
            <Link to="/admin/explore-candidates/library">
              <SecondaryButton>Library</SecondaryButton>
            </Link>
            <Link
              to={
                accountId
                  ? `/admin/explore-candidates/accounts/${accountId}/profiles`
                  : "/admin/explore-candidates"
              }
            >
              <SecondaryButton>Back</SecondaryButton>
            </Link>
          </div>
        }
      >
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["fullname", "Full name"],
            ["email", "Email"],
            ["countrycode", "Country code"],
            ["phone", "Phone"],
            ["qualification", "Qualification"],
            ["experience", "Experience"],
            ["language", "Language"],
          ].map(([field, label]) => (
            <div key={field} className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">{label}</label>
              <input
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                placeholder={`Enter ${label.toLowerCase()}`}
                value={form[field] || ""}
                onChange={(e) => setForm((v) => ({ ...v, [field]: e.target.value }))}
              />
            </div>
          ))}
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Date of Birth</label>
            <input
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
              type="date"
              value={form.dob || ""}
              onChange={(e) => setForm((v) => ({ ...v, dob: e.target.value }))}
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Gender</label>
            <select
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition bg-white"
              value={form.gender || ""}
              onChange={(e) => setForm((v) => ({ ...v, gender: e.target.value }))}
            >
              <option value="">Select gender...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Others">Others</option>
            </select>
          </div>
          
          {[
            ["resume", "Resume (PDF)"],
            ["degcert", "Degree Certificate (PDF)"],
            ["workcert", "Work Certificate (PDF)"],
            ["langcert", "Language Certificate (PDF)"]
          ].map(([field, label]) => (
            <div key={field} className="space-y-2 rounded-xl border border-slate-200 p-4 bg-slate-50">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">{label}</label>
              <input
                className="w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-[#083262] file:text-white file:px-4 file:py-2 file:text-xs file:font-semibold hover:file:bg-[#052243] transition cursor-pointer"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) =>
                  setForm((v) => ({
                    ...v,
                    [field]: pickPdfOrReset(e.target.files?.[0] || null, e.target),
                  }))
                }
              />
            </div>
          ))}

          <div className="space-y-2 rounded-xl border border-slate-200 p-4 bg-slate-50">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Profile Photo (Image)</label>
            <input
              className="w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-[#083262] file:text-white file:px-4 file:py-2 file:text-xs file:font-semibold hover:file:bg-[#052243] transition cursor-pointer"
              type="file"
              accept="image/*"
              onChange={(e) => setForm((v) => ({ ...v, photo: e.target.files?.[0] || null }))}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <PrimaryButton
            onClick={async () => {
              const payload = {
                fullname: form.fullname,
                email: form.email,
                countrycode: form.countrycode,
                phone: form.phone,
                dob: form.dob,
                gender: form.gender,
                qualification: form.qualification,
                experience: form.experience,
                language: form.language,
                photo: form.photo,
                resume: form.resume,
                degcert: form.degcert,
                workcert: form.workcert,
                langcert: form.langcert,
              };

            let profile;
            if (mode === "edit") {
              const res = await exploreCandidatesAdminApi.updateProfile(profileId, payload);
              profile = res.data.data;
            } else {
              const res = await exploreCandidatesAdminApi.createProfile(payload);
              profile = res.data.data;
              for (const d of createDocs) {
                if (!d.title || !d.file) continue;
                await exploreCandidatesAdminApi.addProfileDocument(profile.id, {
                  title: d.title,
                  display_order: d.display_order || 0,
                  document_file_upload: d.file,
                });
              }
              for (const v of createVideos) {
                if (!v.title || !v.file) continue;
                await exploreCandidatesAdminApi.addProfileVideo(profile.id, {
                  title: v.title,
                  display_order: v.display_order || 0,
                  video_file_upload: v.file,
                });
              }
            }

              if (accountId && profile?.id) {
                await exploreCandidatesAdminApi.assignProfile(accountId, profile.id, 0);
                navigate(`/admin/explore-candidates/accounts/${accountId}/profiles`);
                return;
              }
              navigate("/admin/explore-candidates/library");
            }}
          >
            Save Profile
          </PrimaryButton>
        </div>
      </PageCard>

      <>
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 px-1">Additional Documents</h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            {(mode === "edit" ? documents : createDocs).map((doc, idx) => (
              <div key={doc.id || `new-doc-${idx}`} className="flex flex-col md:flex-row md:items-end gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50">
                {mode === "edit" ? (
                  <>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Title</label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                        defaultValue={doc.title}
                        onBlur={async (e) => {
                          await exploreCandidatesAdminApi.updateProfileDocument(doc.id, {
                            title: e.target.value,
                          });
                        }}
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Order</label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                        type="number"
                        defaultValue={doc.display_order || 0}
                        onBlur={async (e) => {
                          await exploreCandidatesAdminApi.updateProfileDocument(doc.id, {
                            display_order: Number(e.target.value || 0),
                          });
                          await refreshProfileDetails();
                        }}
                      />
                    </div>
                    <div className="flex-[2] space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                        File {doc.document_file && <span className="text-[#083262] truncate ml-2 max-w-[150px]" title={doc.document_file}>{doc.document_file.split('/').pop()}</span>}
                      </label>
                      <input
                        className="w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-slate-300 transition cursor-pointer"
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={async (e) => {
                          const f = pickPdfOrReset(e.target.files?.[0] || null, e.target);
                          if (!f) return;
                          await exploreCandidatesAdminApi.updateProfileDocument(doc.id, {
                            document_file_upload: f,
                          });
                        }}
                      />
                    </div>
                    <ActionButton
                      variant="danger"
                      onClick={async () => {
                        if (window.confirm("Delete this document?")) {
                          await exploreCandidatesAdminApi.deleteProfileDocument(doc.id);
                          await refreshProfileDetails();
                        }
                      }}
                    >
                      Delete
                    </ActionButton>
                  </>
                ) : (
                  <>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Title</label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                        value={doc.title}
                        onChange={(e) => {
                          const next = [...createDocs];
                          next[idx] = { ...next[idx], title: e.target.value };
                          setCreateDocs(next);
                        }}
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Order</label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                        type="number"
                        value={doc.display_order || 0}
                        onChange={(e) => {
                          const next = [...createDocs];
                          next[idx] = { ...next[idx], display_order: Number(e.target.value || 0) };
                          setCreateDocs(next);
                        }}
                      />
                    </div>
                    <div className="flex-[2] flex items-center justify-between text-sm text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">
                      <span className="truncate">{doc.file?.name || "No file attached"}</span>
                      <ActionButton
                        variant="danger"
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
            
            <div className="flex flex-col md:flex-row md:items-end gap-3 p-4 rounded-xl border border-dashed border-slate-300 bg-white">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">New Document Title</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                  placeholder="Document title"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc((v) => ({ ...v, title: e.target.value }))}
                />
              </div>
              <div className="w-24 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Order</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                  type="number"
                  value={newDoc.display_order}
                  onChange={(e) =>
                    setNewDoc((v) => ({ ...v, display_order: Number(e.target.value || 0) }))
                  }
                />
              </div>
              <div className="flex-[2] space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">File (PDF)</label>
                <input
                  className="w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-slate-300 transition cursor-pointer"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) =>
                    setNewDoc((v) => ({
                      ...v,
                      file: pickPdfOrReset(e.target.files?.[0] || null, e.target),
                    }))
                  }
                />
              </div>
              <SecondaryButton
                disabled={!newDoc.title || !newDoc.file}
                onClick={async () => {
                  if (!newDoc.title || !newDoc.file) return;
                  if (mode === "edit") {
                    await exploreCandidatesAdminApi.addProfileDocument(profileId, {
                      title: newDoc.title,
                      display_order: newDoc.display_order,
                      document_file_upload: newDoc.file,
                    });
                  } else {
                    setCreateDocs((prev) => [...prev, { ...newDoc }]);
                  }
                  setNewDoc({ title: "", display_order: 0, file: null });
                  if (mode === "edit") await refreshProfileDetails();
                }}
              >
                Add Document
              </SecondaryButton>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 px-1">Videos</h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            {(mode === "edit" ? videos : createVideos).map((video, idx) => (
              <div key={video.id || `new-video-${idx}`} className="flex flex-col md:flex-row md:items-end gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50">
                {mode === "edit" ? (
                  <>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Title</label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                        defaultValue={video.title}
                        onBlur={async (e) => {
                          await exploreCandidatesAdminApi.updateProfileVideo(video.id, {
                            title: e.target.value,
                          });
                        }}
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Order</label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                        type="number"
                        defaultValue={video.display_order || 0}
                        onBlur={async (e) => {
                          await exploreCandidatesAdminApi.updateProfileVideo(video.id, {
                            display_order: Number(e.target.value || 0),
                          });
                          await refreshProfileDetails();
                        }}
                      />
                    </div>
                    <div className="flex-[2] space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                        File {video.video_file && <span className="text-[#083262] truncate ml-2 max-w-[150px]" title={video.video_file}>{video.video_file.split('/').pop()}</span>}
                      </label>
                      <input
                        className="w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-slate-300 transition cursor-pointer"
                        type="file"
                        accept="video/*"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          await exploreCandidatesAdminApi.updateProfileVideo(video.id, {
                            video_file_upload: f,
                          });
                        }}
                      />
                    </div>
                    <ActionButton
                      variant="danger"
                      onClick={async () => {
                        if (window.confirm("Delete this video?")) {
                          await exploreCandidatesAdminApi.deleteProfileVideo(video.id);
                          await refreshProfileDetails();
                        }
                      }}
                    >
                      Delete
                    </ActionButton>
                  </>
                ) : (
                  <>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Title</label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                        value={video.title}
                        onChange={(e) => {
                          const next = [...createVideos];
                          next[idx] = { ...next[idx], title: e.target.value };
                          setCreateVideos(next);
                        }}
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Order</label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                        type="number"
                        value={video.display_order || 0}
                        onChange={(e) => {
                          const next = [...createVideos];
                          next[idx] = { ...next[idx], display_order: Number(e.target.value || 0) };
                          setCreateVideos(next);
                        }}
                      />
                    </div>
                    <div className="flex-[2] flex items-center justify-between text-sm text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">
                      <span className="truncate">{video.file?.name || "No file attached"}</span>
                      <ActionButton
                        variant="danger"
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
            
            <div className="flex flex-col md:flex-row md:items-end gap-3 p-4 rounded-xl border border-dashed border-slate-300 bg-white">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">New Video Title</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                  placeholder="Video title"
                  value={newVideo.title}
                  onChange={(e) => setNewVideo((v) => ({ ...v, title: e.target.value }))}
                />
              </div>
              <div className="w-24 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Order</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#083262] focus:ring-1 focus:ring-[#083262] outline-none transition"
                  type="number"
                  value={newVideo.display_order}
                  onChange={(e) =>
                    setNewVideo((v) => ({ ...v, display_order: Number(e.target.value || 0) }))
                  }
                />
              </div>
              <div className="flex-[2] space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">File (Video)</label>
                <input
                  className="w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-slate-300 transition cursor-pointer"
                  type="file"
                  accept="video/*"
                  onChange={(e) =>
                    setNewVideo((v) => ({ ...v, file: e.target.files?.[0] || null }))
                  }
                />
              </div>
              <SecondaryButton
                disabled={!newVideo.title || !newVideo.file}
                onClick={async () => {
                  if (!newVideo.title || !newVideo.file) return;
                  if (mode === "edit") {
                    await exploreCandidatesAdminApi.addProfileVideo(profileId, {
                      title: newVideo.title,
                      display_order: newVideo.display_order,
                      video_file_upload: newVideo.file,
                    });
                  } else {
                    setCreateVideos((prev) => [...prev, { ...newVideo }]);
                  }
                  setNewVideo({ title: "", display_order: 0, file: null });
                  if (mode === "edit") await refreshProfileDetails();
                }}
              >
                Add Video
              </SecondaryButton>
            </div>
          </div>
        </div>
      </>
    </div>
  );
}

export default function ExploreCandidatesAdmin() {
  return (
    <Routes>
      <Route index element={<AccountsPage />} />
      <Route path="accounts/:accountId/profiles" element={<AccountProfilesPage />} />
      <Route path="library" element={<LibraryPage />} />
      <Route path="profiles/new" element={<ProfileFormPage mode="create" />} />
      <Route path="profiles/:profileId/edit" element={<ProfileFormPage mode="edit" />} />
      <Route path="*" element={<Navigate to="/admin/explore-candidates" replace />} />
    </Routes>
  );
}
