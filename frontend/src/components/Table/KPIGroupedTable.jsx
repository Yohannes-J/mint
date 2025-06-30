import React, { useState, useEffect } from "react";
import KPITable from "./KPITable";
import PlanModal from "./PlanModal";
import PerformanceModal from "./PerformanceModal";
import RatioModal from "./RatioModal";
import useAuthStore from "../../store/auth.store";

const BACKEND_URL = "http://localhost:1221";

function getCurrentEthiopianYear() {
  const today = new Date();
  const gYear = today.getFullYear();
  const gMonth = today.getMonth() + 1;
  const gDate = today.getDate();
  const isLeapYear = (gYear % 4 === 0 && gYear % 100 !== 0) || gYear % 400 === 0;
  const newYearDay = isLeapYear ? 12 : 11;
  return gMonth < 9 || (gMonth === 9 && gDate < newYearDay) ? gYear - 8 : gYear - 7;
}

function extractId(idField) {
  if (!idField) return "";
  if (typeof idField === "string") return idField;
  if (Array.isArray(idField)) {
    for (const el of idField) {
      const val = extractId(el);
      if (val) return val;
    }
    return "";
  }
  if (typeof idField === "object") {
    if ("_id" in idField) return extractId(idField._id);
    if ("id" in idField) return extractId(idField.id);
    if (typeof idField.toString === "function") {
      const str = idField.toString();
      if (str !== "[object Object]") return str;
    }
  }
  return "";
}

function mergeRowsByKpi(rows) {
  const merged = {};
  rows.forEach((row) => {
    const key = row.kpiId || row.kpiName;
    if (!merged[key]) {
      merged[key] = { ...row };
    } else {
      merged[key].targets = { ...(merged[key].targets || {}), ...(row.targets || {}) };
      merged[key].performance = { ...(merged[key].performance || {}), ...(row.performance || {}) };
      merged[key].ratio = { ...(merged[key].ratio || {}), ...(row.ratio || row.ratios || {}) };
    }
  });
  return Object.values(merged);
}

function KPIGroupedTable({ data, detailedKpis }) {
  const { user: authUser } = useAuthStore();

  const [isUserReady, setIsUserReady] = useState(false);
  const [planModalInfo, setPlanModalInfo] = useState(null);
  const [performanceModalInfo, setPerformanceModalInfo] = useState(null);
  const [ratioModalInfo, setRatioModalInfo] = useState(null);
  const [planIds, setPlanIds] = useState({});
  const [tableValues, setTableValues] = useState({});
  const [loadingTableValues, setLoadingTableValues] = useState(true);
  const [notification, setNotification] = useState(null);

  const currentEthYear = getCurrentEthiopianYear();
  const getKpiKey = (row, quarter, year) =>
    `${row.kpiId || row.kpiName}_${quarter || "year"}_${year}`;

  useEffect(() => {
    if (authUser && (authUser.id || authUser._id) && authUser.role) {
      setIsUserReady(true);
    }
  }, [authUser]);

  useEffect(() => {
    async function fetchTableValues() {
      setLoadingTableValues(true);
      const user = authUser || {};
      const userId = extractId(user.id || user._id);
      const rawRole = user.role || "";
      const role =
        rawRole
          .toLowerCase()
          .split(" ")
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      const sectorId = extractId(user.sectorId) || extractId(user.sector) || "";
      const subsectorId = extractId(user.subsectorId) || extractId(user.subsector) || "";

      try {
        const resUsers = await fetch(`${BACKEND_URL}/api/users/get-users`, {
          credentials: "include",
        });
        if (!resUsers.ok) throw new Error("Failed to fetch users");
        const allUsers = await resUsers.json();

        let userIdsToFetch = [];

        if (role.toLowerCase() === "strategic") {
          userIdsToFetch = allUsers.map(u => extractId(u._id || u.id)).filter(Boolean);
        } else if (role.toLowerCase() === "chief ceo") {
          if (!sectorId) return;
          const ceos = allUsers.filter(
            u => (u.role || "").toLowerCase() === "ceo" &&
              (extractId(u.sectorId || u.sector) === sectorId)
          );
          const workers = allUsers.filter(
            u => (u.role || "").toLowerCase() === "worker" &&
              (extractId(u.sectorId || u.sector) === sectorId)
          );
          userIdsToFetch = [...ceos, ...workers].map(u => extractId(u._id || u.id)).filter(Boolean);
        } else {
          userIdsToFetch = [userId];
        }

        userIdsToFetch = [...new Set(userIdsToFetch)];

        const yearsToFetch = [currentEthYear - 1, currentEthYear];
        let combinedResults = [];

        for (const year of yearsToFetch) {
          const fetches = userIdsToFetch.map(async uid => {
            const params = new URLSearchParams();
            params.append("userId", uid);
            params.append("role", role);
            params.append("year", year.toString());

            if (role.toLowerCase() === "ceo" || role.toLowerCase() === "worker") {
              const userDetails = allUsers.find(u => extractId(u._id || u.id) === uid);
              if (userDetails) {
                const userSectorId = extractId(userDetails.sectorId || userDetails.sector);
                const userSubsectorId = extractId(userDetails.subsectorId || userDetails.subsector);
                if (userSectorId) params.append("sectorId", userSectorId);
                if (userSubsectorId) params.append("subsectorId", userSubsectorId);
              }
            } else {
              if (sectorId) params.append("sectorId", sectorId);
              if (subsectorId) params.append("subsectorId", subsectorId);
            }

            const url = `${BACKEND_URL}/api/kpi-table/table-data?${params.toString()}`;
            try {
              const res = await fetch(url);
             
              if (!res.ok) return [];
              const data = await res.json();
              console.log(data);
              if (Array.isArray(data)) return data;
              if (data.grouped) return Object.values(data.grouped).flat();
              return [];
            } catch (e) {
              console.warn(e.message);
              return [];
            }
          });

          const resultsPerYear = await Promise.all(fetches);
          resultsPerYear.forEach(arr => {
            combinedResults = combinedResults.concat(arr);
          });
        }

        const groupedData = {};
        combinedResults.forEach(item => {
          const groupKey = `${item.goal}|||${item.kra}`;
          if (!groupedData[groupKey]) groupedData[groupKey] = [];
          groupedData[groupKey].push(item);
        });

        setTableValues(groupedData);
      } catch (error) {
        console.error("❌ Error fetching KPI table values:", error);
        setNotification({ type: "error", message: "Failed to load KPI values." });
      } finally {
        setLoadingTableValues(false);
      }
    }

    fetchTableValues();
  }, [authUser, currentEthYear]);

  if (!isUserReady) return <div className="p-4">Loading user information...</div>;

  const normalizedData = [];
  data.forEach((goal) => {
    const goalName = goal.goal_desc || "N/A";
    goal.kras?.forEach((kra) => {
      const kraName = kra.kra_name || "N/A";
      kra.kpis?.forEach((kpi) => {
        const kpiDetail = detailedKpis.find((d) => d._id === kpi._id) || kpi || {};
        normalizedData.push({
          kpiId: kpiDetail.kpiId || kpi.kpiId || kpi._id,
          kpiName: kpiDetail.kpi_name || kpi.kpi_name,
          kraId: kpiDetail.kraId || kra.kra_id || kra._id,
          sectorId: kpiDetail.sectorId || null,
          subsectorId: kpiDetail.subsectorId || null,
          year: kpiDetail.year || currentEthYear,
          q1: kpiDetail.q1 || "N/A",
          q2: kpiDetail.q2 || "N/A",
          q3: kpiDetail.q3 || "N/A",
          q4: kpiDetail.q4 || "N/A",
          target: kpiDetail.target || "",
          performanceMeasure: kpiDetail.performanceMeasure || "",
          description: kpiDetail.description || "",
          kra: kraName,
          goal: goalName,
        });
      });
    });
  });

  const groupedData = {};
  normalizedData.forEach((row) => {
    const groupKey = `${row.goal}|||${row.kra}`;
    if (!groupedData[groupKey]) groupedData[groupKey] = [];
    groupedData[groupKey].push(row);
  });

  const enrichRowsWithFetchedValues = (rows, groupKey) => {
    const fetchedRows = tableValues[groupKey] || [];
    const mergedFetchedRows = mergeRowsByKpi(fetchedRows);
    return rows.map((row) => {
      const fetchedRow = mergedFetchedRows.find(
        (f) => f.kpiId === row.kpiId || f.kpiName === row.kpiName
      );
      return {
        ...row,
        targets: fetchedRow?.targets || {},
        performance: fetchedRow?.performance || {},
        ratios: fetchedRow?.ratios || fetchedRow?.ratio || {},
      };
    });
  };

  const enrichedGroupedData = {};
  Object.entries(groupedData).forEach(([groupKey, rows]) => {
    enrichedGroupedData[groupKey] = enrichRowsWithFetchedValues(rows, groupKey);
  });

  // ---------- MODAL HANDLERS ----------
  const openModal = (row, field) => {
    const sectorId = extractId(authUser.sectorId) || extractId(authUser.sector) || "";
    const subsectorId = extractId(authUser.subsectorId) || extractId(authUser.subsector) || "";
    const userId = extractId(authUser.id || authUser._id);
    setPlanModalInfo({ ...row, field, userId, role: authUser.role, sectorId, subsectorId });
  };
  const closeModal = () => setPlanModalInfo(null);

  const openPerformanceModal = (row, field) => {
    const quarter = field?.toLowerCase().startsWith("q") ? field.toUpperCase() : null;
    const kpiKey = getKpiKey(row, quarter, row.year);
    const planId = planIds[kpiKey] || "";
    const sectorId = extractId(authUser.sectorId) || extractId(authUser.sector) || "";
    const subsectorId = extractId(authUser.subsectorId) || extractId(authUser.subsector) || "";
    const userId = extractId(authUser.id || authUser._id);
    setPerformanceModalInfo({
      ...row, field, quarter, planId, userId, role: authUser.role, sectorId, subsectorId,
      kpi_name: row.kpiName,
    });
  };
  const closePerformanceModal = () => setPerformanceModalInfo(null);

  const openRatioModal = (row, field) => {
    const [quarterRaw, year] = field.split("-");
    const quarter = quarterRaw.toUpperCase();
    const kpiKey = getKpiKey(row, quarter, year);
    const planId = planIds[kpiKey] || "";
    const target = row?.targets?.[quarter.toLowerCase()] ?? row?.target;
    const performance = row?.performance?.[quarter.toLowerCase()] ?? row?.performanceMeasure;
    const userId = extractId(authUser.id || authUser._id);
    const sectorId = extractId(authUser.sectorId) || extractId(authUser.sector) || "";
    const subsectorId = extractId(authUser.subsectorId) || extractId(authUser.subsector) || "";

    setRatioModalInfo({
      ...row, field, quarter, year, planId, target, performance,
      userId, role: authUser.role, sectorId, subsectorId,
    });
  };
  const closeRatioModal = () => setRatioModalInfo(null);

  const handlePlanFormSubmit = async (formData) => {
    try {
      const body = { ...formData };
      Object.entries(body).forEach(([k, v]) => (!v || v === "N/A") && delete body[k]);

      const res = await fetch(`${BACKEND_URL}/api/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      const kpiKey = getKpiKey(formData, formData.quarter, formData.year);
      setPlanIds(prev => ({ ...prev, [kpiKey]: result._id || result.planId }));
      setNotification({ type: "success", message: "Plan saved successfully." });
      closeModal();
    } catch (error) {
      setNotification({ type: "error", message: "Failed to save plan: " + error.message });
    }
  };

  const handlePerformanceFormSubmit = async (formData) => {
    try {
      const body = { ...formData };
      Object.entries(body).forEach(([k, v]) => (!v || v === "N/A") && delete body[k]);

      const res = await fetch(`${BACKEND_URL}/api/performance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      setNotification({ type: "success", message: "Performance saved successfully." });
      closePerformanceModal();
    } catch (error) {
      setNotification({ type: "error", message: "Failed to save performance: " + error.message });
    }
  };

  return (
    <div className="p-4 overflow-x-auto relative">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 max-w-xs rounded border px-4 py-2 shadow-md ${
          notification.type === "success" ? "bg-green-100 border-green-400 text-green-700"
          : "bg-red-100 border-red-400 text-red-700"
        }`} role="alert">
          {notification.message}
          <button onClick={() => setNotification(null)} className="ml-4 font-bold">×</button>
        </div>
      )}

      {loadingTableValues ? (
        <p className="mt-4 text-center text-gray-600">Loading KPI values...</p>
      ) : Object.entries(enrichedGroupedData).length > 0 ? (
        Object.entries(enrichedGroupedData).map(([groupKey, rows], idx) => (
          <KPITable
            key={idx}
            groupKey={groupKey}
            rows={rows}
            openModal={openModal}
            openPerformanceModal={openPerformanceModal}
            openRatioModal={openRatioModal}
            currentEthYear={currentEthYear}
          />
        ))
      ) : (
        <p className="mt-4 text-center text-gray-600">No results found.</p>
      )}

      {planModalInfo && (
        <PlanModal modalInfo={planModalInfo} closeModal={closeModal} handleFormSubmit={handlePlanFormSubmit} />
      )}
      {performanceModalInfo && (
        <PerformanceModal modalInfo={performanceModalInfo} closeModal={closePerformanceModal} handleFormSubmit={handlePerformanceFormSubmit} />
      )}
      {ratioModalInfo && (
        <RatioModal modalInfo={ratioModalInfo} closeModal={closeRatioModal} />
      )}
    </div>
  );
}

export default KPIGroupedTable;