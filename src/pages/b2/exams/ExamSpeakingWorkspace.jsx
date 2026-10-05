import { useParams } from "react-router-dom";
import B2SpeakingWorkspace from "../../../components/b2/B2SpeakingWorkspace";

export default function ExamSpeakingWorkspace() {
  const { paperId } = useParams();
  return <B2SpeakingWorkspace key={paperId} resourceId={paperId} assessment={true} />;
}
