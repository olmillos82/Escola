import { GoogleGenAI, Type } from "@google/genai";
import { Question, Subject } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateQuestions(subject: string, customTopic?: string): Promise<Question[]> {
  const topic = subject === 'personalitzat' ? customTopic : subject;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Genera 15 preguntes per a un joc de "Qui vol ser milionari" per a xiquets de 6é de primària (11-12 anys).
    L'assignatura o tema és: ${topic}.
    Les preguntes han d'anar de menor a major dificultat.
    
    Cada pregunta ha de tindre 4 opcions de resposta, on només una és la correcta.
    
    IMPORTANT: Respon EXCLUSIVAMENT en format JSON amb aquesta estructura:
    Array<{
      id: number,
      enunciado: string,
      respuesta: string,
      opciones: string[],
      pasos: string,
      categoria: string
    }>
    
    L'idioma ha de ser el VALENCIÀ.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            enunciado: { type: Type.STRING },
            respuesta: { type: Type.STRING },
            opciones: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "4 opcions de resposta, una d'elles ha de ser la correcta"
            },
            pasos: { type: Type.STRING },
            categoria: { type: Type.STRING },
          },
          required: ["id", "enunciado", "respuesta", "opciones", "pasos", "categoria"],
        },
      },
    },
  });

  try {
    const questions = JSON.parse(response.text || "[]");
    return questions;
  } catch (e) {
    console.error("Error parsejant preguntes de la IA", e);
    return [];
  }
}
