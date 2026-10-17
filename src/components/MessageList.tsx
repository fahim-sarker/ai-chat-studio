'use client';

import { useEffect, useRef } from 'react';
import type { Message } from '@/types/chat';

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-neutral-500">
        <h2 className="text-2xl font-semibold text-neutral-300">AI Chat Studio</h2>
        <p>Start a conversation by typing a message below.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-neutral-100'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
