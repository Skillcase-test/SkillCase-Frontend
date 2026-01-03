import { useState, useRef } from "react";
import { CheckCircle, Loader2, Eye, EyeOff } from "lucide-react";

export default function InternalLeadForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const formRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    formRef.current.submit();
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
    }, 2000);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-[#002856] mb-6 text-center">
            Access Required
          </h2>
          <div className="relative mb-4">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter access code"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1976D2]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          <button
            onClick={() => {
              if (password === import.meta.env.VITE_PASSWORD) {
                setAuthenticated(true);
              } else {
                alert("Invalid access code");
              }
            }}
            className="w-full bg-[#1980d8] text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-all cursor-pointer"
          >
            Access Form
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-[#002856] mb-6 text-center">
          Inbound Lead Form
        </h2>

        {submitSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Lead Created!
            </h3>
            <button
              onClick={() => setSubmitSuccess(false)}
              className="bg-[#002856] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#003366] transition-all mt-4 cursor-pointer"
            >
              Create Another
            </button>
          </div>
        ) : (
          <>
            <form
              ref={formRef}
              action="https://bigin.zoho.in/crm/WebForm"
              method="POST"
              target="bigin_hidden_iframe"
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* Hidden Bigin Fields */}
              <input
                type="hidden"
                name="xnQsjsdp"
                value="c3a87a6d8f0d62a55d610ead5258ee12a45be82fd471b94004baf965ad30784c"
              />
              <input type="hidden" name="zc_gad" value="" />
              <input
                type="hidden"
                name="xmIwtLD"
                value="e81c7e5d60860a251e375719ab25cfb954c6b2bde9d03f735ea48bb4284bf4a295d70b28e788d2b19a6de6dc4da33f43"
              />
              <input type="hidden" name="actionType" value="Q29udGFjdHM=" />
              <input type="hidden" name="returnURL" value="null" />
              <input type="hidden" name="CONTACTCF1" value="Candidate" />

              {/* Last Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="Last Name"
                  required
                  maxLength="80"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1976D2]"
                  placeholder="Enter last name"
                />
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="Accounts.Account Name"
                  required
                  maxLength="200"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1976D2]"
                  placeholder="Enter company name"
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mobile *
                </label>
                <input
                  type="text"
                  name="Mobile"
                  required
                  maxLength="30"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1976D2]"
                  placeholder="Enter mobile number"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="Email"
                  maxLength="100"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1976D2]"
                  placeholder="Enter email (optional)"
                />
              </div>

              {/* Ad Set */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ad Set *
                </label>
                <select
                  name="CONTACTCF8"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1976D2] bg-white"
                >
                  <option value="">-- Select Ad Set --</option>
                  <option value="Inbound">Inbound</option>
                  <option value="Influencer">Influencer</option>
                </select>
              </div>

              {/* Language Level - NEW */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Language Level *
                </label>
                <select
                  name="CONTACTCF4"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1976D2] bg-white"
                >
                  <option value="">-- Select Level --</option>
                  <option value="Yet to start">Yet to start</option>
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                </select>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#1980d8] text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg mt-6 disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Lead"
                )}
              </button>
            </form>
            <iframe
              name="bigin_hidden_iframe"
              style={{ display: "none" }}
              title="Hidden Form Target"
            />
          </>
        )}
      </div>
    </div>
  );
}
