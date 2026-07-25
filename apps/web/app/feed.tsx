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

  // Reply-as-mention: clicking Reply on a comment prefills the draft with
  // that person's @handle, so replying automatically tags who it's for.
  function replyTo(author: Author) {
    setDraft(`@${author.handle} `);
  }

  return (
    <div style={{ marginTop: "0.6rem", paddingLeft: "0.9rem", borderLeft: "2px solid var(--rule)" }}>
      {loading && <p style={{ color: "var(--ink-soft)" }}>Loading comments...</p>}
      {comments.map((c) => (
        <div key={c.id} style={{ display: "flex", gap: "0.5rem", margin: "0.4rem 0" }}>
          <Avatar name={c.author.displayName} avatarUrl={c.author.avatarUrl} size="sm" />
          <div>
            <span style={{ fontSize: "0.92rem" }}>
              <strong>{c.author.displayName}</strong> <span className="eyebrow">@{c.author.handle}</span> — {c.body}
            </span>
            <br />
            <button
              onClick={() => replyTo(c.author)}
              className="eyebrow"
              style={{ border: "none", background: "none", padding: 0 }}
            >
              Reply
            </button>
          </div>
        </div>
      ))}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <MentionInput value={draft} onChange={setDraft} placeholder="Write a comment... (@ to mention)" style={{}} />
        <button type="submit" disabled={posting || !draft.trim()}>
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
    <div className="with-margin-rail">
      <div>
        <form onSubmit={handlePost} className="card" style={{ padding: "1rem", marginBottom: "1.75rem" }}>
          <MentionInput
            value={draft}
            onChange={setDraft}
            placeholder="Share an update with other writers... (@ to mention)"
            multiline
            rows={3}
            maxLength={2000}
          />
          <div style={{ textAlign: "right", marginTop: "0.5rem" }}>
            <button type="submit" className="primary" disabled={posting || !draft.trim()}>
              {posting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>

        {posts.length === 0 && (
          <p style={{ color: "var(--ink-soft)" }}>
            No posts yet. Follow some writers on the right, or post your own update above.
          </p>
        )}

        {posts.map((post) => (
          <div key={post.id} style={{ borderBottom: "1px solid var(--rule)", padding: "1rem 0" }}>
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <Avatar name={post.author.displayName} avatarUrl={post.author.avatarUrl} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0 }}>
                  <strong>{post.author.displayName}</strong>{" "}
                  <span className="eyebrow">@{post.author.handle}</span>
                </p>
                <p style={{ margin: "0.35rem 0" }}>{post.body}</p>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    onClick={() => toggleLike(post.id)}
                    className="margin-mark"
                    style={{ border: "none", background: "none", padding: 0 }}
                  >
                    {post.likedByMe ? "♥ liked" : "♡ like"} · {post.likeCount}
                  </button>
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="eyebrow"
                    style={{ border: "none", background: "none", padding: 0 }}
                  >
                    {post.commentCount} comment{post.commentCount === 1 ? "" : "s"}
                  </button>
                </div>
                {openComments.has(post.id) && (
                  <CommentsSection postId={post.id} onCommentAdded={() => bumpCommentCount(post.id)} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <aside>
        <h3 className="eyebrow">Discover writers</h3>
        {users.length === 0 && <p style={{ color: "var(--ink-soft)" }}>No other writers have signed up yet.</p>}
        {users.map((u) => (
          <div key={u.id} style={{ marginBottom: "0.6rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <Avatar name={u.displayName} avatarUrl={u.avatarUrl} size="sm" />
            <div>
              <span>{u.displayName}</span>
              <br />
              <button onClick={() => toggleFollow(u.id)} style={{ marginTop: "0.2rem" }}>
                {u.isFollowing ? "Unfollow" : "Follow"}
              </button>
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}
