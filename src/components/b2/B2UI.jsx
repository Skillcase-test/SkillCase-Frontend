import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./b2.css";
import { B2_SKILLS } from "./b2Skills";
import { B2_SCORE_BANDS, getB2ScoreBand, normalizeB2Score } from "../../utils/b2Scores";

export function B2Button({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  return (
    <button
      type="button"
      className={`b2-button b2-button--${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
export function B2Page({
  title,
  children,
  back = "/",
  onBack,
  className = "",
}) {
  const navigate = useNavigate();
  return (
    <main className={`b2-ui b2-page ${className}`}>
      <header className="b2-page-header">
        <button className="b2-back" onClick={onBack || (() => navigate(back))}>
          <ArrowLeft size={19} /> Back
        </button>
        <span className="b2-small b2-muted">{title}</span>
        <span className="b2-chip">B2</span>
      </header>
      {children}
    </main>
  );
}
export function B2SkillStrip() {
  return (
    <div className="b2-skill-strip">
      {B2_SKILLS.map(({ key, label, Icon }) => (
        <div key={key}>
          <span className="b2-icon">
            <Icon size={21} />
          </span>
          {label}
        </div>
      ))}
    </div>
  );
}
export function B2ScoreRing({ score, size = 112 }) {
  const value = normalizeB2Score(score);
  const band = getB2ScoreBand(value);
  return (
    <div
      className="b2-score-ring"
      style={{ width: size, height: size }}
      role="img"
      data-score-band={band.key}
      aria-label={
        value !== null ? `Score ${value} percent, ${band.label}` : "Score not available"
      }
    >
      <svg viewBox="0 0 112 112" aria-hidden="true">
        <circle
          cx="56"
          cy="56"
          r="48"
          fill="none"
          stroke="var(--b2-chart-track)"
          strokeWidth="8"
        />
        <circle
          cx="56"
          cy="56"
          r="48"
          fill="none"
          stroke={band.chartColor || band.color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(value ?? 0) * 3.016} 301.6`}
          opacity={value > 0 ? 1 : 0}
        />
      </svg>
      <strong>{value !== null ? `${value}%` : "—"}</strong>
    </div>
  );
}
export function B2ScoreStatus({ score }) {
  const band = getB2ScoreBand(score);
  return <span className="b2-score-status" data-score-band={band.key}
    style={{ color: band.color, background: band.background }}>{band.label}</span>;
}

export function B2ScoreGuide() {
  return (
    <details className="b2-score-guide">
      <summary>Score guide</summary>
      <ul>{["good", "developing", "practice"].map((key) => {
        const band = B2_SCORE_BANDS[key];
        return <li key={key}><span style={{ color: band.color }}>{band.label}</span><span>{band.range}</span></li>;
      })}</ul>
      <p>Practice guidance, not an exam pass/fail result.</p>
    </details>
  );
}

export function B2ScoreBar({ label, score }) {
  const value = normalizeB2Score(score);
  const band = getB2ScoreBand(value);
  return (
    <div className="b2-score-bar" data-score-band={band.key}>
      <div className="b2-row b2-between">
        <span className="b2-metric-name">{label}
          {value !== null && <small style={{ color: band.color }}>{band.label}</small>}
        </span>
        <strong>{value !== null ? `${value}%` : "Not scored yet"}</strong>
      </div>
      <div className="b2-score-track" aria-hidden="true">
        <i style={{ width: `${value ?? 0}%`, background: band.chartColor || band.color }} />
      </div>
    </div>
  );
}
export function B2ScoreBars({ bySkill = {} }) {
  return (
    <div className="b2-score-bars">
      {B2_SKILLS.map(({ key, label }) => {
        const entry = bySkill[key];
        return (
          <B2ScoreBar key={key} label={label} score={entry?.measured ? entry.score : null} />
        );
      })}
    </div>
  );
}
export function B2State({ loading = false, title, description, onRetry }) {
  return (
    <div className="b2-state" role={loading ? "status" : undefined}>
      {loading ? (
        <>
          <div className="b2-skeleton" />
          <p>Loading…</p>
        </>
      ) : (
        <>
          <AlertCircle size={30} />
          <h2>{title || "Something didn’t load"}</h2>
          <p>{description || "Check your connection and try again."}</p>
          {onRetry && (
            <B2Button onClick={onRetry}>
              Try again <ArrowRight size={18} />
            </B2Button>
          )}
        </>
      )}
    </div>
  );
}
