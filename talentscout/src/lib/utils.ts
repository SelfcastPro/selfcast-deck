## `src/lib/utils.ts`
```ts
export function clsx(...args: Array<string | false | null | undefined>) {
return args.filter(Boolean).join(' ');
}


export const STATUS_OPTIONS = [
{ value: 'NEW', label: 'New' },
{ value: 'CONTACTED', label: 'Contacted' },
{ value: 'REPLIED', label: 'Replied' },
{ value: 'SIGNED_UP', label: 'Signed up' },
{ value: 'NOT_INTERESTED', label: 'Not interested' },
] as const;
```
