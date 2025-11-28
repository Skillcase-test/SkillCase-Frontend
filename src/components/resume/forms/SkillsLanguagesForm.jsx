export default function SkillsLanguagesForm({ data, onUpdate }) {
  const skills = data?.skills || { technical: [], soft: [] };
  const languages = data?.languages || [];

  // Handle skills input - allow typing commas, only split on blur
  const handleSkillsBlur = (type, text) => {
    const skillsArray = text
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);
    onUpdate("skills", { ...skills, [type]: skillsArray });
  };
  const addLanguage = () => {
    onUpdate("languages", [
      ...languages,
      {
        id: `lang-${Date.now()}`,
        language: "",
        reading: "B2",
        speaking: "B2",
        writing: "B2",
      },
    ]);
  };
  const updateLanguage = (index, field, value) => {
    const updated = [...languages];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate("languages", updated);
  };
  const removeLanguage = (index) => {
    onUpdate(
      "languages",
      languages.filter((_, i) => i !== index)
    );
  };
  const LANGUAGE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
  return (
    <div className="space-y-8">
      {/* Skills Section */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Skills</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Technical Skills (comma-separated)
            </label>
            <textarea
              defaultValue={skills.technical?.join(", ") || ""}
              onBlur={(e) => handleSkillsBlur("technical", e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="JavaScript, Python, React, Node.js, AWS"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Soft Skills (comma-separated)
            </label>
            <textarea
              defaultValue={skills.soft?.join(", ") || ""}
              onBlur={(e) => handleSkillsBlur("soft", e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Communication, Leadership, Problem Solving"
            />
          </div>
        </div>
      </div>
      {/* Languages Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Languages</h2>
          <button
            onClick={addLanguage}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition cursor-pointer"
          >
            + Add Language
          </button>
        </div>
        {languages.length === 0 ? (
          <p className="text-slate-500 text-center py-8">
            No languages added. Click "Add Language" to start.
          </p>
        ) : (
          <div className="space-y-4">
            {languages.map((lang, index) => (
              <div
                key={lang.id}
                className="border border-slate-200 rounded-lg p-6"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-900">
                    Language #{index + 1}
                  </h3>
                  <button
                    onClick={() => removeLanguage(index)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Language
                    </label>
                    <input
                      type="text"
                      value={lang.language || ""}
                      onChange={(e) =>
                        updateLanguage(index, "language", e.target.value)
                      }
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="English"
                    />
                  </div>
                  {["reading", "speaking", "writing"].map((skill) => (
                    <div key={skill}>
                      <label className="block text-sm font-medium text-slate-700 mb-2 capitalize">
                        {skill}
                      </label>
                      <select
                        value={lang[skill] || "B2"}
                        onChange={(e) =>
                          updateLanguage(index, skill, e.target.value)
                        }
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {LANGUAGE_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Hobbies Section */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Hobbies (optional)
        </label>
        <textarea
          value={data?.hobbies || ""}
          onChange={(e) => onUpdate("hobbies", e.target.value)}
          rows={3}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Reading, Traveling, Photography..."
        />
      </div>
    </div>
  );
}
