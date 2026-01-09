import { GoogleGenAI } from "@google/genai";
import { AppState } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function chatWithAI(userMessage: string, currentState: AppState) {
  try {
    const systemPrompt = `Você é o assistente virtual do sistema Volare. 
    Você tem acesso aos dados atuais do sistema em formato JSON abaixo.
    Sua função é ajudar o gestor (Carlos Silva) a entender a operação.
    Responda de forma clara, amigável e use os dados reais.
    
    DADOS DO SISTEMA:
    ${JSON.stringify({
      cashTransactions: currentState.cashTransactions.slice(0, 50),
      kegSales: currentState.kegSales.slice(0, 50),
      mileageRecords: currentState.mileageRecords.slice(0, 50)
    })}
    
    Regras:
    - Se perguntarem sobre saldo, some entradas e subtraia saídas do Fundo de Caixa.
    - Se perguntarem sobre barris, use a lista de kegSales.
    - Se perguntarem sobre quilometragem, use mileageRecords.
    - Use formatação Markdown para tabelas e listas.`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nPERGUNTA DO USUÁRIO: ${userMessage}` }]
      }],
    });

    return response.text;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    throw error;
  }
}
