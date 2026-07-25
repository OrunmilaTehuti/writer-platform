"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "./avatar";

interface MentionUser {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  style?: React.CSSProperties;
}

export function MentionInput({ value, onChange, placeholder, multiline, rows, maxLength, style }: Props) {
  const [options, setOptions] = useState<MentionUser[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  function handleChange(newValue: string) {
    onChange(newValue);

    const cursor = ref.current?.selectionStart ?? newValue.length;
    const beforeCursor = newValue.slice(0, cursor);
    const match = beforeCursor.match(/@(\w*)$/);

    if (match) {
      const query = match[1];
      fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
          setOptions(data.users || []);
          setShowDropdown((data.users || []).length > 0);
        });
    } else {
      setShowDropdown(false);
    }
  }

  function selectMention(user: MentionUser) {
    const cursor = ref.current?.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursor);
    const afterCursor = value.slice(cursor);
    const replaced = beforeCursor.replace(/@(\w*)$/, `@${user.handle} `);
    onChange(replaced + afterCursor);
    setShowDropdown(false);
    ref.current?.focus();
  }

  const commonProps = {
    ref: ref as any,
    value,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => handleChange(e.target.value),
    placeholder,
    maxLength,
    style: { width: "100%", fontFamily: "inherit", ...style },
  };

  return (
    <div style={{ position: "relative" }}>
      {multiline ? <textarea {...commonProps} rows={rows} /> : <input {...commonProps} />}
      {showDropdown && (
        <div className="mention-dropdown">
          {options.map((u) => (
            <div key={u.id} className="mention-option" onClick={() => selectMention(u)}>
              <Avatar name={u.displayName} avatarUrl={u.avatarUrl} size="sm" />
              <span>
                {u.displayName} <span className="eyebrow">@{u.handle}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
