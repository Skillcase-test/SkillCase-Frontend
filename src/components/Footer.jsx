export default function Footer() {
  return (
    <footer className="bg-[#002856] text-white py-16">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-12 text-center md:text-left">
          {/* About Us Section */}
          <div>
            <h3 className="text-3xl font-bold mb-6">About us</h3>
            <p className="text-white text-base leading-relaxed">
              Empowering professionals for global careers. We simplify
              international recruitment through expert guidance, language
              training, and end-to-end relocation support.
            </p>
          </div>

          {/* Contact Us Section */}
          <div>
            <h3 className="text-3xl font-bold mb-6">Contact Us</h3>
            <div className="space-y-4 text-base">
              <p className="text-white">Phone: +91 97314 62667</p>
              <p className="text-white">Email: info@skillcase.in</p>
              <p className="text-white">
                Hours: Mon - Sat | 10:00 AM - 8:00 PM
              </p>
            </div>
          </div>

          {/* Quick Links Section */}
          <div>
            <h3 className="text-3xl font-bold mb-6">Quick Links</h3>
            <ul className="space-y-3 text-base">
              <li>
                <a
                  href="https://skillcase.in/about"
                  className="text-white hover:underline"
                >
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
                <a
                  href="https://skillcase.in/blog"
                  className="text-white hover:underline"
                >
                  Blog
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="border-t border-blue-900 pt-8">
          <p className="text-base text-white">
            © 2025 Skillcase All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}