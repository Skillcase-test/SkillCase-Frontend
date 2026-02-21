import React, { useState, useRef } from "react";
import api from "../api/axios";
import { Mic, Square, Loader2 } from "lucide-react";

export default function VoiceRecorder({ card, closeOverlay,setAssesmentResult }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);

  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const scriptNodeRef = useRef(null);
  const audioDataRef = useRef([]);
  const timerRef = useRef(null);

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

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setUploadStatus("Error: Could not access microphone");
    }
  };

  const stopRecording = async () => {
    try {
      if (!audioContextRef.current || !scriptNodeRef.current) return;

      // Stop all tracks
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());

      // Disconnect nodes
      scriptNodeRef.current.disconnect();
      audioContextRef.current.close();

      // Convert Float32Array chunks to WAV
      const wavBlob = encodeWAV(audioDataRef.current, audioContextRef.current.sampleRate);
      setAudioBlob(wavBlob);

      setIsRecording(false);
      clearInterval(timerRef.current);
    } catch (err) {
      console.error("Error stopping recording:", err);
      setUploadStatus("Error stopping recording");
    }
  };

  const encodeWAV = (chunks, sampleRate) => {
    // Flatten Float32Array
    let flat = mergeBuffers(chunks);
    // Convert to 16-bit PCM
    let buffer = new ArrayBuffer(44 + flat.length * 2);
    let view = new DataView(buffer);

    // WAV header
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + flat.length * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // channels
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    writeString(view, 36, "data");
    view.setUint32(40, flat.length * 2, true);

    // PCM samples
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

  const sendToBackend = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    setUploadStatus("");

    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.wav");
    formData.append("reference_text", card.back_content);

    try {
      const response = await api.post("/pronounce/asses", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 200) {
        setUploadStatus("Successfully uploaded!");
        setAudioBlob(null);
        setAssesmentResult(response.data)
        closeOverlay()
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

  return (
    <div className="relative bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
      <button
        onClick={closeOverlay}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
      >
        ✕
      </button>

      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Voice Recorder</h1>

      <div className="flex flex-col items-center space-y-6">
        {(isRecording || audioBlob) && (
          <div className="text-2xl font-mono text-gray-700">{formatTime(recordingTime)}</div>
        )}

        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all transform hover:scale-105 ${
            isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-blue-500 hover:bg-blue-600"
          } text-white shadow-lg`}
          disabled={isUploading}
        >
          {isRecording ? <Square className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
        </button>

        <p className="text-gray-600 text-sm">
          {isRecording ? "Recording... Click to stop" : "Click to start recording"}
        </p>

        {audioBlob && !isRecording && (
          <div className="w-full space-y-4">
            <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
            <button
              onClick={sendToBackend}
              disabled={isUploading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <span>Check Pronunciation</span>
              )}
            </button>
          </div>
        )}

        {uploadStatus && (
          <div
            className={`w-full p-3 rounded-lg text-center ${
              uploadStatus.includes("Success") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {uploadStatus}
          </div>
        )}
      </div>
    </div>
  );
}
