import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";

import SidebarLinkGroup from "./SidebarLinkGroup";

function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  activePage,
  setActivePage,
  variant = "default",
}) {
  const location = useLocation();
  const { pathname } = location;

  const trigger = useRef(null);
  const sidebar = useRef(null);

  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (!sidebar.current || !trigger.current) return;
      if (
        !sidebarOpen ||
        sidebar.current.contains(target) ||
        trigger.current.contains(target)
      )
        return;
      setSidebarOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  });

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  });

  useEffect(() => {
    localStorage.setItem("sidebar-expanded", sidebarExpanded);
    if (sidebarExpanded) {
      document.querySelector("body").classList.add("sidebar-expanded");
    } else {
      document.querySelector("body").classList.remove("sidebar-expanded");
    }
  }, [sidebarExpanded]);

  return (
    <div className="min-w-fit">
      {/* Sidebar backdrop (mobile only) */}
      <div
        className={`fixed inset-0 bg-gray-900/30 z-40 lg:hidden lg:z-auto transition-opacity duration-200 ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      ></div>

      {/* Sidebar */}
      <div
        id="sidebar"
        ref={sidebar}
        className={`flex lg:flex! flex-col absolute z-40 left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 h-[100dvh] overflow-y-scroll lg:overflow-y-auto no-scrollbar w-64 lg:w-20 lg:sidebar-expanded:!w-64 2xl:w-64! shrink-0 bg-white  p-4 transition-all duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-64"
        } ${
          variant === "v2"
            ? "border-r border-gray-200 "
            : "rounded-r-2xl shadow-xs"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex justify-between mb-10 pr-3 sm:px-2">
          {/* Close button */}
          <button
            ref={trigger}
            className="lg:hidden text-gray-500 hover:text-gray-400"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
          >
            <span className="sr-only">Close sidebar</span>
            <svg
              className="w-6 h-6 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10.7 18.7l1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4L4 12z" />
            </svg>
          </button>
          {/* Logo */}
        </div>

        {/* Links */}
        {/* Links */}
        <div className="space-y-8">
          {/* Pages group */}
          <div>
            <h3 className="text-xs uppercase text-gray-400  font-semibold pl-3">
              <span
                className="hidden lg:block lg:sidebar-expanded:hidden 2xl:hidden text-center w-6"
                aria-hidden="true"
              >
                •••
              </span>
              <span className="lg:hidden lg:sidebar-expanded:block 2xl:block">
                Services
              </span>
            </h3>
            <ul className="mt-3">
              {/* 1. Analytics - Default */}
              <li
                className={`pl-4 pr-3 py-2 rounded-lg mb-0.5 last:mb-0 bg-linear-to-r ${
                  activePage === "analytics" &&
                  "from-blue-500/[0.12]  to-blue-500/[0.04]"
                }`}
              >
                <button
                  onClick={() => setActivePage("analytics")}
                  className={`block text-gray-800  truncate transition duration-150 cursor-pointe ${
                    activePage === "analytics" ? "" : "hover:text-gray-900 "
                  }`}
                >
                  <div className="flex items-center">
                    <svg
                      className={`shrink-0 fill-current ${
                        activePage === "analytics"
                          ? "text-blue-500"
                          : "text-gray-400 "
                      }`}
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                    >
                      <path d="M5.936.278A7.983 7.983 0 0 1 8 0a8 8 0 1 1-8 8c0-.722.104-1.413.278-2.064a1 1 0 1 1 1.932.516A5.99 5.99 0 0 0 2 8a6 6 0 1 0 6-6c-.53 0-1.045.076-1.548.21A1 1 0 1 1 5.936.278Z" />
                      <path d="M6.068 7.482A2.003 2.003 0 0 0 8 10a2 2 0 1 0-.518-3.932L3.707 2.293a1 1 0 0 0-1.414 1.414l3.775 3.775Z" />
                    </svg>
                    <span className="text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                      Analytics
                    </span>
                  </div>
                </button>
              </li>

              {/* T&C Agreed Users */}
              <li
                className={`pl-4 pr-3 py-2 rounded-lg mb-0.5 last:mb-0 bg-linear-to-r ${
                  activePage === "tc-agreements" &&
                  "from-blue-500/[0.12] to-blue-500/[0.04]"
                }`}
              >
                <button
                  onClick={() => setActivePage("tc-agreements")}
                  className={`block text-gray-800 truncate transition duration-150 cursor-pointer ${
                    activePage === "tc-agreements" ? "" : "hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center">
                    <svg
                      className={`shrink-0 fill-current ${
                        activePage === "tc-agreements"
                          ? "text-blue-500"
                          : "text-gray-400"
                      }`}
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                    >
                      <path d="M14.3.3c.4-.4 1-.4 1.4 0 .4.4.4 1 0 1.4l-8 8c-.2.2-.4.3-.7.3-.3 0-.5-.1-.7-.3-.4-.4-.4-1 0-1.4l8-8ZM15 7c.6 0 1 .4 1 1 0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8c.6 0 1 .4 1 1s-.4 1-1 1c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6c0-.6.4-1 1-1Z" />
                    </svg>
                    <span className="text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
                      T&C Agreed Users
                    </span>
                  </div>
                </button>
              </li>

              {/* Send Notifications */}
              <li
                className={`pl-4 pr-3 py-2 rounded-lg mb-0.5 last:mb-0 bg-linear-to-r ${
                  activePage === "notifications" &&
                  "from-blue-500/[0.12] to-blue-500/[0.04]"
                }`}
              >
                <button
                  onClick={() => setActivePage("notifications")}
                  className={`block text-gray-800 truncate transition duration-150 cursor-pointer ${
                    activePage === "notifications" ? "" : "hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center">
                    <svg
                      className={`shrink-0 fill-current ${
                        activePage === "notifications"
                          ? "text-blue-500"
                          : "text-gray-400"
                      }`}
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                    >
                      <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2ZM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.761-.361 1.477-.63 2.037-.268.56-.516.871-.771 1.079L2 13h12l-.14-.142c-.255-.208-.503-.52-.771-1.079-.269-.56-.47-1.276-.63-2.037C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917ZM14.22 12c.223.447.481.8.78 1H1c.299-.2.557-.553.78-1 .9-1.8 1.22-5.12 1.22-6 0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6Z" />
                    </svg>
                    <span className="text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
                      Send Notifications
                    </span>
                  </div>
                </button>
              </li>

              {/* 2. Flashcard Service - with dropdown */}
              <SidebarLinkGroup
                activecondition={activePage.includes("flashcards")}
              >
                {(handleClick, open) => {
                  return (
                    <React.Fragment>
                      <a
                        href="#0"
                        className={`block text-gray-800  truncate transition duration-150 ${
                          activePage.includes("flashcards")
                            ? ""
                            : "hover:text-gray-900 "
                        }`}
                        onClick={(e) => {
                          setActivePage("flashcards-add");
                          e.preventDefault();
                          handleClick();
                          setSidebarExpanded(true);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <svg
                              className={`shrink-0 fill-current ${
                                activePage.includes("flashcards")
                                  ? "text-blue-500"
                                  : "text-gray-400 "
                              }`}
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                            >
                              <path d="M5 4a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2H5Z" />
                              <path d="M4 0a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V4a4 4 0 0 0-4-4H4ZM2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Z" />
                            </svg>
                            <span className="text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
                              Flashcard Service
                            </span>
                          </div>
                          <div className="flex shrink-0 ml-2">
                            <svg
                              className={`w-3 h-3 shrink-0 ml-1 fill-current text-gray-400  ${
                                open && "rotate-180"
                              }`}
                              viewBox="0 0 12 12"
                            >
                              <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                            </svg>
                          </div>
                        </div>
                      </a>
                      <div className="lg:hidden lg:sidebar-expanded:block 2xl:block">
                        <ul className={`pl-8 mt-1 ${!open && "hidden"}`}>
                          <li className="mb-1 last:mb-0">
                            <button
                              onClick={() => setActivePage("flashcards-add")}
                              className={({ activePage }) =>
                                "block transition duration-150 truncate " +
                                (activePage === "flashcards-add"
                                  ? "text-blue-500"
                                  : "text-gray-500/90  hover:text-gray-700 ")
                              }
                            >
                              <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                                Add Flashcard
                              </span>
                            </button>
                          </li>
                          <li className="mb-1 last:mb-0">
                            <button
                              onClick={() => {
                                setActivePage("flashcards-delete");
                              }}
                              className={({ activePage }) =>
                                "block transition duration-150 truncate " +
                                (activePage === "flashcard-delete"
                                  ? "text-blue-500"
                                  : "text-gray-500/90  hover:text-gray-700 ")
                              }
                            >
                              <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                                Delete Flashcard
                              </span>
                            </button>
                          </li>
                        </ul>
                      </div>
                    </React.Fragment>
                  );
                }}
              </SidebarLinkGroup>

              {/* 3. Pronunciation - with dropdown */}
              <SidebarLinkGroup
                activecondition={activePage.includes("pronounce")}
              >
                {(handleClick, open) => {
                  return (
                    <React.Fragment>
                      <a
                        href="#0"
                        className={`block text-gray-800  truncate transition duration-150 ${
                          activePage.includes("pronounce")
                            ? ""
                            : "hover:text-gray-900 "
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleClick();
                          setActivePage("pronounce-add");
                          setSidebarExpanded(true);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <svg
                              className={`shrink-0 fill-current ${
                                activePage.includes("pronounce")
                                  ? "text-blue-500"
                                  : "text-gray-400 "
                              }`}
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                            >
                              <path d="M11.92 6.851c.044-.027.09-.05.137-.07.481-.275.758-.68.908-1.256.126-.55.169-.81.357-2.058.075-.498.144-.91.217-1.264-4.122.75-7.087 2.984-9.12 6.284a18.087 18.087 0 0 0-1.985 4.585 17.07 17.07 0 0 0-.354 1.506c-.05.265-.076.448-.086.535a1 1 0 0 1-1.988-.226c.056-.49.209-1.312.502-2.357a20.063 20.063 0 0 1 2.208-5.09C5.31 3.226 9.306.494 14.913.004a1 1 0 0 1 .954 1.494c-.237.414-.375.993-.567 2.267-.197 1.306-.244 1.586-.392 2.235-.285 1.094-.789 1.853-1.552 2.363-.748 3.816-3.976 5.06-8.515 4.326a1 1 0 0 1 .318-1.974c2.954.477 4.918.025 5.808-1.556-.628.085-1.335.121-2.127.121a1 1 0 1 1 0-2c1.458 0 2.434-.116 3.08-.429Z" />
                            </svg>
                            <span className="text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
                              Pronunciation
                            </span>
                          </div>
                          <div className="flex shrink-0 ml-2">
                            <svg
                              className={`w-3 h-3 shrink-0 ml-1 fill-current text-gray-400  ${
                                open && "rotate-180"
                              }`}
                              viewBox="0 0 12 12"
                            >
                              <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                            </svg>
                          </div>
                        </div>
                      </a>
                      <div className="lg:hidden lg:sidebar-expanded:block 2xl:block">
                        <ul className={`pl-8 mt-1 ${!open && "hidden"}`}>
                          <li className="mb-1 last:mb-0">
                            <button
                              onClick={() => {
                                setActivePage("pronounce-add");
                              }}
                              className={({ activePage }) =>
                                "block transition duration-150 truncate " +
                                (activePage === "pronounce-add"
                                  ? "text-blue-500"
                                  : "text-gray-500/90  hover:text-gray-700 ")
                              }
                            >
                              <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                                Add Pronunciation Set
                              </span>
                            </button>
                          </li>
                          <li className="mb-1 last:mb-0">
                            <button
                              onClick={() => setActivePage("pronounce-delete")}
                              className={({ activePage }) =>
                                "block transition duration-150 truncate " +
                                (activePage === "pronounce-delete"
                                  ? "text-blue-500"
                                  : "text-gray-500/90  hover:text-gray-700 ")
                              }
                            >
                              <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                                Delete Pronunciation Set
                              </span>
                            </button>
                          </li>
                        </ul>
                      </div>
                    </React.Fragment>
                  );
                }}
              </SidebarLinkGroup>

              {/* 4. Test - with dropdown */}
              <SidebarLinkGroup activecondition={activePage.includes("test")}>
                {(handleClick, open) => {
                  return (
                    <React.Fragment>
                      <a
                        href="#0"
                        className={`block text-gray-800  truncate transition duration-150 ${
                          activePage.includes("test")
                            ? ""
                            : "hover:text-gray-900 "
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleClick();
                          setActivePage("test-add");
                          setSidebarExpanded(true);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <svg
                              className={`shrink-0 fill-current ${
                                activePage.includes("test")
                                  ? "text-blue-500"
                                  : "text-gray-400 "
                              }`}
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                            >
                              <path d="M6.753 2.659a1 1 0 0 0-1.506-1.317L2.451 4.537l-.744-.744A1 1 0 1 0 .293 5.207l1.5 1.5a1 1 0 0 0 1.46-.048l3.5-4ZM6.753 10.659a1 1 0 1 0-1.506-1.317l-2.796 3.195-.744-.744a1 1 0 0 0-1.414 1.414l1.5 1.5a1 1 0 0 0 1.46-.049l3.5-4ZM8 4.5a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1ZM9 11.5a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H9Z" />
                            </svg>
                            <span className="text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                              Test
                            </span>
                          </div>
                          <div className="flex shrink-0 ml-2">
                            <svg
                              className={`w-3 h-3 shrink-0 ml-1 fill-current text-gray-400  ${
                                open && "rotate-180"
                              }`}
                              viewBox="0 0 12 12"
                            >
                              <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                            </svg>
                          </div>
                        </div>
                      </a>
                      <div className="lg:hidden lg:sidebar-expanded:block 2xl:block">
                        <ul className={`pl-8 mt-1 ${!open && "hidden"}`}>
                          <li className="mb-1 last:mb-0">
                            <button
                              onClick={() => setActivePage("test-add")}
                              className={({ isActive }) =>
                                "block transition duration-150 truncate " +
                                (activePage === "test-add"
                                  ? "text-blue-500"
                                  : "text-gray-500/90  hover:text-gray-700 ")
                              }
                            >
                              <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                                Add Test
                              </span>
                            </button>
                          </li>
                          <li className="mb-1 last:mb-0">
                            <button
                              onClick={() => setActivePage("test-delete")}
                              className={({ activePage }) =>
                                "block transition duration-150 truncate " +
                                (activePage === "test-delete"
                                  ? "text-blue-500"
                                  : "text-gray-500/90  hover:text-gray-700 ")
                              }
                            >
                              <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                                Delete Test
                              </span>
                            </button>
                          </li>
                        </ul>
                      </div>
                    </React.Fragment>
                  );
                }}
              </SidebarLinkGroup>

              {/* 5. Interview - with dropdown */}
              <SidebarLinkGroup
                activecondition={activePage.includes("interview")}
              >
                {(handleClick, open) => {
                  return (
                    <React.Fragment>
                      <a
                        href="#0"
                        className={`block text-gray-800  truncate transition duration-150 ${
                          activePage.includes("interview")
                            ? ""
                            : "hover:text-gray-900 "
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleClick();
                          setActivePage("interview-add");
                          setSidebarExpanded(true);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <svg
                              className={`shrink-0 fill-current ${
                                activePage.includes("interview")
                                  ? "text-blue-500"
                                  : "text-gray-400 "
                              }`}
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                            >
                              <path d="M13.95.879a3 3 0 0 0-4.243 0L1.293 9.293a1 1 0 0 0-.274.51l-1 5a1 1 0 0 0 1.177 1.177l5-1a1 1 0 0 0 .511-.273l8.414-8.414a3 3 0 0 0 0-4.242L13.95.879ZM11.12 2.293a1 1 0 0 1 1.414 0l1.172 1.172a1 1 0 0 1 0 1.414l-8.2 8.2-3.232.646.646-3.232 8.2-8.2Z" />
                              <path d="M10 14a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2h-5Z" />
                            </svg>
                            <span className="text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
                              Interview
                            </span>
                          </div>
                          <div className="flex shrink-0 ml-2">
                            <svg
                              className={`w-3 h-3 shrink-0 ml-1 fill-current text-gray-400  ${
                                open && "rotate-180"
                              }`}
                              viewBox="0 0 12 12"
                            >
                              <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                            </svg>
                          </div>
                        </div>
                      </a>
                      <div className="lg:hidden lg:sidebar-expanded:block 2xl:block">
                        <ul className={`pl-8 mt-1 ${!open && "hidden"}`}>
                          <li className="mb-1 last:mb-0">
                            <button
                              end
                              to="/interview/add"
                              className={({ activePage }) =>
                                "block transition duration-150 truncate " +
                                (activePage === "interview-add"
                                  ? "text-blue-500"
                                  : "text-gray-500/90  hover:text-gray-700 ")
                              }
                            >
                              <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                                Add Interview
                              </span>
                            </button>
                          </li>
                          <li className="mb-1 last:mb-0">
                            <button
                              end
                              to="/interview/delete"
                              className={({ activePage }) =>
                                "block transition duration-150 truncate " +
                                (activePage === "interview-delete"
                                  ? "text-blue-500"
                                  : "text-gray-500/90  hover:text-gray-700 ")
                              }
                            >
                              <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                                Delete Interview
                              </span>
                            </button>
                          </li>
                        </ul>
                      </div>
                    </React.Fragment>
                  );
                }}
              </SidebarLinkGroup>

              {/* 6. Stories - with dropdown */}
              <SidebarLinkGroup
                activecondition={activePage.includes("stories")}
              >
                {(handleClick, open) => {
                  return (
                    <React.Fragment>
                      <a
                        href="#0"
                        className={`block text-gray-800 truncate transition duration-150 ${
                          activePage.includes("stories")
                            ? ""
                            : "hover:text-gray-900"
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleClick();
                          setActivePage("stories");
                          setSidebarExpanded(true);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <svg
                              className={`shrink-0 fill-current ${
                                activePage.includes("stories")
                                  ? "text-blue-500"
                                  : "text-gray-400"
                              }`}
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                            >
                              <path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H2zm0 2h12v8H2V4zm2 2a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H4zm0 3a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2H4z" />
                            </svg>
                            <span className="text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
                              Stories
                            </span>
                          </div>
                          <div className="flex shrink-0 ml-2">
                            <svg
                              className={`w-3 h-3 shrink-0 ml-1 fill-current text-gray-400 ${
                                open && "rotate-180"
                              }`}
                              viewBox="0 0 12 12"
                            >
                              <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                            </svg>
                          </div>
                        </div>
                      </a>
                      <div className="lg:hidden lg:sidebar-expanded:block 2xl:block">
                        <ul className={`pl-8 mt-1 ${!open && "hidden"}`}>
                          <li className="mb-1 last:mb-0">
                            <button
                              onClick={() => setActivePage("stories")}
                              className={({ activePage }) =>
                                "block transition duration-150 truncate " +
                                (activePage === "stories"
                                  ? "text-blue-500"
                                  : "text-gray-500/90 hover:text-gray-700")
                              }
                            >
                              <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                                Manage Stories
                              </span>
                            </button>
                          </li>
                        </ul>
                      </div>
                    </React.Fragment>
                  );
                }}
              </SidebarLinkGroup>

              <SidebarLinkGroup
                activecondition={activePage.includes("conversations")}
              >
                {(handleClick, open) => {
                  return (
                    <React.Fragment>
                      <a
                        href="#0"
                        className={`block text-gray-800 truncate transition duration-150 ${
                          activePage.includes("conversations")
                            ? ""
                            : "hover:text-gray-900"
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleClick();
                          setActivePage("conversations");
                          setSidebarExpanded(true);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <svg
                              className={`shrink-0 fill-current ${
                                activePage.includes("conversations")
                                  ? "text-blue-500"
                                  : "text-gray-400"
                              }`}
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                            >
                              <path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H2zm0 2h12v8H2V4zm2 2a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H4zm0 3a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2H4z" />
                            </svg>
                            <span className="text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
                              Conversations
                            </span>
                          </div>
                          <div className="flex shrink-0 ml-2">
                            <svg
                              className={`w-3 h-3 shrink-0 ml-1 fill-current text-gray-400 ${
                                open && "rotate-180"
                              }`}
                              viewBox="0 0 12 12"
                            >
                              <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                            </svg>
                          </div>
                        </div>
                      </a>
                      <div className="lg:hidden lg:sidebar-expanded:block 2xl:block">
                        <ul className={`pl-8 mt-1 ${!open && "hidden"}`}>
                          <li className="mb-1 last:mb-0">
                            <button
                              onClick={() => setActivePage("conversation-add")}
                              className={({ activePage }) =>
                                "block transition duration-150 truncate " +
                                (activePage === "conversation-add"
                                  ? "text-blue-500"
                                  : "text-gray-500/90 hover:text-gray-700")
                              }
                            >
                              <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                                Add Conversations
                              </span>
                            </button>
                          </li>
                          <li className="mb-1 last:mb-0">
                            <button
                              onClick={() =>
                                setActivePage("conversation-delete")
                              }
                              className={({ activePage }) =>
                                "block transition duration-150 truncate " +
                                (activePage === "conversation-delete"
                                  ? "text-blue-500"
                                  : "text-gray-500/90 hover:text-gray-700")
                              }
                            >
                              <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                                Manage conversations
                              </span>
                            </button>
                          </li>
                        </ul>
                      </div>
                    </React.Fragment>
                  );
                }}
              </SidebarLinkGroup>
            </ul>
          </div>
        </div>

        {/* ====== A2 FEATURES SECTION ====== */}
        <div className="space-y-8">
          <div>
            <h3 className="text-xs uppercase text-gray-400 font-semibold pl-3">
              <span className="hidden lg:block lg:sidebar-expanded:hidden 2xl:hidden text-center w-6" aria-hidden="true">
                •••
              </span>
              <span className="lg:hidden lg:sidebar-expanded:block 2xl:block">
                A2 Features
              </span>
            </h3>
            <ul className="mt-3">
              {/* A2 Flashcards */}
              <SidebarLinkGroup activecondition={activePage.includes("a2-flashcard")}>
          {(handleClick, open) => (
            <React.Fragment>
              <a
                href="#0"
                className={`block text-gray-800 truncate transition duration-150 ${
                  activePage.includes("a2-flashcard")
                    ? ""
                    : "hover:text-gray-900 "
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick();
                  setSidebarExpanded(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg
                      className={`shrink-0 h-6 w-6 stroke-current ${
                        activePage.includes("a2-flashcard")
                          ? "text-blue-500"
                          : "text-gray-400 "
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="2"
                    >
                      <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
                      <line x1="7" y1="10" x2="17" y2="10" />
                      <line x1="7" y1="14" x2="12" y2="14" />
                    </svg>
                    <span className="text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
                      A2 Flashcards
                    </span>
                  </div>
                  <div className="flex shrink-0 ml-2">
                    <svg
                      className={`w-3 h-3 shrink-0 ml-1 fill-current text-gray-400 ${
                        open && "rotate-180"
                      }`}
                      viewBox="0 0 12 12"
                    >
                      <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                    </svg>
                  </div>
                </div>
              </a>
              <div className="lg:hidden lg:sidebar-expanded:block 2xl:block">
                <ul className={`pl-8 mt-1 ${!open && "hidden"}`}>
                  <li className="mb-1 last:mb-0">
                    <button
                      onClick={() => setActivePage("a2-flashcard-add")}
                      className={
                        "block transition duration-150 truncate " +
                        (activePage === "a2-flashcard-add"
                          ? "text-blue-500"
                          : "text-gray-500/90 hover:text-gray-700 ")
                      }
                    >
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                        Add
                      </span>
                    </button>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <button
                      onClick={() => setActivePage("a2-flashcard-manage")}
                      className={
                        "block transition duration-150 truncate " +
                        (activePage === "a2-flashcard-manage"
                          ? "text-blue-500"
                          : "text-gray-500/90 hover:text-gray-700 ")
                      }
                    >
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                        Manage & Reorder
                      </span>
                    </button>
                  </li>
                </ul>
              </div>
            </React.Fragment>
          )}
        </SidebarLinkGroup>
        {/* A2 Grammar */}
        <SidebarLinkGroup activecondition={activePage.includes("a2-grammar")}>
          {(handleClick, open) => (
            <React.Fragment>
              <a
                href="#0"
                className={`block text-gray-800 truncate transition duration-150 ${
                  activePage.includes("a2-grammar")
                    ? ""
                    : "hover:text-gray-900 "
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick();
                  setSidebarExpanded(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg
                      className={`shrink-0 h-6 w-6 stroke-current ${
                        activePage.includes("a2-grammar")
                          ? "text-blue-500"
                          : "text-gray-400 "
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="2"
                    >
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    <span className="text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
                      A2 Grammar
                    </span>
                  </div>
                  <div className="flex shrink-0 ml-2">
                    <svg
                      className={`w-3 h-3 shrink-0 ml-1 fill-current text-gray-400 ${
                        open && "rotate-180"
                      }`}
                      viewBox="0 0 12 12"
                    >
                      <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                    </svg>
                  </div>
                </div>
              </a>
              <div className="lg:hidden lg:sidebar-expanded:block 2xl:block">
                <ul className={`pl-8 mt-1 ${!open && "hidden"}`}>
                  <li className="mb-1 last:mb-0">
                    <button
                      onClick={() => setActivePage("a2-grammar-add")}
                      className={
                        "block transition duration-150 truncate " +
                        (activePage === "a2-grammar-add"
                          ? "text-blue-500"
                          : "text-gray-500/90 hover:text-gray-700 ")
                      }
                    >
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                        Add
                      </span>
                    </button>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <button
                      onClick={() => setActivePage("a2-grammar-manage")}
                      className={
                        "block transition duration-150 truncate " +
                        (activePage === "a2-grammar-manage"
                          ? "text-blue-500"
                          : "text-gray-500/90 hover:text-gray-700 ")
                      }
                    >
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                        Manage & Reorder
                      </span>
                    </button>
                  </li>
                </ul>
              </div>
            </React.Fragment>
          )}
        </SidebarLinkGroup>
        {/* A2 Listening */}
        <SidebarLinkGroup activecondition={activePage.includes("a2-listening")}>
          {(handleClick, open) => (
            <React.Fragment>
              <a
                href="#0"
                className={`block text-gray-800 truncate transition duration-150 ${
                  activePage.includes("a2-listening")
                    ? ""
                    : "hover:text-gray-900 "
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick();
                  setSidebarExpanded(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg
                      className={`shrink-0 h-6 w-6 stroke-current ${
                        activePage.includes("a2-listening")
                          ? "text-blue-500"
                          : "text-gray-400 "
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="2"
                    >
                      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                    </svg>
                    <span className="text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
                      A2 Listening
                    </span>
                  </div>
                  <div className="flex shrink-0 ml-2">
                    <svg
                      className={`w-3 h-3 shrink-0 ml-1 fill-current text-gray-400 ${
                        open && "rotate-180"
                      }`}
                      viewBox="0 0 12 12"
                    >
                      <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                    </svg>
                  </div>
                </div>
              </a>
              <div className="lg:hidden lg:sidebar-expanded:block 2xl:block">
                <ul className={`pl-8 mt-1 ${!open && "hidden"}`}>
                  <li className="mb-1 last:mb-0">
                    <button
                      onClick={() => setActivePage("a2-listening-add")}
                      className={
                        "block transition duration-150 truncate " +
                        (activePage === "a2-listening-add"
                          ? "text-blue-500"
                          : "text-gray-500/90 hover:text-gray-700 ")
                      }
                    >
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                        Add
                      </span>
                    </button>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <button
                      onClick={() => setActivePage("a2-listening-manage")}
                      className={
                        "block transition duration-150 truncate " +
                        (activePage === "a2-listening-manage"
                          ? "text-blue-500"
                          : "text-gray-500/90 hover:text-gray-700 ")
                      }
                    >
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                        Manage & Reorder
                      </span>
                    </button>
                  </li>
                </ul>
              </div>
            </React.Fragment>
          )}
        </SidebarLinkGroup>
        {/* A2 Speaking */}
        <SidebarLinkGroup activecondition={activePage.includes("a2-speaking")}>
          {(handleClick, open) => (
            <React.Fragment>
              <a
                href="#0"
                className={`block text-gray-800 truncate transition duration-150 ${
                  activePage.includes("a2-speaking")
                    ? ""
                    : "hover:text-gray-900 "
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick();
                  setSidebarExpanded(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg
                      className={`shrink-0 h-6 w-6 stroke-current ${
                        activePage.includes("a2-speaking")
                          ? "text-blue-500"
                          : "text-gray-400 "
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="2"
                    >
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                    <span className="text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
                      A2 Speaking
                    </span>
                  </div>
                  <div className="flex shrink-0 ml-2">
                    <svg
                      className={`w-3 h-3 shrink-0 ml-1 fill-current text-gray-400 ${
                        open && "rotate-180"
                      }`}
                      viewBox="0 0 12 12"
                    >
                      <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                    </svg>
                  </div>
                </div>
              </a>
              <div className="lg:hidden lg:sidebar-expanded:block 2xl:block">
                <ul className={`pl-8 mt-1 ${!open && "hidden"}`}>
                  <li className="mb-1 last:mb-0">
                    <button
                      onClick={() => setActivePage("a2-speaking-add")}
                      className={
                        "block transition duration-150 truncate " +
                        (activePage === "a2-speaking-add"
                          ? "text-blue-500"
                          : "text-gray-500/90 hover:text-gray-700 ")
                      }
                    >
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                        Add
                      </span>
                    </button>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <button
                      onClick={() => setActivePage("a2-speaking-manage")}
                      className={
                        "block transition duration-150 truncate " +
                        (activePage === "a2-speaking-manage"
                          ? "text-blue-500"
                          : "text-gray-500/90 hover:text-gray-700 ")
                      }
                    >
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                        Manage & Reorder
                      </span>
                    </button>
                  </li>
                </ul>
              </div>
            </React.Fragment>
          )}
        </SidebarLinkGroup>
        {/* A2 Reading */}
        <SidebarLinkGroup activecondition={activePage.includes("a2-reading")}>
          {(handleClick, open) => (
            <React.Fragment>
              <a
                href="#0"
                className={`block text-gray-800 truncate transition duration-150 ${
                  activePage.includes("a2-reading")
                    ? ""
                    : "hover:text-gray-900 "
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick();
                  setSidebarExpanded(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg
                      className={`shrink-0 h-6 w-6 stroke-current ${
                        activePage.includes("a2-reading")
                          ? "text-blue-500"
                          : "text-gray-400 "
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="2"
                    >
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                    <span className="text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
                      A2 Reading
                    </span>
                  </div>
                  <div className="flex shrink-0 ml-2">
                    <svg
                      className={`w-3 h-3 shrink-0 ml-1 fill-current text-gray-400 ${
                        open && "rotate-180"
                      }`}
                      viewBox="0 0 12 12"
                    >
                      <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                    </svg>
                  </div>
                </div>
              </a>
              <div className="lg:hidden lg:sidebar-expanded:block 2xl:block">
                <ul className={`pl-8 mt-1 ${!open && "hidden"}`}>
                  <li className="mb-1 last:mb-0">
                    <button
                      onClick={() => setActivePage("a2-reading-add")}
                      className={
                        "block transition duration-150 truncate " +
                        (activePage === "a2-reading-add"
                          ? "text-blue-500"
                          : "text-gray-500/90 hover:text-gray-700 ")
                      }
                    >
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                        Add
                      </span>
                    </button>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <button
                      onClick={() => setActivePage("a2-reading-manage")}
                      className={
                        "block transition duration-150 truncate " +
                        (activePage === "a2-reading-manage"
                          ? "text-blue-500"
                          : "text-gray-500/90 hover:text-gray-700 ")
                      }
                    >
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                        Manage & Reorder
                      </span>
                    </button>
                  </li>
                </ul>
              </div>
            </React.Fragment>
          )}
        </SidebarLinkGroup>
        {/* A2 Test */}
        <SidebarLinkGroup activecondition={activePage.includes("a2-test")}>
          {(handleClick, open) => (
            <React.Fragment>
              <a
                href="#0"
                className={`block text-gray-800 truncate transition duration-150 ${
                  activePage.includes("a2-test")
                    ? ""
                    : "hover:text-gray-900 "
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick();
                  setSidebarExpanded(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg
                      className={`shrink-0 h-6 w-6 stroke-current ${
                        activePage.includes("a2-test")
                          ? "text-blue-500"
                          : "text-gray-400 "
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <span className="text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
                      A2 Test
                    </span>
                  </div>
                  <div className="flex shrink-0 ml-2">
                    <svg
                      className={`w-3 h-3 shrink-0 ml-1 fill-current text-gray-400 ${
                        open && "rotate-180"
                      }`}
                      viewBox="0 0 12 12"
                    >
                      <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                    </svg>
                  </div>
                </div>
              </a>
              <div className="lg:hidden lg:sidebar-expanded:block 2xl:block">
                <ul className={`pl-8 mt-1 ${!open && "hidden"}`}>
                  <li className="mb-1 last:mb-0">
                    <button
                      onClick={() => setActivePage("a2-test-add")}
                      className={
                        "block transition duration-150 truncate " +
                        (activePage === "a2-test-add"
                          ? "text-blue-500"
                          : "text-gray-500/90 hover:text-gray-700 ")
                      }
                    >
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                        Add
                      </span>
                    </button>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <button
                      onClick={() => setActivePage("a2-test-manage")}
                      className={
                        "block transition duration-150 truncate " +
                        (activePage === "a2-test-manage"
                          ? "text-blue-500"
                          : "text-gray-500/90 hover:text-gray-700 ")
                      }
                    >
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 cursor-pointer">
                        Manage & Reorder
                      </span>
                    </button>
                  </li>
                </ul>
              </div>
            </React.Fragment>
          )}
        </SidebarLinkGroup>
            </ul>
          </div>
        </div>
        {/* ====== END A2 FEATURES ====== */}

        {/* Expand / collapse button */}
        <div className="pt-3 hidden lg:inline-flex 2xl:hidden justify-end mt-auto">
          <div className="w-12 pl-4 pr-3 py-2">
            <button
              className="text-gray-400 hover:text-gray-500  "
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
            >
              <span className="sr-only">Expand / collapse sidebar</span>
              <svg
                className="shrink-0 fill-current text-gray-400  sidebar-expanded:rotate-180"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
              >
                <path d="M15 16a1 1 0 0 1-1-1V1a1 1 0 1 1 2 0v14a1 1 0 0 1-1 1ZM8.586 7H1a1 1 0 1 0 0 2h7.586l-2.793 2.793a1 1 0 1 0 1.414 1.414l4.5-4.5A.997.997 0 0 0 12 8.01M11.924 7.617a.997.997 0 0 0-.217-.324l-4.5-4.5a1 1 0 0 0-1.414 1.414L8.586 7M12 7.99a.996.996 0 0 0-.076-.373Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
