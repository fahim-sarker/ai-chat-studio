'use client';

import { useState, useSyncExternalStore } from 'react';
import type { Message } from '@/types/chat';
import {
  INITIAL_CONVERSATION,
  NEW_CHAT_TITLE,
  createConversation,
  getServerSnapshot,
  getSnapshot,
  subscribe,
  updateConversations,
} from '@/lib/conversation-store';
import Sidebar from './Sidebar';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

function createMessage(role: Message['role'], content: string): Message {
  return { id: crypto.randomUUID(), role, content };
}

export default function ChatWindow() {
  const conversations = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [activeId, setActiveId] = useState<string>(INITIAL_CONVERSATION.id);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];
  const isLoading = loadingId === active.id;
  const lastMessage = active.messages[active.messages.length - 1];
  const showThinking = isLoading && lastMessage?.role === 'user';

  function addMessage(conversationId: string, message: Message) {
    updateConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, messages: [...c.messages, message] } : c,
      ),
    );
  }

  function updateMessage(conversationId: string, messageId: string, content: string) {
    updateConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: c.messages.map((m) => (m.id === messageId ? { ...m, content } : m)),
            }
          : c,
      ),
    );
  }

  function handleNewChat() {
    const conversation = createConversation();
    updateConversations((prev) => [conversation, ...prev]);
    setActiveId(conversation.id);
  }

  function handleRename(id: string, title: string) {
    updateConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }

  function handleDelete(id: string) {
    const target = conversations.find((c) => c.id === id);
    if (!window.confirm(`Delete "${target?.title ?? 'this chat'}"?`)) return;

    updateConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      return next.length > 0 ? next : [createConversation()];
    });
  }

  async function handleSend(text: string) {
    const conversationId = active.id;
    const userMessage = createMessage('user', text);
    const history = [...active.messages, userMessage];

    addMessage(conversationId, userMessage);
    updateConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId && c.title === NEW_CHAT_TITLE
          ? { ...c, title: text.slice(0, 30) }
          : c,
      ),
    );
    setLoadingId(conversationId);

    const assistantId = crypto.randomUUID();
    let started = false;
    let reply = '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Something went wrong.');
      }
      if (!res.body) throw new Error('No response from the server.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        reply += decoder.decode(value, { stream: true });

        if (!started) {
          started = true;
          addMessage(conversationId, { id: assistantId, role: 'assistant', content: reply });
        } else {
          updateMessage(conversationId, assistantId, reply);
        }
      }

      if (!started) {
        addMessage(conversationId, createMessage('assistant', '(No response received.)'));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      if (started) {
        updateMessage(conversationId, assistantId, `${reply}\n\n⚠️ ${message}`);
      } else {
        addMessage(conversationId, createMessage('assistant', `⚠️ ${message}`));
      }
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100">
      <Sidebar
        conversations={conversations}
        activeId={active.id}
        onSelect={setActiveId}
        onNew={handleNewChat}
        onRename={handleRename}
        onDelete={handleDelete}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        <MessageList messages={active.messages} />
        {showThinking && (
          <p className="mx-auto w-full max-w-3xl px-4 pb-2 text-sm text-neutral-500">
            Thinking...
          </p>
        )}
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </main>
    </div>
  );
}
