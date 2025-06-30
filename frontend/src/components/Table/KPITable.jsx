import React, { useEffect } from "react";
import useThemeStore from "../../store/themeStore";
import useAuthStore from "../../store/auth.store";

function KPITable({ groupKey, rows, openModal, openPerformanceModal, openRatioModal, currentEthYear }) {
  const { dark } = useThemeStore();
  const { user: authUser } = useAuthStore();

  const [goal = "", kra = ""] = groupKey.split("|||").map((s) => s.trim());

  const recentYear = currentEthYear;
  const previousYear = currentEthYear - 1;

  // Helper to safely get values from objects case-insensitively
  // Enhanced to handle keys with or without year suffix interchangeably
  const getValue = (obj, key) => {
    if (!obj) return undefined;
    if (obj[key] !== undefined) return obj[key];

    // Try case-insensitive exact match
    const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
    if (foundKey) return obj[foundKey];

    // Try fallback logic for quarterly and yearly keys:
    // If key includes year suffix like "q1-2024", try "q1"
    // If key is like "q1", try "q1-<recentYear>" or "q1-<previousYear>"
    const quarterMatch = key.toLowerCase().match(/^(q[1-4])(?:-(\d{4}))?$/);
    if (quarterMatch) {
      const quarter = quarterMatch[1];
      const yearPart = quarterMatch[2];

      if (yearPart) {
        // If year suffix exists, try without year suffix
        if (obj[quarter] !== undefined) return obj[quarter];
      } else {
        // No year suffix, try with current or previous year suffixes
        if (obj[`${quarter}-${recentYear}`] !== undefined) return obj[`${quarter}-${recentYear}`];
        if (obj[`${quarter}-${previousYear}`] !== undefined) return obj[`${quarter}-${previousYear}`];
      }
    }

    // Similarly for yearly keys "year" or "year-2024"
    if (key.toLowerCase().startsWith("year")) {
      if (key.toLowerCase() === "year") {
        if (obj[`year-${recentYear}`] !== undefined) return obj[`year-${recentYear}`];
        if (obj[`year-${previousYear}`] !== undefined) return obj[`year-${previousYear}`];
      } else {
        // key like year-2024
        if (obj["year"] !== undefined) return obj["year"];
      }
    }

    return undefined;
  };

  const formatRatio = (perf, target) => {
    if (typeof perf === "number" && typeof target === "number" && target !== 0) {
      return `${Math.round((perf / target) * 100)}%`;
    }
    return "–";
  };

  const baseBtn =
    "text-xs px-2 py-1 rounded font-medium transition duration-200 w-full text-center whitespace-nowrap";

  useEffect(() => {
    console.group(`KPITable Data for goal: "${goal}", KRA: "${kra}"`);
    rows.forEach((row, index) => {
      console.group(`Row ${index} - KPI Name: ${row.kpiName}`);
      console.log("Targets:", row.targets);
      console.log("Performance:", row.performance);
      console.groupEnd();
    });
    console.groupEnd();
  }, [rows, goal, kra]);

  const renderPlanCell = (row, periodKey) => {
    const val = getValue(row.targets, periodKey);
    console.log(`PlanCell for KPI "${row.kpiName}", period "${periodKey}":`, val);
    return (
      <button
        onClick={() => openModal({ ...row, period: periodKey })}
        className={`${
          dark
            ? "bg-[#F36F21] hover:bg-orange-600 text-gray-900"
            : "bg-[#F36F21] hover:bg-orange-700 text-white"
        } ${baseBtn}`}
        title="Plan Target"
      >
        🎯 {val != null && val !== "" ? val : "-"}
      </button>
    );
  };

  const renderPerformanceCell = (row, periodKey) => {
    const val = getValue(row.performance, periodKey);
    console.log(`PerformanceCell for KPI "${row.kpiName}", period "${periodKey}":`, val);
    return (
      <button
        onClick={() => openPerformanceModal({ ...row, period: periodKey })}
        className={`${
          dark
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "bg-blue-700 hover:bg-blue-800 text-white"
        } ${baseBtn}`}
        title="Performance"
      >
        📊 {val != null && val !== "" ? val : "-"}
      </button>
    );
  };

  const renderRatioCell = (row, periodKey) => {
    const target = getValue(row.targets, periodKey);
    const perf = getValue(row.performance, periodKey);
    console.log(`RatioCell for KPI "${row.kpiName}", period "${periodKey}": perf=${perf}, target=${target}`);
    return (
      <button
        onClick={() => openRatioModal(row, periodKey)}
        className={`${
          dark
            ? "bg-gray-700 hover:bg-gray-600 text-white"
            : "bg-gray-300 hover:bg-gray-400 text-gray-900"
        } ${baseBtn}`}
        title="Ratio"
      >
        %
        {!isNaN(Number(perf)) && !isNaN(Number(target)) && Number(target) !== 0
          ? ` ${formatRatio(Number(perf), Number(target))}`
          : " –"}
      </button>
    );
  };

  const borderColor = dark ? "border-gray-700" : "border-gray-300";
  const headerBg = dark ? "bg-gray-800 text-white" : "bg-gray-100 text-[#0D2A5C]";
  const rowHoverBg = dark ? "hover:bg-gray-800" : "hover:bg-gray-50";
  const cardBg = dark ? "bg-[#1f2937] text-white" : "bg-white text-[rgba(13,42,92,0.85)]";

  const goalHeaderBg = dark ? "bg-[#b44d12]" : "bg-[#F36F21]";
  const goalHeaderText = "text-white";
  const kraHeaderBg = dark ? "bg-gray-700" : "bg-gray-200";
  const kraHeaderText = dark ? "text-white" : "text-[#0D2A5C]";

  const quarters = ["q1", "q2", "q3", "q4"];

  return (
    <div className={`p-6 mb-10 rounded overflow-hidden shadow-md transition ${cardBg}`}>
      {/* === Goal Header === */}
      <div className={`p-3 font-bold text-sm ${goalHeaderBg} ${goalHeaderText} flex items-center gap-2`}>
        <span role="img" aria-label="Goal">🎯</span> Goal: {goal}
      </div>

      {/* === KRA Header === */}
      <div className={`p-3 font-semibold text-sm ${kraHeaderBg} ${kraHeaderText} flex items-center gap-2 mb-4`}>
        <span role="img" aria-label="KRA">🏷️</span> KRA: {kra}
      </div>

      {/* === Table === */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse text-sm">
          <thead>
            <tr className={`border-b ${headerBg}`}>
              <th className={`border px-3 py-2 ${borderColor} text-left`}>KPI Name</th>
              <th className={`border px-3 py-2 ${borderColor} text-center`}>{previousYear}</th>
              <th className={`border px-3 py-2 ${borderColor} text-center`}>{recentYear}</th>
              {quarters.map((q) => (
                <th key={q} className={`border px-3 py-2 ${borderColor} text-center`}>{q.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={`border-b ${borderColor} ${rowHoverBg}`}>
                <td className="px-3 py-2 text-left font-medium">{row.kpiName}</td>

                {/* Yearly: Previous & Current */}
                {[`year-${previousYear}`, `year-${recentYear}`].map((periodKey) => (
                  <td key={periodKey} className="px-3 py-2 text-center align-top">
                    <div className="flex flex-col gap-1">
                      {renderPlanCell(row, periodKey)}
                      {renderPerformanceCell(row, periodKey)}
                      {renderRatioCell(row, periodKey)}
                    </div>
                  </td>
                ))}

                {/* Quarterly: Q1-Q4 for current year */}
                {quarters.map((q) => {
                  const periodKey = `${q}-${recentYear}`;
                  return (
                    <td key={q} className="px-3 py-2 text-center align-top">
                      <div className="flex flex-col gap-1">
                        {renderPlanCell(row, periodKey)}
                        {renderPerformanceCell(row, periodKey)}
                        {renderRatioCell(row, periodKey)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default KPITable;
