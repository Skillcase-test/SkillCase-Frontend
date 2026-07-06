import React, { useState, useEffect, useRef } from "react";
import { Upload, X } from "lucide-react";

export default function OcrModal({ onClose, onUpload }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl("");
    }
  };

  const handleUploadClick = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      await onUpload({ target: { files: [selectedFile] } });
    } catch (err) {
      console.error(err);
      setIsUploading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={() => {
          if (!isUploading) onClose();
        }}
      />

      <div className="relative w-full max-w-[340px] bg-white rounded-2xl px-5 pt-12 pb-5 shadow-[0px_4px_20px_rgba(0,0,0,0.15)] flex flex-col justify-start items-center gap-5 border border-slate-100 animate-in zoom-in-95 duration-200">
        {!isUploading && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-lg bg-black/5 hover:bg-black/10 text-slate-500 hover:text-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="w-full flex flex-col justify-start items-center gap-3">
          <h3 className="text-center text-[#002856] text-base font-semibold font-sans leading-5">
            Upload Handwritten Image
          </h3>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        <div className="w-full">
          {selectedFile ? (
            <div
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className="relative w-full h-40 rounded-xl overflow-hidden bg-slate-50 border border-black/10 flex items-center justify-center cursor-pointer group py-3"
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Selected preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                  <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                    <span className="font-bold text-xs uppercase">
                      {selectedFile.name.split(".").pop()}
                    </span>
                  </div>
                  <span className="text-xs font-semibold max-w-[200px] text-center truncate">
                    {selectedFile.name}
                  </span>
                </div>
              )}

              {!isUploading && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                  <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 px-3 py-1.5 rounded-full shadow-sm">
                    Change file
                  </span>
                </div>
              )}

              {isUploading && (
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                  <div className="w-9 h-9 border-4 border-white/25 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className="w-full py-7 rounded-xl border border-slate-200 hover:border-[#002856] hover:bg-slate-50 flex justify-center items-center gap-2.5 cursor-pointer transition-all duration-200"
            >
              <div className="flex flex-col justify-start items-center gap-3">
                <div className="p-2.5 bg-[#002856] text-white rounded-xl inline-flex justify-center items-center shadow-sm">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="flex flex-col justify-start items-center gap-1 text-center">
                  <span className="text-[#002856] text-xs font-semibold font-sans">
                    Tap to upload
                  </span>
                  <span className="text-slate-400 text-[10px] font-normal font-sans">
                    Supported files: JPG, PNG, PDF
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-full flex flex-col justify-start items-start gap-2">
          <button
            onClick={handleUploadClick}
            disabled={!selectedFile || isUploading}
            className={`w-full py-3 rounded-lg flex justify-center items-center gap-1.5 transition-all duration-200 font-sans text-sm font-semibold ${
              selectedFile && !isUploading
                ? "bg-[#002856] hover:bg-[#001c3d] text-white shadow-sm cursor-pointer"
                : "bg-neutral-200 text-neutral-400 cursor-not-allowed border border-zinc-400/50"
            }`}
          >
            Upload Image
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="w-full py-3 rounded-lg border border-zinc-200 hover:bg-slate-50 flex justify-center items-center gap-1.5 transition-all duration-200 text-[#002856] text-sm font-semibold font-sans cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
