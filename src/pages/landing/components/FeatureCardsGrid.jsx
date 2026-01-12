import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Badge from "../../../components/ui/Badge";
import { images } from "../../../assets/images.js";
import { useState } from "react";
import { hapticLight } from "../../../utils/haptics";

/* Feature Cards */

export default function FeatureCardsGrid() {
  const { user } = useSelector((state) => state.auth);
  const profLevel = user?.user_prof_level || "A1";

  const features = [
    {
      id: "flashcards",
      tourId: "flashcard-card",
      title: "Flashcards",
      description: "Practice basic German using Flashcards",
      image: images.flashcards,
      link: `/practice/${profLevel}`,
      enabled: true,
    },
    {
      id: "vocabulary",
      tourId: "pronunciation-card",
      title: "Vocabulary Practice",
      description: "Build your German vocabulary",
      image: images.vocabulary,
      link: `/pronounce/${profLevel}`,
      enabled: true,
    },
    {
      id: "mock-test",
      tourId: "test-card",
      title: "Mock Test",
      description: "Test your German knowledge",
      image: images.mockTest,
      link: `/test/${profLevel}`,
      enabled: true,
    },
    {
      id: "listener",
      tourId: "listener-card",
      title: "Listener",
      description: "Listen the conversations",
      image: images.speakToAI,
      link: `/conversation/${profLevel}`,
      enabled: true,
    },
    {
      id: "stories",
      tourId: "stories-card",
      title: "Short Stories",
      description: "Read engaging stories",
      image: images.grammar,
      link: `/stories`,
      enabled: true,
    },
    {
      id: "interview",
      title: "Interview Practice",
      description: "Prepare for job interviews",
      image: images.interview,
      link: `#`,
      enabled: false,
      comingSoon: true,
    },
  ];

  return (
    <div className="px-4 pt-8 pb-4">
      <div id="feature-cards-grid" className="grid grid-cols-3 gap-2.5">
        {features.map((feature) => (
          <FeatureCard key={feature.id} {...feature} />
        ))}
      </div>
    </div>
  );
}

function FeatureCard({ title, description, image, link, enabled, comingSoon, tourId }) {
  const CardWrapper = enabled ? Link : "div";
  const [isPressed, setIsPressed] = useState(false);

  return (
    <CardWrapper
      id={tourId}
      to={enabled ? link : undefined}
      onTouchStart={() => { if (enabled) { setIsPressed(true); hapticLight(); } }}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => enabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={`
        bg-white rounded-lg p-0.5 card-shadow
        transition-all duration-150
        ${
          enabled
            ? "hover:scale-105 cursor-pointer"
            : "opacity-60 cursor-not-allowed"
        }
        ${isPressed ? "scale-[0.85] shadow-inner" : ""}
        ${!enabled && "bg-[#e5e5e5]"}
      `}
    >
      {/* Image */}
      <div className="h-16 md:h-40 rounded-md overflow-hidden">
        <img src={image} alt={title} className="w-full h-full object-cover" />
      </div>

      {/* Content */}
      <div className="p-1.5 pb-2">
        <h3 className="text-xs md:text-xl font-medium text-black mb-1">
          {title}
        </h3>
        {comingSoon ? (
          <Badge variant="warning">Coming soon</Badge>
        ) : (
          <p className="text-[8px] md:text-[14px] text-black opacity-60 leading-[1.3]">
            {description}
          </p>
        )}
      </div>
    </CardWrapper>
  );
}
