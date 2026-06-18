/* eslint-disable quotes, max-len */
import type { NextPage } from 'next';
import Head from 'next/head';
import React, { useState } from 'react';
import TopBar from '../../components/common/TopBar';

const API_KEY = process.env.NEXT_PUBLIC_APIKEY || 'YOUR_API_KEY';

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
      example: `curl -X POST -H "Authorization: Bearer {APIKEY}" -H "Content-Type: application/json" \\
  -d '{"username":"john","password":"secret","role":"viewer"}' \\
  https://serpbear.turbo-platinium.com/api/v1/users`,
   },
   {
      method: 'PUT',
      path: '/api/v1/users',
      description: 'Modifie un utilisateur (role, email, password)',
      body: '{ "ID": 1, "role": "admin" }',
      example: `curl -X PUT -H "Authorization: Bearer {APIKEY}" -H "Content-Type: application/json" \\
  -d '{"ID":2,"role":"admin"}' \\
  https://serpbear.turbo-platinium.com/api/v1/users`,
   },
   {
      method: 'DELETE',
      path: '/api/v1/users',
      description: 'Supprime un utilisateur',
      body: '{ "ID": 2 }',
      example: `curl -X DELETE -H "Authorization: Bearer {APIKEY}" -H "Content-Type: application/json" \\
  -d '{"ID":2}' \\
  https://serpbear.turbo-platinium.com/api/v1/users`,
   },
];

const methodColor: Record<string, string> = {
   GET: 'bg-blue-100 text-blue-700',
   POST: 'bg-green-100 text-green-700',
   PUT: 'bg-yellow-100 text-yellow-700',
   DELETE: 'bg-red-100 text-red-700',
};

const ApiDocs: NextPage = () => {
   const [copied, setCopied] = useState(false);
   const [apiKey, setApiKey] = useState('');

   React.useEffect(() => {
      fetch('/api/settings').then((r) => r.json()).then((d) => {
         if (d?.settings?.apikey) setApiKey(d.settings.apikey);
      }).catch(() => {});
   }, []);

   const displayKey = apiKey || API_KEY;

   const copyKey = () => {
      navigator.clipboard.writeText(displayKey).then(() => {
         setCopied(true);
         setTimeout(() => setCopied(false), 2000);
      });
   };

   return (
      <div>
         <Head><title>API — SerpBear</title></Head>
         <TopBar showSettings={() => {}} showAddModal={() => {}} />
         <div className='max-w-4xl mx-auto px-4 py-8'>
            <h1 className='text-2xl font-bold text-gray-800 mb-2'>API Documentation</h1>
            <p className='text-sm text-gray-500 mb-6'>Toutes les routes utilisent l&apos;authentification Bearer token.</p>

            <div className='bg-gray-50 border border-gray-200 rounded p-4 mb-8'>
               <p className='text-xs font-semibold text-gray-600 mb-2'>Votre clé API</p>
               <div className='flex items-center gap-2'>
                  <code className='flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm font-mono text-gray-800 overflow-auto'>
                     {displayKey}
                  </code>
                  <button
                     onClick={copyKey}
                     className='px-3 py-2 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700'
                  >
                     {copied ? '✓ Copié' : 'Copier'}
                  </button>
               </div>
               <p className='text-xs text-gray-400 mt-2'>
                  Header : <code>Authorization: Bearer {displayKey}</code>
               </p>
            </div>

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
                           {ep.example.replace(/{APIKEY}/g, displayKey)}
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
