import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { leadService, tagService, savedSearchService } from "@/services";
import { useTheme } from "@/context/ThemeContext";
import { UptoPage, SectionHeading } from "@/components/UI/UptoStyles";
import {
  UptoButton as Button,
  UptoInput as Input,
  UptoSelect as Select,
  UptoBadge as Badge,
  UptoSpinner as FullPageSpinner,
  UptoError as ErrorBanner,
  UptoEmptyState as EmptyState,
  UptoCopyButton as CopyButton,
} from "@/components/UI/UptoHooks";
import {
  Plus,
  Download,
  Upload,
  Save,
  X,
  Target,
  Filter,
  ListChecks,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const Leads = () => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";
  const { isMember } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    source: "",
    tagId: "",
    sortBy: "createdAt",
    order: "desc",
  });

  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [tags, setTags] = useState([]);

  // Selected lead IDs for bulk deletion
  const [selected, setSelected] = useState([]);
  const [deletingSelected, setDeletingSelected] = useState(false);

  const [draft, setDraft] = useState({
    name: "",
    email: "",
    companyName: "",
    status: "new",
    source: "website",
  });

  const [csv, setCsv] = useState("");
  const [savedSearches, setSavedSearches] = useState([]);

  const limit = 20;

  const heading = darkMode ? "text-white" : "text-slate-900";
  const subtext = darkMode ? "text-slate-400" : "text-slate-500";
  const body = darkMode ? "text-slate-300" : "text-slate-600";
  const card = darkMode
    ? "bg-slate-900 border-slate-800"
    : "bg-white border-slate-100";
  const divider = darkMode ? "border-slate-800" : "border-slate-200";
  const inputBg = darkMode
    ? "bg-slate-800 border-slate-700 text-white"
    : "bg-white border-slate-300 text-slate-900";
  const pill = darkMode
    ? "bg-teal-900/50 text-teal-400"
    : "bg-teal-50 text-teal-700";

  const load = async (p = page, f = filters) => {
    setLoading(true);

    try {
      const params = {
        page: p,
        limit,
        ...Object.fromEntries(
          Object.entries(f).filter(
            ([_, v]) => v !== "" && v !== null
          )
        ),
      };

      const r = await leadService.list(params);

      setItems(r.items || []);
      setTotal(r.total || 0);
      setPages(r.pages || 1);
      setError(null);

      // Remove selected IDs that are no longer present
      // after filtering/deletion.
      setSelected((prev) =>
        prev.filter((id) =>
          (r.items || []).some((lead) => lead.id === id)
        )
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, filters);
  }, []);

  useEffect(() => {
    tagService
      .list()
      .then(setTags)
      .catch(() => {});

    savedSearchService
      .list({ resource: "leads" })
      .then((r) => setSavedSearches(r || []))
      .catch(() => {});
  }, []);

  const create = async (e) => {
    e.preventDefault();

    try {
      await leadService.create(draft);

      toast.success("Lead created");

      setShowCreate(false);

      setDraft({
        name: "",
        email: "",
        companyName: "",
        status: "new",
        source: "website",
      });

      load(1);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const importLeads = async () => {
    try {
      const r = await leadService.import(csv);

      toast.success(
        `Imported ${r.created} new, updated ${r.updated}, ${r.failed} failed`
      );

      setShowImport(false);
      setCsv("");
      load(1);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const saveSearch = async () => {
    const name = prompt("Name this search");

    if (!name) return;

    try {
      await savedSearchService.create({
        name,
        resource: "leads",
        filters,
      });

      toast.success("Search saved");

      const s = await savedSearchService.list({
        resource: "leads",
      });

      setSavedSearches(s || []);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const applySaved = (saved) => {
    const f = {
      ...filters,
      ...saved.filters,
    };

    setFilters(f);

    setTimeout(() => load(1, f), 0);
  };

  // Single lead delete
  const remove = async (id) => {
    if (!confirm("Delete this lead?")) return;

    try {
      await leadService.remove(id);

      toast.success("Lead deleted");

      // Remove it immediately from selection
      setSelected((prev) => prev.filter((selectedId) => selectedId !== id));

      load(page);
    } catch (e) {
      toast.error(e.message);
    }
  };

  // Toggle one lead checkbox
  const toggleSelect = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((selectedId) => selectedId !== id);
      }

      return [...prev, id];
    });
  };

  // Check whether all leads on current page are selected
  const allSelected =
    items.length > 0 &&
    items.every((lead) => selected.includes(lead.id));

  // Select/unselect all leads on current page
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected((prev) =>
        prev.filter(
          (id) => !items.some((lead) => lead.id === id)
        )
      );
      return;
    }

    const currentPageIds = items.map((lead) => lead.id);

    setSelected((prev) => [
      ...new Set([...prev, ...currentPageIds]),
    ]);
  };

  // Bulk delete selected leads
  const removeSelected = async () => {
    const ids = [...selected];

    if (ids.length === 0) {
      toast.error("Please select at least one lead");
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete ${ids.length} selected lead${
        ids.length > 1 ? "s" : ""
      }? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingSelected(true);

    try {
      let successful = 0;
      let failed = 0;

      try {
        // Preferred: use the backend bulk-delete endpoint.
        await leadService.bulkDelete(ids);
        successful = ids.length;
      } catch (bulkError) {
        // Fallback: delete each selected lead through the existing
        // single-delete API if bulk-delete is unavailable.
        const results = await Promise.allSettled(
          ids.map((id) => leadService.remove(id))
        );

        successful = results.filter(
          (result) => result.status === "fulfilled"
        ).length;

        failed = results.length - successful;

        if (successful === 0) {
          throw bulkError;
        }
      }

      setSelected([]);

      // If the current page becomes empty, move to the previous page.
      const deletingWholePage =
        items.length > 0 && successful >= items.length;

      const nextPage =
        deletingWholePage && page > 1 ? page - 1 : page;

      if (nextPage !== page) {
        setPage(nextPage);
      }

      await load(nextPage, filters);

      if (successful > 0) {
        toast.success(
          `${successful} lead${successful > 1 ? "s" : ""} deleted successfully`
        );
      }

      if (failed > 0) {
        toast.error(
          `${failed} lead${failed > 1 ? "s" : ""} could not be deleted`
        );
      }
    } catch (e) {
      toast.error(e?.message || "Failed to delete selected leads");
    } finally {
      setDeletingSelected(false);
    }
  };

  return (
    <UptoPage>
      {/* Hero */}
      <div className="relative overflow-hidden -mx-6 md:-mx-10 lg:-mx-16 px-6 md:px-10 lg:px-16 py-10">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl ${
              darkMode
                ? "bg-teal-900/10"
                : "bg-teal-300/20"
            }`}
          />
        </div>

        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1
              className={`text-3xl md:text-4xl font-semibold mb-2 ${heading}`}
            >
              Leads
            </h1>

            <p className={`text-base ${subtext}`}>
              {total.toLocaleString()} total leads in your pipeline
            </p>
          </div>

          {isMember && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowImport((p) => !p)}
                className={
                  !darkMode
                    ? "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                    : "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
                }
              >
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>

              <a
                href={leadService.exportUrl()}
                target="_blank"
                rel="noreferrer"
              >
                <Button
                  variant="secondary"
                  className={
                    !darkMode
                      ? "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                      : "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
                  }
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </a>

              <Button
                onClick={() => setShowCreate((p) => !p)}
                className="bg-[#00b5ad] text-white hover:bg-[#2dd4bf]"
              >
                <Plus className="h-4 w-4" />
                New Lead
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <section>
        <SectionHeading label="Filters" darkMode={darkMode} />

        <div className={`rounded-2xl p-5 border ${card}`}>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <input
                placeholder="Search by name, email, company…"
                value={filters.search}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    search: e.target.value,
                  }))
                }
                className={`w-full rounded-xl border px-3 py-2 text-sm ${inputBg}`}
              />
            </div>

            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((p) => ({
                  ...p,
                  status: e.target.value,
                }))
              }
              className={`rounded-xl border px-3 py-2 text-sm ${inputBg}`}
            >
              <option value="">All Statuses</option>

              {[
                "new",
                "contacted",
                "qualified",
                "in_progress",
                "converted",
                "closed",
                "lost",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            <select
              value={filters.source}
              onChange={(e) =>
                setFilters((p) => ({
                  ...p,
                  source: e.target.value,
                }))
              }
              className={`rounded-xl border px-3 py-2 text-sm ${inputBg}`}
            >
              <option value="">All Sources</option>

              {[
                "website",
                "referral",
                "social_media",
                "email_campaign",
                "cold_call",
                "trade_show",
                "partner",
                "import",
                "api",
                "other",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            <select
              value={filters.tagId}
              onChange={(e) =>
                setFilters((p) => ({
                  ...p,
                  tagId: e.target.value,
                }))
              }
              className={`rounded-xl border px-3 py-2 text-sm ${inputBg}`}
            >
              <option value="">All Tags</option>

              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <Button
              onClick={() => load(1, filters)}
              className="bg-[#00b5ad] text-white hover:bg-[#2dd4bf]"
            >
              Apply
            </Button>

            <Button
              onClick={saveSearch}
              variant="secondary"
              className={
                !darkMode
                  ? "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                  : "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
              }
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>

          {savedSearches.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`text-xs ${subtext}`}>
                Saved:
              </span>

              {savedSearches.map((saved) => (
                <div
                  key={saved.id}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                    darkMode
                      ? "border-slate-700"
                      : "border-slate-300"
                  }`}
                >
                  <button
                    onClick={() => applySaved(saved)}
                    className="hover:text-[#00b5ad]"
                  >
                    {saved.name}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Create Lead */}
      {showCreate && (
        <section>
          <div className={`rounded-2xl p-6 border ${card}`}>
            <h3
              className={`text-base font-semibold mb-4 ${heading}`}
            >
              New Lead
            </h3>

            <form
              onSubmit={create}
              className="grid grid-cols-1 gap-3 md:grid-cols-2"
            >
              <input
                placeholder="Full name *"
                value={draft.name}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    name: e.target.value,
                  }))
                }
                required
                className={`rounded-xl border px-3 py-2 text-sm ${inputBg}`}
              />

              <input
                placeholder="Email *"
                type="email"
                value={draft.email}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    email: e.target.value,
                  }))
                }
                required
                className={`rounded-xl border px-3 py-2 text-sm ${inputBg}`}
              />

              <input
                placeholder="Company"
                value={draft.companyName}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    companyName: e.target.value,
                  }))
                }
                className={`rounded-xl border px-3 py-2 text-sm ${inputBg}`}
              />

              <input
                placeholder="Job title"
                value={draft.jobTitle || ""}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    jobTitle: e.target.value,
                  }))
                }
                className={`rounded-xl border px-3 py-2 text-sm ${inputBg}`}
              />

              <select
                value={draft.status}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    status: e.target.value,
                  }))
                }
                className={`rounded-xl border px-3 py-2 text-sm ${inputBg}`}
              >
                {[
                  "new",
                  "contacted",
                  "qualified",
                  "in_progress",
                  "converted",
                  "closed",
                  "lost",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>

              <select
                value={draft.source}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    source: e.target.value,
                  }))
                }
                className={`rounded-xl border px-3 py-2 text-sm ${inputBg}`}
              >
                {[
                  "website",
                  "referral",
                  "social_media",
                  "email_campaign",
                  "cold_call",
                  "trade_show",
                  "partner",
                  "import",
                  "api",
                  "other",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>

              <div className="md:col-span-2 flex gap-2">
                <Button
                  type="submit"
                  className="bg-[#00b5ad] text-white hover:bg-[#2dd4bf]"
                >
                  Create Lead
                </Button>

                <Button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  variant="secondary"
                  className={
                    !darkMode
                      ? "bg-white text-slate-700 border border-slate-300"
                      : "bg-slate-800 text-slate-200 border border-slate-700"
                  }
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* Import CSV */}
      {showImport && (
        <section>
          <div className={`rounded-2xl p-6 border ${card}`}>
            <h3
              className={`text-base font-semibold mb-4 ${heading}`}
            >
              Import CSV
            </h3>

            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={6}
              placeholder={
                "name,email,phone,domain,company_name,job_title,status,source\nJane,jane@acme.com"
              }
              className={`w-full rounded-xl border p-3 font-mono text-xs ${inputBg}`}
            />

            <div className="mt-2 flex gap-2">
              <Button
                onClick={importLeads}
                className="bg-[#00b5ad] text-white hover:bg-[#2dd4bf]"
              >
                Import
              </Button>

              <Button
                onClick={() => setShowImport(false)}
                variant="secondary"
                className={
                  !darkMode
                    ? "bg-white text-slate-700 border border-slate-300"
                    : "bg-slate-800 text-slate-200 border border-slate-700"
                }
              >
                Cancel
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Leads table */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionHeading
            label="Your Leads"
            darkMode={darkMode}
          />

          {/* Bulk Delete */}
          {isMember && selected.length > 0 && (
            <Button
              onClick={removeSelected}
              disabled={deletingSelected}
              className="bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {deletingSelected
                ? "Deleting..."
                : `Delete Selected (${selected.length})`}
            </Button>
          )}
        </div>

        {/* Selection info */}
        {selected.length > 0 && (
          <div
            className={`mb-3 flex items-center justify-between rounded-xl border px-4 py-3 ${
              darkMode
                ? "border-teal-900 bg-teal-900/20"
                : "border-teal-200 bg-teal-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-[#00b5ad]" />

              <span
                className={`text-sm font-medium ${
                  darkMode
                    ? "text-teal-300"
                    : "text-teal-700"
                }`}
              >
                {selected.length} lead
                {selected.length > 1 ? "s" : ""} selected
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelected([])}
              className={`text-xs font-medium ${
                darkMode
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Clear selection
            </button>
          </div>
        )}

        {error && (
          <ErrorBanner
            error={error}
            onRetry={() => load(page)}
          />
        )}

        <div
          className={`rounded-2xl border ${card} overflow-hidden`}
        >
          {loading ? (
            <FullPageSpinner />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No leads match your filters"
              body="Try clearing filters or importing a CSV."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <tr>
                    {/* Select All checkbox */}
                    <th className="py-3 px-4 w-12">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all leads"
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#00b5ad] focus:ring-[#00b5ad]"
                      />
                    </th>

                    <th className="py-3 px-4">
                      Name
                    </th>

                    <th className="py-3 px-4">
                      Email
                    </th>

                    <th className="py-3 px-4">
                      Company
                    </th>

                    <th className="py-3 px-4">
                      Status
                    </th>

                    <th className="py-3 px-4">
                      Score
                    </th>

                    <th className="py-3 px-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((l) => {
                    const isSelected = selected.includes(l.id);

                    return (
                      <tr
                        key={l.id}
                        className={`cursor-pointer ${
                          isSelected
                            ? darkMode
                              ? "bg-teal-900/20"
                              : "bg-teal-50/60"
                            : darkMode
                            ? "hover:bg-slate-800/40"
                            : "hover:bg-slate-50/60"
                        }`}
                        onClick={() =>
                          navigate(`/leads/${l.id}`)
                        }
                      >
                        {/* Individual checkbox */}
                        <td
                          className="py-3 px-4"
                          onClick={(e) =>
                            e.stopPropagation()
                          }
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              toggleSelect(l.id)
                            }
                            aria-label={`Select ${l.name}`}
                            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#00b5ad] focus:ring-[#00b5ad]"
                          />
                        </td>

                        <td
                          className={`py-3 px-4 font-medium ${heading}`}
                        >
                          {l.name}
                        </td>

                        <td
                          className={`py-3 px-4 ${body}`}
                        >
                          <div className="flex items-center gap-2">
                            {l.email}

                            <CopyButton
                              value={l.email}
                            />
                          </div>
                        </td>

                        <td
                          className={`py-3 px-4 ${body}`}
                        >
                          {l.companyName || "—"}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              l.status === "lost"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                : l.status === "converted"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium ${heading}`}
                            >
                              {l.score}
                            </span>

                            <div
                              className={`h-1.5 w-16 overflow-hidden rounded-full ${
                                darkMode
                                  ? "bg-slate-800"
                                  : "bg-slate-100"
                              }`}
                            >
                              <div
                                className="h-full bg-gradient-to-r from-[#00b5ad] to-[#2dd4bf]"
                                style={{
                                  width: `${l.score}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td
                          className="py-3 px-4 text-right"
                          onClick={(e) =>
                            e.stopPropagation()
                          }
                        >
                          {isMember && (
                            <button
                              onClick={() => remove(l.id)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            onClick={() => {
              const p = page - 1;
              setPage(p);
              setSelected([]);
              load(p);
            }}
            disabled={page === 1}
            variant="secondary"
            className={
              !darkMode
                ? "bg-white text-slate-700 border border-slate-300"
                : "bg-slate-800 text-slate-200 border border-slate-700"
            }
          >
            Previous
          </Button>

          <span className={`text-xs ${subtext}`}>
            Page {page} of {pages}
          </span>

          <Button
            onClick={() => {
              const p = page + 1;
              setPage(p);
              setSelected([]);
              load(p);
            }}
            disabled={page >= pages}
            variant="secondary"
            className={
              !darkMode
                ? "bg-white text-slate-700 border border-slate-300"
                : "bg-slate-800 text-slate-200 border border-slate-700"
            }
          >
            Next
          </Button>
        </div>
      )}
    </UptoPage>
  );
};

export default Leads;
