'use client';

import { useState } from 'react';
import type { Conversation, Message } from '@/types/chat';
import Sidebar from './Sidebar';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

const NEW_CHAT_TITLE = 'New chat';

const INITIAL_CONVERSATION: Conversation = {
  id: 'initial',
  title: NEW_CHAT_TITLE,
  messages: [],
};

function createConversation(): Conversation {
  return { id: crypto.randomUUID(), title: NEW_CHAT_TITLE, messages: [] };
}

export default function ChatWindow() {
  const [conversations, setConversations] = useState<Conversation[]>([
    INITIAL_CONVERSATION,
  ]);
  const [activeId, setActiveId] = useState<string>(INITIAL_CONVERSATION.id);

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];

  function addMessage(conversationId: string, message: Message) {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, messages: [...c.messages, message] } : c,
      ),
    );
  }

  function handleNewChat() {
    const conversation = createConversation();
    setConversations((prev) => [conversation, ...prev]);
    setActiveId(conversation.id);
  }

  function handleSend(text: string) {
    const conversationId = active.id;

    addMessage(conversationId, { id: crypto.randomUUID(), role: 'user', content: text });

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId && c.title === NEW_CHAT_TITLE
          ? { ...c, title: text.slice(0, 30) }
          : c,
      ),
    );

    // Placeholder reply. Real AI responses come in a later PR.
    setTimeout(() => {
      addMessage(conversationId, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'This is a placeholder reply. Real AI responses are coming soon.',
      });
    }, 600);
  }

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100">
      <Sidebar
        conversations={conversations}
        activeId={active.id}
        onSelect={setActiveId}
        onNew={handleNewChat}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        <MessageList messages={active.messages} />
        <ChatInput onSend={handleSend} />
      </main>
    </div>
  );
}
