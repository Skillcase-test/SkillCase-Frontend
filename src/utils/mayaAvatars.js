import mayaLooking from "../assets/onboarding/mayaLooking.webp";
import mayaLookingPhysio from "../assets/onboarding/mayaLookingPhysio.webp";
import mayaSmiling from "../assets/onboarding/mayaSmiling.webp";
import mayaSmilingPhysio from "../assets/onboarding/mayaSmilingPhysio.webp";
import mayaThumbsup from "../assets/onboarding/mayaThumbsup.webp";
import mayaThumbsupPhysio from "../assets/onboarding/mayaThumbsupPhysio.webp";
import mayaWave from "../assets/onboarding/mayaWave.webp";
import mayaWavePhysio from "../assets/onboarding/mayaWavePhysio.webp";

export function isPhysiotherapist(occupationOrUser) {
  if (!occupationOrUser) return false;
  const occ =
    typeof occupationOrUser === "string"
      ? occupationOrUser
      : occupationOrUser.occupation || "";
  const normalized = occ.trim().toLowerCase();
  return normalized === "physiotherapist" || normalized === "physio";
}

export function getMayaImage(name, occupationOrUser) {
  const isPhysio = isPhysiotherapist(occupationOrUser);
  switch (name) {
    case "looking":
      return isPhysio ? mayaLookingPhysio : mayaLooking;
    case "smiling":
      return isPhysio ? mayaSmilingPhysio : mayaSmiling;
    case "thumbsup":
      return isPhysio ? mayaThumbsupPhysio : mayaThumbsup;
    case "wave":
      return isPhysio ? mayaWavePhysio : mayaWave;
    default:
      return isPhysio ? mayaSmilingPhysio : mayaSmiling;
  }
}
