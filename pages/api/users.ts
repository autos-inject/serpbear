import type { NextApiRequest, NextApiResponse } from 'next';
import Cookies from 'cookies';
import jwt from 'jsonwebtoken';
import database from '../../database/database';
import User from '../../database/models/user';
import { hashPassword, generateSalt } from './login';

type JWTPayload = { user: string; role: string };

function getTokenPayload(req: NextApiRequest, res: NextApiResponse): JWTPayload | null {
   if (!process.env.SECRET) return null;
   const cookies = new Cookies(req, res);
   const token = cookies.get('token');
   if (!token) return null;
   try {
      return jwt.verify(token, process.env.SECRET) as JWTPayload;
   } catch {
      return null;
   }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   const payload = getTokenPayload(req, res);
   if (!payload) return res.status(401).json({ error: 'Not authorized' });
   if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

   await database.authenticate();

   if (req.method === 'GET') return listUsers(res);
   if (req.method === 'POST') return createUser(req, res, payload);
   if (req.method === 'PUT') return updateUser(req, res, payload);
   if (req.method === 'DELETE') return deleteUser(req, res, payload);

   return res.status(405).json({ error: 'Method not allowed' });
}

async function listUsers(res: NextApiResponse) {
   const users = await User.findAll({ attributes: ['ID', 'username', 'email', 'role', 'created_at'] });
   return res.status(200).json({ users });
}

async function createUser(req: NextApiRequest, res: NextApiResponse, _payload: JWTPayload) {
   const { username, email = '', password, role = 'viewer' } = req.body;
   if (!username || !password) return res.status(400).json({ error: 'username and password required' });
   if (!['admin', 'viewer'].includes(role)) return res.status(400).json({ error: 'role must be admin or viewer' });

   const existing = await User.findOne({ where: { username } });
   if (existing) return res.status(409).json({ error: 'Username already exists' });

   const salt = generateSalt();
   const hash = hashPassword(password, salt);
   const user = await User.create({
      username,
      email,
      password_hash: hash,
      password_salt: salt,
      role,
      created_at: new Date().toISOString(),
   });
   return res.status(201).json({ user: { ID: user.ID, username: user.username, email: user.email, role: user.role, created_at: user.created_at } });
}

async function updateUser(req: NextApiRequest, res: NextApiResponse, payload: JWTPayload) {
   const { ID, email, password, role } = req.body;
   if (!ID) return res.status(400).json({ error: 'ID required' });

   const user = await User.findByPk(ID);
   if (!user) return res.status(404).json({ error: 'User not found' });

   if (email !== undefined) user.email = email;
   if (role !== undefined) {
      if (!['admin', 'viewer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
      if (user.username === payload.user && role !== 'admin') {
         return res.status(400).json({ error: 'Cannot remove your own admin role' });
      }
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

async function deleteUser(req: NextApiRequest, res: NextApiResponse, payload: JWTPayload) {
   const { ID } = req.body;
   if (!ID) return res.status(400).json({ error: 'ID required' });

   const user = await User.findByPk(ID);
   if (!user) return res.status(404).json({ error: 'User not found' });
   if (user.username === payload.user) return res.status(400).json({ error: 'Cannot delete your own account' });

   await user.destroy();
   return res.status(200).json({ success: true });
}
