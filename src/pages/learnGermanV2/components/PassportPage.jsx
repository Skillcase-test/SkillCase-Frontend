import StampSVG from "./StampSVG";
import { tilt } from "./passportUtils";

// One page of the passport: the holder's data page, a six-slot stamp page,
// or a blank back page. The reward screen shows the same page the new stamp
// just landed on — earning it and viewing it are visibly the same object.
export default function PassportPage({ page, stats, landing, userName }) {
  const words = Array.isArray(stats?.words) ? stats.words.length : 0;
  const streak = typeof stats?.streak === "number" ? stats.streak : 0;

  if (page.kind === "data") {
    const surname = (userName || "").trim().split(/\s+/);
    const last = (surname.length > 1 ? surname[surname.length - 1] : surname[0] || "LEARNER").toUpperCase();
    const first = (surname.length > 1 ? surname[0] : surname[0] || "").toUpperCase();
    return (
      <div className="lg2-pb-page">
        <div className="lg2-pb-guilloche" aria-hidden="true" />
        <div className="lg2-pb-data-head">Bundesrepublik Deutschland</div>
        <div className="lg2-pb-data-row">
          <div className="lg2-pb-portrait" aria-hidden="true">
            <span>{(first[0] || "S") + (last[0] || "C")}</span>
          </div>
          <dl className="lg2-pb-fields">
            <dt>Name</dt><dd>{last}{first ? `, ${first}` : ""}</dd>
            <dt>Beruf · Profession</dt><dd>PFLEGEKRAFT</dd>
            <dt>Stufe · Level</dt><dd>A1</dd>
          </dl>
        </div>
        <div className="lg2-pb-mrz">
          P&lt;SKC{last}&lt;&lt;{first || "LEARNER"}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br />
          WORDS{String(words).padStart(3, "0")}&lt;STREAK{String(streak).padStart(2, "0")}&lt;A1&lt;&lt;&lt;&lt;&lt;&lt;
        </div>
      </div>
    );
  }

  if (page.kind === "blank") {
    return <div className="lg2-pb-page"><div className="lg2-pb-guilloche" aria-hidden="true" /></div>;
  }

  return (
    <div className="lg2-pb-page">
      <div className="lg2-pb-guilloche" aria-hidden="true" />
      <div className="lg2-pb-page-no">Visa · {String(page.no).padStart(2, "0")}</div>
      <div className="lg2-pb-slots">
        {page.slots.map((t, i) => (
          <div
            className={`lg2-pb-slot ${t ? "on" : ""} ${landing && t && t.id === landing ? "landing" : ""}`}
            key={t ? t.id : `empty-${i}`}
            style={t ? { transform: `rotate(${tilt(t.id)}deg)` } : undefined}
          >
            {t ? <StampSVG topic={t} animated={landing != null && t.id === landing} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
