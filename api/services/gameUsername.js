import axios from 'axios';

function readPath(source, path) {
  return path.split('.').reduce((value, key) => value?.[key], source);
}

function applyTemplate(value, accountInfo, { encode = false } = {}) {
  if (typeof value !== 'string') return value;
  return value.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const replacement = accountInfo[key] || '';
    return encode ? encodeURIComponent(replacement) : replacement;
  });
}

function normalizeUsername(value) {
  return String(value || '').replace(/\+/g, ' ').replace(/\s+/g, ' ').trim();
}

function templateEntries(value) {
  if (!value) return [];
  if (typeof value.entries === 'function') return Array.from(value.entries());
  return Object.entries(value);
}

export async function checkGameUsername(game, accountInfo) {
  const missing = game.requiredFields.filter((field) => field.required && !accountInfo[field.key]);
  if (missing.length) {
    return { found: false, message: `Missing ${missing.map((field) => field.label).join(', ')}` };
  }

  if (!game.usernameApi?.enabled || !game.usernameApi?.url) {
    return { found: false, message: 'Username lookup is not configured for this game yet' };
  }

  const headers = Object.fromEntries(
    templateEntries(game.usernameApi.headers).map(([key, value]) => [key, applyTemplate(value, accountInfo)])
  );
  const body = Object.fromEntries(
    templateEntries(game.usernameApi.bodyTemplate).map(([key, value]) => [key, applyTemplate(value, accountInfo)])
  );
  const url = applyTemplate(game.usernameApi.url, accountInfo, { encode: true });
  let response;
  try {
    response =
      game.usernameApi.method === 'POST'
        ? await axios.post(url, body, { headers, timeout: 12000 })
        : await axios.get(url, { headers, timeout: 12000 });
  } catch (error) {
    if (!error.response?.data) throw error;
    response = error.response;
  }
  const username = readPath(response.data, game.usernameApi.usernamePath || 'data.username');
  const status = String(response.data?.status || '').toUpperCase();
  const valid = String(response.data?.valid || '').toLowerCase();

  const normalizedUsername = normalizeUsername(username);

  return normalizedUsername && status !== 'NOT_ALLOW' && valid !== 'invalid'
    ? { found: true, username: normalizedUsername, raw: response.data }
    : { found: false, message: 'Game username was not found', raw: response.data };
}
