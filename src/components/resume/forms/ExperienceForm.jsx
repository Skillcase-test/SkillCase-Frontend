export default function ExperienceForm({ data, onUpdate }) {
  const experience = data?.experience || [];

  const addExperience = () => {
    onUpdate("experience", [
      ...experience,
      {
        id: `exp-${Date.now()}`,
        company: "",
        position: "",
        startDate: "",
        endDate: "",
        location: "",
        responsibilities: [],
        currentJob: false,
      },
    ]);
  };
  const updateExperience = (index, field, value) => {
    const updated = [...experience];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate("experience", updated);
  };
  const removeExperience = (index) => {
    onUpdate(
      "experience",
      experience.filter((_, i) => i !== index)
    );
  };
  const updateResponsibilities = (index, text) => {
    const responsibilities = text.split("\n").filter((r) => r.trim());
    updateExperience(index, "responsibilities", responsibilities);
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Work Experience</h2>
        <button
          onClick={addExperience}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition cursor-pointer"
        >
          + Add Experience
        </button>
      </div>
      {experience.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          No experience entries. Click "Add Experience" to start.
        </p>
      ) : (
        experience.map((exp, index) => (
          <div
            key={exp.id}
            className="border border-slate-200 rounded-lg p-6 space-y-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-900">
                Experience #{index + 1}
              </h3>
              <button
                onClick={() => removeExperience(index)}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Remove
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  value={exp.company || ""}
                  onChange={(e) =>
                    updateExperience(index, "company", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Company Name"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Position
                </label>
                <input
                  type="text"
                  value={exp.position || ""}
                  onChange={(e) =>
                    updateExperience(index, "position", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Software Engineer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Start Date
                </label>
                <input
                  type="text"
                  value={exp.startDate || ""}
                  onChange={(e) =>
                    updateExperience(index, "startDate", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="MM/YYYY"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  End Date
                </label>
                <input
                  type="text"
                  value={exp.endDate || ""}
                  onChange={(e) =>
                    updateExperience(index, "endDate", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Present or MM/YYYY"
                  disabled={exp.currentJob}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={exp.location || ""}
                  onChange={(e) =>
                    updateExperience(index, "location", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="City, Country"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Responsibilities (one per line)
                </label>
                <textarea
                  value={exp.responsibilities?.join("\n") || ""}
                  onChange={(e) =>
                    updateResponsibilities(index, e.target.value)
                  }
                  rows={5}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Developed features...&#10;Improved performance...&#10;Led team of..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exp.currentJob || false}
                    onChange={(e) => {
                      updateExperience(index, "currentJob", e.target.checked);
                      if (e.target.checked) {
                        updateExperience(index, "endDate", "Present");
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-slate-700">
                    I currently work here
                  </span>
                </label>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
