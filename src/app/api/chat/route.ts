import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.8-flash';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL;
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUSES = new Set([429, 500, 503, 504]);
const MAX_MESSAGES = 50;
const MAX_CHARS = 8000;

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

function isValidMessages(value: unknown): value is IncomingMessage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_MESSAGES &&
    value.every(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.length > 0 &&
        m.content.length <= MAX_CHARS,
    )
  );
}

function getStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: unknown }).status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateWithRetry(ai: GoogleGenAI, contents: GeminiContent[]) {
  const models = [MODEL, FALLBACK_MODEL].filter((m): m is string => Boolean(m));
  let lastError: unknown;

  for (const model of models) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        return await ai.models.generateContent({ model, contents });
      } catch (error) {
        lastError = error;
        const status = getStatus(error);
        if (!status || !RETRYABLE_STATUSES.has(status)) throw error;
        console.warn(`Gemini ${model} failed (${status}), attempt ${attempt + 1}`);
        await sleep(1000 * 2 ** attempt); // 1s, 2s, 4s
      }
    }
  }
  throw lastError;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Server is missing GEMINI_API_KEY.' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const messages = (body as { messages?: unknown })?.messages;
  if (!isValidMessages(messages)) {
    return NextResponse.json({ error: 'Invalid messages.' }, { status: 400 });
  }

  const contents: GeminiContent[] = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await generateWithRetry(ai, contents);
    return NextResponse.json({ reply: response.text ?? '' });
  } catch (error) {
    console.error('Gemini request failed:', error);

    const status = getStatus(error);
    if (status === 429 || status === 503) {
      return NextResponse.json(
        { error: 'The AI is busy right now. Please try again in a moment.' },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: 'The AI service failed. Please try again.' },
      { status: 502 },
    );
  }
}
