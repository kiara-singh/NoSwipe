import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize the SDK. This runs strictly on the server.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// The "System Prompt" that gives your NoSwipe Agent its personality and goal
const SYSTEM_INSTRUCTION = `
You are the NoSwipe Match Agent. Your goal is to interview the user to extract their dating "intent" and "vibe."
Do not ask for boring stats like height or job. Ask clever, revealing questions.
Ask only ONE question at a time. Keep your tone modern, slightly witty, and highly empathetic.
For the very first message, always start by welcoming them to NoSwipe and asking: "What does an ideal Sunday look like for you?"
`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body; // Expecting an array of previous messages for context

    // Use the fast and free Flash model
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: SYSTEM_INSTRUCTION,
    });

    // Format the conversation history for the AI
    const formattedHistory = messages.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // Start the chat and send the latest user message
    const chat = model.startChat({ history: formattedHistory.slice(0, -1) });
    const latestMessage = messages[messages.length - 1].content;
    
    const result = await chat.sendMessage(latestMessage);
    const responseText = result.response.text();

    return NextResponse.json({ message: responseText });

  } catch (error) {
    console.error('AI Error:', error);
    return NextResponse.json(
      { error: 'Failed to process intent.' },
      { status: 500 }
    );
  }
}
