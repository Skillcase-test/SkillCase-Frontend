import { useState, useRef } from "react";
import api from "../../../api/axios";
const useVoiceRecorder = (referenceText) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [assesmentResult, setAssesmentResult] = useState(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const scriptNodeRef = useRef(null);
  const audioDataRef = useRef([]);
  const timerRef = useRef(null);
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
  const sendToBackend = async (audioBlob, refText) => {
    if (!audioBlob) return;
    setIsUploading(true);
    setUploadStatus("");
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.wav");
    formData.append("reference_text", refText);
    try {
      const response = await api.post("/pronounce/asses", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.status === 200) {
        setUploadStatus("Successfully uploaded!");
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
            stopRecording();
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
  const stopRecording = async (refText) => {
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
      await sendToBackend(wavBlob, refText || referenceText);
    } catch (err) {
      console.error("Error stopping recording:", err);
      setUploadStatus("Error stopping recording");
    }
  };
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  const resetRecording = () => {
    setAssesmentResult(null);
    setUploadStatus("");
    setRecordingTime(0);
  };
  return {
    isRecording,
    isUploading,
    uploadStatus,
    recordingTime,
    assesmentResult,
    startRecording,
    stopRecording,
    formatTime,
    resetRecording,
    setAssesmentResult,
  };
};
export default useVoiceRecorder;
