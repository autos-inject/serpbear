import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Icon from './Icon';

const CURRENT_VERSION = '3.1.0';
const UPDATE_CACHE_KEY = 'serpbear_update_check';

function useUpdateCheck() {
   const [latestVersion, setLatestVersion] = useState<string | null>(null);
   const [checking, setChecking] = useState(false);
   const [lastChecked, setLastChecked] = useState<string | null>(null);

   const check = (force = false) => {
      if (checking) return;
      try {
         if (!force) {
            const cached = localStorage.getItem(UPDATE_CACHE_KEY);
            if (cached) {
               const { version, ts } = JSON.parse(cached);
               if (Date.now() - ts < 3600000) {
                  setLatestVersion(version);
                  setLastChecked(new Date(ts).toLocaleTimeString());
                  return;
               }
            }
         }
      } catch { /* ignore */ }
      setChecking(true);
      fetch('https://api.github.com/repos/towfiqi/serpbear/releases/latest')
         .then((r) => r.json())
         .then((data) => {
            const tag = (data?.tag_name || '').replace(/^v/, '');
            const ts = Date.now();
            localStorage.setItem(UPDATE_CACHE_KEY, JSON.stringify({ version: tag, ts }));
            setLatestVersion(tag);
            setLastChecked(new Date(ts).toLocaleTimeString());
         })
         .catch(() => { /* ignore */ })
         .finally(() => setChecking(false));
   };

   useEffect(() => { check(); }, []);

   const hasUpdate = latestVersion !== null && latestVersion !== CURRENT_VERSION;
   return { latestVersion, hasUpdate, checking, lastChecked, checkNow: () => check(true) };
}

type TopbarProps = {
   showSettings: Function,
   showAddModal: Function,
}

const TopBar = ({ showSettings, showAddModal }:TopbarProps) => {
   const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);
   const router = useRouter();
   const isDomainsPage = router.pathname === '/domains';
   const { latestVersion, hasUpdate, checking, lastChecked, checkNow } = useUpdateCheck();

   const logoutUser = async () => {
      try {
         const fetchOpts = { method: 'POST', headers: new Headers({ 'Content-Type': 'application/json', Accept: 'application/json' }) };
         const res = await fetch(`${window.location.origin}/api/logout`, fetchOpts).then((result) => result.json());
         console.log(res);
         if (!res.success) {
            toast(res.error, { icon: '⚠️' });
         } else {
            router.push('/login');
         }
      } catch (fetchError) {
         toast('Could not logout, The Server is not responsive.', { icon: '⚠️' });
      }
   };

   return (
      <>
      <div className={`w-full border-b px-4 py-1 flex items-center justify-between text-xs
         ${hasUpdate ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
         <span>
            Version actuelle : <strong>v{CURRENT_VERSION}</strong>
            {latestVersion && (
               <span className='ml-2'>
                  — Upstream : <strong className={hasUpdate ? 'text-amber-700' : 'text-green-600'}>v{latestVersion}</strong>
                  {hasUpdate && (
                     <a
                        href='https://github.com/towfiqi/serpbear/releases'
                        target='_blank'
                        rel='noreferrer'
                        className='ml-2 underline font-semibold text-amber-700'
                     >
                        Voir les changements
                     </a>
                  )}
               </span>
            )}
            {lastChecked && <span className='ml-2 text-gray-400'>({lastChecked})</span>}
         </span>
         <button
            onClick={checkNow}
            disabled={checking}
            className='ml-4 px-2 py-0.5 border border-gray-300 rounded text-xs hover:bg-gray-100 disabled:opacity-50'
         >
            {checking ? '...' : 'Vérifier'}
         </button>
      </div>
       <div className={`topbar flex w-full mx-auto justify-between
       ${isDomainsPage ? 'max-w-5xl lg:justify-between' : 'max-w-7xl lg:justify-end'}  bg-white lg:bg-transparent`}>

         <h3 className={`p-4 text-base font-bold text-blue-700 ${isDomainsPage ? 'lg:pl-0' : 'lg:hidden'}`}>
            <span className=' relative top-[3px] mr-1'><Icon type="logo" size={24} color="#364AFF" /></span> SerpBear
            <button className='px-3 py-1 font-bold text-blue-700  lg:hidden ml-3 text-lg' onClick={() => showAddModal()}>+</button>
         </h3>
         {!isDomainsPage && router.asPath !== '/research' && (
            <Link href={'/domains'} passHref={true}>
               <a className=' right-14 top-2 px-2 py-1 cursor-pointer bg-[#ecf2ff] hover:bg-indigo-100 transition-all
               absolute lg:top-3 lg:right-auto lg:left-8 lg:px-3 lg:py-2 rounded-full'>
                  <Icon type="caret-left" size={16} title="Go Back" />
               </a>
            </Link>
         )}
         <div className="topbar__right">
            <button className={' lg:hidden p-3'} onClick={() => setShowMobileMenu(!showMobileMenu)}>
               <Icon type="hamburger" size={24} />
            </button>
            <ul
            className={`text-sm font-semibold text-gray-500 absolute mt-[-10px] right-3 bg-white 
            border border-gray-200 lg:mt-2 lg:relative lg:block lg:border-0 lg:bg-transparent ${showMobileMenu ? 'block' : 'hidden'}`}>
               <li className={`block lg:inline-block lg:ml-5 ${router.asPath === '/domains' ? ' text-blue-700' : ''}`}>
                  <Link href={'/domains'} passHref={true}>
                     <a className='block px-3 py-2 cursor-pointer'>
                        <Icon type="domains" color={router.asPath === '/domains' ? '#1d4ed8' : '#888'} size={14} /> Domains
                     </a>
                  </Link>
               </li>
               <li className={`block lg:inline-block lg:ml-5 ${router.asPath === '/research' ? ' text-blue-700' : ''}`}>
                  <Link href={'/research'} passHref={true}>
                     <a className='block px-3 py-2 cursor-pointer'>
                        <Icon type="research" color={router.asPath === '/research' ? '#1d4ed8' : '#888'} size={14} /> Research
                     </a>
                  </Link>
               </li>
               <li className={`block lg:inline-block lg:ml-5 ${router.asPath === '/api-docs' ? ' text-blue-700' : ''}`}>
                  <Link href={'/api-docs'} passHref={true}>
                     <a className='block px-3 py-2 cursor-pointer'>
                        <Icon type="lock" color={router.asPath === '/api-docs' ? '#1d4ed8' : '#888'} size={14} /> API
                     </a>
                  </Link>
               </li>
               <li className='block lg:inline-block lg:ml-5'>
                  <a className='block px-3 py-2 cursor-pointer' onClick={() => showSettings()}>
                     <Icon type="settings-alt" color={'#888'} size={14} /> Settings
                  </a>
               </li>

               <li className='block lg:inline-block lg:ml-5'>
                  <a className='block px-3 py-2 cursor-pointer' onClick={() => logoutUser()}>
                     <Icon type="logout" color={'#888'} size={14} /> Logout
                  </a>
               </li>
            </ul>
         </div>
       </div>
      </>
   );
 };

 export default TopBar;
