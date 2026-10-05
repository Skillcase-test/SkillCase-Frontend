import Story from "./Story";
import Teach from "./Teach";
import Pick from "./Pick";
import Listen from "./Listen";
import Build from "./Build";
import Translate from "./Translate";
import Match from "./Match";
import Speak from "./Speak";
import Chat from "./Chat";
import SoundMatch from "./SoundMatch";
import SceneTap from "./SceneTap";
import Keypad from "./Keypad";
import RaceTap from "./RaceTap";
import Hack from "./Hack";
import SpotMistake from "./SpotMistake";
import OddOneOut from "./OddOneOut";
import SpeakCards from "./SpeakCards";
import VoiceNote from "./VoiceNote";
import GapFill from "./GapFill";
import CategorySort from "./CategorySort";
import "./steps.css";

const MECHANICS = {
  story: Story, teach: Teach, pick: Pick, listen: Listen, build: Build, translate: Translate,
  match: Match, speak: Speak, chat: Chat,
  soundmatch: SoundMatch, scenetap: SceneTap, keypad: Keypad, race: RaceTap, hack: Hack,
  spotmistake: SpotMistake, oddoneout: OddOneOut, speakcards: SpeakCards,
  voicenote: VoiceNote, gapfill: GapFill, sort: CategorySort,
};

export default function StepBody({ step, ctx }) {
  const C = MECHANICS[step.t];
  if (!C) return null;
  return <C step={step} ctx={ctx} />;
}
