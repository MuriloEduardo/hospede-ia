import dotenv from "dotenv";
import consumerToSend from "./consumer-to-send.js";

dotenv.config();

export const startConsumers = (dependencies) => {
    // Pass dependencies to each consumer
    consumerToSend(dependencies);
};