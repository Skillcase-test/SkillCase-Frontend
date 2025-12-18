import { Link } from "react-router-dom";
import Button from "../../../components/ui/Button";

/* Explore Jobs in Germany CTA */

export default function ExploreJobsCTA() {
  return (
    <div className="px-4 py-5">
      <div className="bg-[#002856] rounded-2xl px-6 py-10 lg:flex items-center justify-between">
        <div>
          <h2 className="text-[30px] font-semibold leading-[38px] text-white mb-4">
            Explore Jobs in Germany
          </h2>
          <p className="text-lg text-[#89a1bd] leading-7 mb-8">
            See job details, requirements, salary, and more.
          </p>
        </div>
        <a
          className="bg-[#edb843] block w-full lg:max-w-xs py-2 rounded-md shadow-md text-[#002856]  hover:bg-[#c48b0e] transition-colors duration-300 cursor-pointer font-bold text-center"
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
