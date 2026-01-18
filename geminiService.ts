import OpenAI from "openai";
import { AppState } from "./types";

// The API key is provided by the user
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

let openai: OpenAI | null = null;

if (OPENAI_API_KEY) {
  try {
    openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
      dangerouslyAllowBrowser: true // Required for client-side usage in Vite/React
    });
  } catch (error) {
    console.error("Failed to initialize OpenAI:", error);
  }
}

export async function chatWithAI(userMessage: string, currentState: AppState, userName: string = 'Carlos Silva') {
  if (!openai) {
    return "O assistente não está configurado. Verifique a chave de API da OpenAI.";
  }

  try {
    const systemPrompt = `Você é o assistente virtual do sistema Volare. 
    Você tem acesso aos dados atuais do sistema em formato JSON abaixo.
    Sua função é ajudar o gestor (${userName}) a entender a operação.
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
    - Use formatação Markdown para tabelas e listas.
    - SEMPRE use a moeda "MTn" (Metical Moçambicano) para valores monetários.
    - Formate números monetários com separadores de milhar (ex: 1.000,00 MTn).
    - NÃO use notação matemática LaTeX (como \[ \], \text{}). Escreva cálculos como texto simples (ex: 10 + 20 = 30).`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
    });

    return response.choices[0].message.content || "Não consegui gerar uma resposta.";

  } catch (error) {
    console.error("OpenAI Error:", error);
    return "Desculpe, ocorreu um erro ao comunicar com a inteligência artificial. Verifique se a chave API é válida e se tem créditos.";
  }
}
