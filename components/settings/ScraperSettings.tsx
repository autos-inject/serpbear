/* eslint-disable max-len, no-nested-ternary */
import React, { useState, useEffect, useCallback } from 'react';
import { useClearFailedQueue } from '../../services/settings';
import Icon from '../common/Icon';
import SelectField, { SelectionOption } from '../common/SelectField';
import ToggleField from '../common/ToggleField';

type KeyBalance = {
   id: string,
   label: string,
   provider: string,
   balance: number | null,
   total: number | null,
   error: string | null,
}

type ScraperSettingsProps = {
   settings: SettingsType,
   settingsError: null | { type: string, msg: string },
   updateSettings: Function,
}

type NewKeyForm = { label: string, key: string }

const maskKey = (key: string) => {
   if (!key || key.length < 8) return '••••••••';
   return `${'•'.repeat(Math.min(key.length - 6, 20))}${key.slice(-6)}`;
};

const ScraperSettings = ({ settings, settingsError, updateSettings }: ScraperSettingsProps) => {
   const { mutate: clearFailedMutate, isLoading: clearingQueue } = useClearFailedQueue(() => {});
   const [showAddForm, setShowAddForm] = useState(false);
   const [newKey, setNewKey] = useState<NewKeyForm>({ label: '', key: '' });
   const [balances, setBalances] = useState<KeyBalance[]>([]);
   const [loadingBalances, setLoadingBalances] = useState(false);

   const fetchBalances = useCallback(async () => {
      setLoadingBalances(true);
      try {
         const res = await fetch('/api/settings?balance=true', { credentials: 'include' });
         const data = await res.json();
         if (data.balances) setBalances(data.balances);
      } catch (e) { /* silent */ } finally {
         setLoadingBalances(false);
      }
   }, []);

   useEffect(() => {
      if (settings.scraper_type !== 'none' && settings.scraper_type !== 'proxy') {
         fetchBalances();
      }
   }, [settings.scraper_type, fetchBalances]);

   const scrapingOptions: SelectionOption[] = [
      { label: 'Daily', value: 'daily' },
      { label: 'Every Other Day', value: 'other_day' },
      { label: 'Weekly', value: 'weekly' },
      { label: 'Monthly', value: 'monthly' },
      { label: 'Never', value: 'never' },
   ];
   const delayOptions: SelectionOption[] = [
      { label: 'No Delay', value: '0' },
      { label: '5 Seconds', value: '5000' },
      { label: '10 Seconds', value: '10000' },
      { label: '30 Seconds', value: '30000' },
      { label: '1 Minutes', value: '60000' },
      { label: '2 Minutes', value: '120000' },
      { label: '5 Minutes', value: '300000' },
      { label: '10 Minutes', value: '600000' },
      { label: '15 Minutes', value: '900000' },
      { label: '30 Minutes', value: '1800000' },
   ];
   const strategyOptions: SelectionOption[] = [
      { label: 'Basic (First page only — 10 results)', value: 'basic' },
      { label: 'Custom (Set number of pages)', value: 'custom' },
      { label: 'Smart (Based on last known position)', value: 'smart' },
   ];
   const paginationLimitOptions: SelectionOption[] = Array.from({ length: 10 }, (_, i) => (
      { label: `${i + 1} Page${i > 0 ? 's' : ''}`, value: String(i + 1) }
   ));
   const allScrapers: SelectionOption[] = settings.available_scrapers ? settings.available_scrapers : [];
   const scraperOptions: SelectionOption[] = [{ label: 'None', value: 'none' }, ...allScrapers];
   const labelStyle = 'mb-2 font-semibold inline-block text-sm text-gray-700 capitalize';

   const currentKeys: ApiKeyEntry[] = (settings.scaping_apis || []).filter(
      (k) => k.provider === settings.scraper_type,
   );
   const hasExhausted = currentKeys.some((k) => k.exhausted);
   const showMultiKey = settings.scraper_type !== 'none' && settings.scraper_type !== 'proxy';

   const addKey = () => {
      if (!newKey.key.trim()) return;
      const entry: ApiKeyEntry = {
         id: `${settings.scraper_type}_${Date.now()}`,
         label: newKey.label.trim() || `Key ${currentKeys.length + 1}`,
         provider: settings.scraper_type,
         key: newKey.key.trim(),
         exhausted: false,
         requestCount: 0,
      };
      const updated = [...(settings.scaping_apis || []), entry];
      updateSettings('scaping_apis', updated);
      // Sync first key to legacy scaping_api field for backward compat
      const activeKeys = updated.filter((k) => k.provider === settings.scraper_type && !k.exhausted);
      if (activeKeys.length === 1) updateSettings('scaping_api', entry.key);
      setNewKey({ label: '', key: '' });
      setShowAddForm(false);
   };

   const removeKey = (id: string) => {
      const updated = (settings.scaping_apis || []).filter((k) => k.id !== id);
      updateSettings('scaping_apis', updated);
      const activeKeys = updated.filter((k) => k.provider === settings.scraper_type && !k.exhausted);
      updateSettings('scaping_api', activeKeys[0]?.key || '');
   };

   const resetExhausted = () => {
      const updated = (settings.scaping_apis || []).map((k) => (
         k.provider === settings.scraper_type ? { ...k, exhausted: false } : k
      ));
      updateSettings('scaping_apis', updated);
   };

   return (
      <div>
         <div className='settings__content styled-scrollbar p-6 text-sm'>

            <div className="settings__section__select mb-5">
               <SelectField
                  label='Scraping Method'
                  options={scraperOptions}
                  selected={[settings.scraper_type || 'none']}
                  defaultLabel="Select Scraper"
                  updateField={(updatedTime: [string]) => updateSettings('scraper_type', updatedTime[0])}
                  multiple={false}
                  rounded={'rounded'}
                  minWidth={220}
               />
            </div>

            {showMultiKey && (
               <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                     <label className={labelStyle}>API Keys</label>
                     <div className="flex gap-2">
                        <button
                           onClick={fetchBalances}
                           disabled={loadingBalances}
                           className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                           title="Refresh balances"
                        >
                           {loadingBalances ? <Icon type="loading" size={12} /> : '↻ Balance'}
                        </button>
                        {hasExhausted && (
                           <button
                              onClick={resetExhausted}
                              className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                           >
                              Reset exhausted
                           </button>
                        )}
                        <button
                           onClick={() => setShowAddForm(!showAddForm)}
                           className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1"
                        >
                           <Icon type="add" size={12} /> Add Key
                        </button>
                     </div>
                  </div>

                  {currentKeys.length === 0 && !showAddForm && (
                     <div className={`w-full p-3 border rounded text-gray-400 text-xs text-center ${settingsError?.type === 'no_api_key' ? 'border-red-400' : 'border-gray-200'}`}>
                        No API keys — click &quot;Add Key&quot; to add one
                     </div>
                  )}

                  {currentKeys.length > 0 && (
                     <div className="border border-gray-200 rounded overflow-hidden mb-2">
                        {currentKeys.map((entry, idx) => {
                           const bal = balances.find((b) => b.id === entry.id);
                           const hasBalance = bal && bal.balance !== null;
                           const pct = hasBalance && bal.total ? Math.round((bal.balance! / bal.total) * 100) : null;
                           const balColor = !hasBalance ? 'text-gray-400'
                              : bal.balance! > 500 ? 'text-green-600'
                              : bal.balance! > 100 ? 'text-amber-600' : 'text-red-600';
                           return (
                              <div
                                 key={entry.id}
                                 className={`flex items-center gap-2 px-3 py-2 text-xs ${idx > 0 ? 'border-t border-gray-100' : ''} ${entry.exhausted ? 'bg-red-50' : 'bg-white'}`}
                              >
                                 <span className={`w-2 h-2 rounded-full flex-shrink-0 ${entry.exhausted ? 'bg-red-400' : 'bg-green-400'}`} />
                                 <span className="font-medium text-gray-700 min-w-[70px] truncate">{entry.label}</span>
                                 <span className="font-mono text-gray-400 flex-1 truncate">{maskKey(entry.key)}</span>
                                 <span className={`font-medium flex-shrink-0 ${balColor}`}>
                                    {loadingBalances && '…'}
                                    {!loadingBalances && hasBalance && (
                                       <>
                                          {bal!.balance!.toLocaleString()}
                                          {bal!.total ? ` / ${bal!.total.toLocaleString()}` : ' crédits'}
                                          {pct !== null && ` (${pct}%)`}
                                       </>
                                    )}
                                    {!loadingBalances && !hasBalance && bal?.error && <span title={bal.error}>— crédits</span>}
                                 </span>
                                 <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${entry.exhausted ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                    {entry.exhausted ? 'Exhausted' : 'Active'}
                                 </span>
                                 <button
                                    onClick={() => removeKey(entry.id)}
                                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 ml-1"
                                    title="Remove key"
                                 >
                                    <Icon type="close" size={14} />
                                 </button>
                              </div>
                           );
                        })}
                     </div>
                  )}

                  {showAddForm && (
                     <div className="border border-blue-200 rounded p-3 bg-blue-50 mt-2">
                        <div className="flex gap-2 mb-2">
                           <input
                              type="text"
                              placeholder="Label (ex: Compte 1)"
                              value={newKey.label}
                              onChange={(e) => setNewKey({ ...newKey, label: e.target.value })}
                              className="flex-1 p-2 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-300 bg-white"
                           />
                        </div>
                        <div className="flex gap-2">
                           <input
                              type="text"
                              placeholder="API Key"
                              value={newKey.key}
                              onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                              className="flex-1 p-2 border border-gray-200 rounded text-xs font-mono focus:outline-none focus:border-blue-300 bg-white"
                           />
                           <button
                              onClick={addKey}
                              disabled={!newKey.key.trim()}
                              className="px-3 py-2 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                           >
                              Add
                           </button>
                           <button
                              onClick={() => { setShowAddForm(false); setNewKey({ label: '', key: '' }); }}
                              className="px-3 py-2 rounded bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors"
                           >
                              Cancel
                           </button>
                        </div>
                     </div>
                  )}

                  {currentKeys.length > 0 && (
                     <p className="text-xs text-gray-400 mt-1">
                        Keys are tried in order. Exhausted keys (quota reached) are skipped automatically.
                     </p>
                  )}
               </div>
            )}

            {settings.scraper_type === 'proxy' && (
               <div className="settings__section__input mb-5">
                  <label className={labelStyle}>Proxy List</label>
                  <textarea
                     className={`w-full p-2 border border-gray-200 rounded mb-3 text-xs focus:outline-none min-h-[160px] focus:border-blue-200 ${settingsError?.type === 'no_email' ? ' border-red-400 focus:border-red-400' : ''}`}
                     value={settings?.proxy}
                     placeholder={'http://122.123.22.45:5049\nhttps://user:password@122.123.22.45:5049'}
                     onChange={(event) => updateSettings('proxy', event.target.value)}
                  />
               </div>
            )}

            {settings.scraper_type !== 'none' && (
               <div className="settings__section__input mb-5">
                  <SelectField
                     label='Scraping Frequency'
                     multiple={false}
                     selected={[settings?.scrape_interval || 'daily']}
                     options={scrapingOptions}
                     defaultLabel={'Notification Settings'}
                     updateField={(updated: string[]) => updated[0] && updateSettings('scrape_interval', updated[0])}
                     rounded='rounded'
                     maxHeight={48}
                     minWidth={220}
                  />
                  <small className=' text-gray-500 pt-2 block'>This option requires Server/Docker Instance Restart to take Effect.</small>
               </div>
            )}

            <div className="settings__section__input mb-5">
               <SelectField
                  label='keyword Scrape Delay'
                  multiple={false}
                  selected={[settings?.scrape_delay || '0']}
                  options={delayOptions}
                  defaultLabel={'Delay Settings'}
                  updateField={(updated: string[]) => updated[0] && updateSettings('scrape_delay', updated[0])}
                  rounded='rounded'
                  maxHeight={48}
                  minWidth={220}
               />
               <small className=' text-gray-500 pt-2 block'>This option requires Server/Docker Instance Restart to take Effect.</small>
            </div>

            <div className="settings__section__input mb-5">
               <ToggleField
                  label='Auto Retry Failed Keyword Scrape'
                  value={!!settings?.scrape_retry}
                  onChange={(val) => updateSettings('scrape_retry', val)}
               />
            </div>

            {settings.scraper_type !== 'none' && (
               <div className="settings__section__select mb-5">
                  <SelectField
                     label='Scrape Strategy'
                     options={strategyOptions}
                     selected={[settings?.scrape_strategy || 'basic']}
                     defaultLabel="Select Strategy"
                     updateField={(updated: string[]) => updated[0] && updateSettings('scrape_strategy', updated[0])}
                     multiple={false}
                     rounded={'rounded'}
                     minWidth={220}
                  />
                  <small className='text-gray-500 pt-2 block'>
                     {(!settings.scrape_strategy || settings.scrape_strategy === 'basic') && 'Scrape only the first page (10 results). Fastest, uses least API credits.'}
                     {settings.scrape_strategy === 'custom' && 'Scrape a fixed number of pages per keyword on every refresh.'}
                     {settings.scrape_strategy === 'smart' && 'Scrape the page where the keyword was last seen, plus its neighbors.'}
                  </small>
               </div>
            )}

            {settings.scraper_type !== 'none' && settings.scrape_strategy === 'custom' && (
               <div className="settings__section__select mb-5">
                  <SelectField
                     label='Number of Pages to Scrape'
                     options={paginationLimitOptions}
                     selected={[String(settings?.scrape_pagination_limit || 5)]}
                     defaultLabel="Select Page Count"
                     updateField={(updated: string[]) => updated[0] && updateSettings('scrape_pagination_limit', parseInt(updated[0], 10))}
                     multiple={false}
                     rounded={'rounded'}
                     minWidth={220}
                  />
                  <small className='text-gray-500 pt-2 block'>Each page returns up to 10 results. 5 pages = top 50 results checked.</small>
               </div>
            )}

            {settings.scraper_type !== 'none' && settings.scrape_strategy === 'smart' && (
               <div className="settings__section__input mb-5">
                  <ToggleField
                     label='Full Fallback: Scrape all pages if not found on nearby pages'
                     value={!!settings?.scrape_smart_full_fallback}
                     onChange={(val) => updateSettings('scrape_smart_full_fallback', val)}
                  />
                  <small className='text-gray-500 pt-2 block'>
                     When enabled, all 10 pages will be scraped if the keyword is not found near its last known position.
                  </small>
               </div>
            )}

            {settings?.scrape_retry && (settings.failed_queue?.length || 0) > 0 && (
               <div className="settings__section__input mb-5">
                  <label className={labelStyle}>Clear Failed Retry Queue</label>
                  <button
                     onClick={() => clearFailedMutate()}
                     className=' py-3 px-5 w-full rounded cursor-pointer bg-gray-100 text-gray-800 font-semibold text-sm hover:bg-gray-200'>
                     {clearingQueue && <Icon type="loading" size={14} />} Clear Failed Queue
                     ({settings.failed_queue?.length || 0} Keywords)
                  </button>
               </div>
            )}
         </div>
      </div>
   );
};

export default ScraperSettings;
