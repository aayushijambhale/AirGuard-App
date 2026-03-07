import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateChatResponse(message: string, history: { role: string, parts: { text: string }[] }[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: message }] }], // Simplified for direct call if needed, but chat is better
    config: {
      systemInstruction: "You are Nexus AI, a helpful personal assistant. You help users manage their knowledge, take notes, and answer questions concisely and accurately.",
    },
  });
  return response.text;
}

export async function* generateChatResponseStream(message: string, history: { role: string, parts: { text: string }[] }[]) {
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "You are Nexus AI, a helpful personal assistant. You help users manage their knowledge, take notes, and answer questions concisely and accurately.",
    },
    history: history,
  });

  const result = await chat.sendMessageStream({ message });
  for await (const chunk of result) {
    yield chunk.text;
  }
}
