export const TOTAL_REQUIRED_HOURS = 400;

export const INTERNSHIP_START_DATE = new Date('2026-01-26T00:00:00');

export const ADMIN_EMAILS = [
	'jerwincruz53@gmail.com',
	'johnchristianleoncio4@gmail.com',
] as const;

export function isAdminEmail(email?: string | null): boolean {
	if (!email) return false;
	const normalizedEmail = email.trim().toLowerCase();
	return ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === normalizedEmail);
}
