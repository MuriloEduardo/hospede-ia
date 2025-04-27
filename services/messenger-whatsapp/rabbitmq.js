// Create a new file for RabbitMQ connection logic
import amqp from "amqplib";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const QUEUE_NAME = "incoming.messages";
const DLQ_NAME = "dql.incoming.messages";

let channel;

export const connectToRabbitMQ = async () => {
    let connection;
    let retries = 5;

    while (retries) {
        try {
            connection = await amqp.connect(RABBITMQ_URL);
            channel = await connection.createChannel();

            // Ensure the Dead Letter Queue exists
            await channel.assertQueue(DLQ_NAME, {
                durable: true,
            });

            // Ensure the main queue exists with DLQ configuration
            await channel.assertQueue(QUEUE_NAME, {
                durable: true,
                arguments: {
                    "x-dead-letter-exchange": "",
                    "x-dead-letter-routing-key": DLQ_NAME,
                },
            });

            console.log("Connected to RabbitMQ and queues are ready.");
            return channel;
        } catch (error) {
            console.error("Failed to connect to RabbitMQ. Retrying in 5 seconds...", error);
            retries -= 1;
            await new Promise((res) => setTimeout(res, 5000));
        }
    }

    throw new Error("Failed to connect to RabbitMQ after multiple retries.");
};

export const publishToQueue = (message) => {
    if (!channel) {
        throw new Error("RabbitMQ channel is not initialized.");
    }

    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(message)), {
        persistent: true, // Ensure message is persistent
    });
    console.log("Message published to RabbitMQ queue.");
};