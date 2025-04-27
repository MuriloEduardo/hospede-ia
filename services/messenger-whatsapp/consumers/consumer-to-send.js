import axios from "axios";

const consumerToSend = ({ rabbitMQChannel, GRAPH_API_TOKEN }) => {
    console.log("Consumer to send is running...");

    rabbitMQChannel.consume("outgoing.messages", async (msg) => {
        if (msg !== null) {
            const messageContent = JSON.parse(msg.content.toString());
            console.log("Processing message:", messageContent);

            try {
                // Send message via WhatsApp API
                const response = await axios.post(
                    "https://graph.facebook.com/v22.0/me/messages",
                    {
                        messaging_product: "whatsapp",
                        to: messageContent.to,
                        type: "text",
                        text: { body: messageContent.body },
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${GRAPH_API_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                console.log("Message sent successfully:", response.data);
            } catch (error) {
                console.error("Failed to send message:", error.response?.data || error.message);
            }

            // Acknowledge the message after processing
            rabbitMQChannel.ack(msg);
        }
    });
};

export default consumerToSend;