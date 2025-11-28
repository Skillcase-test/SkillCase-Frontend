import { Loader2 } from "lucide-react";
export default function ProcessingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-16 h-16 animate-spin mx-auto mb-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Processing Your Resume
        </h2>
        <p className="text-slate-600">
          AI is extracting data from your resume...
        </p>
        <p className="text-sm text-slate-500 mt-2">
          This may take 10-30 seconds
        </p>
      </div>
    </div>
  );
}
