import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../database/database';
import User from '../../../database/models/user';
import { hashPassword, generateSalt } from '../login';
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

   await db.authenticate();

   if (req.method === 'GET') {
      const users = await User.findAll({ attributes: ['ID', 'username', 'email', 'role', 'created_at'] });
      return res.status(200).json({ users });
   }

   if (req.method === 'POST') {
      const { username, email = '', password, role = 'viewer' } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'username and password required' });
      if (!['admin', 'viewer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
      const existing = await User.findOne({ where: { username } });
      if (existing) return res.status(409).json({ error: 'Username already exists' });
      const salt = generateSalt();
      const hash = hashPassword(password, salt);
      const user = await User.create({ username, email, password_hash: hash, password_salt: salt, role, created_at: new Date().toISOString() });
      return res.status(201).json({ user: { ID: user.ID, username: user.username, email: user.email, role: user.role } });
   }

   if (req.method === 'PUT') {
      const { ID, email, password, role } = req.body;
      if (!ID) return res.status(400).json({ error: 'ID required' });
      const user = await User.findByPk(ID);
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (email !== undefined) user.email = email;
      if (role !== undefined) {
         if (!['admin', 'viewer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
         user.role = role;
      }
      if (password) {
         const salt = generateSalt();
         user.password_hash = hashPassword(password, salt);
         user.password_salt = salt;
      }
      await user.save();
      return res.status(200).json({ user: { ID: user.ID, username: user.username, email: user.email, role: user.role } });
   }

   if (req.method === 'DELETE') {
      const { ID } = req.body;
      if (!ID) return res.status(400).json({ error: 'ID required' });
      const user = await User.findByPk(ID);
      if (!user) return res.status(404).json({ error: 'User not found' });
      await user.destroy();
      return res.status(200).json({ success: true });
   }

   return res.status(405).json({ error: 'Method not allowed' });
}
