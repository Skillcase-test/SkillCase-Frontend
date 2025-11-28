export default function EducationForm({ data, onUpdate }) {
  const education = data?.education || [];

  const addEducation = () => {
    onUpdate("education", [
      ...education,
      {
        id: `edu-${Date.now()}`,
        institution: "",
        degree: "",
        startYear: "",
        endYear: "",
        location: "",
      },
    ]);
  };
  const updateEducation = (index, field, value) => {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate("education", updated);
  };
  const removeEducation = (index) => {
    onUpdate(
      "education",
      education.filter((_, i) => i !== index)
    );
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Education</h2>
        <button
          onClick={addEducation}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition cursor-pointer"
        >
          + Add Education
        </button>
      </div>
      {education.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          No education entries. Click "Add Education" to start.
        </p>
      ) : (
        education.map((edu, index) => (
          <div
            key={edu.id}
            className="border border-slate-200 rounded-lg p-6 space-y-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-900">
                Education #{index + 1}
              </h3>
              <button
                onClick={() => removeEducation(index)}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Remove
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Institution
                </label>
                <input
                  type="text"
                  value={edu.institution || ""}
                  onChange={(e) =>
                    updateEducation(index, "institution", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="University Name"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Degree
                </label>
                <input
                  type="text"
                  value={edu.degree || ""}
                  onChange={(e) =>
                    updateEducation(index, "degree", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bachelor of Science in Computer Science"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Start Year
                </label>
                <input
                  type="text"
                  value={edu.startYear || ""}
                  onChange={(e) =>
                    updateEducation(index, "startYear", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="2020"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  End Year
                </label>
                <input
                  type="text"
                  value={edu.endYear || ""}
                  onChange={(e) =>
                    updateEducation(index, "endYear", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="2024"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={edu.location || ""}
                  onChange={(e) =>
                    updateEducation(index, "location", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="City, Country"
                />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
