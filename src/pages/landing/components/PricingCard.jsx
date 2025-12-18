import { Zap, Check } from "lucide-react";
import Button from "../../../components/ui/Button";

/* A1 Starter Plan Pricing Card */

export default function PricingCard() {
  const features = [
    "A1 Level - Learn from scratch",
    "Live classes (Flexible Timings)",
    "English & Local Language support",
    "German-certified trainers",
  ];
  return (
    <div className="bg-[#fafafa] px-4 py-16">
      {/* Section Header */}
      <div className="mb-12">
        <h2 className="text-[30px] font-semibold leading-[38px] text-[#181d27] mb-4">
          Begin Your German Classes Today
        </h2>
        <p className="text-lg text-[#535862] leading-7">
          Take your first step towards working in Germany with beginner-friendly
          training.
        </p>
      </div>

      {/* Pricing Card */}
      <div className="w-full flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] overflow-hidden shadow-lg lg:w-[32vw]">
          {/* Header */}
          <div className="pt-6 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#f8f8f8] flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-[#edb843]" />
            </div>
            <h3 className="text-xl font-semibold text-[#002856] mb-2">
              A1 Starter Plan
            </h3>
            <p className="text-4xl font-semibold text-[#181d27] tracking-tight">
              ₹2000
            </p>
            <p className="text-base text-[#535862] mt-2">Billed once.</p>
          </div>

          {/* Features */}
          <div className="px-6 py-8">
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#f8f8f8] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-[#edb843]" />
                  </div>
                  <p className="text-base text-[#535862]">{feature}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-[#fafafa] border-t border-[#e9eaeb] px-6 py-6">
            <Button variant="primary" fullWidth>
              Get started
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
