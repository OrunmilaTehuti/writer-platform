"use client";

import { useEffect, useState } from "react";

interface Notification {
  id: string;
  type: "FOLLOW" | "LIKE" | "COMMENT";
  read: boolean;
  createdAt: string;
  actor: { id: string; handle: string; displayName: string };
}

function describe(n: Notification) {
  switch (n.type) {
    case "FOLLOW":
      return `${n.actor.displayName} followed you`;
    case "LIKE":
      return `${n.actor.displayName} liked your post`;
    case "COMMENT":
      return `${n.actor.displayName} commented on your post`;
  }
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  async function load() {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }
  }

  useEffect(() => {
    load();
    // Simple polling so notifications show up without a full page reload.
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      await fetch("/api/notifications", { method: "POST" });
      setUnreadCount(0);
    }
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button onClick={handleOpen}>
        🔔 {unreadCount > 0 && <strong>({unreadCount})</strong>}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: 4,
            padding: "0.5rem",
            width: 280,
            zIndex: 10,
          }}
        >
          {notifications.length === 0 && <p style={{ color: "#888", margin: 0 }}>No notifications yet.</p>}
          {notifications.map((n) => (
            <p key={n.id} style={{ margin: "0.25rem 0", fontWeight: n.read ? "normal" : "bold" }}>
              {describe(n)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
