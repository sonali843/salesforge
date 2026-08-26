import React, { useEffect, useState, useCallback } from "react";
import {
  Search, FileText, ChevronLeft, ChevronRight, Loader2,
  AlertTriangle, RefreshCw, Clock, Building,
} from "lucide-react";
import { api } from "../../lib/api";

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/admin/audit-logs", { params: { page, limit, search } });
      const body = res.data;
      setLogs(body.data || []);
      setTotal(body.meta?.pagination?.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const getActionColor = (action) => {
    if (action?.includes("create") || action?.includes("login")) return "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30";
    if (action?.includes("update") || action?.includes("edit")) return "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30";
    if (action?.includes("delete") || action?.includes("revoke")) return "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30";
    return "text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40";
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <main className="flex-1 p-8 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Audit Logs</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {total} audit entries across the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search actions, users..."
                className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none w-64"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-500 transition-colors"
            >
              Search
            </button>
          </form>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400 text-sm">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-teal-600" />
            <span className="ml-3 text-slate-500 dark:text-slate-400 text-sm">Loading audit logs...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-850/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">User</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Entity</th>
                    <th className="p-4">Organization</th>
                    <th className="p-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">
                        <FileText size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                        No audit logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <Clock size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                            <div>
                              <div className="text-xs font-medium">{formatDate(log.createdAt)}</div>
                              <div className="text-xs text-slate-400 dark:text-slate-500">{formatTime(log.createdAt)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {log.user ? (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {(log.user.name || "?").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-xs font-medium text-slate-800 dark:text-slate-200">{log.user.name}</div>
                                <div className="text-xs text-slate-400 dark:text-slate-500">{log.user.email}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 italic text-xs">System</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-xs text-slate-600 dark:text-slate-300">{log.entityType}</div>
                          {log.entityId && (
                            <div className="text-xs text-slate-400 dark:text-slate-500">ID: {log.entityId}</div>
                          )}
                        </td>
                        <td className="p-4">
                          {log.org ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                              <Building size={12} className="text-slate-400 dark:text-slate-500" />
                              {log.org.name}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {log.ipAddress || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Page {page} of {totalPages} ({total} entries)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default AdminAuditLogs;
