"use client";

import { useEffect, useState } from "react";

interface Post {
  id: string;
  type: string;
  body: string | null;
  createdAt: string;
  author: { id: string; handle: string; displayName: string };
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; handle: string; displayName: string };
}

interface DiscoverUser {
  id: string;
  handle: string;
  displayName: string;
  isFollowing: boolean;
}

function CommentsSection({
  postId,
  onCommentAdded,
}: {
  postId: string;
  onCommentAdded: () => void;
}) {
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

  return (
    <div style={{ marginTop: "0.5rem", paddingLeft: "1rem", borderLeft: "2px solid #eee" }}>
      {loading && <p style={{ color: "#888" }}>Loading comments...</p>}
      {comments.map((c) => (
        <p key={c.id} style={{ margin: "0.25rem 0" }}>
          <strong>{c.author.displayName}</strong>: {c.body}
        </p>
      ))}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a comment..."
          style={{ flex: 1 }}
          maxLength={1000}
        />
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
    if (res.ok) {
      const data = await res.json();
      setPosts(data.posts);
    }
  }

  async function loadUsers() {
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
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
          p.id === postId
            ? { ...p, likedByMe: liked, likeCount: p.likeCount + (liked ? 1 : -1) }
            : p
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
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  function bumpCommentCount(postId: string) {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p))
    );
  }

  if (loading) return <p>Loading feed...</p>;

  return (
    <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
      <div style={{ flex: 2 }}>
        <form onSubmit={handlePost} style={{ marginBottom: "1.5rem" }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share an update with other writers..."
            rows={3}
            style={{ width: "100%", fontFamily: "inherit" }}
            maxLength={2000}
          />
          <button type="submit" disabled={posting || !draft.trim()}>
            {posting ? "Posting..." : "Post"}
          </button>
        </form>

        {posts.length === 0 && (
          <p style={{ color: "#666" }}>
            No posts yet. Follow some writers on the right, or post your own update above.
          </p>
        )}

        {posts.map((post) => (
          <div key={post.id} style={{ borderBottom: "1px solid #eee", padding: "0.75rem 0" }}>
            <p style={{ margin: 0 }}>
              <strong>{post.author.displayName}</strong>{" "}
              <span style={{ color: "#888" }}>@{post.author.handle}</span>
            </p>
            <p style={{ margin: "0.25rem 0" }}>{post.body}</p>
            <button onClick={() => toggleLike(post.id)}>
              {post.likedByMe ? "♥" : "♡"} {post.likeCount}
            </button>{" "}
            <button onClick={() => toggleComments(post.id)}>
              {post.commentCount} comment{post.commentCount === 1 ? "" : "s"}
            </button>
            {openComments.has(post.id) && (
              <CommentsSection postId={post.id} onCommentAdded={() => bumpCommentCount(post.id)} />
            )}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, borderLeft: "1px solid #eee", paddingLeft: "1rem" }}>
        <h3>Discover writers</h3>
        {users.length === 0 && <p style={{ color: "#666" }}>No other writers have signed up yet.</p>}
        {users.map((u) => (
          <div key={u.id} style={{ marginBottom: "0.5rem" }}>
            <span>{u.displayName}</span>{" "}
            <button onClick={() => toggleFollow(u.id)}>
              {u.isFollowing ? "Unfollow" : "Follow"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
