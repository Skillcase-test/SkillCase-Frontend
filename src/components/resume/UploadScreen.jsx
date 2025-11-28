import { Upload, FileText, AlertCircle, ArrowLeft } from "lucide-react";
export default function UploadScreen({
  file,
  error,
  onFileChange,
  onExtract,
  onBack,
  loading,
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center text-slate-600 hover:text-slate-900 mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Resume Options
        </button>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Upload Your Resume
            </h1>
            <p className="text-slate-600">
              Upload your existing resume and let AI extract all information
              automatically
            </p>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          )}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Resume File
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={onFileChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer cursor-pointer"
              />
              <p className="text-sm text-slate-500 mt-2">
                Supported format: PDF (Max 10MB)
              </p>
            </div>
            {file && (
              <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
                <FileText className="w-6 h-6 text-slate-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={onExtract}
              disabled={!file || loading}
              className="w-full bg-[#1976D2] text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Processing..." : "Extract Resume Data"}
            </button>
            <div className="text-center text-sm text-slate-500 pt-4 border-t">
              <p className="font-medium mb-3">AI will extract:</p>
              <div className="grid grid-cols-2 gap-2">
                <span>• Personal Information</span>
                <span>• Work Experience</span>
                <span>• Education</span>
                <span>• Skills & Languages</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
