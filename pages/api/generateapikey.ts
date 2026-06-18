import type { NextApiRequest, NextApiResponse } from 'next';
import Cookies from 'cookies';
import jwt from 'jsonwebtoken';
import { generateApiKey, getApiKey, getAllowedIPs, setAllowedIPs } from '../../utils/apiKey';

function verifyAdmin(req: NextApiRequest, res: NextApiResponse): boolean {
   if (!process.env.SECRET) return false;
   const token = new Cookies(req, res).get('token');
   if (!token) return false;
   try {
      const payload = jwt.verify(token, process.env.SECRET) as { role?: string };
      return payload.role === 'admin';
   } catch { return false; }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   if (!verifyAdmin(req, res)) return res.status(401).json({ error: 'Admin only' });

   if (req.method === 'GET') {
      const key = await getApiKey();
      const allowed_ips = await getAllowedIPs();
      return res.status(200).json({ key, allowed_ips });
   }

   if (req.method === 'POST') {
      const key = await generateApiKey();
      return res.status(200).json({ key });
   }

   if (req.method === 'PUT') {
      const { allowed_ips } = req.body as { allowed_ips: string[] };
      if (!Array.isArray(allowed_ips)) return res.status(400).json({ error: 'allowed_ips must be an array' });
      await setAllowedIPs(allowed_ips);
      return res.status(200).json({ allowed_ips });
   }

   return res.status(405).json({ error: 'Method not allowed' });
}
