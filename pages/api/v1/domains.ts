import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../database/database';
import Domain from '../../../database/models/domain';
import Keyword from '../../../database/models/keyword';

function verifyApiKey(req: NextApiRequest): boolean {
   const auth = req.headers.authorization || '';
   const key = auth.startsWith('Bearer ') ? auth.slice(7) : req.query.apikey as string;
   return key === process.env.APIKEY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   if (!verifyApiKey(req)) return res.status(401).json({ error: 'Invalid API key' });
   if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

   await db.authenticate();

   const domains = await Domain.findAll();

   const result = await Promise.all(domains.map(async (d) => {
      const plain = d.get({ plain: true });
      const keywords = await Keyword.findAll({ where: { domain: plain.domain } });
      const positions = keywords.map((k) => k.position).filter((p) => p > 0);
      const avgPosition = positions.length > 0
         ? Math.round(positions.reduce((a, b) => a + b, 0) / positions.length)
         : 0;
      return {
         id: plain.ID,
         domain: plain.domain,
         slug: plain.slug,
         keywordCount: plain.keywordCount,
         avgPosition,
         lastUpdated: plain.lastUpdated,
         tags: plain.tags ? JSON.parse(plain.tags) : [],
      };
   }));

   return res.status(200).json({ count: result.length, domains: result });
}
