import { useEffect, useState } from "react";

import { CheckCircle, Home, Phone } from "lucide-react";

import { useNavigate, useSearchParams } from "react-router-dom";

export default function ThankYouPage() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const [pixelFired, setPixelFired] = useState(false);

  useEffect(() => {
    const urlNonce = searchParams.get("nonce");
    const storedNonce = sessionStorage.getItem("thankYouNonce");

    // Verify nonce matches (this prevents abuse)

    if (urlNonce && storedNonce && urlNonce === storedNonce && !pixelFired) {
      if (typeof fbq !== "undefined") {
        fbq("track", "PageView");
        fbq("track", "Lead", {
          content_name: "Nursing Germany Registration",
          value: 0.0,
          currency: "INR",
        });

        console.log("Valid nonce - Meta Pixel fired for conversion");
      } else {
        console.warn("Meta Pixel (fbq) not loaded");
      }

      setPixelFired(true);

      // Delete nonce to prevent reuse
      sessionStorage.removeItem("thankYouNonce");
    } else {
      console.warn(
        "Invalid or missing nonce - Pixel NOT fired (possible abuse attempt)"
      );
      console.warn("Debug:", { urlNonce, storedNonce, pixelFired });
    }
  }, [searchParams, pixelFired]);

  return (
    <div
      style={{ fontFamily: "'Poppins', sans-serif" }}
      className="min-h-screen bg-gradient-to-b from-white to-gray-50"
    >
      {/* Header */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/register" className="flex items-center">
              <img
                src="/mainlogo.png"
                alt="SkillCase"
                className="w-30 sm:w-30 md:w-30 lg:w-40 h-auto pt-1"
              />
            </a>
            <a
              href="tel:+919972266767"
              className="flex items-center gap-1 bg-white hover:bg-grey-100 text-slate-800 px-4 py-2 rounded-full text-sm font-medium transition-all border"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
              Call Us
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex items-center justify-center px-4 py-8 md:py-16 lg:py-24">
        <div className="max-w-md w-full">
          {/* Success Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center">
            {/* Success Icon */}
            <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 animate-bounce">
              <CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-green-500" />
            </div>

            {/* Heading */}
            <h1 className="text-2xl md:text-3xl font-bold text-[#002856] mb-2 md:mb-3">
              You're All Set! 🎉
            </h1>

            {/* Subheading */}
            <p className="text-gray-600 text-sm md:text-base mb-4 md:mb-6 leading-relaxed">
              Thank you for taking the first step toward your dream career in
              Germany!
            </p>

            {/* Next Steps Card */}
            <div className="bg-[#74d5ff]/10 rounded-xl p-4 md:p-6 mb-4 md:mb-6 text-left">
              <h3 className="font-semibold text-[#002856] mb-3 flex items-center gap-2">
                <span className="text-xl">📞</span> What's Next?
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  Our team will contact you within 24 hours
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  We'll assess your profile and answer all your questions
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  Start your personalized German learning journey
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className="border-t border-gray-200 pt-4 md:pt-6 mb-4 md:mb-6">
              <p className="text-sm text-gray-600 mb-3">
                Have questions? We're here to help!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="tel:+919972266767"
                  className="inline-flex items-center justify-center gap-2 bg-[#002856] text-white px-6 py-3 rounded-full font-medium text-sm hover:bg-[#003366] transition-all"
                >
                  <Phone className="w-4 h-4" />
                  Call Now
                </a>
              </div>
            </div>

            {/* Back to Home */}
            <button
              onClick={() => navigate("/register")}
              className="w-full inline-flex items-center justify-center gap-2 bg-white text-[#002856] px-6 py-3 rounded-full font-medium text-sm border border-[#002856] hover:bg-gray-50 transition-all"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </button>
          </div>

          {/* Extra Info */}
          <p className="text-center text-xs text-gray-500 mt-6">
            🔒 Your information is secure and will only be used to contact you
            about our programs.
          </p>
        </div>
      </div>
    </div>
  );
}
