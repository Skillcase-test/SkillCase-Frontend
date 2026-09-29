import { useParams } from "react-router-dom";
import B2SpeakingWorkspace from "../../../components/b2/B2SpeakingWorkspace";

export default function SpeakingWorkspace() {
  const { exerciseId } = useParams();
  return <B2SpeakingWorkspace key={exerciseId} resourceId={exerciseId} assessment={false} />;
}
