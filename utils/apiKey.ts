import { readFile, writeFile } from 'fs/promises';
import crypto from 'crypto';

const KEY_FILE = `${process.cwd()}/data/api_key.json`;

type ApiKeyData = { key: string; allowed_ips?: string[] };

let cached: { data: ApiKeyData; ts: number } | null = null;

async function readData(): Promise<ApiKeyData> {
   if (cached && Date.now() - cached.ts < 30000) return cached.data;
   try {
      const raw = await readFile(KEY_FILE, { encoding: 'utf-8' });
      const data = JSON.parse(raw) as ApiKeyData;
      if (data.key) { cached = { data, ts: Date.now() }; return data; }
   } catch { /* fall through */ }
   const data: ApiKeyData = { key: process.env.APIKEY || '' };
   cached = { data, ts: Date.now() };
   return data;
}

async function writeData(data: ApiKeyData): Promise<void> {
   await writeFile(KEY_FILE, JSON.stringify(data, null, 2), { encoding: 'utf-8' });
   cached = { data, ts: Date.now() };
}

export async function getApiKey(): Promise<string> {
   const data = await readData();
   return data.key || process.env.APIKEY || '';
}

export async function generateApiKey(): Promise<string> {
   const existing = await readData();
   const key = crypto.randomBytes(24).toString('hex');
   await writeData({ ...existing, key });
   return key;
}

export async function getAllowedIPs(): Promise<string[]> {
   const data = await readData();
   return data.allowed_ips || [];
}

export async function setAllowedIPs(ips: string[]): Promise<void> {
   const existing = await readData();
   await writeData({ ...existing, allowed_ips: ips });
}
