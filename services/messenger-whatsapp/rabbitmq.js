// Create a new file for RabbitMQ connection logic
import amqp from "amqplib";

console.log("Connecting to RabbitMQ...");
console.log(process.env.RABBITMQ_URL);



const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";

let channel;

export const connectToRabbitMQ = async () => {
    let connection;
    let retries = 5;

    while (retries) {
        try {
            connection = await amqp.connect(RABBITMQ_URL);
            channel = await connection.createChannel();

            // Ensure the queues exist
            await channel.assertQueue("incoming.messages", { durable: true });
            await channel.assertQueue("messages.to_send", { durable: true });

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

export const publishToQueue = (message, queue_name) => {
    if (!channel) {
        throw new Error("RabbitMQ channel is not initialized.");
    }

    channel.sendToQueue(queue_name, Buffer.from(JSON.stringify(message)), {
        persistent: true, // Ensure message is persistent
    });
    console.log("Message published to RabbitMQ queue.");
};