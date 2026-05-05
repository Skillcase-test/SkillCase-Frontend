import { useEffect, useMemo, useState } from "react";
import { exploreCandidatesAdminApi } from "../../api/exploreCandidatesAdminApi";

const blankProfile = {
  fullname: "",
  email: "",
  countrycode: "",
  phone: "",
  dob: "",
  gender: "",
  qualification: "",
  experience: "",
  language: "",
  photo: "",
  resume: "",
  degcert: "",
  workcert: "",
  langcert: "",
};

export default function ExploreCandidatesAdmin() {
  const [accounts, setAccounts] = useState([]);
  const [library, setLibrary] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [assigned, setAssigned] = useState([]);
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncEmail, setSyncEmail] = useState("");

  const [accountForm, setAccountForm] = useState({
    email: "",
    password: "",
    partner_logo: "",
    status: 1,
  });
  const [profileForm, setProfileForm] = useState(blankProfile);
  const [selectedAssignProfile, setSelectedAssignProfile] = useState("");

  async function loadBase() {
    setLoading(true);
    try {
      const [accountsRes, libraryRes] = await Promise.all([
        exploreCandidatesAdminApi.listAccounts(),
        exploreCandidatesAdminApi.listLibraryProfiles(),
      ]);
      const accountsData = accountsRes.data.data || [];
      setAccounts(accountsData);
      setLibrary(libraryRes.data.data || []);
      if (!selectedAccountId && accountsData.length) {
        setSelectedAccountId(accountsData[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadAccountProfiles(accountId) {
    if (!accountId) return;
    const res = await exploreCandidatesAdminApi.getAccountProfiles(accountId);
    setAssigned(res.data.data.assigned || []);
    setAvailable(res.data.data.available || []);
  }

  useEffect(() => {
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedAccountId) return;
    loadAccountProfiles(selectedAccountId);
  }, [selectedAccountId]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => Number(a.id) === Number(selectedAccountId)) || null,
    [accounts, selectedAccountId],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-lg font-bold text-slate-900">Explore Candidates Admin</h1>
        <p className="text-sm text-slate-500">
          Manage recruiter accounts, profile library, and account assignments.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading...
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">
                Create / Update Account
              </h2>
              <div className="space-y-2">
                <input
                  value={accountForm.email}
                  onChange={(e) =>
                    setAccountForm((v) => ({ ...v, email: e.target.value }))
                  }
                  placeholder="Recruiter email"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={accountForm.password}
                  onChange={(e) =>
                    setAccountForm((v) => ({ ...v, password: e.target.value }))
                  }
                  placeholder="Password"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={accountForm.partner_logo}
                  onChange={(e) =>
                    setAccountForm((v) => ({ ...v, partner_logo: e.target.value }))
                  }
                  placeholder="Partner logo URL"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  className="w-full rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
                  onClick={async () => {
                    await exploreCandidatesAdminApi.upsertAccount(accountForm);
                    setAccountForm({
                      email: "",
                      password: "",
                      partner_logo: "",
                      status: 1,
                    });
                    await loadBase();
                  }}
                >
                  Save Account
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">
                Recruiter Accounts
              </h2>
              <div className="space-y-2">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => setSelectedAccountId(account.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left ${
                      Number(selectedAccountId) === Number(account.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-800">{account.email}</p>
                    <p className="text-xs text-slate-500">
                      Profiles: {account.total_profiles || 0}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">
                  Assignment Panel {selectedAccount ? `- ${selectedAccount.email}` : ""}
                </h2>
                <div className="flex items-center gap-2">
                  <input
                    value={syncEmail}
                    onChange={(e) => setSyncEmail(e.target.value)}
                    placeholder="legacy email sync"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold"
                    onClick={async () => {
                      if (!syncEmail.trim()) return;
                      const res = await exploreCandidatesAdminApi.fetchLegacyProfiles(
                        syncEmail.trim(),
                      );
                      alert(`Legacy profiles fetched: ${(res.data.data || []).length}`);
                    }}
                  >
                    Sync
                  </button>
                </div>
              </div>

              {!selectedAccount ? (
                <p className="text-sm text-slate-500">Select an account to manage assignments.</p>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Assigned Profiles
                    </p>
                    <div className="space-y-2">
                      {assigned.map((p) => (
                        <div key={p.id} className="rounded-lg border border-slate-200 p-2">
                          <p className="text-sm font-semibold">{p.fullname}</p>
                          <div className="mt-1 flex gap-2">
                            <input
                              defaultValue={p.display_order || 0}
                              type="number"
                              className="w-24 rounded border border-slate-200 px-2 py-1 text-xs"
                              onBlur={async (e) => {
                                await exploreCandidatesAdminApi.updateAssignmentOrder(
                                  selectedAccount.id,
                                  p.id,
                                  Number(e.target.value || 0),
                                );
                                await loadAccountProfiles(selectedAccount.id);
                              }}
                            />
                            <button
                              className="rounded border border-red-200 px-2 py-1 text-xs text-red-700"
                              onClick={async () => {
                                await exploreCandidatesAdminApi.unassignProfile(
                                  selectedAccount.id,
                                  p.id,
                                );
                                await loadAccountProfiles(selectedAccount.id);
                              }}
                            >
                              Unassign
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Assign Existing Profile
                    </p>
                    <div className="space-y-2">
                      <select
                        value={selectedAssignProfile}
                        onChange={(e) => setSelectedAssignProfile(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="">Select profile</option>
                        {available.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullname}
                          </option>
                        ))}
                      </select>
                      <button
                        className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
                        onClick={async () => {
                          if (!selectedAssignProfile) return;
                          await exploreCandidatesAdminApi.assignProfile(
                            selectedAccount.id,
                            selectedAssignProfile,
                            0,
                          );
                          setSelectedAssignProfile("");
                          await loadAccountProfiles(selectedAccount.id);
                        }}
                      >
                        Assign Profile
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">
                Profile Library
              </h2>
              <div className="mb-3 grid gap-2 md:grid-cols-3">
                {Object.keys(blankProfile).map((field) => (
                  <input
                    key={field}
                    value={profileForm[field]}
                    onChange={(e) =>
                      setProfileForm((v) => ({ ...v, [field]: e.target.value }))
                    }
                    placeholder={field}
                    className="rounded border border-slate-200 px-2 py-1.5 text-xs"
                  />
                ))}
              </div>
              <button
                className="mb-4 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
                onClick={async () => {
                  await exploreCandidatesAdminApi.createProfile(profileForm);
                  setProfileForm(blankProfile);
                  await loadBase();
                  if (selectedAccountId) await loadAccountProfiles(selectedAccountId);
                }}
              >
                Add Profile
              </button>

              <div className="max-h-[320px] space-y-2 overflow-auto">
                {library.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded border border-slate-200 p-2">
                    <div>
                      <p className="text-sm font-semibold">{p.fullname}</p>
                      <p className="text-xs text-slate-500">
                        Usage: {p.usage_count || 0}
                      </p>
                    </div>
                    <button
                      className="rounded border border-red-200 px-2 py-1 text-xs text-red-700"
                      onClick={async () => {
                        await exploreCandidatesAdminApi.deleteProfile(p.id);
                        await loadBase();
                        if (selectedAccountId) await loadAccountProfiles(selectedAccountId);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
