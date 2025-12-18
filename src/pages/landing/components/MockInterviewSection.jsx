import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import { images } from "../../../assets/images.js";
export default function MockInterviewSection() {
  return (
    <div className="bg-white overflow-hidden pb-20">
      {/* Desktop: 2-column layout */}
      <div className="bg-[#fafafa] lg:rounded-xl lg:mx-4 lg:overflow-hidden">
        <div className="lg:flex lg:items-center">
          {/* Content - Left */}
          <div className="pt-5 pb-28 lg:pb-10 lg:w-1/2 lg:px-10 lg:py-12">
            <div className="px-4 text-center lg:text-left lg:px-0">
              <h2 className="text-[30px] font-semibold leading-[38px] text-[#181d27] mb-3">
                Practice Free Mock Interview Now
              </h2>
              <Badge variant="success" dot className="mb-4">
                Takes less than 10 mins
              </Badge>
              <p className="text-lg text-[#535862] leading-7 mb-6">
                Want to test your German speaking skills? Take this Online mock
                interview.
              </p>
              <Button
                variant="primary"
                fullWidth
                className="lg:max-w-xs lg:mx-0"
                to={"https://tally.so/r/np8Jx1"}
              >
                Start Interview
              </Button>
            </div>
          </div>
          {/* Image - Right */}
          <div className="-mt-16 px-4 lg:mt-0 lg:px-0 lg:w-1/2 lg:h-full">
            <div className="rounded-lg overflow-hidden aspect-[3/2] lg:rounded-none lg:aspect-auto lg:h-[350px]">
              <img
                src={images.avatar}
                alt="Mock interview preview"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
