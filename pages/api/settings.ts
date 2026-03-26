import type { NextApiRequest, NextApiResponse } from "next";
import { readSettings, writeSettings } from "../../lib/settings";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    return res.status(200).json(readSettings());
  }
  if (req.method === "POST") {
    const saved = writeSettings(req.body);
    return res.status(200).json(saved);
  }
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end();
}
