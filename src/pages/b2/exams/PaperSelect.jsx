import { useNavigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { B2Page, B2Button } from "../../../components/b2/B2UI";
export default function PaperSelect() {
  const navigate = useNavigate();
  return (
    <B2Page title="Full mock exams">
      <div className="b2-content" id="b2-exams-coming-soon">
        <span className="b2-icon">
          <ClipboardList size={24} />
        </span>
        <span className="b2-eyebrow">Coming soon</span>
        <h1>Goethe & telc mock exams</h1>
        <p>For now, practise a skill or take an assessment.</p>
        <B2Button onClick={() => navigate("/")}>Practise a skill</B2Button>
        <B2Button variant="secondary" onClick={() => navigate("/b2/test")}>
          View assessments
        </B2Button>
      </div>
    </B2Page>
  );
}
