// AdminDashboard.jsx
import React, { useState } from "react";
import {
  LayoutDashboard,
  FilePlus2,
  Trash2,
  ClipboardList,
  Users,
  Delete,
} from "lucide-react";

import AddFlashcards from "./AddFlashSetPage";
import DeleteFlashcards from "./deleteFlashSetPage";
import AddTest from "./addTestPage";
import AddInterview from "./addInterviewPage";
import AddPronounceSet from "./AddPronounceSetPage";
import DeletePronounceSet from "./DeletePronounceSetPage";
import DeleteTest from "./deleteTestSetPage";
import DeleteInterview from "./deleteInterviewPage";
import UserAnalyticsDashboard from "./userAnalytics";
import StoryManagement from "./StoryManagement";

const AdminDashboard = () => {
  const [activePage, setActivePage] = useState("flashcards-add");

  const renderPage = () => {
    switch (activePage) {
      case "flashcards-add":
        return <AddFlashcards />;
      case "flashcards-delete":
        return <DeleteFlashcards />;
      case "pronounce-add":
        return <AddPronounceSet />;
      case "pronounce-delete":
        return <DeletePronounceSet />;
      case "test-add":
        return <AddTest />;
      case "test-delete":
        return <DeleteTest />;
      case "interview-add":
        return <AddInterview />;
      case "interview-delete":
        return <DeleteInterview />;
      case "analytics":
        return <UserAnalyticsDashboard />;
      case "stories":
        return <StoryManagement />;
      default:
        return <div>Select an option from the sidebar</div>;
    }
  };

  const menuItems = [
    { id: "flashcards-add", label: "Add Flashcards", icon: <FilePlus2 /> },
    { id: "flashcards-delete", label: "Delete Flashcards", icon: <Trash2 /> },
    { id: "test-add", label: "Add Test", icon: <ClipboardList /> },
    { id: "test-delete", label: "delete Test", icon: <ClipboardList /> },
    { id: "interview-add", label: "Add Interview", icon: <Users /> },
    { id: "interview-delete", label: "Delete Interview", icon: <Users /> },
    {
      id: "pronounce-add",
      label: "Add Pronunciation Set",
      icon: <FilePlus2 />,
    },
    { id: "analytics", label: "User Analytics", icon: <Users /> },
    {
      id: "pronounce-delete",
      label: "Delete Pronunciation Set",
      icon: <Trash2 />,
    },
    { id: "stories", label: "Story Management", icon: <FilePlus2 /> },
  ];

  return (
    <div
      className="flex bg-[#F8FAFC] text-gray-800 font-poppins rounded-2xl overflow-hidden shadow-sm"
      style={{
        height: "90vh", // fixed visible height
        overflow: "hidden", // prevent browser scrolling
      }}
    >
      {/* Sidebar */}
      <div className="w-72 bg-white shadow-xl flex flex-col border-r border-gray-200 rounded-l-2xl">
        <div className="p-6 border-b border-gray-200 flex items-center space-x-2">
          <LayoutDashboard className="text-[#004E92]" size={24} />
          <h1 className="text-2xl font-semibold text-[#004E92]">Admin Panel</h1>
        </div>

        <nav className="flex flex-col mt-4 px-4 space-y-2 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex items-center space-x-3 px-4 py-2 rounded-xl text-left transition-all duration-200 ${
                activePage === item.id
                  ? "bg-[#004E92] text-white shadow-md"
                  : "hover:bg-blue-50 text-gray-700"
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 h-full p-8 overflow-hidden">
        <div
          className="bg-white rounded-2xl shadow-md p-6 h-full overflow-y-auto scrollbar-hide"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* hide scrollbar for WebKit browsers */}
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          {renderPage()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
