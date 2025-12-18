import { Check } from "lucide-react";
import Button from "../../../components/ui/Button";
import { images } from "../../../assets/images.js";
export default function WebinarSection() {
  const benefits = [
    "Exact salary in for Nurses in Germany",
    "Cost of living in various Cities",
    "Monthly expected savings",
    "Benefits: PR, Free Education & more",
  ];
  return (
    <div className="px-4 py-5">
      <div className="bg-white border border-[#c7c7c7] rounded-2xl overflow-hidden lg:flex">
        {/* Content - Left */}
        <div className="px-6 pt-10 pb-8 lg:w-1/2 lg:flex lg:flex-col lg:justify-center lg:px-10">
          <h2 className="text-[30px] font-semibold leading-[38px] text-[#181d27] mb-4">
            Free Webinar on Life in Germany
          </h2>
          <p className="text-[15px] text-[#414651] leading-[1.4] mb-4">
            Get real answers in 30 minutes:
          </p>
          <ul className="space-y-2 mb-6 list-disc pl-6">
            {benefits.map((benefit, index) => (
              <li
                key={index}
                className="text-[15px] text-[#414651] leading-[1.4]"
              >
                {benefit}
              </li>
            ))}
          </ul>
          {/* CTA Button */}
          <Button
            variant="primary"
            fullWidth
            className="mb-4 lg:max-w-xl"
            href="https://luma.com/e4hfm8xk"
            target="_blank"
            rel="noopener noreferrer"
          >
            Register Now for Free
          </Button>
          {/* Date & Time */}
          <div className="flex items-center justify-between px-4 font-bold">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#002856]" />
              <span className="text-md text-[#181d27]/60">31st Dec 2025</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#002856]" />
              <span className="text-md text-[#181d27]/60">9:00 PM IST</span>
            </div>
          </div>
        </div>
        {/* Image - Right */}
        <div className="h-[280px] lg:h-auto lg:w-1/2 lg:min-h-[350px]">
          <img
            src={images.salaryImage}
            alt="Nurses in Germany"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
