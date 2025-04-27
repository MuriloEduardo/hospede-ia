import dotenv from "dotenv";
import express from "express";
import { connectToRabbitMQ, publishToQueue } from "./rabbitmq.js";
import createWebhookRoutes from "./routes/webhookRoutes.js";

dotenv.config();

const app = express();
app.use(express.json());

const { PORT, GRAPH_API_TOKEN, WEBHOOK_VERIFY_TOKEN } = process.env;

(async () => {
    try {
        await connectToRabbitMQ();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
})();

// Inject dependencies into webhook routes
const webhookRoutes = createWebhookRoutes({
    GRAPH_API_TOKEN,
    WEBHOOK_VERIFY_TOKEN,
    publishToQueue,
});

app.use(webhookRoutes);

app.get("/", (req, res) => {
    res.send(`<pre>Nothing to see here.
Checkout README.md to start.</pre>`);
});

app.listen(PORT, () => {
    console.log(`Server is listening on port: ${PORT}`);
});
