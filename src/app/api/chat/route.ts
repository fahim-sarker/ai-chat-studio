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

type Chunk = { text?: string };

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

/**
 * Opens the stream and waits for the first chunk. Retrying is only safe
 * before any text has been sent to the client, so retries happen here.
 */
async function openStream(ai: GoogleGenAI, contents: GeminiContent[]) {
  const models = [MODEL, FALLBACK_MODEL].filter((m): m is string => Boolean(m));
  let lastError: unknown;

  for (const model of models) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const stream = await ai.models.generateContentStream({ model, contents });
        const iterator = stream[Symbol.asyncIterator]();
        const first = await iterator.next();
        return { iterator, first };
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
    const { iterator, first } = await openStream(ai, contents);
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          let result = first;
          while (!result.done) {
            const text = (result.value as Chunk).text;
            if (text) controller.enqueue(encoder.encode(text));
            result = await iterator.next();
          }
          controller.close();
        } catch (error) {
          console.error('Gemini stream interrupted:', error);
          controller.error(error);
        }
      },
      async cancel() {
        await iterator.return?.(undefined);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
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
