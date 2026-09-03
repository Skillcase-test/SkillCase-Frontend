import { useEffect, useMemo, useState } from "react";
import GuideSpotlight from "../../components/GuideSpotlight";
import { trackFeatureEvent } from "../../telemetry/events";
import { markVideoClassesTourComplete } from "./videoClassesTourStorage";

const SETTLE_DELAYS_MS = [250, 650];

function measure(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export default function VideoClassesTour({
  videoId,
  refs,
  hasDescription,
  hasNotes,
  hasAudioSwitch,
  openSettingsMenu,
  closeSettingsMenu,
  onExit,
}) {
  const steps = useMemo(() => {
    const list = [
      {
        id: "player",
        title: "Your video plays here",
        body: "Tap to play or pause, drag the red bar to scrub — and double-tap the left or right side to jump 10 seconds.",
        radius: 18,
        getEl: () => refs.videoContainer.current,
      },
      {
        id: "settings",
        title: "Speed & language",
        body: "Open settings to change the playback speed or switch the audio language.",
        radius: 999,
        getEl: () => refs.settingsButton.current,
      },
    ];
    if (hasAudioSwitch) {
      list.push({
        id: "settings_menu",
        title: "Switch audio here",
        body: "Tap “Audio language” to pick the voice track you want to listen to.",
        radius: 18,
        getEl: () => refs.settingsMenu.current,
        enter: openSettingsMenu,
        exit: closeSettingsMenu,
      });
    }
    if (hasDescription) {
      list.push({
        id: "description",
        title: "What this video covers",
        body: "Open the description for a quick summary of the lesson.",
        radius: 18,
        getEl: () => refs.description.current,
        scrollTo: true,
      });
    }
    if (hasNotes) {
      list.push({
        id: "notes",
        title: "Lesson notes",
        body: "Downloadable notes live here — switch the note language if you need to.",
        radius: 18,
        getEl: () => refs.notes.current,
        scrollTo: true,
      });
    }
    list.push({
      id: "chat",
      title: "Ask anything",
      body: "Stuck on something? Ask about this video and get an instant answer.",
      radius: 999,
      getEl: () => refs.chatBar.current,
    });
    return list;
  }, [
    refs,
    hasDescription,
    hasNotes,
    hasAudioSwitch,
    openSettingsMenu,
    closeSettingsMenu,
  ]);

  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    trackFeatureEvent("video_courses", "tour_started", { entityId: videoId });
  }, [videoId]);

  useEffect(() => {
    const current = steps[stepIndex];
    current.enter?.();
    if (current.scrollTo) {
      try {
        current
          .getEl()
          ?.scrollIntoView?.({ block: "center", behavior: "smooth" });
      } catch {}
    }

    const update = () => setRect(measure(current.getEl()));
    update();
    const timers = SETTLE_DELAYS_MS.map((delay) =>
      window.setTimeout(update, delay),
    );
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      current.exit?.();
    };
  }, [steps, stepIndex]);

  const exit = (completed, eventName) => {
    if (completed) markVideoClassesTourComplete();
    trackFeatureEvent("video_courses", eventName, { entityId: videoId });
    onExit(completed);
  };

  const goNext = () => {
    if (isLastStep) {
      exit(true, "tour_completed");
      return;
    }
    const next = steps[stepIndex + 1];
    trackFeatureEvent("video_courses", "tour_step_advanced", {
      entityId: videoId,
      attributes: { step_id: next.id, step_index: stepIndex + 1 },
    });
    setStepIndex((i) => i + 1);
  };

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  if (!rect) return null;

  return (
    <GuideSpotlight rect={rect} radius={step.radius} onClick={() => {}}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-bold text-slate-900">{step.title}</div>
        <button
          type="button"
          onClick={() => exit(true, "tour_skipped")}
          className="text-xs font-semibold text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
          data-testid="video-tour-skip"
        >
          Skip
        </button>
      </div>
      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{step.body}</p>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1" aria-hidden="true">
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex ? "w-4 bg-[#002856]" : "w-1.5 bg-slate-300"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={goBack}
              data-testid="video-tour-back"
              className="px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            data-testid="video-tour-next"
            className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-[#002856] hover:bg-[#002856] cursor-pointer"
          >
            {isLastStep ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </GuideSpotlight>
  );
}
