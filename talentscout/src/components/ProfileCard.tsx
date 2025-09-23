'use client';
import { useState } from 'react';
import { ProfileDTO } from '@/types';


export function ProfileCard({ p, onStatusChanged }: { p: ProfileDTO; onStatusChanged: (s: string) => void; }) {
const [loading, setLoading] = useState(false);


async function updateStatus(status: string) {
setLoading(true);
try {
const res = await fetch(`/api/profiles/${p.id}/status`, {
method: 'PATCH',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ status })
});

if (!res.ok) {
let errorMessage = res.statusText || 'Failed to update status.';
const responseText = await res.text();
const trimmedResponse = responseText.trim();

if (trimmedResponse) {
try {
const data = JSON.parse(trimmedResponse) as { message?: string; error?: string };
errorMessage = data.message ?? data.error ?? errorMessage;
} catch (parseError) {
console.error('Unable to parse error response', parseError);
errorMessage = trimmedResponse;
}
}

throw new Error(errorMessage);
}

onStatusChanged(status);
} catch (err) {
const message = err instanceof Error ? err.message : 'Failed to update status.';
console.error('Failed to update profile status', err);
window.alert(message);
} finally {
setLoading(false);
}
}


return (
<div className="card flex items-start gap-4">
<img src={p.avatarUrl ?? '/favicon.ico'} alt={p.username} className="h-16 w-16 rounded-full object-cover" />
<div className="flex-1">
<div className="flex items-center gap-2">
<a href={p.profileUrl} target="_blank" className="font-medium hover:underline">@{p.username}</a>
{p.followers ? <span className="badge">{p.followers.toLocaleString()} followers</span> : null}
{p.sourceHashtag ? <span className="badge">#{p.sourceHashtag}</span> : null}
{p.country ? <span className="badge">{p.country}</span> : null}
</div>
{p.fullName ? <div className="text-sm text-neutral-300">{p.fullName}</div> : null}
{p.bio ? <div className="mt-1 text-sm text-neutral-400 line-clamp-2">{p.bio}</div> : null}
<div className="mt-3 flex flex-wrap gap-2">
<button disabled={loading} className="btn btn-primary" onClick={() => updateStatus('CONTACTED')}>Mark as Contacted</button>
<button disabled={loading} className="btn bg-neutral-800" onClick={() => updateStatus('REPLIED')}>Replied</button>
<button disabled={loading} className="btn bg-neutral-800" onClick={() => updateStatus('SIGNED_UP')}>Signed up</button>
<button disabled={loading} className="btn bg-neutral-800" onClick={() => updateStatus('NOT_INTERESTED')}>Not interested</button>
</div>
</div>
</div>
);
}
