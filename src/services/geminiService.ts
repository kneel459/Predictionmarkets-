import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getMarketInsight(marketQuestion: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a crypto market analyst. Provide a short, insightful analysis (max 50 words) 
      for this prediction market question: "${marketQuestion}". Focus on factors that could influence the outcome.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "No insights available at the moment.";
  }
}
