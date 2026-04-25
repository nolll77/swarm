import express from "express";
import dotenv from "dotenv";
import { handleGithubEvent } from "./webhooks/github";

dotenv.config();

const app = express();

app.use(express.json());

app.post("/webhooks/github", handleGithubEvent);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API Service listening on port ${port}`);
});
