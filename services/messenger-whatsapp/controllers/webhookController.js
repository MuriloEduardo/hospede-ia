export const createWebhookController = ({ publishToQueue }) => {
    const handleWebhookPost = async (req, res) => {
        console.log("Incoming webhook message...", req.body);

        const message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0];

        console.log(JSON.stringify(req.body, null, 2));

        if (message?.type === "text") {
            try {
                publishToQueue(req.body, "incoming.messages");
            } catch (error) {
                console.error("Failed to publish message to RabbitMQ:", error);
            }
        }

        res.sendStatus(200);
    };

    const handleWebhookGet = (req, res) => {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
            res.status(200).send(challenge);
            console.log("Webhook verified successfully!");
        } else {
            res.sendStatus(403);
        }
    };

    return { handleWebhookPost, handleWebhookGet };
};