export const INITIAL_PROFILE_FORM = {
  fullname: "",
  email: "",
  countrycode: "+91",
  phone: "",
  dob: "",
  age: "",
  gender: "",
  expected_level: "",
  qualification: "",
  experience: "",
  language: "",
  specialization: "",
  photo: null,
  resume: null,
  degcert: null,
  workcert: null,
  langcert: null,
};

export const ACCESS_REQUEST_STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "declined", label: "Declined" },
];

export const ACCESS_REQUEST_STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  declined: "bg-rose-100 text-rose-700 border-rose-200",
};

export const RECRUITER_TABS = [
  { key: "accounts", label: "Recruiter Accounts", path: "/admin/explore-candidates" },
  { key: "library", label: "Candidate Library", path: "/admin/explore-candidates/library" },
  { key: "jobs", label: "Jobs Admin", path: "/admin/explore-candidates/jobs" },
  { key: "access-requests", label: "Access Requests", path: "/admin/explore-candidates/access-requests" },
];

export const CANDIDATE_SOURCES = [
  { value: "local", label: "Explore Shared Profiles" },
  { value: "explore_php", label: "Explore Shared Profiles (PHP)" },
  { value: "main_php", label: "Main Website Profiles (PHP)" },
  { value: "job_screening", label: "Job Screening Candidates" },
];
