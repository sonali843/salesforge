import React, { useEffect, useState } from "react";
import { contactService } from "@/services";
import {
  UptoPage, UptoHero, UptoButton, UptoInput, UptoBadge,
  UptoSpinner, UptoError, UptoEmptyState, UptoCard,
} from "@/components/UI/UptoHooks";
import { User, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const Contacts = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({ firstName: "", lastName: "", email: "", phone: "", jobTitle: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await contactService.list({ limit: 100 });
      setItems(res?.items || res || []);
      setError(null);
    } catch (e) {
      setError(e?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!draft.firstName.trim() && !draft.lastName.trim()) {
      toast.error("First Name or Last Name is required");
      return;
    }
    try {
      await contactService.create(draft);
      toast.success("Contact created successfully");
      setShowCreate(false);
      setDraft({ firstName: "", lastName: "", email: "", phone: "", jobTitle: "" });
      load();
    } catch (err) {
      toast.error(err?.message || "Failed to create contact");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this contact?")) return;
    try {
      await contactService.remove(id);
      toast.success("Contact removed successfully");
      load();
    } catch (err) {
      toast.error(err?.message || "Failed to delete contact");
    }
  };

  return (
    <UptoPage>
      <UptoHero
        title="Contacts"
        subtitle="Manage leads, customers, and key organizational contacts"
        actions={
          <UptoButton onClick={() => setShowCreate(true)}>
            <Plus className="mr-1 h-4 w-4 inline" /> New Contact
          </UptoButton>
        }
      />
      <UptoCard>
        {loading && <UptoSpinner />}
        {error && <UptoError message={error} onRetry={load} />}
        {!loading && !error && items.length === 0 && (
          <UptoEmptyState
            icon={User}
            title="No Contacts"
            body="Start building your network by adding key business contacts."
          />
        )}
        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-3 py-3">Job Title</th>
                  <th className="px-3 py-3">Company</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="px-3 py-3 text-slate-650 dark:text-slate-355">{c.email || "—"}</td>
                    <td className="px-3 py-3 text-slate-650 dark:text-slate-355">{c.phone || "—"}</td>
                    <td className="px-3 py-3 text-slate-650 dark:text-slate-355">
                      <span className="px-2.5 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {c.jobTitle || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-650 dark:text-slate-355">{c.companyName || "—"}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded-md transition-colors"
                        title="Delete contact"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </UptoCard>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreate}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-xl"
          >
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">New Contact</h3>
            <div className="space-y-4">
              <UptoInput
                label="First Name"
                value={draft.firstName}
                onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
                required
              />
              <UptoInput
                label="Last Name"
                value={draft.lastName}
                onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
              />
              <UptoInput
                label="Email"
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
              <UptoInput
                label="Phone"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              />
              <UptoInput
                label="Job Title"
                value={draft.jobTitle}
                onChange={(e) => setDraft({ ...draft, jobTitle: e.target.value })}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <UptoButton type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </UptoButton>
              <UptoButton type="submit">Create</UptoButton>
            </div>
          </form>
        </div>
      )}
    </UptoPage>
  );
};

export default Contacts;
