/* eslint-disable max-len, no-nested-ternary, object-property-newline */
import type { NextApiRequest, NextApiResponse } from 'next';
import verifyUser from '../../utils/verifyUser';
import { getAppSettings } from './settings';

const BALANCE_URLS: Record<string, string> = {
   serper: 'https://google.serper.dev/account',
   scrapingant: 'https://api.scrapingant.com/v2/general?url=https://example.com&x-api-key=',
   serpapi: 'https://serpapi.com/account',
   hasdata: '',
};

const BALANCE_HEADERS: Record<string, (key: string) => Record<string, string>> = {
   serper: (key) => ({ 'X-API-KEY': key }),
   serpapi: (key) => ({ authorization: `Bearer ${key}` }),
   scrapingant: () => ({}),
};

const BALANCE_PARSERS: Record<string, (data: any, key?: string) => { balance: number | null, total: number | null }> = {
   serper: (data) => ({ balance: data?.balance ?? null, total: null }),
   serpapi: (data) => ({ balance: data?.plan_searches_left ?? null, total: data?.plan_monthly_searches ?? null }),
   scrapingant: (data) => ({ balance: data?.credits ?? null, total: null }),
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   const authorized = verifyUser(req, res);
   if (authorized !== 'authorized') {
      return res.status(401).json({ error: authorized });
   }

   if (req.method === 'GET') {
      return getBalances(req, res);
   }
   return res.status(502).json({ error: 'Unrecognized Route.' });
}

const getBalances = async (req: NextApiRequest, res: NextApiResponse) => {
   const settings = await getAppSettings();
   const keys: ApiKeyEntry[] = settings.scaping_apis || [];

   if (keys.length === 0) {
      // Legacy single key — wrap it for balance check
      if (settings.scaping_api && settings.scraper_type) {
         keys.push({
            id: 'legacy', label: 'API Key', provider: settings.scraper_type,
            key: settings.scaping_api, exhausted: false, requestCount: 0,
         });
      }
   }

   const results = await Promise.all(
      keys.map(async (entry) => {
         const url = BALANCE_URLS[entry.provider];
         const headersBuilder = BALANCE_HEADERS[entry.provider];
         const parser = BALANCE_PARSERS[entry.provider];

         if (!url || !headersBuilder || !parser) {
            return { id: entry.id, label: entry.label, provider: entry.provider, balance: null, total: null, error: 'No balance API' };
         }

         try {
            const fetchUrl = entry.provider === 'scrapingant'
               ? `https://api.scrapingant.com/v2/general?url=https://example.com&x-api-key=${entry.key}`
               : url;
            const response = await fetch(fetchUrl, {
               method: 'GET',
               headers: { 'Content-Type': 'application/json', ...headersBuilder(entry.key) },
            });
            const data = await response.json();
            const { balance, total } = parser(data, entry.key);
            return { id: entry.id, label: entry.label, provider: entry.provider, balance, total, error: null };
         } catch (e: any) {
            return { id: entry.id, label: entry.label, provider: entry.provider, balance: null, total: null, error: e?.message || 'Fetch error' };
         }
      }),
   );

   return res.status(200).json({ balances: results });
};
