import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import crypto from 'node:crypto';
import type { RequestHandler } from './$types';

function decrypt(encryptedBase64: string): string {
	const secret = env.GITHUB_CLIENT_SECRET;
	if (!secret) throw new Error('GITHUB_CLIENT_SECRET is not configured');
	const key = crypto.createHash('sha256').update(secret).digest();
	const buf = Buffer.from(encryptedBase64, 'base64');
	const iv = buf.subarray(0, 12);
	const tag = buf.subarray(12, 28);
	const encrypted = buf.subarray(28);
	const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
	decipher.setAuthTag(tag);
	return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
}

export const POST: RequestHandler = async ({ cookies }) => {
	const encrypted = cookies.get('github_credentials');
	if (!encrypted) {
		error(401, 'No GitHub credentials found');
	}

	cookies.delete('github_credentials', { path: '/api/auth/github' });

	try {
		const { email, password } = JSON.parse(decrypt(encrypted));
		return json({ email, password });
	} catch {
		error(401, 'Invalid or expired credentials');
	}
};
