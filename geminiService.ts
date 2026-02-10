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

  // Ferramentas de Auditoria e Análise
  const tools: any[] = [
    {
      type: "function",
      function: {
        name: "get_cash_fund_audit",
        description: "Consulta o módulo Fundo de Caixa: saldos, entradas, saídas, transferências entre gerentes e categorias de despesas.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "get_fleet_audit",
        description: "Consulta o módulo de Quilometragem e Frota: consumo de combustível, quilometragem percorrida, custo por viatura e médias de gasto.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "get_keg_inventory_audit",
        description: "Consulta o módulo de Venda de Barris: estoque, compras, vendas, perdas por marca e estatísticas mensais.",
        parameters: { type: "object", properties: {} }
      }
    }
  ];

  try {
    const systemPrompt = `Tu és o **VOLARE ASSISTENTE**, o Analista Digital Oficial do sistema Volare – Gestão & Operação.

Tua função é analisar as perguntas dos utilizadores sobre os três módulos principais:
1. **Fundo de Caixa** (saldo, entradas/saídas, gerentes, dinheiro, transferência)
2. **Quilometragem** (viaturas, moto, combustível, quilómetros, consumo, médias, gasto)
3. **Venda de Barris** (vendas, perdas, estoque, marca, mês, quantidade)

⚠️ REGRAS GERAIS (OBRIGATÓRIAS):
- Nunca inventes dados. Nunca faças suposições.
- Responde APENAS com base nos dados reais do sistema.
- Identifica o módulo correcto automaticamente baseado na pergunta.
- **PROIBIDO O USO DE TABELAS**: O sistema é visualizado maioritariamente em telemóveis. Apresenta os dados em **listas estruturadas**, **tópicos (bullets)** ou **blocos de texto curtos**.
- Se a informação não existir ou estiver incompleta, informa: "Não existem registos suficientes na base de dados para responder com precisão."
- Se a pergunta for fora do contexto dos três módulos: "Essa informação não pertence aos módulos Fundo de Caixa, Quilometragem ou Venda de Barris."
- Linguagem profissional, clara e objectiva. Usa **MTn** para valores monetários.

Ao responder, segue o formato mobile-friendly:
- 📊 **Resumo curto** (identificando o módulo).
- 📍 **Dados detalhados** (use listas com emojis ou negrito para destacar valores).
- 💡 **Observação relevante** (se aplicável).`;

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

          const categories = Array.from(new Set(txs.map(t => t.category)));
          const categoryStats = categories.map(c => {
            const amount = txs.filter(t => t.category === c).reduce((acc, curr) => acc + Number(curr.amount), 0);
            return { categoria: c, total: amount };
          });

          const totalIn = txs.filter(t => t.type === 'entrada').reduce((acc, curr) => acc + Number(curr.amount), 0);
          const totalOut = txs.filter(t => t.type === 'saida').reduce((acc, curr) => acc + Number(curr.amount), 0);
          result = {
            saldo_global: totalIn - totalOut,
            total_entradas: totalIn,
            total_saidas: totalOut,
            performance_por_gerente: managerStats,
            gastos_por_categoria: categoryStats
          };
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
