import { Check } from "lucide-react";
import Button from "../../../components/ui/Button";
import { images } from "../../../assets/images.js";

const D = {
  heading: "Free Demo Class for Nurses: Learn German Basics",
  subtitle:
    "Learn to greet and introduce yourself in German - in just 30 minutes!",
  check_item_1: "Today",
  check_item_2: "9:00 PM",
  button_text: "Register Now for Free",
  button_link: "https://luma.com/Skillcase.in",
  badge_text: "Limited Seats available",
  image_url: "",
};

export default function DemoClassSection({ data }) {
  const d = data ? { ...D, ...data } : D;

  return (
    <div className="pt-6 lg:px-4">
      <div className="lg:flex lg:rounded-xl lg:overflow-hidden lg:border lg:border-gray-200 lg:shadow-sm">
        <div className="bg-[#002856] pt-7 pb-6 lg:pb-7 lg:w-1/2 lg:flex lg:flex-col lg:justify-center">
          <div className="px-4 lg:px-8">
            <h2 className="text-white text-[30px] font-semibold leading-[38px] mb-4">
              {d.heading}
            </h2>
            <p className="text-white text-lg leading-7 mb-4 opacity-80">
              {d.subtitle}
            </p>
            <div className="flex flex-wrap gap-6 mb-6">
              {[d.check_item_1, d.check_item_2].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#003D83] flex items-center justify-center">
                    <Check className="size-4 text-[#edb843] font-bold" />
                  </div>
                  <span className="text-white text-lg opacity-80">{item}</span>
                </div>
              ))}
            </div>
            <Button
              variant="primary"
              fullWidth
              className="mb-2 lg:max-w-xl"
              href={d.button_link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {d.button_text}
            </Button>
            <p className="text-[#edb843] text-sm text-center mt-2 font-medium">
              {d.badge_text}
            </p>
          </div>
        </div>
        <div className="h-[250px] lg:h-auto lg:w-1/2 lg:min-h-[350px]">
          <img
            src={d.image_url || images.demoCards}
            alt="Demo class"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
