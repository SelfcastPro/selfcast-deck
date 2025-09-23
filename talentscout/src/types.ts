export type ProfileDTO = {
id: string;
username: string;
fullName?: string | null;
bio?: string | null;
profileUrl: string;
avatarUrl?: string | null;
followers?: number | null;
sourceHashtag?: string | null;
country?: string | null;
status: 'NEW' | 'CONTACTED' | 'REPLIED' | 'SIGNED_UP' | 'NOT_INTERESTED';
};
