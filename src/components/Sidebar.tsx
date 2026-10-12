import type { Conversation } from '@/types/chat';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
}: SidebarProps) {
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
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            aria-current={conversation.id === activeId ? 'true' : undefined}
            className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm ${
              conversation.id === activeId
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:bg-neutral-900'
            }`}
          >
            {conversation.title}
          </button>
        ))}
      </nav>
    </aside>
  );
}
