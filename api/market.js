import { fetchMarket, friendlyError } from "../lib/ai.js";

export default async function handler(req, res) {
  try {
    const data = await fetchMarket(req.query.symbol, Number(req.query.months) || 12);
    res.setHeader("Cache-Control", "s-maxage=600"); // cache 10 min at the edge
    res.status(200).json(data);
  } catch (err) {
    const { status, message } = friendlyError(err);
    res.status(status).json({ error: message });
  }
}
