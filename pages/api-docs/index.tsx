/* eslint-disable quotes, max-len */
import type { NextPage } from 'next';
import Head from 'next/head';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import TopBar from '../../components/common/TopBar';

type Endpoint = {
   method: 'GET' | 'POST' | 'PUT' | 'DELETE';
   path: string;
   description: string;
   params?: string;
   body?: string;
   example: string;
};

const ENDPOINTS: Endpoint[] = [
   {
      method: 'GET',
      path: '/api/v1/domains',
      description: 'Liste tous les domaines avec leurs statistiques',
      example: `curl -H "Authorization: Bearer {APIKEY}" https://serpbear.turbo-platinium.com/api/v1/domains`,
   },
   {
      method: 'GET',
      path: '/api/v1/keywords',
      description: 'Récupère les mots-clés et positions d\'un domaine',
      params: '?domain=www.example.com',
      example: `curl -H "Authorization: Bearer {APIKEY}" "https://serpbear.turbo-platinium.com/api/v1/keywords?domain=www.auto-platinium.com"`,
   },
   {
      method: 'GET',
      path: '/api/v1/users',
      description: 'Liste tous les utilisateurs',
      example: `curl -H "Authorization: Bearer {APIKEY}" https://serpbear.turbo-platinium.com/api/v1/users`,
   },
   {
      method: 'POST',
      path: '/api/v1/users',
      description: 'Crée un nouvel utilisateur',
      body: '{ "username": "john", "password": "secret", "email": "john@example.com", "role": "viewer" }',
      example: `curl -X POST -H "Authorization: Bearer {APIKEY}" -H "Content-Type: application/json" \\\n  -d '{"username":"john","password":"secret","role":"viewer"}' \\\n  https://serpbear.turbo-platinium.com/api/v1/users`,
   },
   {
      method: 'PUT',
      path: '/api/v1/users',
      description: 'Modifie un utilisateur (role, email, password)',
      body: '{ "ID": 1, "role": "admin" }',
      example: `curl -X PUT -H "Authorization: Bearer {APIKEY}" -H "Content-Type: application/json" \\\n  -d '{"ID":2,"role":"admin"}' \\\n  https://serpbear.turbo-platinium.com/api/v1/users`,
   },
   {
      method: 'DELETE',
      path: '/api/v1/users',
      description: 'Supprime un utilisateur',
      body: '{ "ID": 2 }',
      example: `curl -X DELETE -H "Authorization: Bearer {APIKEY}" -H "Content-Type: application/json" \\\n  -d '{"ID":2}' \\\n  https://serpbear.turbo-platinium.com/api/v1/users`,
   },
];

const methodColor: Record<string, string> = {
   GET: 'bg-blue-100 text-blue-700',
   POST: 'bg-green-100 text-green-700',
   PUT: 'bg-yellow-100 text-yellow-700',
   DELETE: 'bg-red-100 text-red-700',
};

const ApiDocs: NextPage = () => {
   const [apiKey, setApiKey] = useState('');
   const [allowedIPs, setAllowedIPs] = useState<string[]>([]);
   const [newIP, setNewIP] = useState('');
   const [copied, setCopied] = useState(false);
   const [generating, setGenerating] = useState(false);
   const [savingIPs, setSavingIPs] = useState(false);

   React.useEffect(() => {
      fetch('/api/generateapikey')
         .then((r) => r.json())
         .then((d) => {
            if (d.key) setApiKey(d.key);
            if (Array.isArray(d.allowed_ips)) setAllowedIPs(d.allowed_ips);
         })
         .catch(() => {});
   }, []);

   const copyKey = () => {
      navigator.clipboard.writeText(apiKey).then(() => {
         setCopied(true);
         setTimeout(() => setCopied(false), 2000);
      });
   };

   const generateKey = () => {
      setGenerating(true);
      fetch('/api/generateapikey', { method: 'POST' })
         .then((r) => r.json())
         .then((d) => {
            if (d.key) { setApiKey(d.key); toast.success('Nouvelle clé générée'); }
            else toast.error(d.error || 'Erreur');
         })
         .catch(() => { toast.error('Erreur réseau'); })
         .finally(() => setGenerating(false));
   };

   const addIP = () => {
      const ip = newIP.trim();
      if (!ip) return;
      if (allowedIPs.includes(ip)) { toast.error('IP déjà présente'); return; }
      setAllowedIPs([...allowedIPs, ip]);
      setNewIP('');
   };

   const removeIP = (ip: string) => { setAllowedIPs(allowedIPs.filter((x) => x !== ip)); };

   const saveIPs = () => {
      setSavingIPs(true);
      fetch('/api/generateapikey', {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ allowed_ips: allowedIPs }),
      })
         .then((r) => r.json())
         .then((d) => {
            if (Array.isArray(d.allowed_ips)) { setAllowedIPs(d.allowed_ips); toast.success('IPs enregistrées'); }
            else toast.error(d.error || 'Erreur');
         })
         .catch(() => { toast.error('Erreur réseau'); })
         .finally(() => setSavingIPs(false));
   };

   return (
      <div>
         <Head><title>API — SerpBear</title></Head>
         <TopBar showSettings={() => {}} showAddModal={() => {}} />
         <div className='max-w-4xl mx-auto px-4 py-8'>
            <h1 className='text-2xl font-bold text-gray-800 mb-2'>API Documentation</h1>
            <p className='text-sm text-gray-500 mb-6'>Toutes les routes utilisent l&apos;authentification Bearer token.</p>

            {/* API Key */}
            <div className='bg-gray-50 border border-gray-200 rounded p-4 mb-4'>
               <p className='text-xs font-semibold text-gray-600 mb-2'>Votre clé API</p>
               <div className='flex items-center gap-2'>
                  <code className='flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm font-mono text-gray-800 overflow-auto'>
                     {apiKey || '—'}
                  </code>
                  <button
                     onClick={copyKey}
                     disabled={!apiKey}
                     className='px-3 py-2 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 disabled:opacity-40'
                  >
                     {copied ? '✓ Copié' : 'Copier'}
                  </button>
                  <button
                     onClick={generateKey}
                     disabled={generating}
                     className='px-3 py-2 bg-amber-500 text-white rounded text-xs font-semibold hover:bg-amber-600 disabled:opacity-40'
                  >
                     {generating ? '...' : '⟳ Générer'}
                  </button>
               </div>
               <p className='text-xs text-gray-400 mt-2'>
                  Header : <code>Authorization: Bearer {apiKey || '...'}</code>
               </p>
            </div>

            {/* IP Whitelist */}
            <div className='bg-gray-50 border border-gray-200 rounded p-4 mb-8'>
               <p className='text-xs font-semibold text-gray-600 mb-1'>IPs autorisées <span className='font-normal text-gray-400'>(laisser vide = toutes les IPs acceptées)</span></p>
               <div className='flex flex-wrap gap-2 mb-2'>
                  {allowedIPs.map((ip) => (
                     <span key={ip} className='flex items-center gap-1 bg-white border border-gray-300 rounded px-2 py-1 text-xs font-mono'>
                        {ip}
                        <button onClick={() => removeIP(ip)} className='ml-1 text-red-400 hover:text-red-600 font-bold leading-none'>×</button>
                     </span>
                  ))}
                  {allowedIPs.length === 0 && <span className='text-xs text-gray-400 italic'>Toutes les IPs autorisées</span>}
               </div>
               <div className='flex items-center gap-2'>
                  <input
                     type='text'
                     value={newIP}
                     onChange={(e) => setNewIP(e.target.value)}
                     onKeyDown={(e) => { if (e.key === 'Enter') addIP(); }}
                     placeholder='Ex: 82.64.12.100'
                     className='flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-400'
                  />
                  <button onClick={addIP} className='px-3 py-1.5 bg-gray-700 text-white rounded text-xs font-semibold hover:bg-gray-800'>+ Ajouter</button>
                  <button onClick={saveIPs} disabled={savingIPs} className='px-3 py-1.5 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 disabled:opacity-40'>
                     {savingIPs ? '...' : 'Enregistrer'}
                  </button>
               </div>
            </div>

            {/* Endpoints */}
            <div className='space-y-4'>
               {ENDPOINTS.map((ep) => (
                  <div key={ep.path + ep.method} className='border border-gray-200 rounded overflow-hidden'>
                     <div className='flex items-center gap-3 px-4 py-3 bg-white'>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${methodColor[ep.method]}`}>
                           {ep.method}
                        </span>
                        <code className='text-sm font-mono text-gray-800'>
                           {ep.path}{ep.params && <span className='text-gray-400'>{ep.params}</span>}
                        </code>
                     </div>
                     <div className='px-4 pb-4 bg-gray-50 border-t border-gray-100'>
                        <p className='text-sm text-gray-600 mt-2 mb-3'>{ep.description}</p>
                        {ep.body && (
                           <div className='mb-3'>
                              <p className='text-xs font-semibold text-gray-500 mb-1'>Body JSON</p>
                              <code className='block bg-gray-800 text-green-300 text-xs rounded p-3 whitespace-pre-wrap'>
                                 {ep.body}
                              </code>
                           </div>
                        )}
                        <p className='text-xs font-semibold text-gray-500 mb-1'>Exemple</p>
                        <code className='block bg-gray-800 text-green-300 text-xs rounded p-3 whitespace-pre-wrap overflow-auto'>
                           {ep.example.replace(/{APIKEY}/g, apiKey || 'YOUR_API_KEY')}
                        </code>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
   );
};

export default ApiDocs;
