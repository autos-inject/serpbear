import type { NextApiRequest, NextApiResponse } from 'next';
import Cookies from 'cookies';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodeMailer from 'nodemailer';
import database from '../../database/database';
import User from '../../database/models/user';
import { hashPassword, generateSalt } from './login';
import { getAppSettings } from './settings';

function verifyAdmin(req: NextApiRequest, res: NextApiResponse): boolean {
   if (!process.env.SECRET) return false;
   const token = new Cookies(req, res).get('token');
   if (!token) return false;
   try {
      const payload = jwt.verify(token, process.env.SECRET) as { role?: string };
      return payload.role === 'admin';
   } catch { return false; }
}

function generateTempPassword(): string {
   const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
   return Array.from(crypto.randomBytes(10)).map((b) => chars[b % chars.length]).join('');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
   if (!verifyAdmin(req, res)) return res.status(401).json({ error: 'Admin only' });

   const { ID } = req.body as { ID: number };
   if (!ID) return res.status(400).json({ error: 'ID required' });

   await database.authenticate();
   const user = await User.findByPk(ID);
   if (!user) return res.status(404).json({ error: 'User not found' });
   if (!user.email) return res.status(400).json({ error: 'User has no email address' });

   const settings = await getAppSettings();
   const { smtp_server, smtp_port, smtp_username, smtp_password, notification_email_from, notification_email_from_name } = settings;

   if (!smtp_server || !smtp_port) {
      return res.status(400).json({ error: 'SMTP not configured in Settings' });
   }

   const tempPassword = generateTempPassword();
   const salt = generateSalt();
   user.password_hash = hashPassword(tempPassword, salt);
   user.password_salt = salt;
   await user.save();

   const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://serpbear.turbo-platinium.com';
   const fromName = notification_email_from_name || 'SerpBear';
   const fromEmail = notification_email_from || 'no-reply@serpbear.com';

   const mailerOpts: any = { host: smtp_server, port: parseInt(smtp_port, 10) };
   if (smtp_username || smtp_password) {
      mailerOpts.auth = {};
      if (smtp_username) mailerOpts.auth.user = smtp_username;
      if (smtp_password) mailerOpts.auth.pass = smtp_password;
   }

   const html = `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h2 style="color:#1d4ed8;margin-bottom:8px">Accès SerpBear</h2>
  <p style="color:#374151">Bonjour <strong>${user.username}</strong>,</p>
  <p style="color:#374151">Votre compte a été créé / réinitialisé. Voici vos identifiants de connexion :</p>
  <table style="background:#f3f4f6;border-radius:8px;padding:16px;width:100%;border-collapse:collapse">
    <tr><td style="padding:4px 8px;color:#6b7280;font-size:13px">URL</td>
        <td style="padding:4px 8px;font-size:13px"><a href="${appUrl}" style="color:#1d4ed8">${appUrl}</a></td></tr>
    <tr><td style="padding:4px 8px;color:#6b7280;font-size:13px">Identifiant</td>
        <td style="padding:4px 8px;font-size:13px;font-weight:bold">${user.username}</td></tr>
    <tr><td style="padding:4px 8px;color:#6b7280;font-size:13px">Mot de passe</td>
        <td style="padding:4px 8px;font-size:13px;font-family:monospace;font-weight:bold">${tempPassword}</td></tr>
  </table>
  <p style="color:#9ca3af;font-size:12px;margin-top:16px">Pensez à changer votre mot de passe après la première connexion.</p>
</div>`;

   try {
      const transporter = nodeMailer.createTransport(mailerOpts);
      await transporter.sendMail({
         from: `${fromName} <${fromEmail}>`,
         to: user.email,
         subject: 'Vos accès SerpBear',
         html,
      });
      return res.status(200).json({ success: true });
   } catch (err: any) {
      console.error('[ERROR] sendinvite:', err);
      return res.status(500).json({ error: err?.message || 'Error sending email' });
   }
}
