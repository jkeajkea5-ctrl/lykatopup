import axios from 'axios';
import QRCode from 'qrcode';

let cachedToken;

function khqrLinkConfig() {
  return {
    baseUrl: (process.env.KHQR_LINK_BASE_URL || 'https://api.khqr.link').replace(/\/+$/, ''),
    apiKey: process.env.KHQR_LINK_API_KEY || '',
    bakongId: process.env.KHQR_LINK_BAKONG_ID || process.env.BAKONG_ACCOUNT_ID || process.env.TOLA_BAKONG_ID || '',
    merchantName: process.env.KHQR_LINK_MERCHANT_NAME || process.env.TOLA_MERCHANT_NAME || 'Lyka Topup'
  };
}

function shouldUseKhqrLink() {
  const provider = (process.env.PAYMENT_PROVIDER || process.env.KHQR_PROVIDER || '').toLowerCase();
  const config = khqrLinkConfig();
  return provider === 'khqr_link' || provider === 'khqrlink' || Boolean(config.apiKey || process.env.KHQR_LINK_ENABLED === 'true');
}

function shouldUseMockGateway() {
  if (shouldUseKhqrLink()) {
    const config = khqrLinkConfig();
    return !config.baseUrl || !config.bakongId || !config.merchantName;
  }

  return (
    process.env.TOLA_MOCK === 'true' ||
    !process.env.TOLA_BASE_URL ||
    (!process.env.TOLA_TOKEN && !process.env.TOLA_USERNAME && !process.env.TOLA_PASSWORD)
  );
}

function normalizeCreateResponse(data) {
  return {
    qrText: data.qrText || data.qr_string || data.khqr || data.data?.qrText || data.data?.khqr || data.qr,
    qrImageUrl: data.qrImageUrl || data.qr_image || data.data?.qrImageUrl || data.qr,
    providerTransactionId: data.tran || data.transactionId || data.data?.transactionId || data.data?.tran,
    providerReference: data.reference || data.ref || data.data?.reference,
    providerMd5: data.md5 || data.data?.md5,
    rawResponse: data
  };
}

function normalizeStatusResponse(data) {
  const statusValue = String(data.status || data.paymentStatus || data.data?.status || data.responseCode || '').toLowerCase();
  const paid =
    ['paid', 'success', 'successful', 'completed', 'complete', '0', '00'].includes(statusValue) ||
    data.paid === true ||
    data.verified === true;
  return { paid, status: paid ? 'paid' : 'pending', rawResponse: data };
}

async function createMockKhqr({ orderNo, amountUsd, reason = 'mock' }) {
  const qrText = `LYKATOPUP|${orderNo}|USD|${amountUsd.toFixed(2)}`;
  return {
    qrText,
    qrDataUrl: await QRCode.toDataURL(qrText),
    providerTransactionId: `mock_${orderNo}`,
    providerReference: orderNo,
    rawResponse: { mock: true, reason }
  };
}

function normalizeKhqrImageUrl(value) {
  const url = String(value || '').trim();
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url.replace(/^http:\/\//i, 'https://');
  return undefined;
}

async function createKhqrLinkPayment({ orderNo, amountUsd }) {
  const config = khqrLinkConfig();
  if (!config.bakongId || !config.merchantName) {
    return createMockKhqr({ orderNo, amountUsd, reason: 'khqr_link_missing_config' });
  }

  const amount = Number(amountUsd).toFixed(2);
  const params = {
    amount,
    bakongid: config.bakongId,
    merchantname: config.merchantName
  };
  const headers = { Accept: 'application/json' };

  if (config.apiKey) {
    params.apikey = config.apiKey;
    headers['X-API-Key'] = config.apiKey;
  }

  const response = await axios.get(`${config.baseUrl}/v1/khqr/create`, {
    params,
    headers,
    timeout: 20000
  });
  const data = response.data;

  if (!data || String(data.status || '').toLowerCase() !== 'success') {
    const message = data?.message || data?.error || 'KHQR Link could not create a payment';
    throw new Error(message);
  }

  const qrImageUrl = normalizeKhqrImageUrl(data.qr);
  const qrText = qrImageUrl ? undefined : data.qr;
  const qrDataUrl = qrText ? await QRCode.toDataURL(qrText) : undefined;

  if (!qrImageUrl && !qrDataUrl) {
    throw new Error('KHQR Link did not return a usable QR code');
  }

  return {
    provider: 'khqr-link',
    currency: data.currency || 'USD',
    qrText,
    qrImageUrl,
    qrDataUrl,
    providerTransactionId: data.tran || data.hash || orderNo,
    providerReference: orderNo,
    providerMd5: data.md5,
    rawResponse: data
  };
}

async function getAuthHeader() {
  if (process.env.TOLA_TOKEN) return { Authorization: `Bearer ${process.env.TOLA_TOKEN}` };
  if (cachedToken) return { Authorization: `Bearer ${cachedToken}` };
  if (!process.env.TOLA_USERNAME || !process.env.TOLA_PASSWORD) return {};

  const response = await axios.post(
    `${process.env.TOLA_BASE_URL}${process.env.TOLA_AUTH_PATH || '/api/login'}`,
    { username: process.env.TOLA_USERNAME, password: process.env.TOLA_PASSWORD },
    { timeout: 15000 }
  );
  cachedToken = response.data.token || response.data.access_token || response.data.data?.token;
  return cachedToken ? { Authorization: `Bearer ${cachedToken}` } : {};
}

export async function createKhqrPayment({ orderNo, amountUsd }) {
  if (shouldUseKhqrLink()) {
    return createKhqrLinkPayment({ orderNo, amountUsd });
  }

  if (shouldUseMockGateway()) {
    return createMockKhqr({ orderNo, amountUsd });
  }

  try {
    const headers = await getAuthHeader();
    const payload = {
      amount: amountUsd,
      currency: 'USD',
      reference: orderNo,
      merchantName: process.env.TOLA_MERCHANT_NAME || 'Lyka Topup',
      bakongId: process.env.TOLA_BAKONG_ID
    };
    const response = await axios.post(
      `${process.env.TOLA_BASE_URL}${process.env.TOLA_KHQR_PATH || '/api/khqr/create'}`,
      payload,
      { headers, timeout: 20000 }
    );
    const normalized = normalizeCreateResponse(response.data);
    const qrDataUrl = normalized.qrText ? await QRCode.toDataURL(normalized.qrText) : undefined;
    if (!qrDataUrl && !normalized.qrImageUrl) {
      return createMockKhqr({ orderNo, amountUsd, reason: 'gateway_missing_qr' });
    }
    return { ...normalized, qrDataUrl };
  } catch (error) {
    return createMockKhqr({ orderNo, amountUsd, reason: error.message });
  }
}

export async function checkKhqrPayment(payment) {
  if (payment.provider === 'khqr-link' || shouldUseKhqrLink()) {
    if (!payment.providerMd5) {
      return { paid: false, status: 'pending', rawResponse: { message: 'Missing KHQR MD5' } };
    }

    const config = khqrLinkConfig();
    const params = { md5: payment.providerMd5 };
    const headers = { Accept: 'application/json' };

    if (config.bakongId) params.bakongid = config.bakongId;
    if (config.apiKey) {
      params.apikey = config.apiKey;
      headers['X-API-Key'] = config.apiKey;
    }

    const response = await axios.get(`${config.baseUrl}/v1/khqr/check`, {
      params,
      headers,
      timeout: 20000
    });
    return normalizeStatusResponse(response.data);
  }

  if (shouldUseMockGateway()) {
    return { paid: true, status: 'paid', rawResponse: { mock: true } };
  }
  const headers = await getAuthHeader();
  const response = await axios.post(
    `${process.env.TOLA_BASE_URL}${process.env.TOLA_STATUS_PATH || '/api/khqr/status'}`,
    {
      reference: payment.providerReference,
      transactionId: payment.providerTransactionId,
      md5: payment.providerMd5
    },
    { headers, timeout: 15000 }
  );
  return normalizeStatusResponse(response.data);
}
