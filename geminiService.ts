import OpenAI from "openai";
import { AppState } from "./types";
import { supabase } from "./src/lib/supabase";

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

  // Ferramentas de Auditoria e Análise (Snapshots Completos dos Módulos)
  const tools: any[] = [
    {
      type: "function",
      function: {
        name: "get_cash_fund_audit",
        description: "Obtém um relatório completo do Fundo de Caixa: saldos globais, totais por gerente e lista de todas as categorias e responsáveis ativos.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "get_fleet_audit",
        description: "Obtém um relatório completo da Frota: quilometragem total, consumo de combustível, custos de abastecimento e lista de veículos com suas médias de consumo.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "get_keg_inventory_audit",
        description: "Obtém um inventário completo de Barris: litros comprados, vendidos, perdidos, estoque atual e estatísticas detalhadas por marca (2M, Laurentina, etc).",
        parameters: { type: "object", properties: {} }
      }
    }
  ];

  try {
    const systemPrompt = `Você é o **Auditor Chefe Volare**, uma IA de alta precisão conectada ao Supabase do Restaurante/Estadão.
    Sua função é analisar os dados dos 3 módulos (Caixa, Frota, Barris) e fornecer respostas irrefutáveis.

    DIRETRIZES CRÍTICAS:
    1. **Sempre use as ferramentas**: Para QUALQUER pergunta sobre o negócio, chame a ferramenta de auditoria correspondente.
    2. **Fatos, não suposições**: Use apenas os números retornados. Se o dado não existir, diga "Não há registos no sistema".
    3. **Respostas Estruturadas**: 
       - Resposta principal no **primeiro parágrafo**.
       - Use **MTn** em negrito para valores monetários.
       - Use tabelas ou listas se houver múltiplos itens (ex: litros por marca).
    
    DISPONIBILIDADE: Você responde sobre dinheiro (Caixa), veículos (Frota) e cerveja (Barris).`;

    // Primeira chamada
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      tools: tools,
      tool_choice: "auto"
    });

    const toolCalls = response.choices[0].message.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      const messages: any[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
        response.choices[0].message
      ];

      for (const toolCall of toolCalls) {
        const tc = toolCall as any;
        let result = {};

        // AUDITORIA DE CAIXA
        if (tc.function.name === "get_cash_fund_audit") {
          const txs = currentState.cashTransactions;
          const managers = Array.from(new Set(txs.map(t => t.manager)));
          const managerStats = managers.map(m => {
            const data = txs.filter(t => t.manager === m);
            const tin = data.filter(t => t.type === 'entrada').reduce((acc, curr) => acc + Number(curr.amount), 0);
            const tout = data.filter(t => t.type === 'saida').reduce((acc, curr) => acc + Number(curr.amount), 0);
            return { gerente: m, entradas: tin, saidas: tout, saldo: tin - tout };
          });
          const totalIn = txs.filter(t => t.type === 'entrada').reduce((acc, curr) => acc + Number(curr.amount), 0);
          const totalOut = txs.filter(t => t.type === 'saida').reduce((acc, curr) => acc + Number(curr.amount), 0);
          result = { saldo_global: totalIn - totalOut, total_entradas: totalIn, total_saidas: totalOut, performance_por_gerente: managerStats };
        }

        // AUDITORIA de FROTA
        else if (tc.function.name === "get_fleet_audit") {
          const recs = currentState.mileageRecords;
          const vehicles = Array.from(new Set(recs.map(r => r.vehicle)));
          const vehicleStats = vehicles.map(v => {
            const data = recs.filter(r => r.vehicle === v);
            const km = data.reduce((acc, curr) => acc + (curr.kmFinal - curr.kmInitial), 0);
            const liters = data.reduce((acc, curr) => acc + Number(curr.liters), 0);
            const cost = data.reduce((acc, curr) => acc + Number(curr.cost), 0);
            return { veiculo: v, km_percorridos: km, litros: liters, custo_mtn: cost, media_kml: km / (liters || 1) };
          });
          result = { total_km_frota: recs.reduce((acc, curr) => acc + (curr.kmFinal - curr.kmInitial), 0), custo_total_mtn: recs.reduce((acc, curr) => acc + Number(curr.cost), 0), estatisticas_por_veiculo: vehicleStats };
        }

        // AUDITORIA de BARRIS
        else if (tc.function.name === "get_keg_inventory_audit") {
          const kegs = currentState.kegs;
          const movements = currentState.kegMovements;
          const brands = Array.from(new Set(kegs.map(k => k.brand)));
          const summaryByBrand = brands.map(b => {
            const brandKegs = kegs.filter(k => k.brand === b);
            const brandMovements = movements.filter(m => {
              const keg = kegs.find(k => k.id === m.kegId);
              return keg?.brand === b;
            });
            return {
              marca: b,
              litros_comprados: brandKegs.reduce((acc, curr) => acc + Number(curr.capacity), 0),
              litros_vendidos: brandMovements.filter(m => m.type === 'Venda').reduce((acc, curr) => acc + Number(curr.liters), 0),
              litros_perdidos: brandMovements.filter(m => m.type === 'Perda').reduce((acc, curr) => acc + Number(curr.liters), 0),
              barris_ativos: brandKegs.filter(k => k.status === 'Ativo').length
            };
          });
          result = { resumo_por_marca: summaryByBrand, total_barris: kegs.length, barris_ativos_total: kegs.filter(k => k.status === 'Ativo').length };
        }

        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result)
        });
      }

      // Segunda chamada para gerar a resposta final com os dados precisos
      const finalResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages
      });

      return finalResponse.choices[0].message.content;
    }

    return response.choices[0].message.content;

  } catch (error) {
    console.error("OpenAI Error:", error);
    return "Ocorreu um erro no processamento. Por favor, tente novamente.";
  }
}
