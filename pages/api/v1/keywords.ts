import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../database/database';
import Keyword from '../../../database/models/keyword';
import parseKeywords from '../../../utils/parseKeywords';

function verifyApiKey(req: NextApiRequest): boolean {
   const auth = req.headers.authorization || '';
   const key = auth.startsWith('Bearer ') ? auth.slice(7) : req.query.apikey as string;
   return key === process.env.APIKEY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   if (!verifyApiKey(req)) return res.status(401).json({ error: 'Invalid API key' });
   if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

   const domain = req.query.domain as string;
   if (!domain) return res.status(400).json({ error: 'domain query param required' });

   await db.authenticate();

   const rows = await Keyword.findAll({ where: { domain } });
   const keywords = parseKeywords(rows.map((r) => r.get({ plain: true })));

   const result = keywords.map((k) => ({
      id: k.ID,
      keyword: k.keyword,
      position: k.position,
      device: k.device,
      country: k.country,
      city: k.city || '',
      url: k.url,
      volume: k.volume,
      lastUpdated: k.lastUpdated,
      history: k.history,
   }));

   return res.status(200).json({ domain, count: result.length, keywords: result });
}
