import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

// Define the tools for the agent to use
const agentTools = [];
console.log("TESTEEEEEEEEEEEEEEEEEEEEEE", process.env.OPENAI_API_KEY)
const agentModel = new ChatOpenAI({ temperature: 0 });

// Initialize memory to persist state between graph runs
const agentCheckpointer = new MemorySaver();
const agent = createReactAgent({
    llm: agentModel,
    tools: agentTools,
    checkpointSaver: agentCheckpointer,
});

// Now it's time to use!
const agentFinalState = await agent.invoke(
    { messages: [new HumanMessage("what is the current weather in sf")] },
    { configurable: { thread_id: "42" } },
);

/**
 * Processes a message using LangGraph and OpenAI.
 * @param {Object} message - The input message to process.
 * @returns {Object} - The processed message with a generated response.
 */
export const processMessage = async (message) => {
    if (!message) {
        throw new Error("Message cannot be null or undefined.");
    }

    const agentNextState = await agent.invoke(
        { messages: [new HumanMessage(message.text.body)] },
        { configurable: { thread_id: message.from } },
    );

    console.log("Agent Next State:");
    console.log(
        agentNextState.messages[agentNextState.messages.length - 1].content,
    );

    return {
        ...message,
        response,
        timestamp: new Date().toISOString(),
    };
};