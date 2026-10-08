import {
  BadgeCheck,
  ChevronDown,
  ClipboardList,
  FileText,
  FolderOpen,
  Languages,
  LifeBuoy,
  ListChecks,
  Route,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from "lucide-react";

// Renders the per-role opportunity content (see irelandOpportunityContent.js
// on the backend). Digestibility model: header + snapshot stay open, the
// journey renders as a numbered strip, and every other section collapses into
// an accordion so candidates can skim first and drill in.
const SECTION_ICONS = {
  snapshot: ClipboardList,
  details: ListChecks,
  costs: Wallet,
  process: Route,
  stages: ListChecks,
  support: LifeBuoy,
  progression: TrendingUp,
  english: Languages,
  documents: FolderOpen,
  compensation: TriangleAlert,
};

const Note = ({ text }) => (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800 leading-relaxed">
    {text}
  </div>
);

const TableRows = ({ rows = [] }) => (
  <dl className="flex flex-col divide-y divide-slate-100">
    {rows.map((r, i) => (
      <div key={i} className="flex items-start justify-between gap-4 py-2">
        <dt className="text-[11px] text-slate-500 font-medium shrink-0">
          {r.label}
        </dt>
        <dd className="text-[11px] text-slate-800 font-semibold text-right">
          {r.value}
        </dd>
      </div>
    ))}
  </dl>
);

const StepsStrip = ({ steps = [] }) => (
  <ol className="flex flex-col gap-1.5">
    {steps.map((s, i) => (
      <li key={i} className="flex items-center gap-2.5">
        <span className="w-5 h-5 rounded-full bg-[#083262] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
          {i + 1}
        </span>
        <span className="text-[11px] font-semibold text-slate-700">{s}</span>
      </li>
    ))}
  </ol>
);

const CardItems = ({ items = [] }) => (
  <div className="flex flex-col gap-2">
    {items.map((it, i) => (
      <div
        key={i}
        className="bg-white border border-slate-100/80 rounded-lg p-2.5 text-left"
      >
        <p className="text-[11px] font-bold text-slate-800">{it.title}</p>
        <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
          {it.text}
        </p>
      </div>
    ))}
  </div>
);

const SectionBody = ({ section }) => (
  <div className="flex flex-col gap-2.5 pt-2.5">
    {section.body && (
      <p className="text-[11px] text-slate-600 leading-relaxed">
        {section.body}
      </p>
    )}
    {section.kind === "table" && <TableRows rows={section.rows} />}
    {section.kind === "steps" && <StepsStrip steps={section.steps} />}
    {section.kind === "cards" && <CardItems items={section.items} />}
    {section.list?.length > 0 && (
      <ul className="flex flex-col gap-1 pl-1">
        {section.list.map((li, i) => (
          <li
            key={i}
            className="text-[11px] text-slate-600 flex items-start gap-2"
          >
            <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
            {li}
          </li>
        ))}
      </ul>
    )}
    {section.note && <Note text={section.note} />}
  </div>
);

const OpportunitySheet = ({
  content,
  onPrimary,
  onSecondary,
  primaryBusy = false,
  primaryDone = false,
  doneLabel = "Interest noted",
}) => {
  if (!content) return null;
  const { header = {}, sections = [], cta = {} } = content;

  return (
    <div className="w-full flex flex-col gap-3 text-left">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-md border uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-100 inline-flex items-center gap-1">
            <BadgeCheck className="w-3 h-3" />
            {header.status || "Eligible"}
          </span>
        </div>
        <h3 className="text-lg font-extrabold text-[#002856] tracking-tight">
          {header.title}
        </h3>
        {header.subtitle && (
          <p className="text-xs text-slate-500 leading-relaxed">
            {header.subtitle}
          </p>
        )}
      </div>

      {sections.map((section, idx) => {
        const Icon = SECTION_ICONS[section.id] || FileText;
        return (
          <details
            key={section.id || idx}
            open={idx === 0}
            className="group bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden"
          >
            <summary className="p-3.5 flex items-center justify-between gap-2 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2 text-xs font-bold text-[#083262]">
                <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {section.title}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform duration-200 shrink-0" />
            </summary>
            <div className="px-3.5 pb-3.5">
              <SectionBody section={section} />
            </div>
          </details>
        );
      })}

      {(cta.heading || onPrimary) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center gap-2.5">
          {cta.heading && (
            <h4 className="text-sm font-extrabold text-[#002856]">
              {cta.heading}
            </h4>
          )}
          {cta.subtext && (
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {cta.subtext}
            </p>
          )}
          {onPrimary && (
            <button
              type="button"
              onClick={onPrimary}
              disabled={primaryBusy || primaryDone}
              className="w-full h-11 bg-[#002856] hover:bg-[#001f42] text-white rounded-xl font-bold text-sm transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {primaryDone
                ? doneLabel
                : primaryBusy
                  ? "Saving..."
                  : cta.primaryLabel || "I'm Interested"}
            </button>
          )}
          {onSecondary && (
            <button
              type="button"
              onClick={onSecondary}
              className="w-full h-10 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
            >
              {cta.secondaryLabel || "Not Now"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default OpportunitySheet;
