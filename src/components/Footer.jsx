import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function Footer() {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const footerBody = (
    <div className="max-w-7xl mx-auto px-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-12 text-center md:text-left">
        <div>
          <h3 className="text-3xl font-bold mb-6">About us</h3>
          <p className="text-white text-base leading-relaxed">
            Empowering professionals for global careers. We simplify
            international recruitment through expert guidance, language
            training, and end-to-end relocation support.
          </p>
        </div>

        <div>
          <h3 className="text-3xl font-bold mb-6">Contact Us</h3>
          <div className="space-y-4 text-base">
            <p className="text-white">Phone: +91 97314 62667</p>
            <p className="text-white">Email: info@skillcase.in</p>
            <p className="text-white">Hours: Mon - Sat | 10:00 AM - 8:00 PM</p>
          </div>
        </div>

        <div>
          <h3 className="text-3xl font-bold mb-6">Quick Links</h3>
          <ul className="space-y-3 text-base">
            <li>
              <a href="https://skillcase.in/about" className="text-white hover:underline">
                About Us
              </a>
            </li>
            <li>
              <a
                href="https://skillcase.in/terms-and-condition"
                className="text-white hover:underline"
              >
                Terms & Conditions
              </a>
            </li>
            <li>
              <a
                href="https://skillcase.in/privacy-policy"
                className="text-white hover:underline"
              >
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="https://skillcase.in/blog" className="text-white hover:underline">
                Blog
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-blue-900 pt-8">
        <p className="text-xs text-blue-100 mb-3">
          We use limited operational journey and error data to run, secure, and improve Skillcase. The system is designed to exclude lesson answers, typed content, recordings, documents, and contact details. See our{" "}
          <a href="https://skillcase.in/privacy-policy" className="underline">
            Privacy Policy
          </a>.
        </p>
        <p className="text-base text-white">© 2025 Skillcase All Rights Reserved.</p>
      </div>
    </div>
  );

  return (
    <footer className="bg-[#002856] text-white">
      <div className="lg:hidden px-4 py-3 border-b border-blue-900/70">
        <button
          onClick={() => setIsMobileExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between text-left"
          aria-expanded={isMobileExpanded}
          aria-label="Toggle footer links"
        >
          <span className="text-sm font-semibold tracking-wide">
            Policies, Terms & Contact Us
          </span>
          <ChevronDown
            className={`w-5 h-5 transition-transform ${isMobileExpanded ? "rotate-180" : "rotate-0"}`}
          />
        </button>
      </div>

      <div className="hidden lg:block py-16">{footerBody}</div>

      {isMobileExpanded && (
        <div className="lg:hidden py-8">
          <div className="[&_h3]:text-2xl [&_p]:text-sm [&_a]:text-sm">{footerBody}</div>
        </div>
      )}
    </footer>
  );
}
