import { companyCaseStudy, friendlyError } from "../lib/ai.js";

export const config = { maxDuration: 120 }; // web-search case studies can be slow

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const study = await companyCaseStudy((req.body || {}).query);
    res.status(200).json({ study });
  } catch (err) {
    const { status, message } = friendlyError(err);
    res.status(status).json({ error: message });
  }
}
