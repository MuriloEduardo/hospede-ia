import amqp from "amqplib";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const QUEUE_NAME = "processing.done";

(async () => {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();

        // Ensure the queue exists
        await channel.assertQueue(QUEUE_NAME, {
            durable: true,
        });

        console.log("Waiting for messages in queue:", QUEUE_NAME);

        // Consume messages from the queue
        channel.consume(
            QUEUE_NAME,
            (msg) => {
                if (msg !== null) {
                    const messageContent = msg.content.toString();
                    console.log("Received message:", messageContent);

                    // Process the message here
                    // Example: Log the message or perform some action

                    // Acknowledge the message
                    channel.ack(msg);
                }
            },
            {
                noAck: false, // Ensure messages are acknowledged after processing
            }
        );
    } catch (error) {
        console.error("Failed to connect to RabbitMQ or consume messages:", error);
    }
})();