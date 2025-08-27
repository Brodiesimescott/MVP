import { GoogleGenAI } from "@google/genai";

// Use the Google API key for Gemma 3 API
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  response: string;
  error?: string;
}

export async function generateAIResponse(messages: ChatMessage[]): Promise<ChatResponse> {
  try {
    // Convert messages to Gemma 3 format
    const prompt = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n') + '\nassistant:';

    const response = await ai.models.generateContent({
      model: "gemma-3-27b-it",
      contents: prompt,
    });

    const aiResponse = response.text || "I'm sorry, I couldn't generate a response.";

    return {
      response: aiResponse.trim()
    };
  } catch (error) {
    console.error("AI Service Error:", error);
    return {
      response: "I'm experiencing technical difficulties. Please try again later.",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export async function generateHealthcareResponse(userMessage: string): Promise<ChatResponse> {
  try {
    const systemPrompt = `You are ChironIQ Assistant, an AI helper for UK healthcare practice management. 
You help with:
- CQC compliance questions
- HR and staff management
- Practice administration
- General healthcare practice queries
- Financial management for medical practices

Keep responses professional, concise, and relevant to UK healthcare practices. 
If asked about patient-specific medical advice, politely redirect to appropriate healthcare professionals.

User question: ${userMessage}`;

    const response = await ai.models.generateContent({
      model: "gemma-3-27b-it",
      contents: systemPrompt,
    });

    const aiResponse = response.text || "I'm sorry, I couldn't generate a response.";

    return {
      response: aiResponse.trim()
    };
  } catch (error) {
    console.error("Healthcare AI Service Error:", error);
    return {
      response: "I'm experiencing technical difficulties. Please try again later.",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}