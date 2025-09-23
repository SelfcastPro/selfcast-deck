## `src/components/DMComposer.tsx`
```tsx
'use client';
import { useMemo, useState } from 'react';


export default function DMComposer({ username, onCopied }: { username: string; onCopied?: () => void }) {
const [name, setName] = useState('');
const [handle1, setHandle1] = useState('@selfcastapp');
const [handle2, setHandle2] = useState('');
const [handle3, setHandle3] = useState('');


const message = useMemo(() => {
const handles = [handle1, handle2, handle3].filter(Boolean).join(' | ');
return (
`Hi ${username},
We’re inviting selected talents like you to join **Selfcast** – the fastest-growing international casting platform. Clients, casters, and producers can book talents directly in the Selfcast app – with 0% commission fees.


Download the Selfcast app on App Store or Google Play: <add your smartlink>


When you have created your profile, please email support@selfcast.com and we’ll activate 3 months FREE subscription so you can apply for roles and jobs worldwide.


Best regards,
${name}
${handles}`
);
}, [username, name, handle1, handle2, handle3]);


async function copy() {
await navigator.clipboard.writeText(message);
onCopied?.();
}


return (
<div className="card space-y-3">
<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
<input className="input" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
<input className="input" placeholder="@selfcastapp" value={handle1} onChange={e => setHandle1(e.target.value)} />
<input className="input" placeholder="@your_profile (optional)" value={handle2} onChange={e => setHandle2(e.target.value)} />
<input className="input md:col-span-3" placeholder="@second_selfcast_profile (optional)" value={handle3} onChange={e => setHandle3(e.target.value)} />
</div>
<textarea className="input h-40" value={message} readOnly />
<button className="btn btn-primary" onClick={copy}>Copy DM to clipboard</button>
<p className="text-xs text-neutral-500">Paste this into Instagram DM manually to avoid automation blocks.</p>
</div>
);
}
```
