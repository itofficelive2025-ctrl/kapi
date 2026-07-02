import { aiConfigured, MODEL } from "../lib/ai.js";

export default function handler(req, res) {
  res.status(200).json({ aiAvailable: aiConfigured(), model: MODEL });
}
