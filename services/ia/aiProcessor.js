import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export const processMessage = async (message) => {
    // Define the tools for the agent to use
    const agentTools = [];
    const agentModel = new ChatOpenAI({ temperature: 0 });

    // Initialize memory to persist state between graph runs
    const agentCheckpointer = new MemorySaver();
    const agent = createReactAgent({
        llm: agentModel,
        tools: agentTools,
        checkpointSaver: agentCheckpointer,
    });

    const agentNextState = await agent.invoke(
        {
            messages: [
                new SystemMessage(```
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
                ```),
                new HumanMessage(message.text.body)
            ]
        },
        { configurable: { thread_id: message.from } },
    );

    return {
        ...message,
        text: { body: agentNextState.messages[agentNextState.messages.length - 1].content },
        timestamp: new Date().toISOString(),
    };
};