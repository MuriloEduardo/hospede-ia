import axios from "axios";

const META_API_URL = "https://graph.facebook.com/v12.0/messages";
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

(async () => {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();

        await channel.assertQueue(QUEUE_NAME, {
            durable: true,
        });

        console.log("Waiting for messages in queue:", QUEUE_NAME);

        channel.consume(
            QUEUE_NAME,
            async (msg) => {
                if (msg !== null) {
                    const messageContent = msg.content.toString();
                    console.log("Received message:", messageContent);

                    try {
                        const response = await axios.post(
                            META_API_URL,
                            {
                                messaging_product: "whatsapp",
                                to: "recipient_phone_number", // Replace with actual recipient
                                type: "text",
                                text: { body: messageContent },
                            },
                            {
                                headers: {
                                    Authorization: `Bearer ${META_ACCESS_TOKEN}`,
                                },
                            }
                        );

                        console.log("Message sent to Meta API:", response.data);
                    } catch (apiError) {
                        console.error("Failed to send message to Meta API:", apiError);
                    }

                    channel.ack(msg);
                }
            },
            {
                noAck: false,
            }
        );
    } catch (error) {
        console.error("Failed to connect to RabbitMQ or consume messages:", error);
    }
})();