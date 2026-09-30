import B2ResponseReviewCard from "../../../components/b2/B2ResponseReviewCard";
import { normalizeB2Score } from "../../../utils/b2Scores";
import { getScoreGreeting } from "../utils/scoreUtils";
import { B2Page, B2State } from "../../../components/b2/B2UI";
import B2ResultSummary from "../../../components/b2/B2ResultSummary";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { resolveB2SubmissionId } from "../../../utils/b2Submission";
import {
  ChevronLeft,
  ThumbsUp,
  Lightbulb,
} from "lucide-react";
import {
  getB2ExamSubmissionStatus,
  getB2ExamSectionContent,
} from "../../../api/b2Api";
import ScoreRing from "../components/ScoreRing";
import MetricBar from "../components/MetricBar";
import AudioPlayer from "../components/AudioPlayer";

export default function ExamSpeakingResults() {
  const navigate = useNavigate();
  const { paperId } = useParams();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const submissionId = location.state?.submissionId;

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [sectionData, setSectionData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewBlockIndex, setReviewBlockIndex] = useState(null);
  const [isOverallCompleted, setIsOverallCompleted] = useState(false);

  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const playbackAudioRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const fetchResults = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const resolvedId = await resolveB2SubmissionId(paperId, submissionId);
      if (!resolvedId) {
        throw new Error("No submission found for this paper");
      }

      const statusRes = await getB2ExamSubmissionStatus(resolvedId);
      setIsOverallCompleted(statusRes.data.submission?.status === "completed");

      const sectionsList = Array.isArray(statusRes.data.sections)
        ? statusRes.data.sections
        : [];
      const speakingSection = sectionsList.find(
        (s) => s.section_type === "speaking",
      );
      setSectionData(speakingSection);

      const contentRes = await getB2ExamSectionContent(paperId, "speaking");
      setQuestions(Array.isArray(contentRes.data) ? contentRes.data : []);
    } catch (err) {
      console.error("Error fetching Speaking results:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.user_id || !paperId) return;
    fetchResults();
  }, [user?.user_id, paperId, submissionId]);

  useEffect(() => {
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current = null;
    }
    setIsPlayingBack(false);
    setPlaybackTime(0);
    setPlaybackDuration(0);

    const q = reviewBlockIndex !== null ? questions[reviewBlockIndex] : null;
    // Exam answers are keyed by the question row id (no _0 suffix) and store
    // { audio_url, record_duration } — play the url, not the object.
    const userAudio = q ? sectionData?.answers?.[q.id] : null;
    const userAudioUrl = userAudio?.audio_url || null;

    if (userAudioUrl) {
      const audio = new Audio(userAudioUrl);
      playbackAudioRef.current = audio;

      const handleLoadedMetadata = () => {
        setPlaybackDuration(audio.duration);
      };
      const handleTimeUpdate = () => {
        setPlaybackTime(audio.currentTime);
      };
      const handleEnded = () => {
        setIsPlayingBack(false);
        setPlaybackTime(0);
      };

      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleEnded);

      audio.load();

      return () => {
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
      };
    }
  }, [reviewBlockIndex, questions, sectionData]);

  const handlePlayPause = () => {
    if (!playbackAudioRef.current) return;
    if (isPlayingBack) {
      playbackAudioRef.current.pause();
      setIsPlayingBack(false);
    } else {
      playbackAudioRef.current.play();
      setIsPlayingBack(true);
    }
  };

  useEffect(() => {
    return () => {
      if (playbackAudioRef.current) {
        playbackAudioRef.current.pause();
      }
    };
  }, []);

  const handleBackToDashboard = () => {
    if (isOverallCompleted) {
      navigate(`/b2/exams/papers/${paperId}/congratulations`);
    } else {
      navigate(`/b2/exams/papers/${paperId}/dashboard`);
    }
  };

  const handleStartNextSection = () => {
    handleBackToDashboard();
  };

  if (loading)
    return (
      <B2Page title="Speaking" back="/b2/test">
        <B2State loading />
      </B2Page>
    );

  if (fetchError || !sectionData)
    return (
      <B2Page title="Speaking" back="/b2/test">
        <B2State
          title="Speaking feedback couldn’t load"
          description="Your connection may have dropped. Try again when you’re ready."
          onRetry={fetchResults}
        />
      </B2Page>
    );

  const answersMap = sectionData.answers || {};
  const feedbackData = sectionData.feedback || {};

  const whatWentWell =
    feedbackData.whatWentWell || "Feedback is not available yet.";
  const tryToImprove =
    feedbackData.tryToImprove ||
    "Open your response to check for available feedback.";

  const flatQuestions = questions.map((block) => {
    const userAns = answersMap[block.id] || {};
    const report =
      (feedbackData.questions
        ? feedbackData.questions[block.id]
        : feedbackData[block.id]) || {};
    const qScore = normalizeB2Score(report.score);
    const skipped = !userAns.audio_url;

    return {
      ...block,
      userAns,
      report,
      qScore,
      skipped,
    };
  });

  const formatSeconds = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };



  const padZero = (num) => {
    return String(num || 0).padStart(2, "0");
  };

  const currentBlock =
    reviewBlockIndex !== null ? questions[reviewBlockIndex] : null;
  const currentBlockData =
    reviewBlockIndex !== null ? flatQuestions[reviewBlockIndex] : null;

  const qObj = currentBlock?.questions?.[0] || {};
  return (
    <div className="b2-ui b2-review w-full max-w-md mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden shadow-sm relative pb-24">
      <div className="self-stretch px-4 py-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white">
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={() => {
              if (reviewMode) setReviewMode(false);
              else handleBackToDashboard();
            }}
            className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
          >
            <ChevronLeft className="w-4 h-4 text-slate-900" />
            <span className="text-center text-slate-900 text-sm font-semibold leading-6">
              Back
            </span>
          </button>
          <span className="text-center text-neutral-500 text-sm font-semibold leading-6">
            Speaking Feedback
          </span>
        </div>
      </div>

      {!reviewMode ? (
        <B2ResultSummary
          skill="speaking"
          assessment={true}
          data={sectionData}
          onReview={() => {
            setReviewMode(true);
            setReviewBlockIndex(null);
          }}
          onContinue={handleStartNextSection}
        />
      ) : reviewBlockIndex === null ? (
        /* ================= REVIEW ANSWER INDEX LIST VIEW ================= */
        <div className="flex-1 w-full overflow-y-auto px-4 py-6 flex flex-col gap-3 pb-24">
          <div className="flex flex-col items-start gap-1 pb-2">
            <h3 className="text-sky-950 text-base font-semibold">
              Speaking Review
            </h3>
            <p className="text-slate-500 text-xs">
              Review transcription reports and pronunciation scores.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {flatQuestions.map((q, idx) => (
              <B2ResponseReviewCard
                key={idx} index={idx} title={q.block_title || `Speaking Task ${idx + 1}`}
                score={q.qScore} skipped={q.skipped}
                onClick={() => setReviewBlockIndex(idx)}
              />
            ))}
          </div>
        </div>
      ) : (
        /* ================= FULL-SCREEN WORKSPACE-LIKE REVIEW VIEW ================= */
        <div className="flex-1 w-full flex flex-col justify-start items-center overflow-hidden">
          <div className="self-stretch px-4 pt-1 flex flex-col justify-start items-start gap-2 shrink-0 bg-white">
            <div className="self-stretch text-center text-sky-950 text-base font-semibold leading-5">
              Question {padZero(reviewBlockIndex + 1)} of{" "}
              {padZero(questions.length)}
            </div>
            <div className="self-stretch flex justify-start items-center gap-1.5 pb-4">
              {questions.map((_, idx) => (
                <div
                  key={idx}
                  className={`flex-1 h-2.5 rounded-[200px] transition-all ${
                    idx <= reviewBlockIndex ? "bg-amber-300" : "bg-zinc-100"
                  }`}
                ></div>
              ))}
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            className="flex-1 w-full overflow-y-auto pb-52"
          >
            <div className="self-stretch px-4 pt-4 pb-6 flex flex-col justify-start items-start bg-white shrink-0">
              <div className="w-full flex flex-col gap-4 text-left">
                {currentBlock.speaking_prompt_image && (
                  <img
                    src={currentBlock.speaking_prompt_image}
                    alt="Speaking Prompt Illustration"
                    className="w-full h-52 object-cover rounded-lg shadow-sm"
                  />
                )}

                <h3 className="text-sky-950 text-base font-semibold leading-6">
                  {currentBlock.block_title}
                </h3>

                {currentBlock.passage_text && (
                  <div className="w-full p-3 border border-zinc-200 rounded-xl bg-slate-50">
                    <p className="text-slate-750 text-xs font-normal leading-relaxed whitespace-pre-line">
                      {currentBlock.passage_text}
                    </p>
                  </div>
                )}

                {qObj.question_text && (
                  <div className="w-full p-3.5 bg-blue-50/40 border border-blue-100 rounded-xl text-left">
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block mb-1">
                      Aufgabe (Task)
                    </span>
                    <p className="text-slate-800 text-xs font-medium leading-relaxed">
                      {qObj.question_text}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="self-stretch px-4 flex flex-col gap-4">
              {currentBlockData.userAns?.audio_url && (
                <div className="w-full pt-4 pb-6 bg-white flex flex-col justify-start items-start gap-3 mt-4">
                  <div className="w-full text-left text-sky-950 text-sm font-bold leading-5">
                    Your Speech Recording
                  </div>
                  <AudioPlayer
                    isPlaying={isPlayingBack}
                    onPlayPause={handlePlayPause}
                    playbackTime={playbackTime}
                    playbackDuration={
                      playbackDuration ||
                      currentBlockData.userAns.record_duration ||
                      0
                    }
                    formatSeconds={formatSeconds}
                    variant="review"
                  />
                </div>
              )}

              {currentBlockData.report?.transcript && (
                <div className="p-4 bg-white border border-zinc-200 rounded-xl text-left flex flex-col gap-1 shadow-sm mt-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Transcribed Text
                  </span>
                  <p className="text-slate-800 text-xs italic">
                    "{currentBlockData.report.transcript}"
                  </p>
                </div>
              )}

              {!currentBlockData.skipped && (
                <div className="self-stretch pb-6 mt-4">
                  <div className="w-full px-5 pt-10 pb-5 bg-black/5 rounded-xl flex flex-col justify-start items-center gap-9">
                    <div className="flex flex-col justify-start items-center gap-3">
                      <div className="text-center text-sky-950 text-base font-semibold leading-5">
                        Speaking Feedback
                      </div>
                      <div className="text-center text-sky-950 text-3xl font-semibold leading-9">
                        {getScoreGreeting(currentBlockData.qScore)}
                      </div>
                    </div>

                    <ScoreRing
                      score={currentBlockData.qScore}
                      label="overall speaking accuracy"
                    />

                    <div className="w-full flex flex-col justify-start items-start gap-3">
                      <MetricBar
                        label="Pronunciation"
                        score={
                          currentBlockData.report?.metrics?.pronunciation
                        }
                      />
                      <MetricBar
                        label="Fluency"
                        score={
                          currentBlockData.report?.metrics?.fluency
                        }
                      />
                      <MetricBar
                        label="Accuracy"
                        score={
                          currentBlockData.report?.metrics?.accuracy
                        }
                      />
                      <MetricBar
                        label="Completeness"
                        score={
                          currentBlockData.report?.metrics?.completeness
                        }
                      />
                    </div>

                    <div className="w-full flex flex-col justify-start items-start gap-3">
                      {whatWentWell && (
                        <div className="w-full p-4 bg-white rounded-xl border border-zinc-200 inline-flex justify-start items-start gap-3 text-left shadow-sm">
                          <ThumbsUp className="w-4.5 h-4.5 text-green-700 mt-0.5 shrink-0" />
                          <div className="flex-1 flex flex-col gap-1">
                            <span className="text-slate-900 text-xs font-semibold">
                              What went well
                            </span>
                            <p className="text-slate-600 text-xs leading-4">
                              {whatWentWell}
                            </p>
                          </div>
                        </div>
                      )}

                      {tryToImprove && (
                        <div className="w-full p-4 bg-white rounded-xl border border-zinc-200 inline-flex justify-start items-start gap-3 text-left shadow-sm">
                          <Lightbulb className="w-4.5 h-4.5 text-amber-500 mt-0.5 shrink-0" />
                          <div className="flex-1 flex flex-col gap-1">
                            <span className="text-slate-900 text-xs font-semibold">
                              Try to improve
                            </span>
                            <p className="text-slate-600 text-xs leading-4">
                              {tryToImprove}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {reviewMode && (
        <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col gap-2 shrink-0 z-10">
          {reviewBlockIndex !== null ? (
            <>
              <button
                onClick={() => {
                  if (reviewBlockIndex < questions.length - 1) {
                    setReviewBlockIndex((prev) => prev + 1);
                  } else {
                    setReviewBlockIndex(null);
                  }
                }}
                className="w-full py-3 bg-blue-950 hover:bg-blue-900 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all outline-none border-0 cursor-pointer flex justify-center items-center"
              >
                {reviewBlockIndex === questions.length - 1
                  ? "Finish Review"
                  : "Review Next Question"}
              </button>

              {reviewBlockIndex > 0 && (
                <button
                  onClick={() => setReviewBlockIndex((prev) => prev - 1)}
                  className="w-full py-3 bg-white hover:bg-slate-50 border border-zinc-300 active:scale-95 text-slate-700 text-sm font-semibold rounded-lg transition-all outline-none cursor-pointer flex justify-center items-center shadow-sm"
                >
                  Previous Question
                </button>
              )}

              <button
                onClick={handleStartNextSection}
                className="w-full py-3 bg-white hover:bg-slate-50 border border-zinc-300 active:scale-95 text-blue-950 text-sm font-semibold rounded-lg transition-all outline-none cursor-pointer flex justify-center items-center shadow-sm"
              >
                Continue assessment
              </button>
            </>
          ) : (
            <button
              onClick={handleStartNextSection}
              className="w-full py-3 bg-blue-950 hover:bg-blue-900 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all outline-none border-0 cursor-pointer flex justify-center items-center"
            >
              Continue assessment
            </button>
          )}
        </div>
      )}
    </div>
  );
}
