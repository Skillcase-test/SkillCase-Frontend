import React from "react";

function toTitleCase(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function EuropassProgressPreview({ data = {} }) {
  const personal = data.personalInfo || {};
  const education = Array.isArray(data.education) ? data.education : [];
  const experience = Array.isArray(data.experience) ? data.experience : [];
  const skills = Array.isArray(data.skills) ? data.skills.filter(Boolean) : [];
  const languageSkills = data.languageSkills || {};
  const motherTongues =
    Array.isArray(languageSkills.motherTongues) && languageSkills.motherTongues.filter(Boolean).length > 0
      ? languageSkills.motherTongues.filter(Boolean).join(" | ").toUpperCase()
      : "";
  const otherLanguages = Array.isArray(languageSkills.otherLanguages)
    ? languageSkills.otherLanguages
    : [];

  const VALID_CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const normCefr = (v) => {
    const s = String(v || "").trim().toUpperCase();
    return VALID_CEFR.includes(s) ? s : "–";
  };

  const hasCefrScores = otherLanguages.some((ol) => {
    const scores = [ol.listening, ol.reading, ol.spokenProduction, ol.spokenInteraction, ol.writing];
    return scores.some((sc) => sc && sc !== "–" && VALID_CEFR.includes(String(sc).trim().toUpperCase()));
  });

  // Group contacts into Line 1 and Line 2 matching backend PDFKit output
  const line1 = [];
  if (personal.phone) line1.push({ label: "Phone:", value: personal.phone });
  if (personal.email) line1.push({ label: "Email address:", value: personal.email, isEmail: true });
  if (personal.address) line1.push({ label: "Address:", value: personal.address });

  const line2 = [];
  if (personal.nationality) line2.push({ label: "Nationality:", value: personal.nationality });
  if (personal.dob) line2.push({ label: "Date of birth:", value: personal.dob });
  if (personal.gender) line2.push({ label: "Gender:", value: personal.gender });

  const formattedName = personal.fullName
    ? toTitleCase(personal.fullName)
    : "Candidate Name";

  return (
    <div className="w-[595px] min-h-[842px] bg-white text-slate-900 shadow-2xl border border-slate-300 rounded-none overflow-hidden select-none font-['Helvetica',_'Arial',_sans-serif] mx-auto">
      {/* 1. Header Banner (#F5F5F5, height 152px) */}
      <div className="bg-[#F5F5F5] h-[152px] w-full relative border-b border-[#cbd5e1] box-border">
        {/* Europass Logo on Top Right (Top: 24px, Right: 39px) */}
        <div className="absolute top-[24px] right-[39px] flex items-center justify-end z-10">
          <img
            src="/europass.png"
            alt="Europass"
            className="h-[24px] w-auto object-contain"
          />
        </div>

        {/* Profile Avatar (Top: 51px, Left: 38px, diameter: 70px) */}
        <div className="absolute top-[51px] left-[38px] w-[70px] h-[70px] rounded-full border-[2px] border-[#1e293b] bg-slate-200 overflow-hidden flex items-center justify-center shadow-xs shrink-0 z-10">
          {personal.photo ? (
            <img
              src={personal.photo}
              alt={personal.fullName || "Candidate"}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[9pt] font-bold text-[#64748b] tracking-wider">
              PHOTO
            </span>
          )}
        </div>

        {/* Candidate Name (Left: 127px, Top: 65px, 16pt Bold Title Case) */}
        <div className="absolute left-[127px] top-[65px] right-[130px]">
          <h1 className="text-[16pt] font-bold text-[#111827] tracking-tight leading-none truncate">
            {formattedName}
          </h1>
        </div>

        {/* Horizontal Divider Line extending under name across to 556px at Top: 94px */}
        <div className="absolute left-[127px] top-[94px] right-[39px] h-[0.8px] bg-[#9ca3af]" />

        {/* Structured Contact line 1 (Top: 100px) */}
        {line1.length > 0 && (
          <div className="absolute left-[127px] top-[100px] right-[39px] flex items-center gap-x-[8px] leading-none whitespace-nowrap overflow-hidden">
            {line1.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-[#9ca3af] font-normal text-[10pt]">|</span>}
                <span className="text-[10pt]">
                  <span className="font-bold text-[#111827]">{item.label} </span>
                  {item.isEmail ? (
                    <span className="text-[#004494] underline">{item.value}</span>
                  ) : (
                    <span className="text-[#374151]">{item.value}</span>
                  )}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Structured Contact line 2 (Top: 120px) */}
        {line2.length > 0 && (
          <div className="absolute left-[127px] top-[120px] right-[39px] flex items-center gap-x-[8px] leading-none whitespace-nowrap overflow-hidden">
            {line2.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-[#9ca3af] font-normal text-[10pt]">|</span>}
                <span className="text-[10pt]">
                  <span className="font-bold text-[#111827]">{item.label} </span>
                  <span className="text-[#374151]">{item.value}</span>
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* 2. Main Content Body (Exact 39px margin matching Adil Khan.pdf) */}
      <div className="px-[39px] pt-[20px] pb-[39px] space-y-[18px]">
        {/* Professional profile summary */}
        {personal.aboutMe && (
          <div className="text-[9.5pt] italic text-[#374151] leading-[1.5] border-b border-slate-200 pb-[10px]">
            {personal.aboutMe}
          </div>
        )}

        {/* A. EDUCATION & TRAINING */}
        {education.length > 0 && (
          <div>
            {/* Section Header */}
            <div className="flex items-center gap-[7px]">
              <div className="w-[5px] h-[5px] rounded-full bg-[#9ca3af] shrink-0" />
              <h2 className="text-[11pt] font-bold text-[#111827] uppercase tracking-[0.5px]">
                Education & Training
              </h2>
            </div>
            <div className="w-full h-[0.8px] bg-[#9ca3af] mt-[3px] mb-[10px]" />

            {/* List */}
            <div className="space-y-[10px]">
              {education.map((edu, idx) => {
                const dateLoc = [edu.period, edu.location].filter(Boolean).join(" - ");
                const degreeInst = [edu.degree, edu.institution].filter(Boolean);
                return (
                  <div key={edu.id || idx}>
                    {dateLoc && (
                      <div className="text-[9pt] text-[#6b7280] font-normal uppercase tracking-normal mb-[1px]">
                        {dateLoc}
                      </div>
                    )}
                    {degreeInst.length > 0 && (
                      <div className="text-[11pt] leading-snug">
                        {edu.degree ? (
                          <span className="font-bold text-[#111827] uppercase underline decoration-[#9ca3af] underline-offset-3">
                            {edu.degree}
                          </span>
                        ) : null}
                        {edu.institution ? (
                          <span className="font-normal text-[#374151] uppercase ml-[6px]">
                            - {edu.institution}
                          </span>
                        ) : null}
                      </div>
                    )}
                    {edu.eqfLevel !== undefined && String(edu.eqfLevel).trim() !== "" && (
                      <div className="text-[9pt] text-[#374151] mt-[2px]">
                        <span className="font-bold text-[#111827]">Level in EQF: </span>
                        <span>{edu.eqfLevel}</span>
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
          <div>
            {/* Section Header */}
            <div className="flex items-center gap-[7px]">
              <div className="w-[5px] h-[5px] rounded-full bg-[#9ca3af] shrink-0" />
              <h2 className="text-[11pt] font-bold text-[#111827] uppercase tracking-[0.5px]">
                Work Experience
              </h2>
            </div>
            <div className="w-full h-[0.8px] bg-[#9ca3af] mt-[3px] mb-[10px]" />

            {/* List */}
            <div className="space-y-[12px]">
              {experience.map((exp, idx) => {
                const dateLoc = [exp.period, exp.location].filter(Boolean).join(" - ");
                const responsibilities = Array.isArray(exp.responsibilities)
                  ? exp.responsibilities.filter(Boolean)
                  : [];
                return (
                  <div key={exp.id || idx}>
                    {dateLoc && (
                      <div className="text-[9pt] text-[#6b7280] font-normal uppercase tracking-normal mb-[1px]">
                        {dateLoc}
                      </div>
                    )}
                    {(exp.position || exp.employer) && (
                      <div className="text-[11pt] leading-snug">
                        {exp.position ? (
                          <span className="font-bold text-[#111827] uppercase underline decoration-[#9ca3af] underline-offset-3">
                            {exp.position}
                          </span>
                        ) : null}
                        {exp.employer ? (
                          <span className="font-normal text-[#374151] uppercase ml-[8px]">
                            {exp.employer}
                          </span>
                        ) : null}
                      </div>
                    )}
                    {responsibilities.length > 0 && (
                      <ul className="space-y-[2px] mt-[3px] pl-[2px]">
                        {responsibilities.map((resp, rIdx) => (
                          <li key={rIdx} className="text-[10pt] text-[#374151] leading-[1.6] flex items-start gap-[6px]">
                            <span className="text-[#374151]">-</span>
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

        {/* C. SKILLS (Pipe-delimited, 10pt with 9pt |) */}
        {skills.length > 0 && (
          <div>
            {/* Section Header */}
            <div className="flex items-center gap-[7px]">
              <div className="w-[5px] h-[5px] rounded-full bg-[#9ca3af] shrink-0" />
              <h2 className="text-[11pt] font-bold text-[#111827] uppercase tracking-[0.5px]">
                Skills
              </h2>
            </div>
            <div className="w-full h-[0.8px] bg-[#9ca3af] mt-[3px] mb-[10px]" />

            <div className="text-[10pt] text-[#374151] leading-[1.5] flex flex-wrap items-center gap-x-[6px] gap-y-[2px]">
              {skills.map((sk, sIdx) => (
                <React.Fragment key={sIdx}>
                  {sIdx > 0 && <span className="text-[#9ca3af] text-[9pt]">|</span>}
                  <span>{sk}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* D. LANGUAGE SKILLS */}
        {(motherTongues || otherLanguages.length > 0) && (
          <div>
            {/* Section Header */}
            <div className="flex items-center gap-[7px]">
              <div className="w-[5px] h-[5px] rounded-full bg-[#9ca3af] shrink-0" />
              <h2 className="text-[11pt] font-bold text-[#111827] uppercase tracking-[0.5px]">
                Language Skills
              </h2>
            </div>
            <div className="w-full h-[0.8px] bg-[#9ca3af] mt-[3px] mb-[10px]" />

            {/* Mother Tongue */}
            {motherTongues && (
              <div className="text-[10pt] text-[#374151] mb-[8px]">
                <span>Mother tongue(s): </span>
                <span className="font-bold text-[#111827] text-[11pt]">{motherTongues}</span>
              </div>
            )}

            {/* 5-Column CEFR Table (Rendered ONLY if CEFR scores exist) */}
            {hasCefrScores ? (
              <div className="w-full border-t border-b border-[#9ca3af] overflow-hidden text-[9pt] mt-[6px]">
                {/* Category Header Row */}
                <div className="grid grid-cols-12 text-center font-bold text-[#111827] border-b border-[#cbd5e1] py-[4px] bg-[#f0f2f5]">
                  <div className="col-span-3" />
                  <div className="col-span-3 border-l border-[#cbd5e1] uppercase tracking-wide text-[10pt]">
                    Understanding
                  </div>
                  <div className="col-span-4 border-l border-[#cbd5e1] uppercase tracking-wide text-[10pt]">
                    Speaking
                  </div>
                  <div className="col-span-2 border-l border-[#cbd5e1] uppercase tracking-wide text-[10pt]">
                    Writing
                  </div>
                </div>

                {/* Subheader Row */}
                <div className="grid grid-cols-12 text-center text-[9pt] text-[#4b5563] border-b border-[#9ca3af] py-[3px]">
                  <div className="col-span-3" />
                  <div className="col-span-1.5 border-l border-[#cbd5e1]">Listening</div>
                  <div className="col-span-1.5 border-l border-[#cbd5e1]">Reading</div>
                  <div className="col-span-2 border-l border-[#cbd5e1]">Spoken prod.</div>
                  <div className="col-span-2 border-l border-[#cbd5e1]">Spoken inter.</div>
                  <div className="col-span-2 border-l border-[#cbd5e1]" />
                </div>

                {/* Data Rows */}
                {otherLanguages.map((ol, idx) => (
                  <div
                    key={ol.id || idx}
                    className="grid grid-cols-12 text-center py-[6px] items-center bg-[#f9fafb] border-b border-[#9ca3af] last:border-b-0"
                  >
                    <div className="col-span-3 text-left pl-[10px] font-bold uppercase text-[#111827] text-[10pt] truncate">
                      {ol.language || "—"}
                    </div>
                    <div className="col-span-1.5 font-bold text-[#374151] text-[10pt]">{normCefr(ol.listening)}</div>
                    <div className="col-span-1.5 font-bold text-[#374151] text-[10pt]">{normCefr(ol.reading)}</div>
                    <div className="col-span-2 font-bold text-[#374151] text-[10pt]">{normCefr(ol.spokenProduction)}</div>
                    <div className="col-span-2 font-bold text-[#374151] text-[10pt]">{normCefr(ol.spokenInteraction)}</div>
                    <div className="col-span-2 font-bold text-[#374151] text-[10pt]">{normCefr(ol.writing)}</div>
                  </div>
                ))}
              </div>
            ) : otherLanguages.length > 0 ? (
              <div className="text-[10pt] text-[#374151]">
                <span>Other language(s): </span>
                <span className="font-bold text-[#111827] text-[11pt]">
                  {otherLanguages.map((l) => String(l.language || "").trim().toUpperCase()).filter(Boolean).join(" | ")}
                </span>
              </div>
            ) : null}
          </div>
        )}

        {/* Empty state */}
        {!personal.fullName &&
          education.length === 0 &&
          experience.length === 0 &&
          skills.length === 0 &&
          !motherTongues &&
          otherLanguages.length === 0 && (
            <div className="text-center text-slate-400 text-xs py-10">
              No CV content yet — convert a resume or fill in the sections on the left.
            </div>
          )}
      </div>
    </div>
  );
}
