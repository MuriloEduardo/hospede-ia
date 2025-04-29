import pg from "pg";
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
} from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { PostgresChatMessageHistory } from "@langchain/community/stores/message/postgres";

export const processMessage = async (message) => {
    const prompt = ChatPromptTemplate.fromMessages([
        [
            "system",
            `
                Você é o assistente da Cabana Vila dos Sonhos, um refúgio para quem deseja se conectar com a natureza. A cabana é perfeita para casais ou famílias e oferece uma experiência completa de conforto e charme.

                Detalhes da propriedade:
                - Localização: Apenas 5km da Catedral de Pedra, no centro da cidade, e 10km de Gramado.
                - Estrutura: 
                - Banheira de hidromassagem privativa para casal
                - Lareira à lenha e lareira ecológica
                - Wi-Fi, Smart-TV, ar-condicionado split
                - Cozinha completa (fogão 2 bocas, micro-ondas, geladeira, louças, cafeteira, chaleira elétrica, torradeira)
                - Deck com rede para descanso, cadeiras, mesas, churrasqueira, grelha, espetos e fogo de chão
                - Cama king com lençol térmico, roupas de cama, toalhas, roupões
                - Secador de cabelo, shampoo, condicionador, sabonete líquido e lenços umedecidos
                - Área externa cercada e Petfriendly
                - Extras: Cestas de café da manhã e surpresas personalizadas (serviço contratado à parte).
                - Acesso: Lagos, trilhas e espaços compartilhados de redes e balanços pela propriedade.

                Tons e orientações para o atendimento:
                - Sempre seja acolhedor, educado e atencioso.
                - Destaque os diferenciais da cabana conforme o interesse do hóspede.
                - Ofereça informações sobre a localização privilegiada e proximidade com pontos turísticos.
                - Se o hóspede mencionar pets, reforce que somos Petfriendly.
                - Sempre mencione que será um prazer recebê-los.
                - Se perguntarem sobre café da manhã ou surpresas, informe que são contratados à parte.
            `,
        ],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
    ]);

    const pool = new pg.Pool({
        host: "postgres",
        port: 5432,
        user: "postgres",
        password: "postgres",
        database: "postgres",
    });

    const chainWithHistory = new RunnableWithMessageHistory({
        runnable: prompt.pipe(new ChatOpenAI({ temperature: 0 })),
        inputMessagesKey: "input",
        historyMessagesKey: "chat_history",
        getMessageHistory: async (sessionId) => {
            const chatHistory = new PostgresChatMessageHistory({
                sessionId,
                pool,
            });
            return chatHistory;
        },
    });

    const response = await chainWithHistory.invoke(
        { input: message.text.body },
        { configurable: { thread_id: message.from, sessionId: message.from } },
    );

    await pool.end();

    return {
        ...message,
        text: { body: response.content },
        timestamp: new Date().toISOString(),
    };
};