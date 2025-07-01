import React, { useEffect, useState } from "react";
import axios from "axios";
import useAuthStore from "../store/auth.store";
import useThemeStore from "../store/themeStore";
import { IoCheckmarkCircleOutline, IoCloseCircleOutline } from "react-icons/io5";


const backendUrl = "https://mint-7g4n.onrender.com";

function useSectors() {
  const [sectors, setSectors] = useState([]);
  const [error, setError] = useState(null);
  useEffect(() => {
    axios.get(`${backendUrl}/api/sector/get-sector`)
      .then(res => setSectors(res.data.data || []))
      .catch(() => setError("Failed to load sectors"));
  }, []);
  return { sectors, error };
}

function useSubsectors() {
  const [subsectors, setSubsectors] = useState([]);
  const [error, setError] = useState(null);
  useEffect(() => {
    axios.get(`${backendUrl}/api/subsector/get-subsector`)
      .then(res => setSubsectors(res.data || []))
      .catch(() => setError("Failed to load subsectors"));
  }, []);
  return { subsectors, error };
}

const Toast = ({ type, message, onClose, dark }) => {
  const iconClasses = "inline-block mr-2 align-middle";
  const baseClasses =
    "fixed bottom-6 right-6 z-50 flex items-center max-w-xs w-full rounded-lg px-4 py-3 shadow-lg font-semibold text-sm select-none transition-transform duration-300 ease-in-out cursor-pointer";

  let bgColor, textColor, IconComp;
  if (type === "success") {
    bgColor = dark ? "bg-green-700" : "bg-green-100";
    textColor = dark ? "text-green-200" : "text-green-800";
    IconComp = IoCheckmarkCircleOutline;
  } else if (type === "error") {
    bgColor = dark ? "bg-red-700" : "bg-red-100";
    textColor = dark ? "text-red-200" : "text-red-800";
    IconComp = IoCloseCircleOutline;
  } else {
    return null;
  }

  return (
    <div
      className={`${baseClasses} ${bgColor} ${textColor} drop-shadow-lg`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      onClick={onClose}
    >
      <IconComp size={20} className={iconClasses} />
      <span className="flex-grow">{message}</span>
      <button
        onClick={onClose}
        aria-label="Close notification"
        className={`${textColor} hover:opacity-70 transition-opacity duration-150 ml-3`}
      >
        &times;
      </button>
    </div>
  );
};

const Filter = ({
  year, setYear,
  quarter, setQuarter,
  sectors, sector, setSector,
  filteredSubsectors, subsector, setSubsector,
  statusFilter, setStatusFilter,
  onFilter, loading
}) => {
  const dark = useThemeStore(s => s.dark);
  const base = dark
    ? "bg-[#1f2937] text-white"
    : "bg-[rgba(13,42,92,0.08)] text-[#0D2A5C]";
  const input = dark
    ? "bg-gray-700 text-white border-gray-600"
    : "bg-white text-[#0D2A5C] border-gray-300";
  const label = dark ? "text-white" : "text-[#0D2A5C]";
  const hoverBtn = dark ? "hover:bg-[#F36F21]" : "hover:bg-orange-500";

  const quarters = ["year", "q1", "q2", "q3", "q4"];
  const statuses = ["Approved", "Pending", "Rejected"];

  return (
    <div className={`p-4 rounded-xl shadow-md flex flex-wrap gap-4 items-end mb-6 ${base}`}>
      {[
        {
          label: "Year",
          content: (
            <input
              type="number"
              value={year}
              onChange={e => setYear(e.target.value)}
              min="2000"
              max="2100"
              className={`border px-3 py-2 rounded ${input}`}
            />
          ),
        },
        {
          label: "Period",
          content: (
            <select
              value={quarter}
              onChange={e => setQuarter(e.target.value)}
              className={`border px-3 py-2 rounded ${input}`}
            >
              {quarters.map(q => (
                <option key={q} value={q}>
                  {q.toUpperCase()}
                </option>
              ))}
            </select>
          ),
        },
        {
          label: "Sector",
          content: (
            <select
              value={sector}
              onChange={e => {
                setSector(e.target.value);
                setSubsector("");
              }}
              className={`border px-3 py-2 rounded ${input}`}
            >
              <option value="">All</option>
              {sectors.map(sec => (
                <option key={sec._id} value={sec._id}>
                  {sec.sector_name}
                </option>
              ))}
            </select>
          ),
        },
        {
          label: "Subsector",
          content: (
            <select
              value={subsector}
              onChange={e => setSubsector(e.target.value)}
              disabled={!sector}
              className={`border px-3 py-2 rounded ${input} ${!sector ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <option value="">All</option>
              {filteredSubsectors.map(ss => (
                <option key={ss._id} value={ss._id}>
                  {ss.subsector_name}
                </option>
              ))}
            </select>
          ),
        },
        {
          label: "Status",
          content: (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className={`border px-3 py-2 rounded ${input}`}
            >
              <option value="">All</option>
              {statuses.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ),
        },
      ].map(({ label, content }) => (
        <div key={label}>
          <label className={`block text-sm mb-1 font-semibold ${label}`}>{label}</label>
          {content}
        </div>
      ))}

      <button
        onClick={onFilter}
        disabled={loading}
        className={`px-5 py-2 rounded font-semibold transition-colors duration-200 ${
          dark ? `bg-[#F36F21] text-white` : `bg-gray-600 text-white ${hoverBtn}`
        }`}
      >
        {loading ? "Filtering..." : "Filter"}
      </button>
    </div>
  );
};

const PerformanceValidation = () => {
  const dark = useThemeStore(s => s.dark);
  const { user } = useAuthStore();
  const myRole = user?.role || "";

  const { sectors, error: sectorError } = useSectors();
  const { subsectors, error: subsectorError } = useSubsectors();

  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState("year");
  const [sector, setSector] = useState("");
  const [subsector, setSubsector] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [performances, setPerformances] = useState([]);
  const [edits, setEdits] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [error, setError] = useState(null);

  // Toast feedback state
  const [toast, setToast] = useState({ type: "", message: "", visible: false });

  const showToast = (type, message) => {
    setToast({ type, message, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  };

  const filteredSubsectors = subsectors.filter(ss => {
    if (!sector) return true;
    const id = ss.sectorId?._id || ss.sectorId;
    return String(id) === String(sector);
  });

  const fetchPerformances = async () => {
    setLoadingFetch(true);
    setLoading(true);
    if (!year) {
      setError("Year is required to filter performances.");
      setLoading(false);
      setLoadingFetch(false);
      return;
    }
    try {
      const params = { year: String(year) };
      if (quarter && quarter !== "year") params.quarter = quarter;
      if (sector) params.sectorId = sector;
      if (subsector) params.subsectorId = subsector;
      if (statusFilter) params.statusFilter = statusFilter;

      const res = await axios.get(`${backendUrl}/api/performance-validation`, {
        params,
        withCredentials: true,
        headers: {
          "x-user-role": user?.role || "",
          "x-sector-id": user?.sector?._id || "",
          "x-subsector-id": user?.subsector?._id || ""
        }
      });

      setPerformances(res.data || []);
      setError(null);
    } catch (e) {
      setError("Failed to load performances");
    } finally {
      setLoading(false);
      setLoadingFetch(false);
    }
  };

  useEffect(() => {
    fetchPerformances();
  }, []);

  const filtered = performances.filter(perf => {
    if (String(perf.year) !== String(year)) return false;
    if (quarter === "year" && perf.performanceYear == null) return false;
    if (quarter !== "year" && perf[`${quarter}Performance`]?.value == null) return false;
    if (sector && String(perf.sectorId?._id || perf.sectorId) !== String(sector)) return false;
    if (subsector && String(perf.subsectorId?._id || perf.subsectorId) !== String(subsector)) return false;

    if (statusFilter) {
      // Determine the validation status field for quarter or year
      const statusField = quarter === "year" ? "validationStatusYear" : `validationStatus${quarter.toUpperCase()}`;
      if (perf[statusField] !== statusFilter) return false;
    }

    return true;
  });

  const grouped = filtered.reduce((acc, perf) => {
    const goal = perf.goalId?.goal_desc || "-";
    const kra = perf.kraId?.kra_name || "-";
    const key = `${goal}|||${kra}`;
    acc[key] = acc[key] || [];
    acc[key].push(perf);
    return acc;
  }, {});

  const handleCheckbox = (id) => {
    setEdits(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        status: prev[id]?.status === "Approved" ? "Pending" : "Approved"
      }
    }));
  };

  const handleSelectAll = () => {
    const newVal = !selectAll;
    setSelectAll(newVal);
    const newEdits = {};
    Object.values(grouped).flat().forEach(perf => {
      newEdits[perf._id] = { ...edits[perf._id], status: newVal ? "Approved" : "Pending" };
    });
    setEdits(newEdits);
  };

  const handleComment = (id, val) => {
    setEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], description: val }
    }));
  };

  const submitOne = async (id) => {
    const { status = "Pending", description = "" } = edits[id] || {};
    try {
      await axios.patch(`${backendUrl}/api/performance-validation/validate/${id}`, {
        type: quarter,
        status,
        description
      }, {
        withCredentials: true,
        headers: { "x-user-role": myRole }
      });
      showToast("success", "Validation saved.");
    } catch {
      showToast("error", "Failed to save validation.");
    }
  };

  const submitBulk = async () => {
    const ids = Object.entries(edits)
      .filter(([, e]) => e.status === "Approved")
      .map(([id]) => id);
    if (!ids.length) {
      showToast("error", "No selections made.");
      return;
    }

    for (const id of ids) {
      const { status = "Approved", description = "" } = edits[id] || {};
      await axios.patch(`${backendUrl}/api/performance-validation/validate/${id}`, {
        type: quarter,
        status,
        description
      }, {
        withCredentials: true,
        headers: { "x-user-role": myRole }
      }).catch(() => { });
    }

    showToast("success", "Bulk validation sent.");
  };

  if (loading) return <p className={`p-6 ${dark ? "text-white" : "text-[#0D2A5C]"}`}>Loading...</p>;
  if (error) return <p className={`p-6 text-red-600`}>{error}</p>;
  if (sectorError || subsectorError) return <p className="p-6 text-red-600">Loading filters failed.</p>;

  const bg = dark ? "bg-[#1f2937] text-white" : "bg-[rgba(13,42,92,0.08)] text-[#0D2A5C]";
  const cardHeader = dark ? "bg-[#374151] text-white" : "bg-yellow-100 text-[#0D2A5C]";
  const cardSubHeader = dark ? "bg-[#4B5563] text-white" : "bg-gray-200 text-[#0D2A5C]";
  const borderColor = dark ? "border-gray-600" : "border-gray-300";
  const inputField = dark ? "bg-gray-700 text-white border-gray-500" : "bg-white text-[#0D2A5C] border-gray-300";
  const buttonBase = "rounded px-3 py-1 text-xs font-semibold transition-colors duration-200";
  const saveButton = dark ? "bg-[#F36F21] text-white hover:opacity-90" : "bg-gray-700 text-white hover:bg-orange-500";
  const validateAllButton = dark ? "bg-green-700 text-white hover:opacity-90" : "bg-green-700 text-white hover:bg-green-800";

  return (
    <>
      <div className={`p-6 max-w-7xl mx-auto transition-all duration-300 ${bg}`}>
        <h1 className={`text-2xl font-bold mb-2 ${dark ? "text-white" : "text-[#040613]"}`}>
          Performance Validation {year} / {quarter.toUpperCase()}
        </h1>
        

        <Filter
          year={year} setYear={setYear}
          quarter={quarter} setQuarter={setQuarter}
          sectors={sectors} sector={sector} setSector={setSector}
          filteredSubsectors={filteredSubsectors}
          subsector={subsector} setSubsector={setSubsector}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          onFilter={fetchPerformances}
          loading={loadingFetch}
        />

        {Object.entries(grouped).map(([key, items]) => {
          const [goal, kra] = key.split("|||");
          return (
            <div key={key} className="mb-10 rounded overflow-hidden shadow-lg">
              <div className={`p-3 font-bold text-sm ${cardHeader}`}>🎯 Goal: {goal}</div>
              <div className={`p-3 font-semibold text-sm ${cardSubHeader}`}>🏷️ KRA: {kra}</div>
              <table className={`w-full border-collapse text-sm ${borderColor}`}>
                <thead className={dark ? "bg-gray-800" : "bg-gray-100"}>
                  <tr>
                    <th className={`border p-2 ${borderColor}`}>Indicator</th>
                    <th className={`border p-2 ${borderColor}`}>Value</th>
                    <th className={`border p-2 text-center ${borderColor}`}>
                      <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
                    </th>
                    <th className={`border p-2 ${borderColor}`}>Comments</th>
                    <th className={`border p-2 text-center ${borderColor}`}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(perf => {
                    const value = quarter === "year"
                      ? perf.performanceYear
                      : perf[`${quarter}Performance`]?.value;
                    const status = edits[perf._id]?.status ?? perf.status ?? "Pending";
                    const description = edits[perf._id]?.description ??
                      (quarter === "year" ? perf.performanceDescription : perf[`${quarter}Performance`]?.description) ?? "";

                    return (
                      <tr key={perf._id} className={dark ? "hover:bg-gray-800" : "hover:bg-gray-50"}>
                        <td className={`border p-2 ${borderColor}`}>{perf.kpiId?.kpi_name}</td>
                        <td className={`border p-2 ${borderColor}`}>{value ?? "-"}</td>
                        <td className={`border p-2 text-center ${borderColor}`}>
                          <input
                            type="checkbox"
                            checked={status === "Approved"}
                            onChange={() => handleCheckbox(perf._id)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className={`border p-2 ${borderColor}`}>
                          <input
                            type="text"
                            value={description}
                            onChange={e => handleComment(perf._id, e.target.value)}
                            className={`w-full rounded px-2 py-1 ${inputField} border`}
                          />
                        </td>
                        <td className={`border p-2 text-center ${borderColor}`}>
                          <button
                            onClick={() => submitOne(perf._id)}
                            className={`${buttonBase} ${saveButton}`}
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className={`text-center py-10 font-semibold ${dark ? "text-gray-300" : "text-gray-600"}`}>
            No KPI performances found.
          </p>
        )}

        {filtered.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={submitBulk}
              className={`px-6 py-2 rounded font-semibold transition-colors duration-200 ${validateAllButton}`}
            >
              Validate All Selected
            </button>
          </div>
        )}
      </div>

      {toast.visible && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(t => ({ ...t, visible: false }))}
          dark={dark}
        />
      )}
    </>
  );
};

export default PerformanceValidation;
