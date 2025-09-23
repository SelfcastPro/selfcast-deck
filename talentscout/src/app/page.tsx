'use client';

import { useEffect, useState } from 'react';
import { Filters } from '@/components/Filters';
import { ProfileCard } from '@/components/ProfileCard';
import DMComposer from '@/components/DMComposer';
import type { ProfileDTO } from '@/types';

export default function Page() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [data, setData] = useState<ProfileDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProfileDTO | null>(null);
  
  async function load() {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
      try {
      const res = await fetch(`/api/profiles?${params.toString()}`);

      if (!res.ok) {
        let message = `Failed to load profiles (${res.status})`;
        const details = (await res.text()).trim();
        if (details) {
          message = `${message}: ${details}`;
        } else if (res.statusText) {
          message = `${message}: ${res.statusText}`;
        }
        setError(message);
        setData([]);
        return;
      }

      const json = await res.json();
      setData(Array.isArray(json.items) ? json.items : []);
      setError(null);
    } catch (err) {
      setError('An unexpected error occurred while loading profiles.');
      setData([]);
    }
  }

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [q, status]);

  return (
    <div className="space-y-4">
      <Filters
        q={q}
        status={status}
        onChange={({ q, status }) => {
          setQ(q);
          setStatus(status);
        }}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
            {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}        
          {data.map((p) => (
            <div key={p.id} onClick={() => setSelected(p)} className="cursor-pointer">
              <ProfileCard p={p} onStatusChanged={() => load()} />
            </div>
          ))}
          {data.length === 0 && (
            <div className="text-sm text-neutral-500">
              No profiles yet. Hook up Apify ingest or adjust filters.
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="card">
            <h2 className="mb-2 text-lg font-semibold">DM Composer</h2>
            {selected ? (
              <DMComposer
                username={`@${selected.username}`}
                onCopied={() => alert('DM copied to clipboard')}
              />
            ) : (
              <p className="text-sm text-neutral-400">Select a profile to compose a DM.</p>
            )}
          </div>
          <div className="card text-sm text-neutral-400">
            <b>Tip:</b> Mark as Contacted immediately after you DM to lock the lead for everyone.
          </div>
        </div>
      </div>
    </div>
  );
}
