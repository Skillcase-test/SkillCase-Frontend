import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ArrowRight, Clock3 } from "lucide-react";
import { getMayaImage } from "../../utils/mayaAvatars";
import api from "../../api/axios";
import { setB2ExamGateSeen } from "../../redux/auth/authSlice";
import useB2Access from "../../hooks/useB2Access";
import { B2Button, B2SkillStrip } from "./B2UI";
import SkillcaseLogo from "../SkillcaseLogo";
export default function B2ExamGate({ overview }) {
  const navigate = useNavigate(),
    dispatch = useDispatch(),
    open = useB2Access();
  const { user } = useSelector((s) => s.auth);
  const dialog = useRef(null);
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  const markSeen = () => {
    dispatch(setB2ExamGateSeen());
    api.post("/user/complete-b2-exam-gate").catch(() => {});
  };
  const start = () => {
    if (!overview?.nextPaper) {
      markSeen();
      navigate("/b2/test");
      return;
    }
    if (open("exams")) {
      markSeen();
      navigate("/b2/test/ready");
    }
  };

  return (
    <dialog
      ref={dialog}
      onCancel={markSeen}
      aria-label="Welcome to B2 German"
      className="b2-ui b2-dialog b2-welcome"
    >
      <div className="b2-welcome-inner">
        <div className="b2-brandbar">
          <SkillcaseLogo width={142} />
          <span className="b2-chip">B2 German</span>
        </div>
        <div className="b2-welcome-art">
          <span className="b2-speech">Hallo! I’m Maya.</span>
          <img src={getMayaImage("wave", user)} alt="Maya, your learning companion" />
        </div>
        <div className="b2-welcome-sheet">
          <h1>Welcome to B2.</h1>
          <p>Take a short test to find what to practise.</p>
          <B2SkillStrip />
          <div className="b2-welcome-actions">
            {overview?.nextPaper?.durationMinutes > 0 && (
              <p className="b2-note b2-welcome-duration">
                <Clock3 size={18} aria-hidden="true" />
                <span>About {overview.nextPaper.durationMinutes} minutes</span>
              </p>
            )}
            <div className="b2-stack" style={{ gap: 4 }}>
              <B2Button onClick={start}>
                Prepare for test <ArrowRight size={18} />
              </B2Button>
              <B2Button variant="quiet" onClick={markSeen}>
                Explore practice
              </B2Button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
