import React from "react";
import * as Icons from "lucide-react";

const StatCard = ({ title, value, icon: IconProp, iconName, change, colorClass = "bg-slate-500" }) => {
  // Support both passing an icon component directly or an icon name string
  const Icon = IconProp || Icons[iconName] || Icons["CircleAlert"];

  const textColor = (colorClass || "bg-slate-500").replace("bg-", "text-");

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{value}</h3>
        </div>

        <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
          <Icon size={20} className={textColor} />
        </div>
      </div>

      <div className="mt-4 text-xs flex items-center">
        <span className="text-green-500 font-bold mr-1">↑ {change}</span>
        <span className="text-slate-400 dark:text-slate-500">vs last month</span>
      </div>
    </div>
  );
};

export default StatCard;
