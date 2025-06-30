import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaPaperclip } from "react-icons/fa";
import useAuthStore from "../../store/auth.store";
import useThemeStore from "../../store/themeStore";

const backendUrl = "http://localhost:1221";

const WorkerPerformanceSubmission = () => {
  const { user } = useAuthStore();
  const dark = useThemeStore((state) => state.dark);

  const [plans, setPlans] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear() - 8);
  const [quarter, setQuarter] = useState("");
  const [kpiId, setKpiId] = useState("");
  const [kpis, setKpis] = useState([]);

  const [comments, setComments] = useState({});
  const [files, setFiles] = useState({});
  const [checked, setChecked] = useState({});

  const inputStyle = `px-3 py-2 rounded-md border text-sm ${
    dark ? "bg-gray-800 text-white border-gray-600" : "bg-white border-gray-300"
  }`;

  useEffect(() => {
    if (user) fetchKpis();
  }, [user]);

  useEffect(() => {
    if (user?._id && year && quarter !== undefined)
      fetchPlans();
  }, [year, quarter, kpiId]);

  async function fetchKpis() {
    try {
      const subsectorId = user?.subsector?._id || user?.subsector;
      const res = await axios.get(
        `${backendUrl}/api/assign/assigned-kpi-with-goal-details/${subsectorId}`
      );
      const kpisObject = res.data || {};
      const kpiArray = Object.entries(kpisObject).flatMap(([goalId, goalObj]) =>
        Object.entries(goalObj.kras || {}).flatMap(([kraId, kraObj]) =>
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
      setPlans(plansData);

      const fileRes = await axios.get(`${backendUrl}/api/worker-performance/files`, {
        params: {
          workerId: user?._id,
          year,
          quarter,
          kpiId,
        },
        withCredentials: true,
      });
      const filesData = fileRes.data || [];

      const filesMap = {};
      filesData.forEach((pf) => {
        const key = `${pf.measureId}_${pf.year}_${pf.quarter}`;
        filesMap[key] = pf;
      });

      const newComments = {};
      const newChecked = {};
      const newFiles = {};

      plansData.forEach((plan, idx) => {
        const key = `${plan.measureId}_${plan.year}_${plan.quarter}`;
        const pf = filesMap[key];
        if (pf) {
          newComments[idx] = pf.description || "";
          newChecked[idx] = !!pf.confirmed;
          if (pf.filename && pf.filename !== "no_file" && pf.filepath) {
            newFiles[idx] = {
              filename: pf.filename,
              filepath: pf.filepath,
            };
          } else {
            newFiles[idx] = null;
          }
        } else {
          newComments[idx] = "";
          newChecked[idx] = false;
          newFiles[idx] = null;
        }
      });

      setComments(newComments);
      setChecked(newChecked);
      setFiles(newFiles);
    } catch (err) {
      console.error("❌ Fetch plans or files error:", err);
    }
  }

  const getFileUrl = (filepath) => {
    if (!filepath || filepath === "no_file") return null;
    const cleanPath = filepath.startsWith("/") ? filepath.slice(1) : filepath;
    return `${backendUrl}/${cleanPath}`;
  };

  const onFileChange = (idx, event) => {
    const selectedFile = event.target.files[0];
    setFiles((prev) => ({
      ...prev,
      [idx]: selectedFile
        ? { fileObj: selectedFile, filename: selectedFile.name }
        : null,
    }));
  };

  const handleSave = async (plan, idx) => {
    if (!plan.measureId) {
      alert("Measure ID missing. Cannot submit.");
      return;
    }
    if (!plan.quarter) {
      alert("Quarter missing in the plan.");
      return;
    }

    const isChecked = !!checked[idx];
    const comment = comments[idx] || "";
    const file = files[idx]?.fileObj || null;

    const formData = new FormData();
    formData.append("measureId", plan.measureId);
    formData.append("kpiId", plan.kpiId || kpiId);
    formData.append("year", plan.year);
    formData.append("quarter", plan.quarter);
    formData.append("value", isChecked ? plan.target : -plan.target);
    formData.append("description", comment);
    formData.append("sectorId", user?.sector?._id || user?.sector);
    formData.append("subsectorId", user?.subsector?._id || user?.subsector);
    formData.append("workerId", user?._id);
    formData.append("confirmed", isChecked ? "true" : "false");

    if (file) formData.append("file", file);

    try {
      await axios.post(`${backendUrl}/api/worker-performance/submit-performance`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      alert("✅ Submitted successfully!");
      setComments((prev) => ({ ...prev, [idx]: "" }));
      setFiles((prev) => ({ ...prev, [idx]: null }));
      setChecked((prev) => ({ ...prev, [idx]: false }));
      fetchPlans();
    } catch (err) {
      console.error("❌ Submit error:", err);
      alert(
        `Submission failed: ${
          err.response?.data?.message || err.message || "Server error"
        }`
      );
    }
  };

  return (
    <div
      className={`min-h-screen p-6 ${
        dark ? "bg-[#111827] text-white" : "bg-[#f9fafb] text-gray-800"
      }`}
    >
      <h1 className="text-2xl font-bold mb-4">📈 Submit KPI Performance</h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <select className={inputStyle} value={year} onChange={(e) => setYear(e.target.value)}>
          {[...Array(5)].map((_, i) => {
            const y = new Date().getFullYear() - 8 - i;
            return (
              <option key={y} value={y}>
                {y}
              </option>
            );
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
            <option key={k._id} value={k._id}>
              {k.kpi_name}
            </option>
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
              <th className="px-4 py-2 border">Check</th>
              <th className="px-4 py-2 border">Action</th>
            </tr>
          </thead>
          <tbody>
            {plans.length ? (
              plans.map((p, idx) => {
                const fileData = files[idx];
                const fileUrl = fileData?.filepath ? getFileUrl(fileData.filepath) : null;
                const fileName = fileData?.filename || "";

                return (
                  <tr key={idx} className={dark ? "hover:bg-gray-700" : "hover:bg-gray-50"}>
                    <td className="px-4 py-2 border">{p.kpiName}</td>
                    <td className="px-4 py-2 border">{p.measureName}</td>
                    <td className="px-4 py-2 border">{p.year}</td>
                    <td className="px-4 py-2 border">{p.quarter}</td>
                    <td className="px-4 py-2 border">{p.target}</td>
                    <td className="px-4 py-2 border">
                      <div className="flex items-center gap-2">
                        <textarea
                          className={`${inputStyle} h-10 w-40 resize-none`}
                          placeholder="Comment"
                          value={comments[idx] || ""}
                          onChange={(e) =>
                            setComments({ ...comments, [idx]: e.target.value })
                          }
                        />
                        <label
                          htmlFor={`file-${idx}`}
                          className={`cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md shadow-sm ${
                            dark
                              ? "bg-gray-700 text-white hover:bg-gray-600"
                              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                          }`}
                        >
                          <FaPaperclip />
                          {fileName ? (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline ml-1"
                            >
                              {fileName}
                            </a>
                          ) : (
                            "File"
                          )}
                        </label>
                        <input
                          type="file"
                          id={`file-${idx}`}
                          className="hidden"
                          onChange={(e) => onFileChange(idx, e)}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 border text-center">
                      <input
                        type="checkbox"
                        checked={checked[idx] || false}
                        onChange={(e) =>
                          setChecked({ ...checked, [idx]: e.target.checked })
                        }
                      />
                    </td>
                    <td className="px-4 py-2 border">
                      <button
                        className="bg-[#F36F21] text-white px-3 py-1 rounded-md text-sm"
                        onClick={() => handleSave(p, idx)}
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" className="p-4 text-center text-gray-500">
                  No performance records available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WorkerPerformanceSubmission;
