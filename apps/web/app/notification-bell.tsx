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
      <button onClick={handleOpen} className="eyebrow">
        Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
      </button>
      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: "calc(100% + 0.4rem)",
            right: 0,
            padding: "0.75rem",
            width: 280,
            zIndex: 10,
          }}
        >
          {notifications.length === 0 && (
            <p style={{ color: "var(--ink-soft)", margin: 0 }}>No notifications yet.</p>
          )}
          {notifications.map((n) => (
            <p key={n.id} style={{ margin: "0.3rem 0", fontWeight: n.read ? 400 : 600, fontSize: "0.9rem" }}>
              {describe(n)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
