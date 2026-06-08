import crypto from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { Admin } from '../models/Admin.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signToken } from '../utils/tokens.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const buyerAuthSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().trim().min(2).max(60).optional()
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

const telegramAuthSchema = z.object({
  body: z.object({
    id: z.union([z.string(), z.number()]),
    first_name: z.string().trim().max(80).optional(),
    last_name: z.string().trim().max(80).optional(),
    username: z.string().trim().max(80).optional(),
    photo_url: z.string().url().optional(),
    auth_date: z.union([z.string(), z.number()]),
    hash: z.string().regex(/^[a-f0-9]{64}$/i)
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

router.post(
  '/register',
  validate(buyerAuthSchema),
  asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase();
    const existingUser = await User.findOne({ email });
    if (existingUser?.passwordHash) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const user = existingUser || new User({ email });
    user.name = req.body.name || user.name || email.split('@')[0];
    user.email = email;
    user.passwordHash = await bcrypt.hash(req.body.password, 12);
    user.lastLoginAt = new Date();
    await user.save();

    res.status(201).json({ token: signToken({ sub: user._id.toString(), role: 'buyer' }), user });
  })
);

router.post(
  '/login',
  validate(buyerAuthSchema),
  asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase();
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user?.passwordHash || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const safeUser = await User.findById(user._id);
    res.json({ token: signToken({ sub: user._id.toString(), role: 'buyer' }), user: safeUser });
  })
);

router.post(
  '/admin/login',
  validate(
    z.object({
      body: z.object({ email: z.string().email(), password: z.string().min(6) }),
      params: z.object({}).passthrough(),
      query: z.object({}).passthrough()
    })
  ),
  asyncHandler(async (req, res) => {
    const admin = await Admin.findOne({ email: req.body.email.toLowerCase(), active: true });
    if (!admin || !(await bcrypt.compare(req.body.password, admin.passwordHash))) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }
    admin.lastLoginAt = new Date();
    await admin.save();
    res.json({
      token: signToken({ sub: admin._id.toString(), role: 'admin', email: admin.email }),
      admin: { id: admin._id, name: admin.name, email: admin.email }
    });
  })
);

router.post(
  '/google',
  validate(
    z.object({
      body: z.object({ credential: z.string().min(20) }),
      params: z.object({}).passthrough(),
      query: z.object({}).passthrough()
    })
  ),
  asyncHandler(async (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ message: 'Google OAuth is not configured' });
    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const user = await User.findOneAndUpdate(
      { email: payload.email },
      {
        name: payload.name,
        email: payload.email,
        avatar: payload.picture,
        providers: { googleId: payload.sub },
        lastLoginAt: new Date()
      },
      { upsert: true, new: true }
    );
    res.json({ token: signToken({ sub: user._id.toString(), role: 'buyer' }), user });
  })
);

router.post(
  '/telegram',
  validate(telegramAuthSchema),
  asyncHandler(async (req, res) => {
    const data = { ...req.body };
    const hash = data.hash;
    delete data.hash;
    if (!hash || !process.env.TELEGRAM_BOT_TOKEN_BUYER) {
      return res.status(400).json({ message: 'Telegram login is not configured' });
    }

    const authDate = Number(data.auth_date);
    const maxAgeSeconds = 24 * 60 * 60;
    if (!Number.isFinite(authDate) || Date.now() / 1000 - authDate > maxAgeSeconds) {
      return res.status(401).json({ message: 'Telegram login has expired' });
    }

    const checkString = Object.keys(data)
      .sort()
      .filter((key) => data[key] !== undefined && data[key] !== null)
      .map((key) => `${key}=${data[key]}`)
      .join('\n');
    const secret = crypto.createHash('sha256').update(process.env.TELEGRAM_BOT_TOKEN_BUYER).digest();
    const digest = crypto.createHmac('sha256', secret).update(checkString).digest('hex');
    const digestBuffer = Buffer.from(digest, 'hex');
    const hashBuffer = Buffer.from(hash, 'hex');
    if (digestBuffer.length !== hashBuffer.length || !crypto.timingSafeEqual(digestBuffer, hashBuffer)) {
      return res.status(401).json({ message: 'Invalid Telegram login' });
    }

    const telegramId = String(data.id);
    const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.username || `Telegram ${telegramId}`;

    const user = await User.findOneAndUpdate(
      { 'providers.telegramId': telegramId },
      {
        $set: {
          name,
          ...(data.photo_url ? { avatar: data.photo_url } : {}),
          'providers.telegramId': telegramId,
          'providers.telegramUsername': data.username,
          telegramChatId: telegramId,
          lastLoginAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    const orderLinkConditions = [{ 'contact.telegramChatId': telegramId }];
    if (data.username) orderLinkConditions.push({ 'contact.telegramUsername': data.username });
    await Order.updateMany(
      {
        user: { $exists: false },
        $or: orderLinkConditions
      },
      { $set: { user: user._id } }
    );

    res.json({ token: signToken({ sub: user._id.toString(), role: 'buyer' }), user });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.auth.role === 'admin') {
      const admin = await Admin.findOne({ _id: req.auth.sub, active: true }).select('name email');
      if (!admin) return res.status(401).json({ message: 'Invalid or expired token' });
      return res.json({ role: 'admin', admin });
    }
    const user = await User.findById(req.auth.sub);
    res.json({ role: 'buyer', user });
  })
);

export default router;
