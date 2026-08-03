import React, { useEffect, useState } from "react";
import { FaBookOpen, FaPlayCircle, FaUpload, FaSun, FaMoon } from "react-icons/fa";
import { useTheme } from "../../../context/ThemeContext";
import { api, unwrapList } from "../../../lib/api";

// ── Theme-aware color palettes ────────────────────────────────────────────────
const makeTokens = (darkMode) => ({
  // Page / structural
  pageBg: darkMode
    ? `radial-gradient(circle at 12% 18%, rgba(23,170,151,0.06), transparent 45%),
       radial-gradient(circle at 88% 82%, rgba(231,105,55,0.05), transparent 50%),
       #0b1120`
    : `radial-gradient(circle at 12% 18%, rgba(23,170,151,0.08), transparent 45%),
       radial-gradient(circle at 88% 82%, rgba(231,105,55,0.07), transparent 50%),
       #ffffff`,

  // Cards
  cardBg: darkMode ? "rgba(17,27,48,0.92)" : "rgba(255,255,255,0.86)",
  cardBorderDefault: darkMode ? "1.5px solid rgba(255,255,255,0.07)" : "1.5px solid rgba(0,0,0,0.10)",
  cardBorderHoverEmail: darkMode ? "1.5px solid rgba(231,105,55,0.45)" : "1.5px solid rgba(231,105,55,0.35)",
  cardBorderHoverBulk:  darkMode ? "1.5px solid rgba(23,170,151,0.45)"  : "1.5px solid rgba(23,170,151,0.35)",
  cardShadowDefault: darkMode ? "0 4px 24px rgba(0,0,0,0.35)" : "0 4px 12px rgba(0,0,0,0.05)",
  cardShadowHoverEmail: darkMode ? "0 18px 44px rgba(231,105,55,0.22)" : "0 18px 44px rgba(231,105,55,0.18)",
  cardShadowHoverBulk:  darkMode ? "0 18px 44px rgba(23,170,151,0.22)"  : "0 18px 44px rgba(23,170,151,0.18)",

  // Typography
  heading:  darkMode ? "#f0f4ff" : "#162944",
  subtext:  darkMode ? "#94a3b8" : "#454545",
  menuGray: darkMode ? "#6b7d9c" : "#636c72",

  // Inputs
  inputBg:     darkMode ? "#131e32" : "#fff",
  inputBorder: (focused) =>
    focused
      ? "1.6px solid rgba(231,105,55,0.65)"
      : darkMode
      ? "1.5px solid rgba(255,255,255,0.12)"
      : "1.5px solid rgba(0,0,0,0.10)",
  inputShadow: (focused) =>
    focused
      ? "0 0 0 4px rgba(231,105,55,0.18)"
      : "0 0 0 0 rgba(0,0,0,0)",
  inputColor: darkMode ? "#e2e8f0" : "#1a1a1a",
  placeholderColor: darkMode ? "#4a5a72" : undefined,

  // Upload box
  uploadBoxBg: darkMode
    ? `radial-gradient(circle at 15% 20%, rgba(231,105,55,0.06), transparent 45%),
       radial-gradient(circle at 85% 80%, rgba(23,170,151,0.08), transparent 50%),
       rgba(23,170,151,0.04)`
    : `radial-gradient(circle at 15% 20%, rgba(231,105,55,0.08), transparent 45%),
       radial-gradient(circle at 85% 80%, rgba(23,170,151,0.10), transparent 50%),
       rgba(23,170,151,0.06)`,
  uploadBoxBorder: darkMode ? "1.5px solid rgba(23,170,151,0.20)" : "1.5px solid rgba(23,170,151,0.25)",
  uploadBoxTitle: darkMode ? "#1ecfba" : "#0E887B",

  // Choose file button
  chooseFileBg: (hover) =>
    hover
      ? darkMode
        ? "linear-gradient(90deg, rgba(231,105,55,0.28), rgba(23,170,151,0.24))"
        : "linear-gradient(90deg, rgba(231,105,55,0.20), rgba(23,170,151,0.18))"
      : darkMode
      ? "rgba(23,170,151,0.16)"
      : "rgba(23,170,151,0.14)",
  chooseFileColor: darkMode ? "#d0e8e5" : "#344755",
  chooseFileBorder: (hover) =>
    hover
      ? "1.5px solid rgba(231,105,55,0.38)"
      : darkMode
      ? "1.5px solid rgba(23,170,151,0.30)"
      : "1.5px solid rgba(23,170,151,0.22)",

  // Selected-file chip
  fileChipBg:     darkMode ? "rgba(23,170,151,0.14)" : "rgba(23,170,151,0.10)",
  fileChipBorder: darkMode ? "1.5px solid rgba(23,170,151,0.35)" : "1.5px solid rgba(23,170,151,0.25)",
  fileChipColor:  "#17AA97",

  // Icon chip bg
  iconChipEmail: darkMode ? "rgba(231,105,55,0.18)" : "rgba(231,105,55,0.12)",
  iconChipBulk:  darkMode ? "rgba(23,170,151,0.18)"  : "rgba(23,170,151,0.12)",

  // Particles
  particle1: darkMode ? "rgba(23,170,151,0.07)"  : "rgba(23,170,151,0.10)",
  particle2: darkMode ? "rgba(231,105,55,0.05)"  : "rgba(231,105,55,0.07)",

  // Toggle button
  toggleBg: darkMode ? "rgba(11,17,32,0.70)" : "rgba(255,255,255,0.22)",
  toggleBorder: darkMode ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.35)",
  toggleColor: "#fff",
});

const EmailSearch = () => {
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === "dark";
  const T = makeTokens(darkMode);

  const [isEmailCardHover, setIsEmailCardHover] = useState(false);
  const [isBulkCardHover,  setIsBulkCardHover]  = useState(false);
  const [pageLoaded,       setPageLoaded]        = useState(false);

  const [name,         setName]         = useState("");
  const [company,      setCompany]      = useState("");
  const [jobTitle,     setJobTitle]     = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [bulkRows,     setBulkRows]     = useState([]);
  const [bulkResults,  setBulkResults]  = useState([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkError,    setBulkError]    = useState("");
  const [isLoading,    setIsLoading]    = useState(false);
  const [foundResult,  setFoundResult]  = useState(null);
  const [searchError,  setSearchError]  = useState("");
  const [leadSuggestions, setLeadSuggestions] = useState({ name: [], company: [], jobTitle: [] });
  const [openSuggestionField, setOpenSuggestionField] = useState("");

  const [isFindHover,   setIsFindHover]   = useState(false);
  const [isChooseHover, setIsChooseHover] = useState(false);
  const [isWatchHover,  setIsWatchHover]  = useState(false);
  const [isGuideHover,  setIsGuideHover]  = useState(false);
  const [isUploadBoxHover, setIsUploadBoxHover] = useState(false);
  const [focusField, setFocusField] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setPageLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Debounced lookups against the existing Leads search endpoint (read-only,
  // no changes to the Leads page or its code needed) — one per field.
  useEffect(() => {
    if (!name || name.trim().length < 2) {
      setLeadSuggestions((s) => ({ ...s, name: [] }));
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { items } = await unwrapList(api.get("/leads", { params: { search: name, limit: 5, page: 1 } }));
        setLeadSuggestions((s) => ({ ...s, name: items || [] }));
      } catch {
        setLeadSuggestions((s) => ({ ...s, name: [] }));
      }
    }, 350);
    return () => clearTimeout(t);
  }, [name]);

  useEffect(() => {
    if (!company || company.trim().length < 2) {
      setLeadSuggestions((s) => ({ ...s, company: [] }));
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { items } = await unwrapList(api.get("/leads", { params: { search: company, limit: 5, page: 1 } }));
        setLeadSuggestions((s) => ({ ...s, company: items || [] }));
      } catch {
        setLeadSuggestions((s) => ({ ...s, company: [] }));
      }
    }, 350);
    return () => clearTimeout(t);
  }, [company]);

  useEffect(() => {
    if (!jobTitle || jobTitle.trim().length < 2) {
      setLeadSuggestions((s) => ({ ...s, jobTitle: [] }));
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { items } = await unwrapList(api.get("/leads", { params: { search: jobTitle, limit: 5, page: 1 } }));
        setLeadSuggestions((s) => ({ ...s, jobTitle: items || [] }));
      } catch {
        setLeadSuggestions((s) => ({ ...s, jobTitle: [] }));
      }
    }, 350);
    return () => clearTimeout(t);
  }, [jobTitle]);

  const selectLeadSuggestion = (lead) => {
    setName(lead.name || "");
    setCompany(lead.companyName || "");
    setJobTitle(lead.jobTitle || "");
    setOpenSuggestionField("");
  };

  // Looks up a real, already-saved lead matching this name + company.
  // Returns the lead record (with its real email) or null if no match exists.
  const findRealLeadEmail = async (searchName, searchCompany) => {
    const { items } = await unwrapList(api.get("/leads", { params: { search: searchName, limit: 20, page: 1 } }));
    const norm = (s) => String(s || "").trim().toLowerCase();
    const nameNorm = norm(searchName);
    const companyNorm = norm(searchCompany);
    return (
      (items || []).find((lead) => {
        const leadName = norm(lead.name);
        const leadCompany = norm(lead.companyName);
        const nameMatches = leadName === nameNorm || leadName.includes(nameNorm) || nameNorm.includes(leadName);
        const companyMatches = !companyNorm || leadCompany.includes(companyNorm) || companyNorm.includes(leadCompany);
        return nameMatches && companyMatches;
      }) || null
    );
  };

  const handleEmailSearch = async (e) => {
    e.preventDefault();
    if (!name || !company) { alert("Please fill in name and company"); return; }
    setIsLoading(true);
    setSearchError("");
    setFoundResult(null);
    try {
      const lead = await findRealLeadEmail(name, company);
      setFoundResult({
        name, company, jobTitle,
        found: !!lead,
        email: lead?.email || null,
        leadStatus: lead?.status || null,
      });
    } catch (err) {
      setSearchError(err?.normalized?.message || err?.message || "Email search failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Minimal CSV parser: handles comma-separated values and basic double-quoted
  // fields (e.g. "Acme, Inc."). No external library needed for this scope.
  const parseCsv = (text) => {
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];
    const splitLine = (line) => {
      const out = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuotes = !inQuotes; continue; }
        if (ch === "," && !inQuotes) { out.push(cur.trim()); cur = ""; continue; }
        cur += ch;
      }
      out.push(cur.trim());
      return out;
    };
    const headers = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s_]+/g, ""));
    return lines.slice(1).map((line) => {
      const values = splitLine(line);
      const row = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
      return {
        name: row.name || row.fullname || "",
        company: row.company || row.companyname || "",
        jobTitle: row.jobtitle || row.job || row.title || "",
      };
    }).filter((r) => r.name);
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setBulkResults([]);
    setBulkError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows = parseCsv(String(ev.target.result || ""));
        if (rows.length === 0) {
          setBulkError("No valid rows found. Make sure the CSV has at least a 'name' column.");
        }
        setBulkRows(rows);
      } catch {
        setBulkError("Could not read that file. Please upload a plain CSV.");
      }
    };
    reader.onerror = () => setBulkError("Could not read that file.");
    reader.readAsText(file);
  };

  const handleBulkSearch = async () => {
    if (bulkRows.length === 0) return;
    setIsBulkLoading(true);
    setBulkError("");
    setBulkResults([]);
    const results = [];
    for (const row of bulkRows) {
      try {
        const lead = await findRealLeadEmail(row.name, row.company);
        results.push({ ...row, found: !!lead, email: lead?.email || null, status: "ok" });
      } catch (err) {
        results.push({ ...row, status: "error", errorMessage: err?.normalized?.message || err?.message || "Failed" });
      }
    }
    setBulkResults(results);
    setIsBulkLoading(false);
  };

  const inputStyle = (fieldKey) => ({
    flex: 1,
    padding: "11px 12px",
    fontSize: 15,
    borderRadius: 10,
    outline: "none",
    background: T.inputBg,
    color: T.inputColor,
    border: T.inputBorder(focusField === fieldKey),
    boxShadow: T.inputShadow(focusField === fieldKey),
    transition: "all 200ms ease",
  });

  return (
    <div>
      {/* ── Header banner ─────────────────────────────────────────────────── */}
<div style={{
  background: darkMode
    ? "linear-gradient(90deg, #020617, #0f172a)"
    : "linear-gradient(90deg, #17AA97, #E76937)",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px 30px",
  color: darkMode ? "#e2e8f0" : "#fff",
  fontWeight: 700,
  fontSize: 20,
  boxSizing: "border-box",
  minHeight: 65,
  gap: "30px",
  // marginBottom: "20px",
  flexWrap: "wrap",
}}>

  <span style={{
    flex: "1 1 300px",
    textAlign: "center",
    color: darkMode ? "#cbd5f5" : "#fff"
  }}>
    Learn how to collect targeted leads from any domain
  </span>

  <div style={{
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
    justifyContent: "center"
  }}>

    {/* Watch Button */}
    <a href="https://uptoskills.com/" target="_blank" rel="noreferrer">
      <button
        onMouseEnter={() => setIsWatchHover(true)}
        onMouseLeave={() => setIsWatchHover(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: darkMode ? "#1e293b" : "#fff",
          color: darkMode ? "#38bdf8" : "#17AA97",
          border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "none",
          fontWeight: 700,
          padding: "11px 26px",
          borderRadius: 36,
          fontSize: 16,
          cursor: "pointer",
          boxShadow: isWatchHover
            ? "0 12px 24px rgba(0,0,0,0.25)"
            : "0 2px 8px rgba(0,0,0,0.08)",
          transform: isWatchHover
            ? "translateY(-2px) scale(1.03)"
            : "translateY(0) scale(1)",
          transition: "all 220ms ease",
        }}
      >
        <FaPlayCircle style={{
          color: darkMode ? "#38bdf8" : "#17AA97",
          fontSize: 21
        }} />
        Watch tutorial
      </button>
    </a>

    {/* Guide Button */}
    <a href="https://uptoskills.com/" target="_blank" rel="noreferrer">
      <button
        onMouseEnter={() => setIsGuideHover(true)}
        onMouseLeave={() => setIsGuideHover(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: darkMode ? "#1e293b" : "#fff",
          color: darkMode ? "#38bdf8" : "#17AA97",
          border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "none",
          fontWeight: 700,
          padding: "11px 26px",
          borderRadius: 36,
          fontSize: 16,
          cursor: "pointer",
          boxShadow: isGuideHover
            ? "0 12px 24px rgba(0,0,0,0.25)"
            : "0 2px 8px rgba(0,0,0,0.08)",
          transform: isGuideHover
            ? "translateY(-2px) scale(1.03)"
            : "translateY(0) scale(1)",
          transition: "all 220ms ease",
        }}
      >
        <FaBookOpen style={{
          color: darkMode ? "#38bdf8" : "#17AA97",
          fontSize: 21
        }} />
        Read Guide
      </button>
    </a>

    </div>
</div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div style={{
        background: T.pageBg,
        boxSizing: "border-box", position: "relative",
        overflow: "hidden", padding: "18px", paddingBottom: "26px",
        transition: "background 300ms ease",
      }}>

        {/* Floating particles */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", top: -40, left: -60, width: 220, height: 220, borderRadius: "50%", background: T.particle1, filter: "blur(1px)", animation: "float1 3.5s ease-in-out infinite" }} />
          <div style={{ position: "absolute", top: 120, right: -60, width: 180, height: 180, borderRadius: "50%", background: T.particle2, filter: "blur(2px)", animation: "float2 4s ease-in-out infinite" }} />
          <div style={{ position: "absolute", top: "52%", left: -90, width: 190, height: 190, borderRadius: "50%", background: T.particle2, filter: "blur(2px)", animation: "float3 3.8s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: -60, left: -80, width: 200, height: 200, borderRadius: "50%", background: T.particle1, filter: "blur(3px)", animation: "float4 4.5s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: 80, right: 60, width: 140, height: 140, borderRadius: "50%", background: T.particle1, filter: "blur(1px)", animation: "float5 3.2s ease-in-out infinite" }} />
          <div style={{ position: "absolute", top: "42%", left: "46%", width: 170, height: 170, borderRadius: "50%", background: T.particle2, filter: "blur(2px)", animation: "float6 3.6s ease-in-out infinite" }} />
        </div>

        {/* ── Email Search card ──────────────────────────────────────────── */}
        <div
          onMouseEnter={() => setIsEmailCardHover(true)}
          onMouseLeave={() => setIsEmailCardHover(false)}
          style={{
            width: "100%", margin: "0 0 30px 0", borderRadius: 18,
            border: isEmailCardHover ? T.cardBorderHoverEmail : T.cardBorderDefault,
            background: T.cardBg,
            backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)",
            padding: "40px", boxSizing: "border-box",
            boxShadow: isEmailCardHover ? T.cardShadowHoverEmail : T.cardShadowDefault,
            opacity: pageLoaded ? 1 : 0,
            transform: pageLoaded ? (isEmailCardHover ? "translateY(-5px)" : "translateY(0px)") : "translateY(18px)",
            transition: "all 320ms ease",
            position: "relative", overflow: "hidden", zIndex: 1,
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: "linear-gradient(90deg, #E76937, #CC4F22)" }} />
          <div style={{ position: "absolute", top: 0, left: "-40%", width: "40%", height: 5, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)", animation: "shimmer 2.2s linear infinite" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: T.iconChipEmail }}>
              <span style={{ fontSize: 18, animation: "iconFloat 2.4s ease-in-out infinite" }}>🔍</span>
            </div>
            <h2 style={{ color: T.heading, fontSize: 18, margin: 0, fontWeight: 800 }}>Email Search</h2>
          </div>

          <p style={{ fontSize: 15, marginBottom: 16, color: T.subtext }}>
            Find email from your lead's name, company, and job title
          </p>

          <form onSubmit={handleEmailSearch}>
            <div style={{ display: "flex", gap: 27, marginBottom: 22 }}>
              {["name", "company", "jobTitle"].map((field, i) => (
                <div key={field} style={{ flex: 1, position: "relative" }}>
                  <input
                    style={{ ...inputStyle(field), width: "100%", boxSizing: "border-box" }}
                    placeholder={["Full Name", "Company", "Job Title"][i]}
                    value={[name, company, jobTitle][i]}
                    onFocus={() => { setFocusField(field); if (leadSuggestions[field].length) setOpenSuggestionField(field); }}
                    onBlur={() => { setFocusField(""); setTimeout(() => setOpenSuggestionField(""), 150); }}
                    onChange={(e) => {
                      [setName, setCompany, setJobTitle][i](e.target.value);
                      setOpenSuggestionField(field);
                    }}
                  />
                  {openSuggestionField === field && leadSuggestions[field].length > 0 && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 20,
                      background: T.cardBg, border: T.cardBorderDefault, borderRadius: 10,
                      boxShadow: "0 12px 28px rgba(0,0,0,0.18)", overflow: "hidden",
                    }}>
                      {leadSuggestions[field].map((lead) => (
                        <div
                          key={lead.id}
                          onMouseDown={() => selectLeadSuggestion(lead)}
                          style={{ padding: "10px 14px", cursor: "pointer", borderBottom: T.cardBorderDefault }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 14, color: T.heading }}>{lead.name}</div>
                          <div style={{ fontSize: 12.5, color: T.subtext }}>
                            {lead.companyName || "—"}{lead.jobTitle ? ` · ${lead.jobTitle}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                type="submit"
                onMouseEnter={() => setIsFindHover(true)}
                onMouseLeave={() => setIsFindHover(false)}
                style={{
                  background: "linear-gradient(90deg, #E76937, #CC4F22)",
                  color: "#fff", border: "none", fontWeight: 700, fontSize: 15,
                  borderRadius: 12, padding: "11px 40px", marginTop: 2, cursor: "pointer",
                  boxShadow: isFindHover ? "0 14px 28px rgba(231,105,55,0.35)" : "0 2px 7px rgba(0,0,0,0.08)",
                  transform: isFindHover ? "translateY(-2px) scale(1.03)" : "translateY(0) scale(1)",
                  transition: "all 220ms ease",
                }}
              >
                {isLoading ? "Searching..." : "Find Email"}
              </button>
            </div>
          </form>

          {searchError && (
            <div style={{ marginTop: 18, padding: "12px 16px", borderRadius: 10, background: "rgba(220,38,38,0.12)", border: "1.5px solid rgba(220,38,38,0.35)", color: darkMode ? "#fca5a5" : "#b91c1c", fontSize: 14, fontWeight: 600 }}>
              {searchError}
            </div>
          )}

          {foundResult && (
            <div style={{ marginTop: 18, padding: "18px 20px", borderRadius: 12, background: T.cardBg, border: T.cardBorderDefault }}>
              {foundResult.found ? (
                <>
                  <div style={{ fontSize: 13, color: T.subtext, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
                    Email on file
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T.heading, marginBottom: 10, wordBreak: "break-all" }}>
                    {foundResult.email}
                  </div>
                  <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 700,
                    background: "rgba(23,170,151,0.16)", color: "#17AA97" }}>
                    Found in your Leads
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 15, color: T.subtext }}>
                  No matching lead found for <strong style={{ color: T.heading }}>{foundResult.name}</strong> at{" "}
                  <strong style={{ color: T.heading }}>{foundResult.company}</strong>. Add them as a lead first, or check
                  the spelling of the name/company.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Bulk Email Search card ─────────────────────────────────────── */}
        <div
          onMouseEnter={() => setIsBulkCardHover(true)}
          onMouseLeave={() => setIsBulkCardHover(false)}
          style={{
            width: "100%", margin: 0, borderRadius: 18,
            border: isBulkCardHover ? T.cardBorderHoverBulk : T.cardBorderDefault,
            background: T.cardBg,
            backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)",
            padding: "40px", boxSizing: "border-box",
            boxShadow: isBulkCardHover ? T.cardShadowHoverBulk : T.cardShadowDefault,
            opacity: pageLoaded ? 1 : 0,
            transform: pageLoaded ? (isBulkCardHover ? "translateY(-5px)" : "translateY(0px)") : "translateY(28px)",
            transition: "all 340ms ease", transitionDelay: "120ms",
            position: "relative", overflow: "hidden", zIndex: 1,
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: "linear-gradient(90deg, #17AA97, #0E887B)" }} />
          <div style={{ position: "absolute", top: 0, left: "-40%", width: "40%", height: 5, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)", animation: "shimmer 2.2s linear infinite", animationDelay: "0.4s" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: T.iconChipBulk }}>
              <span style={{ fontSize: 18, animation: "iconFloat 2.4s ease-in-out infinite" }}>📤</span>
            </div>
            <h2 style={{ color: T.heading, fontSize: 18, margin: 0, fontWeight: 800 }}>Bulk Email Search</h2>
          </div>

          <p style={{ fontSize: 15, marginBottom: 14, color: T.subtext }}>
            Collect emails in bulk from a list of lead names and company domains
          </p>

          {/* Upload drop zone */}
          <div
            onMouseEnter={() => setIsUploadBoxHover(true)}
            onMouseLeave={() => setIsUploadBoxHover(false)}
            style={{
              border: T.uploadBoxBorder, borderRadius: 14,
              background: T.uploadBoxBg,
              padding: "36px 0 34px 0", textAlign: "center", minHeight: 140,
              position: "relative",
              boxShadow: isUploadBoxHover
                ? "0 0 0 5px rgba(23,170,151,0.12)"
                : darkMode
                ? "inset 0 0 0 1px rgba(255,255,255,0.04)"
                : "inset 0 0 0 1px rgba(231,105,55,0.06)",
              transition: "all 260ms ease",
            }}
          >
            <div style={{ color: T.uploadBoxTitle, fontWeight: 800, fontSize: 19, marginBottom: 17, marginTop: 7 }}>
              Upload or drop a file here
            </div>

            <label
              htmlFor="file-upload"
              onMouseEnter={() => setIsChooseHover(true)}
              onMouseLeave={() => setIsChooseHover(false)}
              style={{
                color: T.chooseFileColor,
                background: T.chooseFileBg(isChooseHover),
                fontSize: 17, display: "inline-flex", alignItems: "center", gap: 10,
                padding: "15px 40px", borderRadius: 12, fontWeight: 700,
                marginBottom: 6, marginTop: 4, cursor: "pointer",
                boxShadow: isChooseHover ? "0 14px 26px rgba(231,105,55,0.18)" : "0 1px 5px rgba(23,170,151,0.25)",
                transform: isChooseHover ? "translateY(-2px) scale(1.02)" : "translateY(0) scale(1)",
                transition: "all 220ms ease",
                border: T.chooseFileBorder(isChooseHover),
                letterSpacing: 0.4,
              }}
            >
              <FaUpload style={{ fontSize: 20 }} />
              <span>Choose file</span>
              <input id="file-upload" name="file-upload" type="file" style={{ display: "none" }} onChange={handleFileChange} />
            </label>

            <div style={{ margin: "18px auto 0 auto", color: T.menuGray, fontSize: 15, fontWeight: 500, maxWidth: 530 }}>
              Process up to 50,000 domain searches at once with our Bulk Email Search feature.
            </div>

            {selectedFile && (
              <div style={{ backgroundColor: T.fileChipBg, border: T.fileChipBorder, borderRadius: "10px", padding: "10px 18px", marginTop: 16, fontSize: 15, color: T.fileChipColor, fontWeight: 700, display: "inline-block" }}>
                Selected file: <span style={{ fontWeight: 900 }}>{selectedFile.name}</span>
                {bulkRows.length > 0 && <span style={{ fontWeight: 500 }}> — {bulkRows.length} row{bulkRows.length !== 1 ? "s" : ""} found</span>}
              </div>
            )}

            {bulkError && (
              <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: "rgba(220,38,38,0.12)", border: "1.5px solid rgba(220,38,38,0.35)", color: darkMode ? "#fca5a5" : "#b91c1c", fontSize: 14, fontWeight: 600, maxWidth: 530, marginLeft: "auto", marginRight: "auto" }}>
                {bulkError}
              </div>
            )}

            {bulkRows.length > 0 && (
              <button
                type="button"
                onClick={handleBulkSearch}
                disabled={isBulkLoading}
                style={{
                  marginTop: 20, padding: "13px 34px", borderRadius: 12, fontSize: 16, fontWeight: 800,
                  background: "linear-gradient(90deg, #17AA97, #10897a)", color: "#fff", border: "none",
                  cursor: isBulkLoading ? "default" : "pointer", opacity: isBulkLoading ? 0.7 : 1,
                }}
              >
                {isBulkLoading ? `Searching ${bulkRows.length} leads...` : `Search all ${bulkRows.length} leads`}
              </button>
            )}

            {bulkResults.length > 0 && (
              <div style={{ marginTop: 24, textAlign: "left", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: T.cardBorderDefault }}>
                      <th style={{ padding: "10px 12px", color: T.subtext, fontWeight: 700 }}>Name</th>
                      <th style={{ padding: "10px 12px", color: T.subtext, fontWeight: 700 }}>Company</th>
                      <th style={{ padding: "10px 12px", color: T.subtext, fontWeight: 700 }}>Email</th>
                      <th style={{ padding: "10px 12px", color: T.subtext, fontWeight: 700 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResults.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: T.cardBorderDefault }}>
                        <td style={{ padding: "10px 12px", color: T.heading, fontWeight: 600 }}>{r.name}</td>
                        <td style={{ padding: "10px 12px", color: T.heading }}>{r.company}</td>
                        <td style={{ padding: "10px 12px", color: T.heading, wordBreak: "break-all" }}>{r.status === "ok" && r.found ? r.email : "—"}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{
                            fontSize: 12.5, fontWeight: 700, padding: "3px 10px", borderRadius: 16,
                            background: r.status === "ok" && r.found ? "rgba(23,170,151,0.16)" : r.status === "error" ? "rgba(220,38,38,0.14)" : "rgba(148,163,184,0.16)",
                            color: r.status === "ok" && r.found ? "#17AA97" : r.status === "error" ? "#b91c1c" : "#64748b",
                          }}>
                            {r.status === "error" ? r.errorMessage : r.found ? "Found in Leads" : "No matching lead"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(70px,45px)} }
          @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-80px,60px)} }
          @keyframes float3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(90px,-55px)} }
          @keyframes float4 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-100px,-65px)} }
          @keyframes float5 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-60px,40px)} }
          @keyframes float6 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(70px,-40px)} }
          @keyframes shimmer {
            0%   { left:-40%; opacity:0.2; }
            15%  { opacity:0.8; }
            55%  { opacity:0.65; }
            100% { left:110%; opacity:0.15; }
          }
          @keyframes iconFloat {
            0%,100% { transform:translateY(0px); }
            50%     { transform:translateY(-3px); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default EmailSearch;