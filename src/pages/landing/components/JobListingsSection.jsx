import { useState } from "react";
import { Filter } from "lucide-react";
import JobCard from "./JobCard";
// Sample data - replace with API call
const sampleJobs = [
  {
    id: 1,
    title: "Nursing Assistant",
    organization: "Community Health Center",
    salary: "3 Lakh / month",
    levelRequired: "B2 Completed",
    location: "Hamburg, Germany",
    isLocked: true,
  },
  {
    id: 2,
    title: "Senior Care Assistant",
    organization: "Elderly Care Facility",
    salary: "2.8 Lakh / month",
    levelRequired: "B2 Completed",
    location: "Hanover, Germany",
    isLocked: true,
  },
  {
    id: 3,
    title: "Rehab Assistant",
    organization: "Rehabilitation Facility",
    salary: "2.7 Lakh / month",
    levelRequired: "B2 Completed",
    location: "Bavaria, Germany",
    isLocked: true,
  },
  {
    id: 4,
    title: "Nursing Assistant",
    organization: "Regional Medical Center",
    salary: "2.8 Lakh / month",
    levelRequired: "B2 Completed",
    location: "Bavaria, Germany",
    isLocked: true,
  },
  {
    id: 5,
    title: "Senior Care Worker",
    organization: "Long-Term Care Home",
    salary: "3 Lakh / month",
    levelRequired: "B2 Completed",
    location: "Hamburg, Germany",
    isLocked: true,
  },
];
export default function JobListingsSection() {
  const [showFilter, setShowFilter] = useState(false);

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-16">
        <h1 className="text-[40px] font-semibold text-[#002856] leading-[38px]">
          8+ jobs are live now!
        </h1>
        <button
          onClick={() => setShowFilter(!showFilter)}
          className="flex items-center gap-2 px-4 py-2 bg-[#edb843] text-white text-sm font-semibold rounded-lg hover:bg-[#d9a53a] transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span>Filter</span>
        </button>
      </div>
      {/* Job Cards */}
      <div className="space-y-4 lg:space-y-8">
        {sampleJobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
