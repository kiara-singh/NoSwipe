import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize the SDK. This runs strictly on the server.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const ONBOARDING_CLOSING_MESSAGE =
  "You're all set! Add a profile photo to finish.";
const CONTACT_METHOD_PROMPT =
  "Love that. Choose your platform from the options above the text box, then type the handle or number matches should use. When you send, I'll ask three quick vibe questions—one at a time.";

// The "System Prompt" that gives your NoSwipe Agent its personality and goal
const SYSTEM_INSTRUCTION = `
You are the NoSwipe Match Agent. Your goal is to interview the user to extract their dating "intent" and "vibe."
The first turn is the user's name. The second turn is collected in the UI as platform + handle (you will see it as text in the transcript).
After that, ask exactly three short, revealing intent/vibe questions—one per reply. Each question should surface something new; don't repeat themes across the three.
The app handles a separate photo step after those three—never ask for photos.
Do not ask for boring stats like height or job. Ask clever, revealing questions.
Ask only ONE question at a time. Keep your tone modern, slightly witty, and highly empathetic.
`;
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

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // Format the conversation history for the AI
    let formattedHistory = (messages as { role: string; content: string }[]).map(
      (msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }),
    );

    // Remove the very last message (because that is the one we are submitting right now)
    formattedHistory = formattedHistory.slice(0, -1);

    // Gemini SDK requires history to start with a 'user' turn (see validateChatHistory).
    if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
      formattedHistory.shift();
    }

    const chat = model.startChat({ history: formattedHistory });
    const latestMessage = (messages as { content: string }[])[
      messages.length - 1
    ].content;

    const result = await chat.sendMessage(latestMessage);
    const responseText = result.response.text();

    return NextResponse.json({ message: responseText });
  } catch (error) {
    console.error('AI Error:', error);
    return NextResponse.json(
      { error: 'Failed to process intent.' },
      { status: 500 },
    );
  }
}
