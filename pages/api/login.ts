import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import Cookies from 'cookies';
import crypto from 'crypto';
import database from '../../database/database';
import User from '../../database/models/user';

type loginResponse = {
   success?: boolean
   error?: string|null,
}

export function hashPassword(password: string, salt: string): string {
   return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
   return crypto.randomBytes(32).toString('hex');
}

async function seedAdminIfNeeded() {
   await database.authenticate();
   const count = await User.count();
   if (count === 0) {
      const userName = process.env.USER_NAME || process.env.USER || 'admin';
      const password = process.env.PASSWORD || '';
      const salt = generateSalt();
      const hash = hashPassword(password, salt);
      await User.create({
         username: userName,
         email: '',
         password_hash: hash,
         password_salt: salt,
         role: 'admin',
         created_at: new Date().toISOString(),
      });
   }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   if (req.method === 'POST') {
      return loginUser(req, res);
   }
   return res.status(401).json({ success: false, error: 'Invalid Method' });
}

const loginUser = async (req: NextApiRequest, res: NextApiResponse<loginResponse>) => {
   if (!req.body.username || !req.body.password) {
      return res.status(401).json({ error: 'Username Password Missing' });
   }

   try {
      await seedAdminIfNeeded();

      const user = await User.findOne({ where: { username: req.body.username } });

      if (!user) {
         return res.status(401).json({ success: false, error: 'Incorrect Username' });
      }

      const hash = hashPassword(req.body.password, user.password_salt);
      if (hash !== user.password_hash) {
         return res.status(401).json({ success: false, error: 'Incorrect Password' });
      }

      if (!process.env.SECRET) {
         return res.status(500).json({ success: false, error: 'Server configuration error' });
      }

      const token = jwt.sign({ user: user.username, role: user.role }, process.env.SECRET);
      const cookies = new Cookies(req, res);
      const expireDate = new Date();
      const sessDuration = process.env.SESSION_DURATION;
      expireDate.setHours((sessDuration && parseInt(sessDuration, 10)) || 24);
      cookies.set('token', token, { httpOnly: true, sameSite: 'lax', maxAge: expireDate.getTime() });
      return res.status(200).json({ success: true, error: null });
   } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ success: false, error: 'Server error' });
   }
};
