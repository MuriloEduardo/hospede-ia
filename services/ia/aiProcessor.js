import { Graph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';

// 1. Cria o modelo da OpenAI
const model = new ChatOpenAI({
    model: 'gpt-4o',
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY, // Ou coloque direto aqui (não recomendado)
});

// 2. Define um "nó" (node) para chamar o modelo
async function askOpenAI({ input }) {
    const response = await model.invoke(input);
    return { output: response };
}

// 3. Monta o grafo
const graph = new Graph()
    .addNode('openai', askOpenAI) // Nome do nó é 'openai'
    .addEdge('openai', 'end')     // Depois de rodar, vai para o fim

// 4. Compila o grafo
const runnable = graph.compile();

/**
 * Processes a message using LangGraph and OpenAI.
 * @param {Object} message - The input message to process.
 * @returns {Object} - The processed message with a generated response.
 */
export const processMessage = async (message) => {
    if (!message) {
        throw new Error("Message cannot be null or undefined.");
    }

    const result = await runnable.invoke({ input: message?.text?.body });
    console.log(result.output); // Deve imprimir "Brasília"

    return {
        ...message,
        response,
        timestamp: new Date().toISOString(),
    };
};