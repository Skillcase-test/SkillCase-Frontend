import { Check } from "lucide-react";
import Button from "../../../components/ui/Button";
import { images } from "../../../assets/images.js";
export default function DemoClassSection() {
  return (
    <div className="pt-6 lg:px-4">
      {/* Desktop: 2-column grid */}
      <div className="lg:flex lg:rounded-xl lg:overflow-hidden lg:border lg:border-gray-200 lg:shadow-sm">
        {/* Left:Blue Background Content */}
        <div className="bg-[#002856] pt-7 pb-6 lg:pb-7 lg:w-1/2 lg:flex lg:flex-col lg:justify-center">
          <div className="px-4 lg:px-8">
            <h2 className="text-white text-[30px] font-semibold leading-[38px] mb-4">
              Free Demo Class for Nurses: Learn German Basics
            </h2>
            <p className="text-white text-lg leading-7 mb-4 opacity-80">
              Learn to greet and introduce yourself in German – in just 30
              minutes!
            </p>
            {/* Date & Time */}
            <div className="flex flex-wrap gap-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#003D83] flex items-center justify-center">
                  <Check className="size-4 text-[#edb843] font-bold" />
                </div>
                <span className="text-white text-lg opacity-80">Today</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#003D83] flex items-center justify-center">
                  <Check className="size-4 text-[#edb843] font-bold" />
                </div>
                <span className="text-white text-lg opacity-80">9:00 PM</span>
              </div>
            </div>
            {/* CTA Button */}
            <Button
              variant="primary"
              fullWidth
              className="mb-2 lg:max-w-xl"
              href="https://luma.com/Skillcase.in"
              target="_blank"
              rel="noopener noreferrer"
            >
              Register Now for Free
            </Button>
            <p className="text-[#edb843] text-sm text-center mt-2 font-medium">
              Limited Seats available
            </p>
          </div>
        </div>
        {/* Right: Image */}
        <div className="h-[250px] lg:h-auto lg:w-1/2 lg:min-h-[350px]">
          <img
            src={images.demoCards}
            alt="Demo class"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
