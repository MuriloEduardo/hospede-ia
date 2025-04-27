import dotenv from "dotenv";
import consumerToSend from "./consumer-to-send.js";

dotenv.config();

export const startConsumers = (dependencies) => {
    console.log("Starting consumers...");

    // Pass dependencies to each consumer
    consumerToSend(dependencies);

    console.log("All consumers are now running.");
};