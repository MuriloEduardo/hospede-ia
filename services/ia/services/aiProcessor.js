import pg from "pg";
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
} from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { PostgresChatMessageHistory } from "@langchain/community/stores/message/postgres";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { OpenAIEmbeddings } from "@langchain/openai";

export const processMessage = async (message) => {
    const prompt = ChatPromptTemplate.fromMessages([
        new MessagesPlaceholder("chat_history"),
        ["system", "Use the following documents to help answer: {similar_documents}"],
        ["human", "{input}"],
    ]);

    const pool = new pg.Pool({
        host: "localhost",
        port: 5432,
        user: "postgres",
        password: "postgres",
        database: "postgres",
    });

    const embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-small",
    });

    const vectorStoreConfig = {
        postgresConnectionOptions: {
            type: "postgres",
            host: "localhost",
            port: 5432,
            user: "postgres",
            password: "postgres",
            database: "postgres",
        },
        tableName: "embeddings",
        columns: {
            idColumnName: "id",
            vectorColumnName: "vector",
            contentColumnName: "content",
            metadataColumnName: "metadata",
        },
        distanceStrategy: "cosine",
    };

    const vectorStore = await PGVectorStore.initialize(embeddings, vectorStoreConfig);

    // Perform similarity search
    const query = message.text.body;
    const similarDocuments = await vectorStore.similaritySearch(query, 3); // Retrieve top 3 similar documents
    const similarDocsText = similarDocuments.map((doc) => doc.pageContent).join("\n\n");

    console.log("Similar documents:", similarDocuments);

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
        { input: message.text.body, similar_documents: similarDocsText, },
        { configurable: { thread_id: message.from, sessionId: message.from } },
    );

    await pool.end();

    return {
        ...message,
        text: { body: response.content },
        timestamp: new Date().toISOString(),
    };
};