import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaPaperclip } from "react-icons/fa";
import useAuthStore from "../../store/auth.store";
import useThemeStore from "../../store/themeStore";

const backendUrl = "http://localhost:1221";

const WorkerPerformanceReport = () => {
  const { user } = useAuthStore();
  const dark = useThemeStore((state) => state.dark);

  const [plans, setPlans] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear() - 8);
  const [quarter, setQuarter] = useState("");
  const [kpiId, setKpiId] = useState("");
  const [kpis, setKpis] = useState([]);

  const inputStyle = `px-3 py-2 rounded-md border text-sm ${
    dark ? "bg-gray-800 text-white border-gray-600" : "bg-white border-gray-300"
  }`;

  useEffect(() => {
    if (user) fetchKpis();
  }, [user]);

  useEffect(() => {
    fetchPlans();
  }, [year, quarter, kpiId]);

  async function fetchKpis() {
    try {
      const subsectorId = user?.subsector?._id || user?.subsector;
      const res = await axios.get(
        `${backendUrl}/api/assign/assigned-kpi-with-goal-details/${subsectorId}`
      );
      const kpisObject = res.data || {};
      const kpiArray = Object.entries(kpisObject).flatMap(([_, goalObj]) =>
        Object.entries(goalObj.kras || {}).flatMap(([_, kraObj]) =>
          kraObj.kpis.map((kpi) => ({
            ...kpi,
            kra_name: kraObj.kra_name,
            goal_desc: goalObj.goal_desc,
          }))
        )
      );
      setKpis(kpiArray);
    } catch (err) {
      console.error("❌ Fetch KPI error:", err);
    }
  }

  async function fetchPlans() {
    try {
      const res = await axios.get(`${backendUrl}/api/worker-plans`, {
        params: { year, quarter, kpiId },
        withCredentials: true,
      });
      const plansData = res.data || [];

      const fileRes = await axios.get(`${backendUrl}/api/worker-performance/files`, {
        params: { workerId: user?._id, year, quarter, kpiId },
        withCredentials: true,
      });
      const filesData = fileRes.data || [];

      const filesMap = {};
      filesData.forEach((pf) => {
        const key = `${pf.measureId}_${pf.year}_${pf.quarter}`;
        filesMap[key] = pf;
      });

      const enrichedPlans = plansData.map((plan) => {
        const key = `${plan.measureId}_${plan.year}_${plan.quarter}`;
        const pf = filesMap[key];
        return {
          ...plan,
          comment: pf?.description || "",
          file: pf?.filename && pf.filename !== "no_file" ? pf.filepath : null,
          filename: pf?.filename || "",
          status: pf?.confirmed ? "Done" : "Not Done",
        };
      });

      setPlans(enrichedPlans);
    } catch (err) {
      console.error("❌ Fetch plans or files error:", err);
    }
  }

  const getFileUrl = (filepath) => {
    if (!filepath || filepath === "no_file") return null;
    const cleanPath = filepath.startsWith("/") ? filepath.slice(1) : filepath;
    return `${backendUrl}/${cleanPath}`;
  };

  return (
    <div className={`min-h-screen p-6 ${dark ? "bg-[#111827] text-white" : "bg-[#f9fafb] text-gray-800"}`}>
      <h1 className="text-2xl font-bold mb-4">📊 Worker Performance Report</h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <select className={inputStyle} value={year} onChange={(e) => setYear(e.target.value)}>
          {[...Array(5)].map((_, i) => {
            const y = new Date().getFullYear() - 8 - i;
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>

        <select className={inputStyle} value={quarter} onChange={(e) => setQuarter(e.target.value)}>
          <option value="">All Quarters</option>
          <option value="Q1">Q1</option>
          <option value="Q2">Q2</option>
          <option value="Q3">Q3</option>
          <option value="Q4">Q4</option>
        </select>

        <select className={inputStyle} value={kpiId} onChange={(e) => setKpiId(e.target.value)}>
          <option value="">All KPIs</option>
          {kpis.map((k) => (
            <option key={k._id} value={k._id}>{k.kpi_name}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl shadow-md overflow-hidden">
        <table className="min-w-full table-auto border-collapse text-sm">
          <thead className={dark ? "bg-gray-800 text-white" : "bg-gray-100 text-[#0D2A5C]"}>
            <tr>
              <th className="px-4 py-2 border">KPI</th>
              <th className="px-4 py-2 border">Measure</th>
              <th className="px-4 py-2 border">Year</th>
              <th className="px-4 py-2 border">Quarter</th>
              <th className="px-4 py-2 border">Target</th>
              <th className="px-4 py-2 border">Justification</th>
              <th className="px-4 py-2 border">Status</th>
            </tr>
          </thead>
          <tbody>
            {plans.length ? (
              plans.map((p, idx) => (
                <tr key={idx} className={dark ? "hover:bg-gray-700" : "hover:bg-gray-50"}>
                  <td className="px-4 py-2 border">{p.kpiName}</td>
                  <td className="px-4 py-2 border">{p.measureName}</td>
                  <td className="px-4 py-2 border">{p.year}</td>
                  <td className="px-4 py-2 border">{p.quarter}</td>
                  <td className="px-4 py-2 border">{p.target}</td>
                  <td className="px-4 py-2 border">
                    <div className="flex items-center gap-2">
                      <span className="text-sm w-40 line-clamp-2">{p.comment}</span>
                      {p.file && (
                        <a
                          href={getFileUrl(p.file)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 underline"
                        >
                          <FaPaperclip className="inline" /> {p.filename}
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 border text-center">
                    <span className={`font-semibold ${p.status === "Done" ? "text-green-600" : "text-red-500"}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-4 text-center text-gray-500">
                  No report records available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WorkerPerformanceReport;
