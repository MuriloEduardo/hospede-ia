import amqp from "amqplib";
import dotenv from "dotenv";
import express from "express";
import createRoutes from "./http.js";
import { processMessage } from './services/aiProcessor.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(createRoutes());

app.listen(process.env.PORT || 4000, () => {
    console.log(`Server is listening on port: ${process.env.PORT || 4000}`);
});

(async () => {
    const INPUT_QUEUE = "incoming.messages";
    const OUTPUT_QUEUE = "messages.to_send";

    let connection, channel;

    try {
        connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
        channel = await connection.createChannel();

        // Ensure the input and output queues exist
        await channel.assertQueue(INPUT_QUEUE, { durable: true });
        await channel.assertQueue(OUTPUT_QUEUE, {
            durable: true
        });

        console.log(`Connected to RabbitMQ. Listening on queue: ${INPUT_QUEUE}`);

        // Consume messages from the input queue
        channel.consume(
            INPUT_QUEUE,
            async (msg) => {
                if (!msg) {
                    console.log("No message received.");
                    return;
                }

                const messageContent = JSON.parse(msg.content.toString());
                console.log("Received message:", messageContent);

                // Process the message using the IA module
                const processedMessageContent = await processMessage(messageContent);

                // Process the message (example: add a processed flag)
                const processedMessage = {
                    ...processedMessageContent,
                    processed: true,
                    timestamp: new Date().toISOString(),
                };

                // Publish the processed message to the output queue
                channel.sendToQueue(OUTPUT_QUEUE, Buffer.from(JSON.stringify(processedMessage)), {
                    persistent: true,
                });
                console.log("Published processed message to queue:", OUTPUT_QUEUE);

                // Acknowledge the message
                channel.ack(msg);
            },
            { noAck: false }
        );
    } catch (error) {
        console.error("Failed to connect to RabbitMQ or process messages:", error);
        if (connection) {
            await connection.close();
        }
        process.exit(1);
    }
})();