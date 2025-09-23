## `src/app/login/page.tsx`
```tsx
'use client';
import { useState } from 'react';


export default function LoginPage() {
const [name, setName] = useState('');


async function signIn(e: React.FormEvent) {
e.preventDefault();
document.cookie = `scout-name=${encodeURIComponent(name)}; path=/; max-age=${60 * 60 * 24 * 365}`;
window.location.href = '/';
}


return (
<div className="mx-auto mt-20 max-w-md space-y-4">
<h1 className="text-2xl font-semibold">Sign in to TalentScout</h1>
<form onSubmit={signIn} className="card space-y-3">
<label className="block text-sm">Your name (visible to teammates)</label>
<input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Maria" required />
<button className="btn btn-primary w-full" type="submit">Enter</button>
</form>
<p className="text-xs text-neutral-500">This is a lightweight dev login. Replace with NextAuth/SAML later.</p>
</div>
);
}
```
