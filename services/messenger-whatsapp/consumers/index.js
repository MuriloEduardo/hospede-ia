import dotenv from "dotenv";
import './consumer-to-send.js';

dotenv.config();

console.log(process.env.GRAPH_NUMBER_ID);


console.log("All consumers are now running.");