
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from '../types';

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async getChatResponse(history: ChatMessage[], currentMessage: string): Promise<string> {
    const chat = this.ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: `You are an expert consultant from the Korea Management Quality Institute (KMQI). 
        You specialize in industrial engineering, Design of Experiments (DOE), Six Sigma, and statistical quality control.
        Users are using a Catapult Simulator to learn about DOE. 
        Help them understand how different factors (angle, tension, mass, etc.) affect the landing distance (Y).
        Explain concepts like variance, replication, randomization, and cost-efficiency in experiments.
        Respond in Korean in a professional and educational tone.`,
      },
    });

    // We send current history but convert to Gemini's format if needed
    // For simplicity with this specific SDK:
    const response = await chat.sendMessage({ message: currentMessage });
    return response.text || "죄송합니다. 답변을 생성하는 중에 오류가 발생했습니다.";
  }
}
