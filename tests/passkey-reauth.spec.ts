import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { expect, test, type Page } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../server/data/preprint-explorer.sqlite');

const seededUserId = 'aris_thorne';
const seededEmail = 'aris.thorne@uzh.ch';
const seededPassword = 'password123';
const staleRecentAuthAt = new Date(Date.now() - 1000 * 60 * 30).toISOString();

function withDatabase<T>(run: (db: Database.Database) => T) {
  const db = new Database(dbPath);
  try {
    return run(db);
  } finally {
    db.close();
  }
}

function resetSeededPasskeys() {
  withDatabase((db) => {
    db.prepare('DELETE FROM passkeys WHERE user_id = ?').run(seededUserId);
  });
}

function staleSession(sessionToken: string) {
  withDatabase((db) => {
    db.prepare('UPDATE sessions SET recent_auth_at = ? WHERE token = ?').run(staleRecentAuthAt, sessionToken);
  });
}

async function attachVirtualAuthenticator(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send('WebAuthn.enable');
  await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

test.beforeEach(async () => {
  resetSeededPasskeys();
});

test('uses a passkey for recent-auth step-up before passkey removal', async ({ page }) => {
  await attachVirtualAuthenticator(page);

  await page.goto('/');
  await page.getByPlaceholder('aris.thorne@uzh.ch').fill(seededEmail);
  await page.getByPlaceholder('••••••••').fill(seededPassword);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByRole('button', { name: 'Profile' })).toBeVisible();

  await page.getByRole('button', { name: 'Profile' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Security' }).click();
  await page.getByRole('button', { name: /Passkeys/ }).click();

  await expect(page.getByRole('heading', { name: 'Passkeys' })).toBeVisible();

  await page.getByPlaceholder('Optional label, e.g. MacBook Pro').fill('Playwright Virtual Passkey');
  await page.getByRole('button', { name: 'Add Passkey' }).click();

  await expect(page.getByText('Playwright Virtual Passkey')).toBeVisible();

  const sessionCookie = (await page.context().cookies()).find((cookie) => cookie.name === 'preprint_explorer_session');
  expect(sessionCookie?.value).toBeTruthy();
  staleSession(sessionCookie!.value);

  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByRole('heading', { name: 'Confirm Passkey Removal' })).toBeVisible();
  await page.getByRole('button', { name: 'Remove Passkey' }).click();

  const usePasskeyButton = page.getByRole('button', { name: 'Use Passkey' });
  await expect(usePasskeyButton).toBeVisible();
  await usePasskeyButton.click();

  await expect(page.getByText('No passkeys registered yet.')).toBeVisible();
  await expect(page.getByText('Passkey removed')).toBeVisible();
});
