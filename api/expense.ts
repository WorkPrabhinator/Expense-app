import { NextApiRequest, NextApiResponse } from 'next'; // or use standard node types

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Use googleapis package to access Google Sheets
  // Do your backend logic here
  res.status(200).json({ message: "Backend working via Vercel serverless!" });
}
