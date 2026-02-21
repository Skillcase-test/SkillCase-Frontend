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
import SendNotification from "./notification/send";

// A2 Admin Imports
import A2FlashcardAdd from "./a2/flashcard/add";
import A2FlashcardManage from "./a2/flashcard/manage";
import A2GrammarAdd from "./a2/grammar/add";
import A2GrammarManage from "./a2/grammar/manage";
import A2ListeningAdd from "./a2/listening/add";
import A2ListeningManage from "./a2/listening/manage";
import A2SpeakingAdd from "./a2/speaking/add";
import A2SpeakingManage from "./a2/speaking/manage";
import A2ReadingAdd from "./a2/reading/add";
import A2ReadingManage from "./a2/reading/manage";
import A2TestAdd from "./a2/test/add";
import A2TestManage from "./a2/test/manage";

import AdminExamManager from "./exam/AdminExamManager";
import AdminBatchManager from "./exam/AdminBatchManager";

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
      case "notifications":
        return <SendNotification />;

      // A2 Flashcard
      case "a2-flashcard-add":
        return <A2FlashcardAdd />;
      case "a2-flashcard-manage":
        return <A2FlashcardManage />;

      // A2 Grammar
      case "a2-grammar-add":
        return <A2GrammarAdd />;
      case "a2-grammar-manage":
        return <A2GrammarManage />;

      // A2 Listening
      case "a2-listening-add":
        return <A2ListeningAdd />;
      case "a2-listening-manage":
        return <A2ListeningManage />;

      // A2 Speaking
      case "a2-speaking-add":
        return <A2SpeakingAdd />;
      case "a2-speaking-manage":
        return <A2SpeakingManage />;

      // A2 Reading
      case "a2-reading-add":
        return <A2ReadingAdd />;
      case "a2-reading-manage":
        return <A2ReadingManage />;

      // A2 Test
      case "a2-test-add":
        return <A2TestAdd />;
      case "a2-test-manage":
        return <A2TestManage />;

      // Hard Core Test
      case "exam-manage":
        return <AdminExamManager />;
      case "batch-manage":
        return <AdminBatchManager />;

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
