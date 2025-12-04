import React, { useEffect, useState } from "react";

import Sidebar from "../partials/Sidebar";

import Analytics from "./Analytics";
import AddPronounceSet from "./pronounce/add";
import DeletePronounceSet from "./pronounce/delete";
import AddFlashSet from "./flashcard/add";
import DeleteFlashSet from "./flashcard/delete";
import DeleteInterview from "./interview/delete";
import AddInterviewPage from "./interview/add";
import DeleteTest from "./test/delete";
import AddTestPage from "./test/add";
import TcAgreements from "./TcAgreements";
import StoryManagement from "../../pages/StoryManagement";
import AddConversation from "./conversation/add";
import DeleteConversation from "./conversation/delete";

function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState("analytics");
  const renderPage = () => {
    switch (activePage) {
      case "flashcards-add":
        return <AddFlashSet />;
      case "flashcards-delete":
        return <DeleteFlashSet />;
      case "pronounce-add":
        return <AddPronounceSet />;
      case "pronounce-delete":
        return <DeletePronounceSet />;
      case "test-add":
        return <AddTestPage />;
      case "test-delete":
        return <DeleteTest />;
      case "interview-add":
        return <AddInterviewPage />;
      case "interview-delete":
        return <DeleteInterview />;
      case "analytics":
        return <Analytics />;
      case "tc-agreements":
        return <TcAgreements />;
      case "stories":
        return <StoryManagement />;
      case "conversation-add":
        return <AddConversation />;
      case "conversation-delete":
        return <DeleteConversation />;
      default:
        return <div>Select an option from the sidebar</div>;
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar
        setSidebarOpen={setSidebarOpen}
        sidebarOpen={sidebarOpen}
        activePage={activePage}
        setActivePage={setActivePage}
      />

      {/* Content area */}
      <div className="relative flex flex-col flex-1 bg-gray-100">
        {/*  Site header */}

        <main className="grow">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            {/* Dashboard actions */}
            <div className="sm:flex sm:justify-between sm:items-center mb-8">
              {/* Left: Title */}
              <div className="mb-4 sm:mb-0">
                <h1 className="text-2xl md:text-3xl text-gray-800  font-bold">
                  Dashboard
                </h1>
              </div>

              {/* Right: Actions */}
            </div>
            {/* 
             <div className="grid grid-cols-12 gap-6">

              <DashboardCard01 />
              <DashboardCard02 />
              <DashboardCard03 />
              <DashboardCard04 />
              <DashboardCard05 />
              <DashboardCard06 />
              <DashboardCard07 />

            </div>  */}
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
