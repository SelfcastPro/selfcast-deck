'use client';
import { STATUS_OPTIONS } from '@/lib/utils';


export function Filters({
q, status, onChange
}: {
q: string; status: string; onChange: (next: { q: string; status: string }) => void;
}) {
return (
<div className="card mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
<input
className="input"
placeholder="Search username, bio, hashtag, country…"
value={q}
onChange={e => onChange({ q: e.target.value, status })}
/>
<select
className="select"
value={status}
onChange={e => onChange({ q, status: e.target.value })}
>
<option value="">All statuses</option>
{STATUS_OPTIONS.map(o => (
<option key={o.value} value={o.value}>{o.label}</option>
))}
</select>
<div className="flex items-center justify-end text-xs text-neutral-400">Filters</div>
</div>
);
}
