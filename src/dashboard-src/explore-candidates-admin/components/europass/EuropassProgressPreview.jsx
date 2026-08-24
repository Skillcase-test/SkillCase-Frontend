export function EuropassProgressPreview({ data = {} }) {
  const personal = data.personalInfo || {};
  const education = Array.isArray(data.education) ? data.education : [];
  const experience = Array.isArray(data.experience) ? data.experience : [];
  const skills = Array.isArray(data.skills) ? data.skills.filter(Boolean) : [];
  const languageSkills = data.languageSkills || {};
  const motherTongues =
    Array.isArray(languageSkills.motherTongues) && languageSkills.motherTongues.filter(Boolean).length > 0
      ? languageSkills.motherTongues.filter(Boolean).join(" | ").toUpperCase()
      : "—";
  const otherLanguages = Array.isArray(languageSkills.otherLanguages)
    ? languageSkills.otherLanguages
    : [];

  // Header spans must stay integers: Tailwind's col-span only accepts integers.
  const VALID_CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const normCefr = (v) => {
    const s = String(v || "").trim().toUpperCase();
    return VALID_CEFR.includes(s) ? s : "–";
  };

  return (
    <div className="w-full bg-white text-slate-900 shadow-lg border border-slate-200 rounded-lg overflow-hidden font-sans select-none text-[13px] leading-relaxed">
      {/* 1. Header Banner (#f3f4f6) */}
      <div className="bg-[#f0f2f5] px-8 py-5 flex items-center justify-between relative border-b border-slate-200">
        {/* Profile Photo with dark circle border */}
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-full border-2 border-slate-800 bg-slate-200 overflow-hidden flex items-center justify-center shadow-xs">
            {personal.photo ? (
              <img
                src={personal.photo}
                alt={personal.fullName || "Candidate"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[11px] font-bold text-slate-500 tracking-wider">
                PHOTO
              </span>
            )}
          </div>
        </div>

        {/* Horizontal Divider Line extending from photo across to logo */}
        <div className="flex-1 mx-6 h-[1px] bg-slate-400 opacity-60" />

        {/* Official Europass Logo */}
        <div className="flex items-center gap-2 shrink-0">
          {/* EU Flag Icon */}
          <div className="w-8 h-[22px] bg-[#003399] rounded-[2px] flex items-center justify-center p-0.5 shadow-xs relative">
            <div className="w-3.5 h-3.5 rounded-full border border-dashed border-[#ffcc00] flex items-center justify-center">
              <div className="w-1 h-1 bg-[#ffcc00] rounded-full" />
            </div>
          </div>
          {/* Brand Name */}
          <div className="text-lg font-black tracking-tight flex items-baseline">
            <span className="text-[#003399]">euro</span>
            <span className="text-[#6b21a8]">pass</span>
          </div>
        </div>
      </div>

      {/* 2. Content Body */}
      <div className="p-8 space-y-6">
        {/* Candidate Summary Line if available */}
        {personal.fullName && (
          <div className="border-b border-slate-100 pb-3">
            <h1 className="text-lg font-black text-slate-900 uppercase tracking-wide">
              {personal.fullName}
            </h1>
            <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 pt-0.5">
              {[personal.email, personal.phone, personal.address]
                .filter(Boolean)
                .map((v, i) => (
                  <span key={i}>{i > 0 ? `• ${v}` : v}</span>
                ))}
            </div>
          </div>
        )}

        {/* Professional profile summary */}
        {personal.aboutMe && (
          <div className="text-xs italic text-slate-600 leading-relaxed border-b border-slate-100 pb-3 -mt-2">
            {personal.aboutMe}
          </div>
        )}

        {/* A. EDUCATION & TRAINING */}
        {education.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm leading-none">•</span>
              <h2 className="text-xs font-black text-slate-900 tracking-wider uppercase">
                Education & Training
              </h2>
            </div>
            <div className="w-full h-[1px] bg-slate-400 opacity-70 -mt-1" />

            <div className="space-y-4 pt-1">
              {education.map((edu, idx) => {
                const dateLoc = [edu.period, edu.location].filter(Boolean).join(" - ");
                const degreeInst = [edu.degree, edu.institution].filter(Boolean);
                return (
                  <div key={edu.id || idx} className="space-y-1">
                    {dateLoc && (
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        {dateLoc}
                      </div>
                    )}
                    {degreeInst.length > 0 && (
                      <div className="text-xs text-slate-800">
                        {edu.degree ? (
                          <span className="font-bold underline decoration-slate-400 underline-offset-3 uppercase">
                            {edu.degree}
                          </span>
                        ) : null}
                        {edu.institution ? (
                          <span className="font-medium uppercase text-slate-700 ml-1.5">
                            {edu.degree ? `- ${edu.institution}` : edu.institution}
                          </span>
                        ) : null}
                      </div>
                    )}
                    {edu.eqfLevel !== undefined && String(edu.eqfLevel).trim() !== "" && (
                      <div className="text-[11px] text-slate-600 font-medium">
                        Level in EQF: {edu.eqfLevel}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* B. WORK EXPERIENCE */}
        {experience.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm leading-none">•</span>
              <h2 className="text-xs font-black text-slate-900 tracking-wider uppercase">
                Work Experience
              </h2>
            </div>
            <div className="w-full h-[1px] bg-slate-400 opacity-70 -mt-1" />

            <div className="space-y-4 pt-1">
              {experience.map((exp, idx) => {
                const dateLoc = [exp.period, exp.location].filter(Boolean).join(" - ");
                const responsibilities = Array.isArray(exp.responsibilities)
                  ? exp.responsibilities.filter(Boolean)
                  : [];
                return (
                  <div key={exp.id || idx} className="space-y-1">
                    {dateLoc && (
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        {dateLoc}
                      </div>
                    )}
                    {(exp.position || exp.employer) && (
                      <div className="text-xs text-slate-800">
                        {exp.position ? (
                          <span className="font-bold underline decoration-slate-400 underline-offset-3 uppercase">
                            {exp.position}
                          </span>
                        ) : null}
                        {exp.employer ? (
                          <span className="font-medium uppercase text-slate-700 ml-2">
                            {exp.position ? `- ${exp.employer}` : exp.employer}
                          </span>
                        ) : null}
                      </div>
                    )}
                    {responsibilities.length > 0 && (
                      <ul className="text-xs text-slate-700 space-y-0.5 pt-1 pl-1">
                        {responsibilities.map((resp, rIdx) => (
                          <li key={rIdx} className="flex items-start gap-1.5">
                            <span className="text-slate-400">-</span>
                            <span>{resp}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* C. SKILLS (Pipe-delimited) */}
        {skills.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm leading-none">•</span>
              <h2 className="text-xs font-black text-slate-900 tracking-wider uppercase">
                Skills
              </h2>
            </div>
            <div className="w-full h-[1px] bg-slate-400 opacity-70 -mt-1" />

            <div className="text-xs text-slate-700 leading-relaxed pt-1">
              {skills.join(" | ")}
            </div>
          </div>
        )}

        {/* D. LANGUAGE SKILLS */}
        {(motherTongues !== "—" || otherLanguages.length > 0) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm leading-none">•</span>
              <h2 className="text-xs font-black text-slate-900 tracking-wider uppercase">
                Language Skills
              </h2>
            </div>
            <div className="w-full h-[1px] bg-slate-400 opacity-70 -mt-1" />

            {/* Mother Tongue */}
            <div className="text-xs text-slate-700 pt-1">
              <span className="text-slate-600">Mother tongue(s): </span>
              <span className="font-bold text-slate-900">{motherTongues}</span>
            </div>

            {otherLanguages.length > 0 && (
              <div className="pt-2">
                <div className="w-full border-t border-b border-slate-400 overflow-hidden text-[11px]">
                  {/* Category Group Header: 2 + 4 + 4 + 2 = 12 columns */}
                  <div className="grid grid-cols-12 text-center font-bold text-slate-800 border-b border-slate-300 py-1 bg-slate-50/70">
                    <div className="col-span-2" />
                    <div className="col-span-4 border-l border-slate-200 uppercase tracking-wide">
                      Understanding
                    </div>
                    <div className="col-span-4 border-l border-slate-200 uppercase tracking-wide">
                      Speaking
                    </div>
                    <div className="col-span-2 border-l border-slate-200 uppercase tracking-wide">
                      Writing
                    </div>
                  </div>

                  {/* Subheader row: 2 + 2×5 = 12 columns */}
                  <div className="grid grid-cols-12 text-center text-[10px] text-slate-600 border-b border-slate-300 py-1">
                    <div className="col-span-2" />
                    <div className="col-span-2 border-l border-slate-200">Listening</div>
                    <div className="col-span-2 border-l border-slate-200">Reading</div>
                    <div className="col-span-2 border-l border-slate-200">Spoken prod.</div>
                    <div className="col-span-2 border-l border-slate-200">Spoken inter.</div>
                    <div className="col-span-2 border-l border-slate-200" />
                  </div>

                  {/* Data Rows */}
                  {otherLanguages.map((ol, idx) => (
                    <div
                      key={ol.id || idx}
                      className="grid grid-cols-12 text-center py-2 items-center bg-[#f8fafc] border-b border-slate-200 last:border-b-0"
                    >
                      <div className="col-span-2 text-left pl-3 font-bold uppercase text-slate-900 text-xs truncate">
                        {ol.language || "—"}
                      </div>
                      <div className="col-span-2 font-bold text-slate-800">{normCefr(ol.listening)}</div>
                      <div className="col-span-2 font-bold text-slate-800">{normCefr(ol.reading)}</div>
                      <div className="col-span-2 font-bold text-slate-800">{normCefr(ol.spokenProduction)}</div>
                      <div className="col-span-2 font-bold text-slate-800">{normCefr(ol.spokenInteraction)}</div>
                      <div className="col-span-2 font-bold text-slate-800">{normCefr(ol.writing)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!personal.fullName &&
          education.length === 0 &&
          experience.length === 0 &&
          skills.length === 0 &&
          motherTongues === "—" &&
          otherLanguages.length === 0 && (
            <div className="text-center text-slate-400 text-xs py-10">
              No CV content yet — convert a resume or fill in the sections on the left.
            </div>
          )}
      </div>
    </div>
  );
}
