import React, { useEffect, useState, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Volume2,
  Mic,
  CheckCircle2,
  XCircle,
  Square,
  Loader2,
  RotateCcw,
} from "lucide-react";
import api from "../api/axios";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";

const Pronounce = () => {
  const { user } = useSelector((state) => state.auth);
  const [currentCard, setCurrentCard] = useState(0);
  const [assesmentResult, setAssesmentResult] = useState(null);
  const [flashcardSet, setFlashcardSet] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [Progress, setProgress] = useState(0);

  // Voice recorder states
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);

  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const scriptNodeRef = useRef(null);
  const audioDataRef = useRef([]);
  const timerRef = useRef(null);

  const [swipeDirection, setSwipeDirection] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const { prof_level, pronounce_id } = useParams();
  const [searchParams] = useSearchParams();
  const pronounce_name = searchParams.get("pronounce_name");
  const navigate = useNavigate();

  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const totalCards = flashcardSet.length;

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      mediaStreamRef.current = stream;

      const scriptNode = audioContext.createScriptProcessor(4096, 1, 1);
      scriptNodeRef.current = scriptNode;
      audioDataRef.current = [];

      scriptNode.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        audioDataRef.current.push(new Float32Array(input));
      };

      source.connect(scriptNode);
      scriptNode.connect(audioContext.destination);

      setIsRecording(true);
      setRecordingTime(0);
      setUploadStatus("");
      setAssesmentResult(null);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev + 1 >= 5) {
            stopRecording(); // Auto-stop at 10 seconds
            return 5;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setUploadStatus("Error: Could not access microphone");
    }
  };

  const stopRecording = async () => {
    try {
      if (!audioContextRef.current || !scriptNodeRef.current) return;

      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      scriptNodeRef.current.disconnect();
      audioContextRef.current.close();

      const wavBlob = encodeWAV(
        audioDataRef.current,
        audioContextRef.current.sampleRate
      );

      setIsRecording(false);
      clearInterval(timerRef.current);

      // Automatically send to backend after stopping
      await sendToBackend(wavBlob);
    } catch (err) {
      console.error("Error stopping recording:", err);
      setUploadStatus("Error stopping recording");
    }
  };

  const encodeWAV = (chunks, sampleRate) => {
    let flat = mergeBuffers(chunks);
    let buffer = new ArrayBuffer(44 + flat.length * 2);
    let view = new DataView(buffer);

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + flat.length * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, flat.length * 2, true);

    floatTo16BitPCM(view, 44, flat);

    return new Blob([view], { type: "audio/wav" });
  };

  const mergeBuffers = (chunks) => {
    let length = chunks.reduce((acc, cur) => acc + cur.length, 0);
    let result = new Float32Array(length);
    let offset = 0;
    for (let chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  };

  const floatTo16BitPCM = (output, offset, input) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  };

  const writeString = (view, offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  const sendToBackend = async (audioBlob) => {
    if (!audioBlob) return;

    setIsUploading(true);
    setUploadStatus("");

    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.wav");
    formData.append("reference_text", flashcardSet[currentCard].back_content);

    try {
      const response = await api.post("/pronounce/asses", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 200) {
        setUploadStatus("Successfully uploaded!");
        // console.log("Response:", response.data);
        setAssesmentResult(response.data);
      } else {
        setUploadStatus("Upload failed. Please try again.");
      }
    } catch (err) {
      console.error("Error uploading audio:", err);
      setUploadStatus("Error: Could not connect to server");
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleResend = () => {
    setAssesmentResult(null);
    setUploadStatus("");
    setRecordingTime(0);
  };

  // Speech synthesis
  const speakText = async (text, language = "de-DE") => {
    try {
      setIsLoadingAudio(true);
      setIsSpeaking(true);

      const response = await api.post(
        "/tts/speak",
        {
          text,
          language,
        },
        {
          responseType: "blob", // Important: receive audio as blob
        }
      );

      // Create audio URL from blob
      const audioBlob = new Blob([response.data], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Play audio
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl); // Clean up
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setIsLoadingAudio(false);
        console.error("Failed to play audio");
      };

      await audio.play();
      setIsLoadingAudio(false);
    } catch (err) {
      console.error("TTS Error:", err);
      setIsSpeaking(false);
      setIsLoadingAudio(false);

      // Fallback to browser TTS if Azure fails
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = 0.9;
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const handleSpeakFront = async (e) => {
    e.stopPropagation();
    if (flashcardSet[currentCard]?.back_content) {
      await speakText(flashcardSet[currentCard].back_content, "de-DE");
    }
  };

  useEffect(() => {
    const playAudio = async () => {
      if (flashcardSet[currentCard]?.back_content) {
        await speakText(flashcardSet[currentCard].back_content, "de-DE");
      }
    };
    playAudio();
  }, [currentCard, flashcardSet]);

  // Load flashcards
  useEffect(() => {
    if (!user) navigate("/login");
    const getCards = async () => {
      try {
        const res = await api.get(
          `pronounce/getPronounceCards/${pronounce_id}`
        );
        setFlashcardSet(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    getCards();
  }, [user, navigate, pronounce_id]);

  useEffect(() => {
    const progress = ((currentCard + 1) / totalCards) * 100;
    setProgress(progress);
  }, [currentCard, totalCards]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  // Swipe handling
  const handleDragStart = (e) => {
    const clientX = e.type === "mousedown" ? e.clientX : e.touches[0].clientX;
    setDragStart(clientX);
    setIsDragging(true);
    setSwipeDirection(null);
  };

  const handleDragMove = (e) => {
    if (!dragStart) return;
    const clientX = e.type === "mousemove" ? e.clientX : e.touches[0].clientX;
    const delta = clientX - dragStart;
    setDragOffset(delta);
  };

  const handleDragEnd = () => {
    if (!dragStart) return;
    const swipeThreshold = 100;
    if (Math.abs(dragOffset) > swipeThreshold) {
      if (dragOffset > 0) {
        setSwipeDirection("right");
        setTimeout(() => {
          handlePrevious();
          setSwipeDirection(null);
          setDragOffset(0);
        }, 300);
      } else {
        setSwipeDirection("left");
        setTimeout(() => {
          handleNext();
          setSwipeDirection(null);
          setDragOffset(0);
        }, 300);
      }
    } else {
      setDragOffset(0);
    }
    setDragStart(null);
    setIsDragging(false);
  };

  const getCardTransform = () => {
    if (swipeDirection === "left") return "translateX(-120%) rotate(-20deg)";
    if (swipeDirection === "right") return "translateX(120%) rotate(20deg)";
    if (isDragging && dragOffset !== 0)
      return `translateX(${dragOffset}px) rotate(${dragOffset * 0.05}deg)`;
    return "translateX(0) rotate(0deg)";
  };

  // Navigation
  const handleNext = () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (currentCard < totalCards - 1) {
      setCurrentCard(currentCard + 1);
      setAssesmentResult(null);
      setRecordingTime(0);
      setUploadStatus("");
    }
  };

  const handlePrevious = () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (currentCard > 0) {
      setCurrentCard(currentCard - 1);
      setAssesmentResult(null);
      setRecordingTime(0);
      setUploadStatus("");
    }
  };

  const getAssessmentStatus = () => {
    if (!assesmentResult) return null;
    const accuracy = assesmentResult.result.accuracyScore;
    return accuracy >= 70 ? "pass" : "fail";
  };

  const assessmentStatus = getAssessmentStatus();

  return (
    <section>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-slate-50">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => navigate(`/pronounce/${prof_level}`)}
              className="text-slate-600 hover:text-slate-800 flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <div className="text-center">
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                {pronounce_name}
              </h1>
              <p className="text-sm text-slate-500">
                🇩🇪 German • {prof_level?.toUpperCase()} Level
              </p>
            </div>
            <div className="w-10" />
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
          {/* Progress Bar */}
          <div className="relative w-full h-3 bg-slate-100 rounded-full mb-8">
            <div
              className="h-full bg-gradient-to-r from-slate-700 to-slate-800 rounded-full transition-all duration-300"
              style={{ width: `${Progress}%` }}
            />
          </div>

          {/* Flashcard */}
          <div
            className="relative w-full h-[600px] md:h-[500px] cursor-pointer"
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            style={{
              transform: getCardTransform(),
              opacity: swipeDirection ? 0 : 1,
              transition: isDragging ? "none" : "all 0.3s ease-out",
            }}
          >
            <div className="h-full bg-white rounded-3xl shadow-2xl p-12 flex flex-col items-center justify-center border-4 border-slate-500 relative overflow-hidden">
              {/* Speak button */}
              <button
                onClick={handleSpeakFront}
                disabled={isLoadingAudio || isSpeaking}
                className={`absolute top-6 right-6 p-3 rounded-full shadow-lg transition-all z-20 ${
                  isSpeaking
                    ? "bg-cyan-600 text-white animate-pulse"
                    : "bg-white text-cyan-600 hover:bg-cyan-50 cursor-pointer"
                }`}
                title="Play pronunciation"
              >
                {isLoadingAudio ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              {/* Card content */}
              <div className="text-center mb-6 md:mb-8 px-4">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-800 mb-3 md:mb-4 break-words">
                  {flashcardSet[currentCard]?.back_content}
                </div>
                <div className="text-lg sm:text-xl md:text-2xl text-slate-500 font-medium break-words">
                  {flashcardSet[currentCard]?.front_content}
                </div>
              </div>

              {/* Recording Timer */}
              {(isRecording || isUploading) && (
                <div className="text-2xl font-mono text-slate-700 mb-4">
                  {formatTime(recordingTime)}
                </div>
              )}

              {/* Voice Recorder Button */}
              {!assesmentResult && !isUploading && (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isUploading}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all transform hover:scale-105 ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 animate-pulse"
                      : "bg-blue-500 hover:bg-blue-600"
                  } text-white shadow-lg`}
                >
                  {isRecording ? (
                    <Square className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
              )}

              {/* Uploading State */}
              {isUploading && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                  <p className="text-slate-600 font-medium">
                    Analyzing pronunciation...
                  </p>
                </div>
              )}

              {/* Pronunciation Result Card */}
              {assesmentResult && !isUploading && (
                <div className="mt-8 w-full animate-fadeIn">
                  {/* Pass/Fail Indicator */}
                  <div className="flex items-center justify-center gap-2 mb-6">
                    {assessmentStatus === "pass" ? (
                      <>
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                        <span className="text-green-600 font-semibold text-lg">
                          Passed
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-6 h-6 text-red-600" />
                        <span className="text-red-600 font-semibold text-lg">
                          Keep Practicing
                        </span>
                      </>
                    )}
                  </div>

                  {/* Assessment Metrics - Horizontal */}
                  <div className="flex items-center justify-center gap-8 flex-wrap mb-6">
                    <div className="text-center">
                      <p className="text-xs text-slate-500 font-medium mb-1">
                        Accuracy
                      </p>
                      <p
                        className={`text-3xl font-bold ${
                          assesmentResult.result.accuracyScore >= 70
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {assesmentResult.result.accuracyScore}
                      </p>
                    </div>

                    <div className="h-12 w-px bg-slate-200"></div>

                    <div className="text-center">
                      <p className="text-xs text-slate-500 font-medium mb-1">
                        Fluency
                      </p>
                      <p className="text-3xl font-bold text-slate-700">
                        {assesmentResult.result.fluencyScore}
                      </p>
                    </div>

                    <div className="h-12 w-px bg-slate-200"></div>

                    <div className="text-center">
                      <p className="text-xs text-slate-500 font-medium mb-1">
                        Completeness
                      </p>
                      <p className="text-3xl font-bold text-slate-700">
                        {assesmentResult.result.completenessScore}
                      </p>
                    </div>

                    <div className="h-12 w-px bg-slate-200"></div>

                    <div className="text-center">
                      <p className="text-xs text-slate-500 font-medium mb-1">
                        Pronunciation
                      </p>
                      <p className="text-3xl font-bold text-slate-700">
                        {assesmentResult.result.pronunciationScore}
                      </p>
                    </div>
                  </div>

                  {/* Resend Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={handleResend}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-full shadow-lg flex items-center gap-2 transition-all transform hover:scale-105"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {uploadStatus && uploadStatus.includes("Error") && (
                <div className="mt-4 w-full p-3 rounded-lg text-center bg-red-100 text-red-800">
                  {uploadStatus}
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={handlePrevious}
              disabled={currentCard === 0}
              className="p-3 rounded-xl bg-white text-slate-700 hover:bg-slate-50 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentCard === totalCards - 1}
              className="p-3 rounded-xl bg-white text-slate-700 hover:bg-slate-50 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pronounce;
