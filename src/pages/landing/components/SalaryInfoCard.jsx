import Button from "../../../components/ui/Button";
import { images } from "../../../assets/images.js";
export default function SalaryInfoCard() {
  const benefits = [
    "Exact salary in for Nurses in Germany",
    "Cost of living in various Cities",
    "Monthly expected savings",
    "Benefits: PR, Free Education & more",
  ];
  return (
    <div className="px-4 py-5">
      <div className="bg-white border border-[#c7c7c7] rounded-2xl overflow-hidden lg:flex lg:flex-row-reverse">
        {/* Image - Right on desktop */}
        <div className="h-[280px] lg:h-auto lg:w-1/2 lg:min-h-[350px]">
          <img
            src={images.salaryImage}
            alt="Nurses in Germany"
            className="w-full h-full object-cover"
          />
        </div>
        {/* Content - Left on desktop */}
        <div className="px-6 pt-10 pb-12 lg:w-1/2 lg:flex lg:flex-col lg:justify-center lg:px-10">
          <h2 className="text-[30px] font-semibold leading-[38px] text-[#181d27] mb-4">
            Salary, Expenses and Savings in Germany
          </h2>
          <p className="text-[15px] text-[#414651] leading-[1.4] mb-4">
            Get real answers in 30 minutes:
          </p>
          <ul className="space-y-2 mb-8 list-disc pl-6">
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
            className="mb-6 lg:max-w-xs"
            href="https://luma.com/e4hfm8xk"
            target="_blank"
            rel="noopener noreferrer"
          >
            Register Now for Free
          </Button>
        </div>
      </div>
    </div>
  );
}
