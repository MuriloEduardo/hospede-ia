import amqp from "amqplib";
import axios from "axios";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const QUEUE_NAME = "messages.to_send";
const META_API_URL = "https://graph.facebook.com/v22.0/";
const GRAPH_API_TOKEN = process.env.GRAPH_API_TOKEN;
const GRAPH_NUMBER_ID = process.env.GRAPH_NUMBER_ID;

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
            async (msg) => {
                if (msg !== null) {
                    const messageContent = msg.content.toString();
                    console.log("Received message:", messageContent);

                    try {
                        const response = await axios.post(
                            `${META_API_URL}/${GRAPH_NUMBER_ID}/messages`,
                            {
                                messaging_product: "whatsapp",
                                to: "recipient_phone_number", // Replace with actual recipient
                                type: "text",
                                text: { body: messageContent },
                            },
                            {
                                headers: {
                                    Authorization: `Bearer ${GRAPH_API_TOKEN}`,
                                },
                            }
                        );

                        console.log("Message sent to Meta API:", response.data);
                    } catch (apiError) {
                        console.error("Failed to send message to Meta API:", apiError);
                    }

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