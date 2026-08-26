import { Bell } from "lucide-react";
import React from "react";
import { useLocation } from "react-router-dom";
import ThemeToggle from "@/context/ThemeToggle";

const pageTitles = {
  "/admin/dashboard": "System Overview",
  "/admin/users": "User Management",
  "/admin/server-health": "Server Health",
  "/admin/audit-logs": "Audit Logs",
  "/admin/settings": "Global Settings",
};

const AdminHeader = () => {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] || "Admin Panel";

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-8 shadow-sm z-10">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h2>
      <div className="flex items-center space-x-4">
        <div className="hidden md:flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span>Systems Operational</span>
        </div>
        <ThemeToggle />
        <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors">
          <Bell size={20} />
        </button>
      </div>
    </header>
  );
};
export default AdminHeader;
