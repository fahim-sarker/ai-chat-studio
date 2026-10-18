import type { Conversation } from '@/types/chat';

const STORAGE_KEY = 'ai-chat-studio:conversations:v1';

export const NEW_CHAT_TITLE = 'New chat';

export const INITIAL_CONVERSATION: Conversation = {
  id: 'initial',
  title: NEW_CHAT_TITLE,
  messages: [],
};

// Stable reference: useSyncExternalStore needs the same value for the same state.
const DEFAULT_STATE: Conversation[] = [INITIAL_CONVERSATION];

let cache: Conversation[] | null = null;
const listeners = new Set<() => void>();

export function createConversation(): Conversation {
  return { id: crypto.randomUUID(), title: NEW_CHAT_TITLE, messages: [] };
}

function isConversation(value: unknown): value is Conversation {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    typeof c.title === 'string' &&
    Array.isArray(c.messages) &&
    c.messages.every(
      (m) =>
        typeof m === 'object' &&
        m !== null &&
        typeof m.id === 'string' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string',
    )
  );
}

function read(): Conversation[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isConversation)) {
      return parsed;
    }
  } catch {
    // Corrupted or unavailable storage: fall back to the default state.
  }
  return DEFAULT_STATE;
}

function write(conversations: Conversation[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    // Storage can be full or blocked (private mode). The app keeps working in memory.
  }
}

export function getSnapshot(): Conversation[] {
  if (cache === null) cache = read();
  return cache;
}

export function getServerSnapshot(): Conversation[] {
  return DEFAULT_STATE;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // Keep several open tabs in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cache = read();
    listener();
  };
  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function updateConversations(updater: (prev: Conversation[]) => Conversation[]) {
  cache = updater(getSnapshot());
  write(cache);
  listeners.forEach((listener) => listener());
}
