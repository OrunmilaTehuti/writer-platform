"use client";

import { useEffect, useState } from "react";
import { Avatar } from "./avatar";
import { MentionInput } from "./mention-input";

interface Author {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Post {
  id: string;
  type: string;
  body: string | null;
  createdAt: string;
  author: Author;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: Author;
}

interface DiscoverUser {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  isFollowing: boolean;
}

// Twitter-style relative time ("3m", "2h", "5d") instead of a full date.
function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function CommentsSection({ postId, onCommentAdded }: { postId: string; onCommentAdded: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/${postId}/comments`)
      .then((res) => res.json())
      .then((data) => setComments(data.comments))
      .finally(() => setLoading(false));
  }, [postId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });
    if (res.ok) {
      const { comment } = await res.json();
      setComments((prev) => [...prev, comment]);
      setDraft("");
      onCommentAdded();
    }
    setPosting(false);
  }

  function replyTo(author: Author) {
    setDraft(`@${author.handle} `);
  }

  return (
    <div style={{ marginTop: "0.6rem", paddingLeft: "3rem" }}>
      {loading && <p style={{ color: "var(--ink-soft)" }}>Loading replies...</p>}
      {comments.map((c) => (
        <div key={c.id} style={{ display: "flex", gap: "0.5rem", margin: "0.5rem 0" }}>
          <Avatar name={c.author.displayName} avatarUrl={c.author.avatarUrl} size="sm" />
          <div>
            <span style={{ fontSize: "0.92rem" }}>
              <strong>{c.author.displayName}</strong> <span className="eyebrow">@{c.author.handle}</span> — {c.body}
            </span>
            <br />
            <button
              onClick={() => replyTo(c.author)}
              className="tw-action-btn"
              style={{ marginTop: "0.15rem" }}
            >
              Reply
            </button>
          </div>
        </div>
      ))}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <MentionInput value={draft} onChange={setDraft} placeholder="Post your reply" style={{}} />
        <button type="submit" className="primary" disabled={posting || !draft.trim()}>
          Reply
        </button>
      </form>
    </div>
  );
}

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());

  async function loadFeed() {
    const res = await fetch("/api/posts");
    if (res.ok) setPosts((await res.json()).posts);
  }
  async function loadUsers() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers((await res.json()).users);
  }

  useEffect(() => {
    Promise.all([loadFeed(), loadUsers()]).finally(() => setLoading(false));
  }, []);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setPosting(true);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });
    if (res.ok) {
      const newPost = await res.json();
      setPosts((prev) => [newPost, ...prev]);
      setDraft("");
    }
    setPosting(false);
  }

  async function toggleLike(postId: string) {
    const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    if (res.ok) {
      const { liked } = await res.json();
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, likedByMe: liked, likeCount: p.likeCount + (liked ? 1 : -1) } : p
        )
      );
    }
  }

  async function toggleFollow(userId: string) {
    const res = await fetch("/api/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      const { following } = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isFollowing: following } : u)));
      loadFeed();
    }
  }

  function toggleComments(postId: string) {
    setOpenComments((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  }

  function bumpCommentCount(postId: string) {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)));
  }

  if (loading) return <p style={{ color: "var(--ink-soft)" }}>Loading feed...</p>;

  return (
    <div style={{ display: "flex", gap: "2rem", justifyContent: "center" }}>
      <div className="tw-feed">
        <form onSubmit={handlePost} className="tw-composer">
          <Avatar name="You" avatarUrl={null} />
          <div style={{ flex: 1 }}>
            <MentionInput
              value={draft}
              onChange={setDraft}
              placeholder="What's on your page today?"
              multiline
              rows={2}
              maxLength={2000}
            />
            <div style={{ textAlign: "right", marginTop: "0.5rem" }}>
              <button type="submit" className="primary" disabled={posting || !draft.trim()} style={{ borderRadius: 999 }}>
                {posting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </form>

        {posts.length === 0 && (
          <p style={{ color: "var(--ink-soft)", padding: "1rem" }}>
            No posts yet. Follow some writers, or share your own update above.
          </p>
        )}

        {posts.map((post) => (
          <div key={post.id} className="tw-post">
            <Avatar name={post.author.displayName} avatarUrl={post.author.avatarUrl} />
            <div className="tw-post-body">
              <div className="tw-post-header">
                <strong>{post.author.displayName}</strong>
                <span className="eyebrow">@{post.author.handle}</span>
                <span className="eyebrow">· {timeAgo(post.createdAt)}</span>
              </div>
              <p style={{ margin: "0.15rem 0 0" }}>{post.body}</p>
              <div className="tw-post-actions">
                <button onClick={() => toggleComments(post.id)} className="tw-action-btn">
                  💬 {post.commentCount || ""}
                </button>
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`tw-action-btn ${post.likedByMe ? "liked" : ""}`}
                >
                  {post.likedByMe ? "♥" : "♡"} {post.likeCount || ""}
                </button>
              </div>
              {openComments.has(post.id) && (
                <CommentsSection postId={post.id} onCommentAdded={() => bumpCommentCount(post.id)} />
              )}
            </div>
          </div>
        ))}
      </div>

      <aside style={{ width: 240, flexShrink: 0 }} className="card">
        <div style={{ padding: "1rem" }}>
          <h3 className="eyebrow">Discover writers</h3>
          {users.length === 0 && <p style={{ color: "var(--ink-soft)" }}>No other writers have signed up yet.</p>}
          {users.map((u) => (
            <div key={u.id} style={{ marginBottom: "0.8rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <Avatar name={u.displayName} avatarUrl={u.avatarUrl} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.9rem" }}>{u.displayName}</div>
                <button onClick={() => toggleFollow(u.id)} style={{ marginTop: "0.2rem", borderRadius: 999 }}>
                  {u.isFollowing ? "Unfollow" : "Follow"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
