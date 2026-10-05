import { Navigate, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  Briefcase,
  CircleDollarSign,
  Languages,
  LockKeyhole,
  MapPin,
} from "lucide-react";
import { isPracticeSuiteLevel } from "../../utils/b1Progress";
import bagImg from "../../assets/bag.webp";

const HARDCODED_JOBS = [
  {
    title: "ICU Staff Nurse",
    location: "Munich, GER",
    org: "Elderly Care Hospital",
    meta: [
      { icon: CircleDollarSign, label: "100k/month" },
      { icon: Languages, label: "Language - B2" },
    ],
  },
  {
    title: "Geriatric Nurse",
    location: "Berlin, GER",
    org: "Senior Care Center",
    meta: [
      { icon: Briefcase, label: "Full-time" },
      { icon: CircleDollarSign, label: "90k/month" },
    ],
  },
];

const normalizeLevel = (level) => String(level || "A1").toUpperCase();

export default function JobsLockedPage() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // B1/B2 users have the real pipeline — never show them this gate.
  if (isPracticeSuiteLevel(user?.user_prof_level)) {
    return <Navigate to="/job-screening" replace />;
  }

  const level = normalizeLevel(user?.user_prof_level);

  const goBack = () => {
    // Deep links / fresh opens may have no history to step back to.
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header — with consistent safe area inset top */}
      <div
        className="self-stretch px-4 pb-4 bg-white inline-flex justify-start items-center gap-3 border-b border-slate-100 sticky top-0 z-20"
        style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top, 0px))" }}
      >
        <button
          type="button"
          onClick={goBack}
          className="w-7 h-7 flex items-center justify-center rounded-md border-2 border-black/40 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-blue-950 text-base font-semibold">Jobs</div>
      </div>

      <div
        className="flex-1 px-4 pt-6 bg-black/5 flex flex-col justify-start items-start gap-9"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* Eligibility gate card */}
        <div className="self-stretch px-4 pt-6 pb-4 relative bg-white rounded-xl flex flex-col justify-start items-start gap-2.5">
          {/* Notification badge (decorative) */}

          <div className="self-stretch flex flex-col justify-start items-center gap-5">
            <div className="relative size-full flex items-center justify-center">
              <div className="size-24 relative rounded-3xl overflow-hidden">
                <img
                  src={bagImg}
                  alt="Job search"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div
                className="absolute top-2 right-30 p-1 bg-neutral-200 rounded-full flex items-center justify-center"
                aria-hidden="true"
              >
                <LockKeyhole className="w-4 h-4 text-slate-700" />
              </div>
            </div>

            <div className="px-4 py-1.5 bg-black/5 rounded-[55px] inline-flex justify-center items-center">
              <span className="text-center text-slate-600 text-sm font-medium leading-5">
                You are currently at {level} German level
              </span>
            </div>

            <div className="self-stretch flex flex-col justify-start items-center gap-2">
              <div className="w-72 text-center justify-start text-blue-950 text-2xl font-semibold leading-8">
                You are not eligible for German jobs yet
              </div>
              <div className="self-stretch text-center justify-start text-slate-600 text-sm font-normal leading-5">
                B1 German level is the minimum requirement for German jobs.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={goBack}
            className="self-stretch mt-5 px-4 py-3 bg-blue-950 hover:bg-blue-900 active:bg-blue-900 rounded-lg inline-flex justify-center items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="text-white text-base font-semibold leading-6">
              Okay
            </span>
          </button>
        </div>

        {/* Jobs teaser section */}
        <div className="self-stretch flex flex-col justify-start items-start gap-4">
          <div className="justify-start text-slate-900 text-base font-semibold leading-6">
            800+ jobs in Germany are waiting for you
          </div>

          <div className="self-stretch flex flex-col justify-start items-center gap-5">
            {HARDCODED_JOBS.map((job) => (
              <div
                key={job.title}
                className="self-stretch p-6 bg-white rounded-2xl outline outline-offset-[-1px] outline-slate-200 flex flex-col justify-start items-start gap-5"
              >
                <div className="self-stretch flex flex-col justify-start items-start gap-4">
                  <div className="self-stretch inline-flex justify-start items-start gap-3">
                    <div className="flex-1 justify-start text-slate-900 text-base font-semibold leading-6">
                      {job.title}
                    </div>
                    <div className="pl-1.5 pr-2 py-0.5 bg-white rounded-md shadow-xs outline outline-offset-[-1px] outline-slate-200 inline-flex justify-start items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-stone-300 shrink-0" />
                      <span className="text-center text-slate-600 text-sm font-medium leading-5">
                        {job.location}
                      </span>
                    </div>
                  </div>

                  <div className="self-stretch justify-start text-slate-500 text-base font-normal leading-6">
                    Organization <br />{" "}
                    <span className="font-bold">{job.org}</span>
                  </div>
                </div>

                <div className="self-stretch inline-flex justify-start items-center gap-4">
                  {job.meta.map((meta) => {
                    const MetaIcon = meta.icon;
                    return (
                      <div
                        key={meta.label}
                        className="flex justify-start items-center gap-1.5"
                      >
                        <MetaIcon className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="justify-start text-slate-500 text-sm font-semibold leading-5">
                          {meta.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled
                  className="self-stretch px-3 py-2 bg-stone-300 rounded-lg inline-flex justify-center items-center gap-2 cursor-not-allowed border border-stone-600/50"
                >
                  <LockKeyhole className="w-4 h-4 text-black/60 shrink-0" />
                  <span className="text-center text-black/60 text-sm font-semibold leading-6">
                    Complete German B1 to Apply
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
