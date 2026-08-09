import React, { useEffect, useState } from "react";
import { notificationService } from "@/services";
import { openEventStream } from "@/lib/api";
import { Bell, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const NotificationBell = () => {
  const { tokenStore } = useAuth();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);

  const load = async () => {
    try {
      const data = await notificationService.list({ limit: 20 });
      setItems(data?.data || []);
      setUnread(data?.summary?.unreadCount || 0);
    } catch {}
  };

  useEffect(() => {
    let mounted = true;
    const initialLoad = async () => {
      try {
        const data = await notificationService.list({ limit: 20 });
        if (mounted) {
          setItems(data?.data || []);
          setUnread(data?.summary?.unreadCount || 0);
        }
      } catch {}
    };
    initialLoad();
    const stream = openEventStream("/sse/stream", {
      onEvent: (evt, data) => {
        if (evt === "notification.new") {
          // The backend sends inAppEnabled and pushEnabled flags in the payload,
          // computed from the user's saved preferences at dispatch time.
          // This means the frontend never needs to re-fetch or guess — it just
          // follows the backend's authoritative decision.
          const inAppEnabled = data?.payload?.inAppEnabled !== false;
          const pushEnabled  = data?.payload?.pushEnabled  !== false;

          // In-App: refresh the bell badge/list only if in_app is ON for this category.
          if (inAppEnabled) {
            initialLoad();
          }

          // Push: show OS/browser system popup only if push is ON for this category.
          if (pushEnabled && "Notification" in window && Notification.permission === "granted") {
            const rawType = data?.payload?.type || "New Notification";
            const friendlyTitle = rawType
              .toLowerCase()
              .split("_")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
            const body = data?.payload?.message || "You have a new message.";
            new Notification(friendlyTitle, {
              body,
              icon: "/favicon.ico"
            });
          }
        } else if (evt === "notifications.read_all") {
          initialLoad();
        }
        if (["LEAD_CREATED", "LEAD_UPDATED", "DEAL_CREATED", "DEAL_UPDATED", "PAYMENT_SUCCEEDED", "PAYMENT_FAILED", "USER_INVITED", "USER_JOINED", "INTEGRATION_SYNCED"].includes(evt)) {
          initialLoad();
        }
      },
    });
    const id = setInterval(initialLoad, 60_000);
    return () => { mounted = false; stream.close(); clearInterval(id); };
  }, []);

  const markAll = async () => {
    try { 
      await notificationService.markAllRead(); 
      setUnread(0); 
      setItems((p) => p.map((n) => ({ ...n, is_read: true }))); 
      toast.success("All notifications marked as read");
    }
    catch {}
  };

  const markOne = async (id) => {
    try { 
      await notificationService.markRead(id); 
      setUnread((u) => Math.max(0, u - 1)); 
      setItems((p) => p.map((n) => n.id === id ? { ...n, is_read: true } : n)); 
    }
    catch {}
  };

  const deleteOne = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationService.remove(id);
      setItems((p) => p.filter((n) => n.id !== id));
      const deletedItem = items.find((n) => n.id === id);
      if (deletedItem && !deletedItem.is_read) {
        setUnread((u) => Math.max(0, u - 1));
      }
      toast.success("Notification deleted");
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  const clearAll = async () => {
    if (!confirm("Are you sure you want to clear all notifications?")) return;
    try {
      await notificationService.clearAll();
      setItems([]);
      setUnread(0);
      toast.success("All notifications cleared");
    } catch {
      toast.error("Failed to clear notifications");
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5 text-sm font-semibold dark:border-gray-800">
            <span>Notifications</span>
            <div className="flex items-center gap-2">
              <button onClick={markAll} className="text-xs font-normal text-teal-600 hover:underline">Mark read</button>
              <span className="text-gray-300 dark:text-gray-700 text-xs">•</span>
              <button onClick={clearAll} className="text-xs font-normal text-red-500 hover:underline">Clear all</button>
            </div>
          </div>
          <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-gray-500">No notifications yet.</li>
            ) : items.map((n) => (
              <li key={n.id} className={`group flex items-start justify-between gap-2 px-4 py-3 text-sm transition hover:bg-gray-50 dark:hover:bg-gray-800/40 ${n.is_read ? "" : "bg-teal-50/30 dark:bg-teal-900/5"}`}>
                <div className="flex items-start gap-2 flex-1">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: n.is_read ? "transparent" : "#14b8a6" }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white break-words">{n.message}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{n.type} · {new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {!n.is_read && (
                    <button onClick={() => markOne(n.id)} className="text-xs text-teal-600 hover:underline">Read</button>
                  )}
                  <button 
                    onClick={(e) => deleteOne(n.id, e)} 
                    className="text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5"
                    title="Delete Notification"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
