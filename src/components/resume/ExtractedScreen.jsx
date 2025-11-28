import { CheckCircle } from "lucide-react";
export default function ExtractedScreen({ resumeData, onEdit, onPreview }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Data Extracted Successfully!
            </h1>
            <p className="text-slate-600">
              AI has extracted your resume data. Review and edit as needed.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">
                What was extracted:
              </h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Personal Information</li>
                <li>
                  ✓ {resumeData?.education?.length || 0} Education entries
                </li>
                <li>
                  ✓ {resumeData?.experience?.length || 0} Work experiences
                </li>
                <li>✓ {resumeData?.languages?.length || 0} Languages</li>
                <li>✓ Skills extracted</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Next steps:</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>1. Review extracted data</li>
                <li>2. Edit any incorrect information</li>
                <li>3. Add missing details</li>
                <li>4. Save or download resume</li>
              </ul>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={onEdit}
              className="flex-1 bg-[#1976D2] text-white py-4 px-2 rounded-lg font-semibold hover:bg-blue-700 transition cursor-pointer"
            >
              Review & Edit Data
            </button>
            <button
              onClick={onPreview}
              className="flex-1 bg-white border-2 border-slate-300 text-slate-700 py-4 rounded-lg font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Skip to Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
