import { analyzeChart, friendlyError } from "../../lib/ai.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const result = await analyzeChart(req.body || {});
    res.status(200).json(result);
  } catch (err) {
    const { status, message } = friendlyError(err);
    res.status(status).json({ error: message });
  }
}
