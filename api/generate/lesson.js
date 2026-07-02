import { generateLessonContent, friendlyError } from "../../lib/ai.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const lesson = await generateLessonContent(req.body || {});
    res.status(200).json(lesson);
  } catch (err) {
    const { status, message } = friendlyError(err);
    res.status(status).json({ error: message });
  }
}
