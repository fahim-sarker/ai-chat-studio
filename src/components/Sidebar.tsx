'use client';

import { useRef, useState } from 'react';
import type { Conversation } from '@/types/chat';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const finishedRef = useRef(false);

  function startEditing(conversation: Conversation) {
    finishedRef.current = false;
    setEditingId(conversation.id);
    setDraft(conversation.title);
  }

  function finishEditing(save: boolean) {
    // Enter or Escape unmounts the input, which can also fire blur. Run only once.
    if (finishedRef.current) return;
    finishedRef.current = true;

    const title = draft.trim();
    if (save && editingId && title) onRename(editingId, title);
    setEditingId(null);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') finishEditing(true);
    if (event.key === 'Escape') finishEditing(false);
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-800 bg-neutral-950">
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full rounded-lg border border-neutral-700 px-3 py-2 text-sm font-medium hover:bg-neutral-800"
        >
          + New chat
        </button>
      </div>

      <nav
        className="flex-1 space-y-1 overflow-y-auto px-3 pb-3"
        aria-label="Conversations"
      >
        {conversations.map((conversation) => {
          const isActive = conversation.id === activeId;

          return (
            <div
              key={conversation.id}
              className={`group flex items-center rounded-lg ${
                isActive ? 'bg-neutral-800' : 'hover:bg-neutral-900'
              }`}
            >
              {editingId === conversation.id ? (
                <input
                  autoFocus
                  value={draft}
                  maxLength={60}
                  aria-label="Chat title"
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => finishEditing(true)}
                  onFocus={(event) => event.currentTarget.select()}
                  className="mx-1 my-1 w-full rounded border border-blue-500 bg-neutral-900 px-2 py-1 text-sm outline-none"
                />
              ) : (
                <>
                  <button
                    onClick={() => onSelect(conversation.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`min-w-0 flex-1 truncate px-3 py-2 text-left text-sm ${
                      isActive ? 'text-white' : 'text-neutral-400'
                    }`}
                  >
                    {conversation.title}
                  </button>
                  <div className="flex shrink-0 pr-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      onClick={() => startEditing(conversation)}
                      aria-label={`Rename ${conversation.title}`}
                      className="rounded px-1.5 py-1 text-xs text-neutral-400 hover:bg-neutral-700 hover:text-white"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => onDelete(conversation.id)}
                      aria-label={`Delete ${conversation.title}`}
                      className="rounded px-1.5 py-1 text-xs text-neutral-400 hover:bg-neutral-700 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
