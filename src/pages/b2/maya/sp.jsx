import { Link } from "react-router-dom";
import { getMayaImage } from "../../../utils/mayaAvatars";

/*
 * Building blocks of the speaking screens, shared by the pages and the call (the .sp stylesheet in
 * b2Maya.css). Icons: Lucide paths as in the design (ISC License, (c) Lucide Contributors).
 */
const ICONS = {
  arrow: '<path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path>',
  back: '<path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path>',
  chevron: '<path d="m9 18 6-6-6-6"></path>',
  close: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>',
  mic: '<path d="M12 19v3"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><rect x="9" y="2" width="6" height="13" rx="3"></rect>',
  muted:
    '<path d="M12 19v3"></path><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"></path><path d="M16.95 16.95A7 7 0 0 1 5 12v-2"></path><path d="M18.89 13.23A7 7 0 0 0 19 12v-2"></path><path d="m2 2 20 20"></path><path d="M9 9v3a3 3 0 0 0 5.12 2.12"></path>',
  chat: '<path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"></path><path d="M7 11h10"></path><path d="M7 15h6"></path><path d="M7 7h8"></path>',
  bag: '<path d="M12 12h.01"></path><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path><path d="M22 13a18.15 18.15 0 0 1-20 0"></path><rect width="20" height="14" x="2" y="6" rx="2"></rect>',
  check: '<path d="M20 6 9 17l-5-5"></path>',
  headphones:
    '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"></path>',
  camera:
    '<path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196"></path><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"></path><path d="m2 2 20 20"></path>',
  clock: '<path d="M12 6v6h4"></path><circle cx="12" cy="12" r="10"></circle>',
  bars: '<path d="M5 21v-6"></path><path d="M12 21V9"></path><path d="M19 21V3"></path>',
  plane:
    '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path>',
  heart:
    '<path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"></path>',
  book: '<path d="M12 7v14"></path><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>',
  coffee:
    '<path d="M10 2v2"></path><path d="M14 2v2"></path><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"></path><path d="M6 2v2"></path>',
  shuffle:
    '<path d="m18 14 4 4-4 4"></path><path d="m18 2 4 4-4 4"></path><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"></path><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"></path><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"></path>',
  repeat: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path>',
  end: '<path d="M10.1 13.9a14 14 0 0 0 3.732 2.668 1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2 18 18 0 0 1-12.728-5.272"></path><path d="M22 2 2 22"></path><path d="M4.76 13.582A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 .244.473"></path>',
  wifi: '<path d="M12 20h.01"></path><path d="M8.5 16.429a5 5 0 0 1 7 0"></path><path d="M5 12.859a10 10 0 0 1 5.17-2.69"></path><path d="M19 12.859a10 10 0 0 0-2.007-1.523"></path><path d="M2 8.82a15 15 0 0 1 4.177-2.643"></path><path d="M22 8.82a15 15 0 0 0-11.288-3.764"></path>',
  info: '<circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path>',
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>',
};

export function Icon({ name, className = "" }) {
  return <svg className={`icon ${className}`} data-icon={name} viewBox="0 0 24 24" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: ICONS[name] ?? ICONS.chat }} />;
}

export const MayaImage = ({ pose = "looking", alt = "Maya, your AI speaking coach", user }) => (
  <img className="maya-image" src={getMayaImage(pose, user)} alt={alt} width={140} height={150} decoding="async" />
);
export const MayaMark = ({ pose = "looking", user }) => (
  <span className="maya-mark">
    <MayaImage pose={pose} alt="" user={user} />
  </span>
);
/** Maya during the call: all four poses stay loaded and cross-fade, so a pose change never shows a blank circle. */
export const MayaLive = ({ pose, user }) => (
  <span className="maya-mark maya-live">
    {["looking", "smiling", "wave", "thumbsup"].map((p) => (
      <img key={p} className={`maya-image ${p === pose ? "on" : ""}`} src={getMayaImage(p, user)} alt={p === pose ? "Maya, your AI speaking coach" : ""} aria-hidden={p !== pose} width={140} height={150} />
    ))}
  </span>
);
export const MayaFrame = ({ pose, className = "", user }) => (
  <span className={`maya-frame ${className}`}>
    <MayaImage pose={pose} user={user} />
  </span>
);
export const MayaHero = ({ pose, badge, user }) => (
  <div className="maya-hero">
    <MayaFrame pose={pose} user={user} />
    {badge ? (
      <span className={`maya-hero-badge ${badge === "check" ? "success" : ""}`} aria-hidden="true">
        <Icon name={badge} />
      </span>
    ) : null}
  </div>
);

/** The brand header: back arrow (goes home) and the level. */
export function Brand({ level }) {
  return (
    <header className="top">
      <Link className="wordmark" to="/" aria-label="Back to Skillcase home">
        <Icon name="back" />
      </Link>
      <span className="pill">{level} German</span>
    </header>
  );
}

/** A screen header with a way back (a link, or a button inside the call flow). */
export function Header({ title, back, onBack, tag }) {
  const inner = (
    <>
      <Icon name="back" />
      Back
    </>
  );
  return (
    <header className={`top compact${tag ? "" : " no-tag"}`}>
      {back ? (
        <Link className="back-button" to={back}>
          {inner}
        </Link>
      ) : onBack ? (
        <button type="button" className="back-button" onClick={onBack}>
          {inner}
        </button>
      ) : (
        <span />
      )}
      <span className="top-title">{title}</span>
      {tag ? <span className="pill">{tag}</span> : <span />}
    </header>
  );
}

export const Main = ({ children, className = "" }) => (
  <main className={`content ${className}`} id="content" tabIndex={-1}>
    {children}
  </main>
);

export const Footer = ({ children, note }) => (
  <footer className="bottom-action">
    {children}
    {note ? <p>{note}</p> : null}
  </footer>
);

export function Title({ text, desc, eyebrow }) {
  return (
    <>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>{text}</h1>
      {desc ? <p>{desc}</p> : null}
    </>
  );
}

/** Practice / My progress. */
export function BottomNav({ current }) {
  return (
    <nav className="bottom-nav" aria-label="Speaking navigation">
      <Link to="/b2/maya" className={current === "practice" ? "active" : ""} aria-current={current === "practice" ? "page" : undefined}>
        <Icon name="chat" />
        Practice
      </Link>
      <Link to="/b2/maya?view=progress" className={current === "progress" ? "active" : ""} aria-current={current === "progress" ? "page" : undefined}>
        <Icon name="bars" />
        My progress
      </Link>
    </nav>
  );
}

export function Steps({ n }) {
  return (
    <>
      <div className="steps" aria-label={`Step ${n} of 3`}>
        {[1, 2, 3].map((i) => (
          <i key={i} className={i <= n ? "done" : ""} />
        ))}
      </div>
      <p className="step-caption">{n === 1 ? "Choose your conversation" : n === 2 ? "Get ready to speak" : "Your conversation"}</p>
    </>
  );
}
