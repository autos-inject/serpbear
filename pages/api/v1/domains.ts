import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../database/database';
import Domain from '../../../database/models/domain';
import Keyword from '../../../database/models/keyword';
import { getApiKey, getAllowedIPs } from '../../../utils/apiKey';

async function verifyRequest(req: NextApiRequest): Promise<string | null> {
   const auth = req.headers.authorization || '';
   const key = auth.startsWith('Bearer ') ? auth.slice(7) : req.query.apikey as string;
   const validKey = await getApiKey();
   if (!key || key !== validKey) return 'Invalid API key';
   const allowedIPs = await getAllowedIPs();
   if (allowedIPs.length > 0) {
      const clientIP = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();
      if (!allowedIPs.includes(clientIP)) return 'IP not allowed';
   }
   return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   const err = await verifyRequest(req);
   if (err) return res.status(401).json({ error: err });
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
