// Importa o módulo pg para conexão com o banco de dados PostgreSQL
import pg from "pg";

// Importa classes e funções do LangChain para prompts e processamento de mensagens
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
} from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { RunnableWithMessageHistory, RunnablePassthrough } from "@langchain/core/runnables";
import { PostgresChatMessageHistory } from "@langchain/community/stores/message/postgres";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { OpenAIEmbeddings } from "@langchain/openai";

/**
 * Função principal para processar mensagens recebidas.
 * @param {Object} message - Mensagem recebida contendo informações como texto e remetente.
 * @returns {Object} - Mensagem processada com resposta gerada e timestamp.
 */
export const processMessage = async ({ entry }) => {
    // Cria um pool de conexões com o banco de dados PostgreSQL
    const pool = new pg.Pool({
        host: "postgres",
        port: 5432,
        user: "postgres",
        password: "postgres",
        database: "postgres",
    });

    pool.on("error", (err) => {
        console.error("Unexpected error on idle client", err);
        process.exit(-1);
    });

    // Configura embeddings usando o modelo OpenAI
    const embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-small",
    });

    // Check if the embeddings table exists before initializing PGVectorStore
    const ensureEmbeddingsTable = async () => {
        const client = await pool.connect();
        try {
            const tableExistsQuery = `
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'embeddings'
                );
            `;
            const res = await client.query(tableExistsQuery);
            if (!res.rows[0].exists) {
                await PGVectorStore.ensureTableInDatabase(embeddings, {
                    postgresConnectionOptions: {
                        type: "postgres",
                        host: "postgres",
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
            }
        } catch (err) {
            console.error("Error ensuring embeddings table", err);
            throw err;
        } finally {
            client.release();
        }
    };

    await ensureEmbeddingsTable();

    // Inicializa o VectorStore para armazenar e recuperar vetores
    const vectorStore = await PGVectorStore.initialize(embeddings, {
        postgresConnectionOptions: {
            type: "postgres",
            host: "postgres",
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

    const value_message = entry?.[0]?.changes[0]?.value
    const message = value_message?.messages?.[0]
    const metadata = value_message?.metadata

    // Configura o retriever para buscar os documentos mais relevantes
    const retriever = vectorStore.asRetriever({ k: 3, filter: { businessPhoneId: metadata.display_phone_number } });

    // Define o template do prompt para incluir contexto automaticamente
    const prompt = ChatPromptTemplate.fromMessages([
        new MessagesPlaceholder("chat_history"),
        ["system", "{context}"],
        ["human", "{input}"],
    ]);

    // Configura o modelo de linguagem OpenAI
    const model = new ChatOpenAI({
        temperature: 0,
    });

    // Cria um "runnable" que primeiro realiza a busca e depois processa o prompt
    const ragChain = RunnablePassthrough.assign({
        context: async (input) => {
            const docs = await retriever.invoke(input.input);
            return docs.map((doc) => doc.pageContent).join("\n\n");
        },
    }).pipe(prompt).pipe(model);

    // Adiciona histórico de mensagens ao "runnable"
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

    // Processa a mensagem recebida e gera uma resposta
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

    // Encerra o pool de conexões com o banco de dados
    await pool.end();

    // Retorna a mensagem processada com a resposta gerada e o timestamp
    return {
        ...message,
        text: { body: response.content },
        timestamp: new Date().toISOString(),
    };
};
