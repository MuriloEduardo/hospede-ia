import axios from "axios";

const consumerToSend = ({ rabbitMQChannel, GRAPH_API_TOKEN, GRAPH_NUMBER_ID }) => {
    console.log("Consumer to send is running...");

    // Ensure the queue is not re-declared here
    rabbitMQChannel.consume("messages.to_send", async (msg) => {
        if (msg !== null) {
            const messageContent = JSON.parse(msg.content.toString());
            console.log("Processing message:", messageContent);

            try {
                // Send message via WhatsApp API
                const response = await axios.post(
                    `https://graph.facebook.com/v22.0/${GRAPH_NUMBER_ID}/messages`,
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

                // Acknowledge the message after successful processing
                rabbitMQChannel.ack(msg);
            } catch (error) {
                console.error("Failed to send message:", error.response?.data || error.message);

                // Reject the message and send it to the DLQ
                rabbitMQChannel.nack(msg, false, false);
            }
        }
    });
};

export default consumerToSend;