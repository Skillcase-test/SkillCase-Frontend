import { Link } from "react-router-dom";
import Button from "./ui/Button";

export default function Footer() {
  const footerLinks = {
    Product: ["Overview", "Features", "Solutions", "Tutorials", "Pricing"],
    Company: ["About us", "Careers", "Press", "News", "Contact"],
    Resources: ["Blog", "Newsletter", "Events", "Help centre", "Support"],
    Legal: ["Terms", "Privacy", "Cookies", "Licenses"],
  };

  return (
    <footer className="bg-[#002856] text-white">
      {/* Newsletter Section */}
      <div className="px-4 lg:px-8 py-12 max-w-7xl mx-auto">
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Join our newsletter</h3>
          <p className="text-[#89a1bd] text-base">
            We'll send you a nice letter once per week. No spam.
          </p>
        </div>

        {/* Email Input */}
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 px-4 py-3 rounded-lg bg-white text-gray-900 placeholder-gray-500 border-none focus:ring-2 focus:ring-[#edb843] outline-none"
          />
          <Button variant="primary" className="sm:w-auto">
            Subscribe
          </Button>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-[#d6bbfb] mb-4">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <Link
                      to="#"
                      className="text-[#e9d7fe] hover:text-white transition-colors"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#7f56d9] pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-row items-center gap-2">
              <img src="/s.png" alt="Skillcase" className="h-8" />
              <p className="text-[#d6bbfb] text-md font-bold">SkillCase</p>
            </div>
            <p className="text-[#d6bbfb] text-sm">
              © 2024 Skillcase. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
