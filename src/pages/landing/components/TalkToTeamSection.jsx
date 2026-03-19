import { Phone } from "lucide-react";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import CheckItem from "../../../components/ui/CheckItem";
import { images } from "../../../assets/images.js";

const D = {
  heading: "Talk to our team",
  feature_1: "Personalized assistance",
  feature_2: "Step-by-step guidance",
  feature_3: "Clearing all your doubts with ease",
  button_text: "Call us Now",
  phone_link: "tel:9731462667",
  phone_display_text: "Call Us @ 9731462667",
  badge_text: "Online",
  avatar_image_url: "",
};

export default function TalkToTeamSection({ data }) {
  const d = data ? { ...D, ...data } : D;
  const features = [d.feature_1, d.feature_2, d.feature_3];

  return (
    <div className="px-4 py-5">
      <div className="bg-[rgba(237,184,67,0.15)] rounded-2xl px-5 py-8 lg:px-20 lg:py-10">
        <div className="lg:flex lg:items-center lg:gap-10">
          <div className="flex flex-col items-center mb-6 lg:mb-0 lg:flex-shrink-0">
            <div className="w-[140px] h-[140px] lg:w-[160px] lg:h-[160px] rounded-full border-[1.5px] border-white overflow-hidden mb-2">
              <img
                src={d.avatar_image_url || images.avatarTeam}
                alt="Team member"
                className="w-full h-full object-cover"
              />
            </div>
            <Badge variant="success" dot>
              {d.badge_text}
            </Badge>
          </div>
          <div className="lg:flex-1 lg:flex lg:flex-col lg:items-center">
            <h2 className="text-[30px] font-semibold leading-[38px] text-[#181d27] mb-4 lg:text-left">
              {d.heading}
            </h2>
            <div className="space-y-2 mb-6 lg:mb-0">
              {features.map((f, i) => (
                <CheckItem key={i} variant="light">
                  {f}
                </CheckItem>
              ))}
            </div>
          </div>
          <div className="lg:flex-shrink-0 lg:text-center">
            <Button
              variant="dark"
              fullWidth
              rounded
              icon={<Phone className="w-[18px] h-[18px] text-white" />}
              href={d.phone_link}
              className="mb-3 lg:w-60 lg:px-8"
            >
              {d.button_text}
            </Button>
            <p className="text-center text-base text-black">
              or
              <br />
              <span className="font-semibold">{d.phone_display_text}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
