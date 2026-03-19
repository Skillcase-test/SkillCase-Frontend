import Button from "../../../components/ui/Button";
import { images } from "../../../assets/images.js";

const D = {
  heading: "Salary, Expenses and Savings in Germany",
  subtitle: "Get real answers in 30 minutes:",
  benefit_1: "Exact salary in for Nurses in Germany",
  benefit_2: "Cost of living in various Cities",
  benefit_3: "Monthly expected savings",
  benefit_4: "Benefits: PR, Free Education & more",
  button_text: "Register Now for Free",
  button_link: "https://luma.com/e4hfm8xk",
  image_url: "",
};

export default function SalaryInfoCard({ data }) {
  const d = data ? { ...D, ...data } : D;
  const benefits = [d.benefit_1, d.benefit_2, d.benefit_3, d.benefit_4];

  return (
    <div className="px-4 py-5">
      <div className="bg-white border border-[#c7c7c7] rounded-2xl overflow-hidden lg:flex lg:flex-row-reverse">
        <div className="h-[280px] lg:h-auto lg:w-1/2 lg:min-h-[350px]">
          <img
            src={d.image_url || images.salaryImage}
            alt="Nurses in Germany"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="px-6 pt-10 pb-12 lg:w-1/2 lg:flex lg:flex-col lg:justify-center lg:px-10">
          <h2 className="text-[30px] font-semibold leading-[38px] text-[#181d27] mb-4">
            {d.heading}
          </h2>
          <p className="text-[15px] text-[#414651] leading-[1.4] mb-4">
            {d.subtitle}
          </p>
          <ul className="space-y-2 mb-8 list-disc pl-6">
            {benefits.map((b, i) => (
              <li key={i} className="text-[15px] text-[#414651] leading-[1.4]">
                {b}
              </li>
            ))}
          </ul>
          <Button
            variant="primary"
            fullWidth
            className="mb-6 lg:max-w-xs"
            href={d.button_link}
            target="_blank"
            rel="noopener noreferrer"
          >
            {d.button_text}
          </Button>
        </div>
      </div>
    </div>
  );
}
