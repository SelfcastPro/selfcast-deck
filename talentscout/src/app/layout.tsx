import './globals.css';
import Link from 'next/link';
import { cookies } from 'next/headers';


export const metadata = { title: 'TalentScout – SelfcastPro' };


export default function RootLayout({ children }: { children: React.ReactNode }) {
const cookieStore = cookies();
const scoutName = cookieStore.get('scout-name')?.value;


return (
<html lang="en">
<body>
<header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
<div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
<div className="flex items-center gap-3">
<div className="h-3 w-3 rounded-full bg-brand" />
<Link href="/" className="font-semibold">TalentScout</Link>
<nav className="ml-6 hidden gap-4 text-sm md:flex">
<Link href="/">Dashboard</Link>
</nav>
</div>
<div className="text-xs text-neutral-400">{scoutName ? `Signed in as ${scoutName}` : ''}</div>
</div>
</header>
<main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
</body>
</html>
);
}
