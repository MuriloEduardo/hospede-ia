import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

export const processMessage = async (message) => {
    if (!message) {
        throw new Error("Message cannot be null or undefined.");
    }

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
        { messages: [new HumanMessage(message.text.body)] },
        { configurable: { thread_id: message.from } },
    );

    return {
        ...message,
        text: { body: agentNextState.messages[agentNextState.messages.length - 1].content },
        timestamp: new Date().toISOString(),
    };
};