import { Phone } from "lucide-react";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import CheckItem from "../../../components/ui/CheckItem";
import { images } from "../../../assets/images.js";
export default function TalkToTeamSection() {
  const features = [
    "Personalized assistance",
    "Step-by-step guidance",
    "Clearing all your doubts with ease",
  ];
  return (
    <div className="px-4 py-5">
      <div className="bg-[rgba(237,184,67,0.15)] rounded-2xl px-5 py-8 lg:px-20 lg:py-10">
        {/* Desktop: Horizontal layout */}
        <div className="lg:flex lg:items-center lg:gap-10">
          {/* Avatar - Left */}
          <div className="flex flex-col items-center mb-6 lg:mb-0 lg:flex-shrink-0">
            <div className="w-[140px] h-[140px] lg:w-[160px] lg:h-[160px] rounded-full border-[1.5px] border-white overflow-hidden mb-2">
              <img
                src={images.avatarTeam}
                alt="Team member"
                className="w-full h-full object-cover"
              />
            </div>
            <Badge variant="success" dot>
              Online
            </Badge>
          </div>
          {/* Content - Center */}
          <div className="lg:flex-1 lg:flex lg:flex-col lg:items-center ">
            <h2 className="text-[30px] font-semibold leading-[38px] text-[#181d27] mb-4 lg:text-left">
              Talk to our team
            </h2>
            <div className="space-y-2 mb-6 lg:mb-0">
              {features.map((feature, index) => (
                <CheckItem key={index} variant="light">
                  {feature}
                </CheckItem>
              ))}
            </div>
          </div>
          {/* CTA - Right */}
          <div className="lg:flex-shrink-0 lg:text-center">
            <Button
              variant="dark"
              fullWidth
              rounded
              icon={<Phone className="w-[18px] h-[18px] text-white" />}
              href="tel:9731462667"
              className="mb-3 lg:w-60 lg:px-8"
            >
              Call us Now
            </Button>
            <p className="text-center text-base text-black">
              or
              <br />
              <span className="font-semibold">Call Us @ 9731462667</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
