import pg from "pg";
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
} from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { RunnableWithMessageHistory, RunnablePassthrough } from "@langchain/core/runnables";
import { PostgresChatMessageHistory } from "@langchain/community/stores/message/postgres";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { OpenAIEmbeddings } from "@langchain/openai";

export const processMessage = async (message) => {
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

    const vectorStore = await PGVectorStore.initialize(embeddings, {
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
    });

    const retriever = vectorStore.asRetriever({ k: 3 });

    // Prompt que inclui o contexto automaticamente
    const prompt = ChatPromptTemplate.fromMessages([
        new MessagesPlaceholder("chat_history"),
        ["system", "Use the following retrieved documents to help answer the question:\n\n{context}"],
        ["human", "{input}"],
    ]);

    const model = new ChatOpenAI({});

    // Agora criamos um "runnable" que primeiro faz o search
    const ragChain = RunnablePassthrough.assign({
        context: async (input) => {
            const docs = await retriever.invoke(input.input);
            return docs.map((doc) => doc.pageContent).join("\n\n");
        },
    }).pipe(prompt).pipe(model);

    // Adicionamos a memória no runnable
    const chainWithHistory = new RunnableWithMessageHistory({
        runnable: ragChain,
        inputMessagesKey: "input",
        historyMessagesKey: "chat_history",
        getMessageHistory: async (sessionId) => {
            return new PostgresChatMessageHistory({
                sessionId,
                pool,
            });
        },
    });

    const response = await chainWithHistory.invoke(
        {
            input: message.text.body,
        },
        {
            configurable: {
                thread_id: message.from,
                sessionId: message.from,
            },
        }
    );

    await pool.end();

    return {
        ...message,
        text: { body: response.content },
        timestamp: new Date().toISOString(),
    };
};
