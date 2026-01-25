import { SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('Guardian worker', () => {
	it('returns empty history on GET and handles unsupported methods', async () => {
		// Test GET returns empty history
		const getResponse = await SELF.fetch('https://example.com');
		expect(await getResponse.text()).toMatchInlineSnapshot(`"[]"`);

		// Test unsupported method returns 405
		const deleteResponse = await SELF.fetch('https://example.com', { method: 'DELETE' });
		expect(deleteResponse.status).toBe(405);
	});
});
