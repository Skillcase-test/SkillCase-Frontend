import { Link } from "react-router-dom";
import Button from "../../../components/ui/Button";

/* Complete Your Profile CTA Section */
export default function CompleteProfileCTA() {
  return (
    <div className="px-4 py-5">
      <div className="bg-[#fafafa] rounded-2xl px-6 py-10 lg:flex items-center justify-between">
        <div>
          <h2 className="text-[30px] font-semibold leading-[38px] text-[#181d27] mb-4">
            Complete Your Profile now
          </h2>
          <p className="text-lg text-[#535862] leading-7 mb-8">
            Fill in your details so recruiters can know more about you.
          </p>
        </div>
        <a
          className="bg-white block w-full lg:max-w-xs py-2 rounded-md border border-[#002856] shadow-md text-[#002856] hover:text-white hover:bg-[#002856] transition-colors duration-300 cursor-pointer font-bold text-center"
          href="https://skillcase.in/user-profile?tab=pills-profile"
          target="_blank"
          rel="noopener noreferrer"
        >
          Complete My Profile
        </a>
      </div>
    </div>
  );
}
