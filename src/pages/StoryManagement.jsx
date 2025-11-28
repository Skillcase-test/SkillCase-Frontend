import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios";

export default function StoryManagement() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    description: "",
    coverImageUrl: "",
    heroImageUrl: "",
    story: "",
  });

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/stories");
      setStories(res.data.data || []);
    } catch (err) {
      console.error("Error fetching stories:", err);
      toast.error("Failed to fetch stories");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    setSubmitting(true);
    e.preventDefault();
    try {
      await api.post("/admin/stories", formData);
      toast.success("Story created successfully!");
      setShowForm(false);
      resetForm();
      fetchStories();
    } catch (err) {
      console.error("Error creating story:", err);
      toast.error(err.response?.data?.message || "Failed to create story");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    setSubmitting(true);
    e.preventDefault();
    try {
      await api.put(`/admin/stories/${editingStory.slug}`, {
        ...formData,
        newSlug:
          formData.slug !== editingStory.slug ? formData.slug : undefined,
      });
      toast.success("Story updated successfully!");
      setEditingStory(null);
      setShowForm(false);
      resetForm();
      fetchStories();
    } catch (err) {
      console.error("Error updating story:", err);
      toast.error(err.response?.data?.message || "Failed to update story");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (slug) => {
    if (!confirm("Are you sure you want to delete this story?")) return;

    try {
      await api.delete(`/admin/stories/${slug}`);
      toast.success("Story deleted successfully!");
      fetchStories();
    } catch (err) {
      console.error("Error deleting story:", err);
      toast.error("Failed to delete story");
    }
  };

  const startEdit = (story) => {
    setEditingStory(story);
    setFormData({
      slug: story.slug,
      title: story.title,
      description: story.description || "",
      coverImageUrl: story.coverImageUrl || "",
      heroImageUrl: story.heroImageUrl || "",
      story: story.story,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      slug: "",
      title: "",
      description: "",
      coverImageUrl: "",
      heroImageUrl: "",
      story: "",
    });
    setEditingStory(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    resetForm();
  };

  if (loading) {
    return <div className="p-8 text-center">Loading stories...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Story Management</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Add New Story
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">
            {editingStory ? "Edit Story" : "Create New Story"}
          </h2>
          <form
            onSubmit={editingStory ? handleUpdate : handleCreate}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Slug (URL-friendly) *
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  required
                  placeholder="my-first-story"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="My First Story"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="2"
                placeholder="Brief description of the story..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  name="coverImageUrl"
                  value={formData.coverImageUrl}
                  onChange={handleInputChange}
                  placeholder="https://example.com/cover.jpg"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Hero Image URL
                </label>
                <input
                  type="url"
                  name="heroImageUrl"
                  value={formData.heroImageUrl}
                  onChange={handleInputChange}
                  placeholder="https://example.com/hero.jpg"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Story Content *
              </label>
              <textarea
                name="story"
                value={formData.story}
                onChange={handleInputChange}
                required
                rows="10"
                placeholder="Write your story here..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition cursor-pointer"
              >
                <Save className="w-5 h-5" />
                {submitting
                  ? editingStory
                    ? "Updating..."
                    : "Creating..."
                  : editingStory
                  ? "Update Story"
                  : "Create Story"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-2 bg-slate-500 text-white px-6 py-2 rounded-lg hover:bg-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                Title
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                Created
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {stories.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="px-6 py-8 text-center text-slate-500"
                >
                  No stories found. Create your first story!
                </td>
              </tr>
            ) : (
              stories.map((story) => (
                <tr key={story.story_id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {story.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                    {story.slug}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(story.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(story)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(story.slug)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
