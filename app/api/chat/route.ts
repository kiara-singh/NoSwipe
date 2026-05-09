import Groq from 'groq-sdk';
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { NextResponse } from 'next/server';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const ONBOARDING_CLOSING_MESSAGE =
  "You're all set! Add a profile photo to finish.";
const CONTACT_METHOD_PROMPT =
  "Love that. Choose your platform from the options above the text box, then type the handle or number matches should use. When you send, I'll ask three quick vibe questions—one at a time.";


const SYSTEM_INSTRUCTION = `
You are the NoSwipe Match Agent. Your goal is to interview the user to extract their dating "intent" and "vibe."
The first turn is the user's name. The second turn is collected in the UI as platform + handle (you will see it as text in the transcript).
After that, ask exactly three short, revealing intent/vibe questions—one per reply. Each question should surface something new; don't repeat themes across the three.
The app handles a separate photo step after those three—never ask for photos.
Do not ask for boring stats like height or job. Ask clever, revealing questions.
Ask only ONE question at a time. Keep your tone modern, slightly witty, and highly empathetic.
`;


const CHAT_MODEL = 'llama-3.1-8b-instant';

function toGroqRole(role: string): 'assistant' | 'user' {
  return role === 'model' ? 'assistant' : 'user';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, onboardingTurn } = body as {
      messages: unknown;
      onboardingTurn?: number;
    };

    if (onboardingTurn === 1) {
      if (!Array.isArray(messages) || messages.length === 0) {
        return NextResponse.json(
          { error: 'Missing or invalid messages.' },
          { status: 400 },
        );
      }
      return NextResponse.json({ message: CONTACT_METHOD_PROMPT });
    }

    if (onboardingTurn === 5) {
      if (!Array.isArray(messages) || messages.length === 0) {
        return NextResponse.json(
          { error: 'Missing or invalid messages.' },
          { status: 400 },
        );
      }
      return NextResponse.json({ message: ONBOARDING_CLOSING_MESSAGE });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid messages.' },
        { status: 400 },
      );
    }

    const rawMsgs = messages as { role: string; content: string }[];

    let history = rawMsgs
      .slice(0, -1)
      .map((msg) => ({
        role: toGroqRole(msg.role),
        content: msg.content,
      }));

    if (history.length > 0 && history[0].role === 'assistant') {
      history = history.slice(1);
    }

    const latest = rawMsgs[rawMsgs.length - 1];
    const groqMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_INSTRUCTION.trim() },
      ...history,
      { role: 'user', content: latest.content },
    ];

    const completion = await groq.chat.completions.create({
      model: CHAT_MODEL,
      messages: groqMessages,
    });

    const responseText =
      completion.choices[0]?.message?.content?.trim() ?? '';

    if (!responseText) {
      return NextResponse.json(
        { error: 'Empty model response.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ message: responseText });
  } catch (error) {
    console.error('AI Error:', error);
    return NextResponse.json(
      { error: 'Failed to process intent.' },
      { status: 500 },
    );
  }
}
