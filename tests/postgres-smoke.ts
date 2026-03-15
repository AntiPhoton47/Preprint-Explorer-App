import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import process from 'node:process';
import EmbeddedPostgres from 'embedded-postgres';
import * as otplib from 'otplib';

type JsonValue = Record<string, unknown>;

class SessionClient {
  private cookies = new Map<string, string>();
  csrfToken: string | null = null;

  constructor(private readonly baseUrl: string) {}

  async requestRaw(pathname: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers ?? {});
    const cookieHeader = [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
    if (cookieHeader) {
      headers.set('cookie', cookieHeader);
    }
    if (this.csrfToken && init.method && init.method !== 'GET' && init.method !== 'HEAD' && init.method !== 'OPTIONS') {
      headers.set('x-csrf-token', this.csrfToken);
    }
    if (init.body && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    const response = await fetch(new URL(pathname, this.baseUrl), {
      ...init,
      headers,
    });

    for (const rawCookie of response.headers.getSetCookie()) {
      const [pair] = rawCookie.split(';');
      const [name, value] = pair.split('=');
      this.cookies.set(name, value);
    }

    const contentType = response.headers.get('content-type') ?? '';
    const body = contentType.includes('application/json')
      ? await response.json() as JsonValue
      : await response.text();

    if (typeof body === 'object' && body && 'csrfToken' in body && typeof body.csrfToken === 'string') {
      this.csrfToken = body.csrfToken;
    }

    return {
      status: response.status,
      ok: response.ok,
      body,
    };
  }

  async request<T = JsonValue | string>(pathname: string, init: RequestInit = {}) {
    const response = await this.requestRaw(pathname, init);
    if (!response.ok) {
      throw new Error(`Request ${pathname} failed with ${response.status}: ${JSON.stringify(response.body)}`);
    }
    return response.body as T;
  }
}

async function waitForHealth(baseUrl: string, timeoutMs = 30000, getLogs?: () => string) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(new URL('/api/health', baseUrl));
      if (response.ok) {
        return await response.json() as JsonValue;
      }
    } catch {
      // server still booting
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for API health check${getLogs ? `\n${getLogs()}` : ''}`);
}

async function stopProcess(child: ChildProcess) {
  if (child.exitCode !== null) {
    return;
  }
  child.kill('SIGTERM');
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 5000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'preprint-explorer-pg-'));
  const pgDataDir = path.join(tempRoot, 'embedded-postgres');
  const apiPort = 3027;
  const pgPort = 54329;
  const pgUser = 'postgres';
  const pgPassword = 'postgres';
  const databaseName = 'preprint_explorer';
  const baseUrl = `http://127.0.0.1:${apiPort}`;

  const postgres = new EmbeddedPostgres({
    databaseDir: pgDataDir,
    user: pgUser,
    password: pgPassword,
    port: pgPort,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });

  let server: ChildProcess | null = null;
  let startupOutput = '';
  try {
    await postgres.initialise();
    await postgres.start();
    await postgres.createDatabase(databaseName);

    const databaseUrl = `postgresql://${pgUser}:${pgPassword}@127.0.0.1:${pgPort}/${databaseName}`;
    server = spawn('npx', ['tsx', 'server/index.ts'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        API_PORT: String(apiPort),
        DATABASE_URL: databaseUrl,
        ENABLE_POSTGRES_APP_STORE: '1',
        WEBAUTHN_RP_ID: '127.0.0.1',
        WEBAUTHN_ORIGIN: baseUrl,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    server.stdout?.on('data', (chunk) => {
      startupOutput += chunk.toString();
    });
    server.stderr?.on('data', (chunk) => {
      startupOutput += chunk.toString();
    });
    server.on('exit', (code, signal) => {
      startupOutput += `\n[server-exit] code=${code} signal=${signal}\n`;
    });

    const health = await waitForHealth(baseUrl, 30000, () => startupOutput);
    assert.equal(health.ok, true);
    assert.equal(health.coreStore, 'postgres');
    assert.equal(health.authStore, 'postgres');
    assert.equal(health.securityStore, 'postgres');
    assert.equal(health.contentStore, 'postgres');

    const alice = new SessionClient(baseUrl);
    const bob = new SessionClient(baseUrl);

    const invalidRegister = await alice.requestRaw('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Broken User',
        email: 'broken@example.com',
        password: 'Password123!',
      }),
    });
    assert.equal(invalidRegister.status, 400);

    const readyAfterInvalidRegister = await fetch(new URL('/api/ready', baseUrl));
    assert.equal(readyAfterInvalidRegister.status, 200);

    const aliceAuth = await alice.request<JsonValue>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Alice Example',
        email: 'alice@example.com',
        password: 'Password123!',
        affiliation: 'Example Lab',
      }),
    });
    const aliceUser = (aliceAuth.user as JsonValue);
    assert.equal(aliceUser.email, 'alice@example.com');
    assert.equal(alice.csrfToken !== null, true);

    const bobAuth = await bob.request<JsonValue>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Bob Example',
        email: 'bob@example.com',
        password: 'Password123!',
        affiliation: 'Example Lab',
      }),
    });
    const bobUser = bobAuth.user as JsonValue;
    assert.equal(bobUser.email, 'bob@example.com');

    const verificationRequest = await alice.request<JsonValue>('/api/auth/request-email-verification', {
      method: 'POST',
      body: JSON.stringify({}),
    }) as JsonValue;
    assert.equal(typeof verificationRequest.debugToken, 'string');
    await alice.request('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'x-csrf-token': alice.csrfToken ?? '' },
      body: JSON.stringify({ token: verificationRequest.debugToken }),
    });

    const twoFactorSetup = await alice.request<JsonValue>('/api/auth/2fa/setup', {
      method: 'POST',
      body: JSON.stringify({}),
    }) as JsonValue;
    assert.equal(typeof twoFactorSetup.secret, 'string');
    const setupCode = otplib.generateSync({ secret: String(twoFactorSetup.secret) });
    const twoFactorEnable = await alice.request<JsonValue>('/api/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ code: setupCode }),
    }) as JsonValue;
    assert.equal(Array.isArray(twoFactorEnable.backupCodes), true);

    await alice.request(`/api/social/follow/${String(bobUser.id)}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const chatCreate = await alice.request<JsonValue>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({ participantId: String(bobUser.id) }),
    }) as JsonValue;
    const chat = chatCreate.chat as JsonValue;
    await alice.request(`/api/chats/${String(chat.id)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: 'hello from postgres runtime' }),
    });

    await alice.request('/api/social/share', {
      method: 'POST',
      body: JSON.stringify({ preprintId: 'paper-1', recipientIds: [String(bobUser.id)] }),
    });

    await alice.request('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const loginStep = await alice.request<JsonValue>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'alice@example.com',
        password: 'Password123!',
      }),
    }) as JsonValue;
    assert.equal(loginStep.requiresTwoFactor, true);
    const loginCode = otplib.generateSync({ secret: String(twoFactorSetup.secret) });
    const completedLogin = await alice.request<JsonValue>('/api/auth/2fa/login', {
      method: 'POST',
      body: JSON.stringify({
        challengeToken: loginStep.challengeToken,
        code: loginCode,
        rememberDevice: true,
      }),
    }) as JsonValue;
    assert.equal((completedLogin.user as JsonValue).email, 'alice@example.com');

    const trustedDevices = await alice.request<JsonValue>('/api/auth/trusted-devices');
    assert.equal(Array.isArray(trustedDevices.devices), true);
    assert.equal((trustedDevices.devices as unknown[]).length > 0, true);

    const securitySummary = await alice.request<JsonValue>('/api/auth/security-summary');
    assert.equal(securitySummary.hasTwoFactorEnabled, true);
    assert.equal(securitySummary.isEmailVerified, true);

    const passwordResetRequest = await bob.request<JsonValue>('/api/auth/request-password-reset', {
      method: 'POST',
      headers: { 'x-csrf-token': bob.csrfToken ?? '' },
      body: JSON.stringify({ email: 'bob@example.com' }),
    }) as JsonValue;
    assert.equal(typeof passwordResetRequest.debugToken, 'string');
    await bob.request('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'x-csrf-token': bob.csrfToken ?? '' },
      body: JSON.stringify({
        token: passwordResetRequest.debugToken,
        password: 'Password456!',
      }),
    });

    const bobLogin = await bob.request<JsonValue>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'bob@example.com',
        password: 'Password456!',
      }),
    }) as JsonValue;
    assert.equal((bobLogin.user as JsonValue).email, 'bob@example.com');

    console.log('Postgres smoke test passed');
  } catch (error) {
    if (startupOutput) {
      console.error(startupOutput);
    }
    throw error;
  } finally {
    if (server) {
      await stopProcess(server);
    }
    await postgres.stop().catch(() => {});
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
