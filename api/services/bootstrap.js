import bcrypt from 'bcryptjs';
import { Admin } from '../models/Admin.js';
import { Game } from '../models/Game.js';
import { Package } from '../models/Package.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { MAX_ACTIVE_PACKAGE_PRICE_USD, activeForPackage } from '../utils/packageRules.js';

const officialGameImages = {
  'mobile-legends': '/game-image/mobile-legends.jpg',
  'pubg-mobile': '/game-image/pubg-mobile.jpg',
  'free-fire': '/game-image/free-fire.jpg',
  'honor-of-kings': 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/a4/b8/3e/a4b83e06-18af-9786-cdb5-f16ad0fbb340/AppIcon-1x_U007emarketing-0-7-0-85-220-0.png/512x512bb.jpg',
  'magic-chess-go-go': 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/3c/f1/28/3cf12800-5937-7c4a-0b1a-52768bb098b2/AppIcon-0-0-1x_U007emarketing-0-7-0-85-220.png/512x512bb.jpg',
  'valorant-cambodia': 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/cbf4460132cdfeb2a97fad5f9dd25ba0bc058f76-128x128.png?accountingTag=VAL',
  'blood-strike': 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/1a/fc/32/1afc321b-0a4c-b716-01bc-79977a8b0bc6/AppIcon-0-0-1x_U007emarketing-0-11-0-85-220.png/512x512bb.jpg',
  'genshin-impact-cambodia': 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/df/69/1c/df691ca2-735f-4617-256d-a49202f8db1e/AppIcon-0-0-1x_U007epad-0-1-85-220.png/512x512bb.jpg',
  'honkai-star-rail': 'https://api.g2bulk.com/images/honkai_star_rail.png',
  'zenless-zone-zero': 'https://api.g2bulk.com/images/zzz.png',
  'wuthering-waves': 'https://api.g2bulk.com/images/wuwa.png',
  'delta-force': 'https://api.g2bulk.com/images/deltaforce.png',
  'arena-breakout': 'https://api.g2bulk.com/images/arena_breakout.png',
  'call-of-duty-mobile-garena': 'https://api.g2bulk.com/images/codm_sgmy.png',
  'identity-v': 'https://api.g2bulk.com/images/identityv.png',
  'wild-rift-cambodia': 'https://api.g2bulk.com/images/wild_rift_kh.png',
  'farlight-84': 'https://api.g2bulk.com/images/farlight84.png',
  zepeto: 'https://api.g2bulk.com/images/zepeto.png'
};

const g2bulkUsernameApi = (game, includeServerId = false) => ({
  enabled: true,
  method: 'POST',
  url: 'https://api.g2bulk.com/v1/games/checkPlayerId',
  bodyTemplate: {
    game,
    user_id: '{{userId}}',
    ...(includeServerId ? { server_id: '{{serverId}}' } : {})
  },
  usernamePath: 'name'
});

const seededGames = [
  {
    name: 'Mobile Legends',
    slug: 'mobile-legends',
    category: 'MOBA',
    currencyLabel: 'Diamonds',
    description: 'Fast diamond top-ups with user and server ID verification.',
    imageUrl: officialGameImages['mobile-legends'],
    requiredFields: [
      { key: 'userId', label: 'User ID', placeholder: '123456789', required: true },
      { key: 'serverId', label: 'Server ID', placeholder: '1234', required: true }
    ],
    usernameApi: g2bulkUsernameApi('mlbb', true),
    sortOrder: 1
  },
  {
    name: 'PUBG Mobile',
    slug: 'pubg-mobile',
    category: 'Battle Royale',
    currencyLabel: 'UC',
    description: 'UC packages for global PUBG Mobile accounts.',
    imageUrl: officialGameImages['pubg-mobile'],
    requiredFields: [{ key: 'userId', label: 'Player ID', placeholder: '5123456789', required: true }],
    usernameApi: g2bulkUsernameApi('pubgm'),
    sortOrder: 2
  },
  {
    name: 'Free Fire',
    slug: 'free-fire',
    category: 'Battle Royale',
    currencyLabel: 'Diamonds',
    description: 'Diamond recharge for Garena Free Fire accounts.',
    imageUrl: officialGameImages['free-fire'],
    requiredFields: [{ key: 'userId', label: 'Player ID', placeholder: '1234567890', required: true }],
    usernameApi: g2bulkUsernameApi('freefire_sg'),
    sortOrder: 3
  },
  {
    name: 'Honor of Kings',
    slug: 'honor-of-kings',
    category: 'MOBA',
    currencyLabel: 'Tokens',
    description: 'Top up Honor of Kings accounts with instant user verification.',
    imageUrl: officialGameImages['honor-of-kings'],
    requiredFields: [{ key: 'userId', label: 'Player ID', placeholder: '123456789', required: true }],
    usernameApi: g2bulkUsernameApi('hok'),
    sortOrder: 4
  },
  {
    name: 'Magic Chess Go Go',
    slug: 'magic-chess-go-go',
    category: 'Strategy',
    currencyLabel: 'Diamonds',
    description: 'Magic Chess Go Go recharge with user and zone validation.',
    imageUrl: officialGameImages['magic-chess-go-go'],
    requiredFields: [
      { key: 'userId', label: 'User ID', placeholder: '1255245301', required: true },
      { key: 'serverId', label: 'Zone ID', placeholder: '14024', required: true }
    ],
    usernameApi: g2bulkUsernameApi('magic_chest_gogo', true),
    sortOrder: 5
  },
  {
    name: 'Valorant Cambodia',
    slug: 'valorant-cambodia',
    category: 'FPS',
    currencyLabel: 'VP',
    description: 'Valorant KH account validation before top-up checkout.',
    imageUrl: officialGameImages['valorant-cambodia'],
    requiredFields: [{ key: 'userId', label: 'Player ID', placeholder: '10000001', required: true }],
    usernameApi: g2bulkUsernameApi('valorant_kh'),
    sortOrder: 6
  },
  {
    name: 'Blood Strike',
    slug: 'blood-strike',
    category: 'Battle Royale',
    currencyLabel: 'Gold',
    description: 'Blood Strike top-up with instant account lookup.',
    imageUrl: officialGameImages['blood-strike'],
    requiredFields: [{ key: 'userId', label: 'Player ID', placeholder: '10000001', required: true }],
    usernameApi: g2bulkUsernameApi('bloodstrike'),
    sortOrder: 7
  },
  {
    name: 'Genshin Impact Cambodia',
    slug: 'genshin-impact-cambodia',
    category: 'RPG',
    currencyLabel: 'Genesis Crystals',
    description: 'Genshin Impact account verification for Cambodia top-up orders.',
    imageUrl: officialGameImages['genshin-impact-cambodia'],
    requiredFields: [
      { key: 'userId', label: 'Player ID', placeholder: '10000001', required: true },
      { key: 'serverId', label: 'Server', placeholder: 'Asia / America / Europe / TW_HK_MO', required: true }
    ],
    usernameApi: g2bulkUsernameApi('genshin', true),
    sortOrder: 8
  },
  {
    name: 'Honkai Star Rail',
    slug: 'honkai-star-rail',
    category: 'RPG',
    currencyLabel: 'Oneiric Shards',
    providerGameCode: 'honkai_star_rail',
    description: 'Oneiric Shard top-ups with UID and server validation.',
    imageUrl: officialGameImages['honkai-star-rail'],
    requiredFields: [
      { key: 'userId', label: 'UID', placeholder: '800123456', required: true },
      { key: 'serverId', label: 'Server', placeholder: 'Asia / America / Europe / TW_HK_MO', required: true }
    ],
    usernameApi: {
      enabled: true,
      method: 'POST',
      url: 'https://api.g2bulk.com/v1/games/checkPlayerId',
      bodyTemplate: { game: 'honkai_star_rail', user_id: '{{userId}}', server_id: '{{serverId}}' },
      usernamePath: 'name'
    },
    sortOrder: 9,
    packages: [
      { name: '60', amountLabel: '60 Oneiric Shards', priceUsd: 1.1, providerCatalogueName: '60', providerCatalogueId: 1859 },
      { name: '330', amountLabel: '330 Oneiric Shards', priceUsd: 5.52, providerCatalogueName: '330', providerCatalogueId: 1894 },
      { name: 'Express', amountLabel: 'Express Supply Pass', priceUsd: 5.52, providerCatalogueName: 'Express', providerCatalogueId: 1856 },
      { name: '1090', amountLabel: '1090 Oneiric Shards', priceUsd: 16.62, providerCatalogueName: '1090', providerCatalogueId: 1861 },
      { name: '2240', amountLabel: '2240 Oneiric Shards', priceUsd: 33.24, providerCatalogueName: '2240', providerCatalogueId: 1932 },
      { name: '3880', amountLabel: '3880 Oneiric Shards', priceUsd: 55.41, providerCatalogueName: '3880', providerCatalogueId: 1924 },
      { name: '8080', amountLabel: '8080 Oneiric Shards', priceUsd: 110.84, providerCatalogueName: '8080', providerCatalogueId: 1900 }
    ]
  },
  {
    name: 'Zenless Zone Zero',
    slug: 'zenless-zone-zero',
    category: 'RPG',
    currencyLabel: 'Monochrome',
    providerGameCode: 'zzz',
    description: 'Monochrome and Inter-Knot top-ups for ZZZ accounts.',
    imageUrl: officialGameImages['zenless-zone-zero'],
    requiredFields: [
      { key: 'userId', label: 'UID', placeholder: '1300123456', required: true },
      { key: 'serverId', label: 'Server', placeholder: 'Asia / America / Europe / TW_HK_MO', required: true }
    ],
    usernameApi: {
      enabled: true,
      method: 'POST',
      url: 'https://api.g2bulk.com/v1/games/checkPlayerId',
      bodyTemplate: { game: 'zzz', user_id: '{{userId}}', server_id: '{{serverId}}' },
      usernamePath: 'name'
    },
    sortOrder: 10,
    packages: [
      { name: '60', amountLabel: '60 Monochrome', priceUsd: 1.1, providerCatalogueName: '60', providerCatalogueId: 2216 },
      { name: 'Inter-Knot', amountLabel: 'Inter-Knot Membership', priceUsd: 5.52, providerCatalogueName: 'Inter-Knot', providerCatalogueId: 2194 },
      { name: '330', amountLabel: '330 Monochrome', priceUsd: 5.52, providerCatalogueName: '330', providerCatalogueId: 2187 },
      { name: '1090', amountLabel: '1090 Monochrome', priceUsd: 16.62, providerCatalogueName: '1090', providerCatalogueId: 2202 },
      { name: '2240', amountLabel: '2240 Monochrome', priceUsd: 33.24, providerCatalogueName: '2240', providerCatalogueId: 2207 },
      { name: '3880', amountLabel: '3880 Monochrome', priceUsd: 55.41, providerCatalogueName: '3880', providerCatalogueId: 2212 },
      { name: '8080', amountLabel: '8080 Monochrome', priceUsd: 110.84, providerCatalogueName: '8080', providerCatalogueId: 2198 }
    ]
  },
  {
    name: 'Wuthering Waves',
    slug: 'wuthering-waves',
    category: 'RPG',
    currencyLabel: 'Lunites',
    providerGameCode: 'wuwa',
    description: 'Lunite top-ups with UID and server validation.',
    imageUrl: officialGameImages['wuthering-waves'],
    requiredFields: [
      { key: 'userId', label: 'UID', placeholder: '500123456', required: true },
      { key: 'serverId', label: 'Server', placeholder: 'Asia / America / Europe / SEA', required: true }
    ],
    usernameApi: {
      enabled: true,
      method: 'POST',
      url: 'https://api.g2bulk.com/v1/games/checkPlayerId',
      bodyTemplate: { game: 'wuwa', user_id: '{{userId}}', server_id: '{{serverId}}' },
      usernamePath: 'name'
    },
    sortOrder: 11,
    packages: [
      { name: '60', amountLabel: '60 Lunites', priceUsd: 0.93, providerCatalogueName: '60', providerCatalogueId: 2165 },
      { name: '330', amountLabel: '330 Lunites', priceUsd: 4.7, providerCatalogueName: '330', providerCatalogueId: 2166 },
      { name: 'Lunite Subscription', amountLabel: 'Lunite Subscription', priceUsd: 4.7, providerCatalogueName: 'Lunite Subscription', providerCatalogueId: 2164 },
      { name: '1090', amountLabel: '1090 Lunites', priceUsd: 14.18, providerCatalogueName: '1090', providerCatalogueId: 2167 },
      { name: '2240', amountLabel: '2240 Lunites', priceUsd: 28.34, providerCatalogueName: '2240', providerCatalogueId: 2161 },
      { name: '3880', amountLabel: '3880 Lunites', priceUsd: 46.98, providerCatalogueName: '3880', providerCatalogueId: 2162 },
      { name: '8080', amountLabel: '8080 Lunites', priceUsd: 92.43, providerCatalogueName: '8080', providerCatalogueId: 2163 }
    ]
  },
  {
    name: 'Delta Force',
    slug: 'delta-force',
    category: 'FPS',
    currencyLabel: 'Delta Coins',
    providerGameCode: 'deltaforce',
    description: 'Delta Coins and pass packages with player ID validation.',
    imageUrl: officialGameImages['delta-force'],
    requiredFields: [{ key: 'userId', label: 'Player ID', placeholder: '10000001', required: true }],
    usernameApi: {
      enabled: true,
      method: 'POST',
      url: 'https://api.g2bulk.com/v1/games/checkPlayerId',
      bodyTemplate: { game: 'deltaforce', user_id: '{{userId}}' },
      usernamePath: 'name'
    },
    sortOrder: 12,
    packages: [
      { name: '18', amountLabel: '18 Delta Coins', priceUsd: 0.27, providerCatalogueName: '18', providerCatalogueId: 820 },
      { name: '30', amountLabel: '30 Delta Coins', priceUsd: 0.45, providerCatalogueName: '30', providerCatalogueId: 826 },
      { name: 'Echo Supplies', amountLabel: 'Echo Supplies', priceUsd: 0.53, providerCatalogueName: 'Echo Supplies', providerCatalogueId: 5752 },
      { name: '60', amountLabel: '60 Delta Coins', priceUsd: 0.9, providerCatalogueName: '60', providerCatalogueId: 827 },
      { name: 'Echo Supplies Advanced', amountLabel: 'Echo Supplies - Advanced', priceUsd: 1.6, providerCatalogueName: 'Echo Supplies - Advanced', providerCatalogueId: 5753 },
      { name: '320', amountLabel: '320 Delta Coins', priceUsd: 4.54, providerCatalogueName: '320', providerCatalogueId: 828 },
      { name: 'Warfare Pass', amountLabel: 'Season Pass Warfare Special', priceUsd: 4.9, providerCatalogueName: 'Season Pass Warfare Special', providerCatalogueId: 3521 },
      { name: 'Operations Pass', amountLabel: 'Season Pass Operations Special', priceUsd: 4.9, providerCatalogueName: 'Season Pass Operations Special', providerCatalogueId: 3519 },
      { name: '460', amountLabel: '460 Delta Coins', priceUsd: 6.57, providerCatalogueName: '460', providerCatalogueId: 829 },
      { name: 'Deluxe Pass', amountLabel: 'Season Pass Delta Force Deluxe', priceUsd: 6.8, providerCatalogueName: 'Season Pass Delta Force Deluxe', providerCatalogueId: 3520 }
    ]
  },
  {
    name: 'Arena Breakout',
    slug: 'arena-breakout',
    category: 'FPS',
    currencyLabel: 'Bonds',
    providerGameCode: 'arena_breakout',
    description: 'Arena Breakout Bonds, cases, and pass packages.',
    imageUrl: officialGameImages['arena-breakout'],
    requiredFields: [{ key: 'userId', label: 'Player ID', placeholder: '10000001', required: true }],
    usernameApi: {
      enabled: true,
      method: 'POST',
      url: 'https://api.g2bulk.com/v1/games/checkPlayerId',
      bodyTemplate: { game: 'arena_breakout', user_id: '{{userId}}' },
      usernamePath: 'name'
    },
    sortOrder: 13,
    packages: [
      { name: '60', amountLabel: '60 Bonds', priceUsd: 0.81, providerCatalogueName: '60', providerCatalogueId: 6221 },
      { name: 'Beginner Select', amountLabel: 'Beginner Select', priceUsd: 0.82, providerCatalogueName: 'Beginner Select', providerCatalogueId: 1885 },
      { name: '66', amountLabel: '66 Bonds', priceUsd: 0.89, providerCatalogueName: '66', providerCatalogueId: 1879 },
      { name: 'Monthly Advanced Pass', amountLabel: 'Monthly Advanced Battle Pass', priceUsd: 1.01, providerCatalogueName: 'Monthly Advanced Battle Pass Activation Pass', providerCatalogueId: 4220 },
      { name: 'Bulletproof Case', amountLabel: 'Bulletproof Case (30d)', priceUsd: 2.46, providerCatalogueName: 'Bulletproof Case (30d)', providerCatalogueId: 1886 },
      { name: 'Monthly Premium Pass', amountLabel: 'Monthly Premium Battle Pass', priceUsd: 4.11, providerCatalogueName: 'Monthly Premium Battle Pass Activation Pass', providerCatalogueId: 4221 },
      { name: '335', amountLabel: '335 Bonds', priceUsd: 4.56, providerCatalogueName: '335', providerCatalogueId: 1880 },
      { name: 'Composition Case', amountLabel: 'Composition Case (30d)', priceUsd: 7.45, providerCatalogueName: 'Composition Case (30d)', providerCatalogueId: 1877 },
      { name: '675', amountLabel: '675 Bonds', priceUsd: 9.13, providerCatalogueName: '675', providerCatalogueId: 1881 },
      { name: 'Quarterly Premium Pass', amountLabel: 'Quarterly Premium Battle Pass Bundle', priceUsd: 12.35, providerCatalogueName: 'Quarterly Premium Battle Pass Bundle Activation Pass Bundle', providerCatalogueId: 4222 }
    ]
  },
  {
    name: 'Call of Duty Mobile Garena SGMY',
    slug: 'call-of-duty-mobile-garena',
    shortName: 'COD Mobile',
    category: 'FPS',
    currencyLabel: 'CP',
    providerGameCode: 'codm_sgmy',
    description: 'COD Mobile Garena CP packages for SG/MY accounts.',
    imageUrl: officialGameImages['call-of-duty-mobile-garena'],
    requiredFields: [{ key: 'userId', label: 'Player ID', placeholder: '123456789', required: true }],
    usernameApi: {
      enabled: true,
      method: 'POST',
      url: 'https://api.g2bulk.com/v1/games/checkPlayerId',
      bodyTemplate: { game: 'codm_sgmy', user_id: '{{userId}}' },
      usernamePath: 'name'
    },
    sortOrder: 14,
    packages: [
      { name: '115', amountLabel: '115 CP', priceUsd: 1.31, providerCatalogueName: '115', providerCatalogueId: 571 },
      { name: '253', amountLabel: '253 CP', priceUsd: 2.63, providerCatalogueName: '253', providerCatalogueId: 572 },
      { name: '529', amountLabel: '529 CP', priceUsd: 5.26, providerCatalogueName: '529', providerCatalogueId: 573 },
      { name: '794', amountLabel: '794 CP', priceUsd: 7.88, providerCatalogueName: '794', providerCatalogueId: 566 },
      { name: '1053', amountLabel: '1053 CP', priceUsd: 10.51, providerCatalogueName: '1053', providerCatalogueId: 574 },
      { name: '1323', amountLabel: '1323 CP', priceUsd: 13.14, providerCatalogueName: '1323', providerCatalogueId: 575 },
      { name: '2760', amountLabel: '2760 CP', priceUsd: 26.28, providerCatalogueName: '2760', providerCatalogueId: 567 },
      { name: '6440', amountLabel: '6440 CP', priceUsd: 52.54, providerCatalogueName: '6440', providerCatalogueId: 576 },
      { name: '9200', amountLabel: '9200 CP', priceUsd: 78.81, providerCatalogueName: '9200', providerCatalogueId: 568 },
      { name: '12880', amountLabel: '12880 CP', priceUsd: 105.09, providerCatalogueName: '12880', providerCatalogueId: 565 }
    ]
  },
  {
    name: 'Identity V',
    slug: 'identity-v',
    category: 'Survival',
    currencyLabel: 'Echoes',
    providerGameCode: 'identityv',
    description: 'Identity V Echoes and package top-ups.',
    imageUrl: officialGameImages['identity-v'],
    requiredFields: [
      { key: 'userId', label: 'User ID', placeholder: '10000001', required: true },
      { key: 'serverId', label: 'Server', placeholder: 'Asia / NA-EU', required: true }
    ],
    usernameApi: {
      enabled: true,
      method: 'POST',
      url: 'https://api.g2bulk.com/v1/games/checkPlayerId',
      bodyTemplate: { game: 'identityv', user_id: '{{userId}}', server_id: '{{serverId}}' },
      usernamePath: 'name'
    },
    sortOrder: 15,
    packages: [
      { name: '66', amountLabel: '66 Echoes', priceUsd: 1.08, providerCatalogueName: '66', providerCatalogueId: 610 },
      { name: 'Inspirations Package', amountLabel: 'Inspirations Package', priceUsd: 1.09, providerCatalogueName: 'Inspirations Package', providerCatalogueId: 601 },
      { name: '203', amountLabel: '203 Echoes', priceUsd: 3.26, providerCatalogueName: '203', providerCatalogueId: 603 },
      { name: '335', amountLabel: '335 Echoes', priceUsd: 5.44, providerCatalogueName: '335', providerCatalogueId: 598 },
      { name: 'Clues Package', amountLabel: 'Clues Package', priceUsd: 5.47, providerCatalogueName: 'Clues Package', providerCatalogueId: 589 },
      { name: '759', amountLabel: '759 Echoes', priceUsd: 10.9, providerCatalogueName: '759', providerCatalogueId: 604 },
      { name: 'Memory Sphere Package', amountLabel: 'Memory Sphere Package', priceUsd: 10.96, providerCatalogueName: 'Memory Sphere Package', providerCatalogueId: 597 },
      { name: '1518', amountLabel: '1518 Echoes', priceUsd: 21.78, providerCatalogueName: '1518', providerCatalogueId: 591 },
      { name: '2277', amountLabel: '2277 Echoes', priceUsd: 32.58, providerCatalogueName: '2277', providerCatalogueId: 593 },
      { name: '3036', amountLabel: '3036 Echoes', priceUsd: 43.38, providerCatalogueName: '3036', providerCatalogueId: 600 }
    ]
  },
  {
    name: 'Wild Rift Cambodia',
    slug: 'wild-rift-cambodia',
    shortName: 'Wild Rift',
    category: 'MOBA',
    currencyLabel: 'Wild Cores',
    providerGameCode: 'wild_rift_kh',
    description: 'Wild Core packages for Cambodia Wild Rift accounts.',
    imageUrl: officialGameImages['wild-rift-cambodia'],
    requiredFields: [{ key: 'userId', label: 'Riot ID / User ID', placeholder: 'player#KH1', required: true }],
    usernameApi: {
      enabled: true,
      method: 'POST',
      url: 'https://api.g2bulk.com/v1/games/checkPlayerId',
      bodyTemplate: { game: 'wild_rift_kh', user_id: '{{userId}}' },
      usernamePath: 'name'
    },
    sortOrder: 16,
    packages: [
      { name: '425', amountLabel: '425 Wild Cores', priceUsd: 5.44, providerCatalogueName: '425', providerCatalogueId: 1135 },
      { name: '1000', amountLabel: '1000 Wild Cores', priceUsd: 11.98, providerCatalogueName: '1000', providerCatalogueId: 1136 },
      { name: '1850', amountLabel: '1850 Wild Cores', priceUsd: 21.78, providerCatalogueName: '1850', providerCatalogueId: 1137 },
      { name: '3275', amountLabel: '3275 Wild Cores', priceUsd: 38.13, providerCatalogueName: '3275', providerCatalogueId: 1138 },
      { name: '4800', amountLabel: '4800 Wild Cores', priceUsd: 54.97, providerCatalogueName: '4800', providerCatalogueId: 1133 },
      { name: '10000', amountLabel: '10000 Wild Cores', priceUsd: 108.97, providerCatalogueName: '10000', providerCatalogueId: 1134 }
    ]
  },
  {
    name: 'Farlight 84',
    slug: 'farlight-84',
    category: 'Battle Royale',
    currencyLabel: 'Diamonds',
    providerGameCode: 'farlight84',
    description: 'Farlight 84 diamond packages with player ID validation.',
    imageUrl: officialGameImages['farlight-84'],
    requiredFields: [{ key: 'userId', label: 'User ID', placeholder: '10000001', required: true }],
    usernameApi: {
      enabled: true,
      method: 'POST',
      url: 'https://api.g2bulk.com/v1/games/checkPlayerId',
      bodyTemplate: { game: 'farlight84', user_id: '{{userId}}' },
      usernamePath: 'name'
    },
    sortOrder: 17,
    packages: [
      { name: '5', amountLabel: '5 Diamonds', priceUsd: 0.06, providerCatalogueName: '5', providerCatalogueId: 2534 },
      { name: '10', amountLabel: '10 Diamonds', priceUsd: 0.11, providerCatalogueName: '10', providerCatalogueId: 2539 },
      { name: '20', amountLabel: '20 Diamonds', priceUsd: 0.22, providerCatalogueName: '20', providerCatalogueId: 2538 },
      { name: '30', amountLabel: '30 Diamonds', priceUsd: 0.33, providerCatalogueName: '30', providerCatalogueId: 2526 },
      { name: '40', amountLabel: '40 Diamonds', priceUsd: 0.43, providerCatalogueName: '40', providerCatalogueId: 2535 },
      { name: '50', amountLabel: '50 Diamonds', priceUsd: 0.55, providerCatalogueName: '50', providerCatalogueId: 2527 },
      { name: '60', amountLabel: '60 Diamonds', priceUsd: 0.66, providerCatalogueName: '60', providerCatalogueId: 2528 },
      { name: '80', amountLabel: '80 Diamonds', priceUsd: 0.87, providerCatalogueName: '80', providerCatalogueId: 2529 },
      { name: '100', amountLabel: '100 Diamonds', priceUsd: 1.06, providerCatalogueName: '100', providerCatalogueId: 2540 },
      { name: '165', amountLabel: '165 Diamonds', priceUsd: 1.63, providerCatalogueName: '165', providerCatalogueId: 2536 }
    ]
  },
  {
    name: 'ZEPETO',
    slug: 'zepeto',
    category: 'Social',
    currencyLabel: 'ZEMS',
    providerGameCode: 'zepeto',
    description: 'ZEPETO ZEMS, Coins, and Premium packages.',
    imageUrl: officialGameImages['zepeto'],
    requiredFields: [{ key: 'userId', label: 'User ID', placeholder: 'zepeto_user_id', required: true }],
    usernameApi: {
      enabled: true,
      method: 'POST',
      url: 'https://api.g2bulk.com/v1/games/checkPlayerId',
      bodyTemplate: { game: 'zepeto', user_id: '{{userId}}' },
      usernamePath: 'name'
    },
    sortOrder: 18,
    packages: [
      { name: '7 ZEMS', amountLabel: '7 ZEMS', priceUsd: 0.53, providerCatalogueName: '7 ZEMS', providerCatalogueId: 468 },
      { name: '4680 Coins', amountLabel: '4680 Coins', priceUsd: 1.08, providerCatalogueName: '4680 Coins', providerCatalogueId: 463 },
      { name: '14 ZEMS', amountLabel: '14 ZEMS', priceUsd: 1.08, providerCatalogueName: '14 ZEMS', providerCatalogueId: 469 },
      { name: '29 ZEMS', amountLabel: '29 ZEMS', priceUsd: 2.16, providerCatalogueName: '29 ZEMS', providerCatalogueId: 474 },
      { name: '10200 Coins', amountLabel: '10200 Coins', priceUsd: 2.16, providerCatalogueName: '10200 Coins', providerCatalogueId: 472 },
      { name: '21000 Coins', amountLabel: '21000 Coins', priceUsd: 4.29, providerCatalogueName: '21000 Coins', providerCatalogueId: 464 },
      { name: '60 ZEMS', amountLabel: '60 ZEMS', priceUsd: 4.29, providerCatalogueName: '60 ZEMS', providerCatalogueId: 470 },
      { name: 'Premium 1M', amountLabel: 'Premium (1M)', priceUsd: 4.55, providerCatalogueName: 'Premium (1M)', providerCatalogueId: 467 },
      { name: '38900 Coins', amountLabel: '38900 Coins', priceUsd: 7.65, providerCatalogueName: '38900 Coins', providerCatalogueId: 465 },
      { name: '125 ZEMS', amountLabel: '125 ZEMS', priceUsd: 8.61, providerCatalogueName: '125 ZEMS', providerCatalogueId: 475 }
    ]
  }
];

function defaultPackagesForGame(gameSeed) {
  if (gameSeed.packages?.length) {
    return gameSeed.packages.map((packageSeed, index) => ({
      sortOrder: index + 1,
      deliveryProvider: 'g2bulk',
      providerGameCode: gameSeed.providerGameCode,
      ...packageSeed,
      active: activeForPackage({ ...packageSeed, packageCategory: packageSeed.packageCategory || 'item-package' })
    }));
  }

  const itemLabel = gameSeed.currencyLabel || 'Credits';
  return [
    { name: 'Starter', amountLabel: `86 ${itemLabel}`, priceUsd: 1.25, sortOrder: 1, active: true },
    { name: 'Popular', amountLabel: `257 ${itemLabel}`, priceUsd: 3.65, bonusLabel: 'Best value', sortOrder: 2, active: true },
    { name: 'Pro', amountLabel: `706 ${itemLabel}`, priceUsd: 9.75, sortOrder: 3, active: true }
  ];
}

function shouldRefreshSeedCurrency(game, gameSeed) {
  if (!gameSeed.currencyLabel || game.currencyLabel === gameSeed.currencyLabel) return false;
  return !game.currencyLabel || game.currencyLabel === 'Credits' || game.currencyLabel === 'Diamonds';
}

function comparable(value) {
  return JSON.stringify(value, (_key, item) => {
    if (item instanceof Map) return Object.fromEntries(item);
    return item;
  });
}

export async function ensureDefaultAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const normalizedEmail = email.toLowerCase();
    const exists = await Admin.findOne({ email: normalizedEmail });
    if (!exists) {
      const legacy = await Admin.findOne({ active: true }).sort({ createdAt: 1 }).select('+passwordHash');
      if (legacy) {
        legacy.name = 'Lyka Admin';
        legacy.email = normalizedEmail;
        legacy.passwordHash = await bcrypt.hash(password, 12);
        legacy.active = true;
        await legacy.save();
      } else {
        await Admin.create({
          name: 'Lyka Admin',
          email: normalizedEmail,
          passwordHash: await bcrypt.hash(password, 12)
        });
      }
    } else {
      exists.name = 'Lyka Admin';
      exists.passwordHash = await bcrypt.hash(password, 12);
      exists.active = true;
      await exists.save();
    }
  }

  await SystemSetting.findOneAndUpdate(
    {},
    {
      $setOnInsert: {
        siteName: 'Lyka Topup',
        currency: 'USD',
        slides: [
          {
            title: 'Soft pastel deals for fast game top-ups',
            subtitle: 'Mobile Legends, Free Fire, PUBG Mobile, and more',
            ctaLabel: 'Claim Now',
            gameSlug: 'mobile-legends',
            imageUrl: officialGameImages['mobile-legends'],
            active: true,
            sortOrder: 1
          },
          {
            title: 'Lyka Topup flash picks',
            subtitle: 'Fresh prices on selected games',
            ctaLabel: 'View',
            gameSlug: 'free-fire',
            imageUrl: officialGameImages['free-fire'],
            active: true,
            sortOrder: 2
          }
        ],
        catalog: {
          featuredGameSlugs: ['mobile-legends', 'free-fire', 'pubg-mobile', 'blood-strike'],
          featuredOnly: false,
          flashTitle: 'Lyka Topup flash picks',
          flashSubtitle: 'Fresh prices on selected games',
          flashCtaLabel: 'View',
          categories: [
            { name: 'MOBA', slug: 'moba', active: true, color: '#ff9f2d', icon: 'moba', sortOrder: 1 },
            { name: 'RPG', slug: 'rpg', active: true, color: '#8b5dff', icon: 'rpg', sortOrder: 2 },
            { name: 'Survival', slug: 'survival', active: true, color: '#22c55e', icon: 'survival', sortOrder: 3 },
            { name: 'Battle Royale', slug: 'battle-royale', active: true, color: '#ef4444', icon: 'battle-royale', sortOrder: 4 },
            { name: 'FPS', slug: 'fps', active: true, color: '#4f8bff', icon: 'fps', sortOrder: 5 },
            { name: 'Strategy', slug: 'strategy', active: true, color: '#f59e0b', icon: 'strategy', sortOrder: 6 }
          ],
          categoryOverrides: {}
        },
        khqr: {
          merchantName: process.env.TOLA_MERCHANT_NAME || process.env.KHQR_LINK_MERCHANT_NAME || 'Lyka Topup',
          bakongId: process.env.TOLA_BAKONG_ID || '',
          enabled: true
        }
      }
    },
    { upsert: true, new: true }
  );

  for (const gameSeed of seededGames) {
    const game = await Game.findOneAndUpdate(
      { slug: gameSeed.slug },
      { $setOnInsert: gameSeed },
      { upsert: true, new: true }
    );

    let shouldSaveGame = false;
    if (game.imageUrl !== gameSeed.imageUrl) {
      game.imageUrl = gameSeed.imageUrl;
      shouldSaveGame = true;
    }
    if (gameSeed.usernameApi && comparable(game.usernameApi?.toObject?.() || game.usernameApi) !== comparable(gameSeed.usernameApi)) {
      game.usernameApi = gameSeed.usernameApi;
      shouldSaveGame = true;
    }
    if (gameSeed.requiredFields && comparable(game.requiredFields?.map?.((field) => field.toObject?.() || field) || game.requiredFields) !== comparable(gameSeed.requiredFields)) {
      game.requiredFields = gameSeed.requiredFields;
      shouldSaveGame = true;
    }
    if (shouldSaveGame) {
      await game.save();
    }

    for (const packageSeed of defaultPackagesForGame(gameSeed)) {
      const legacyAmountLabel = `${packageSeed.amountLabel.split(' ')[0]} Credits`;
      await Package.findOneAndUpdate(
        { game: game._id, sortOrder: packageSeed.sortOrder },
        { $setOnInsert: { game: game._id, ...packageSeed } },
        { upsert: true, new: true }
      );
      await Package.updateOne(
        { game: game._id, sortOrder: packageSeed.sortOrder, name: packageSeed.name, amountLabel: legacyAmountLabel },
        { $set: { amountLabel: packageSeed.amountLabel } }
      );
    }

    if (shouldRefreshSeedCurrency(game, gameSeed)) {
      game.currencyLabel = gameSeed.currencyLabel;
      await game.save();
    }
  }

  await Package.updateMany(
    { priceUsd: { $gt: MAX_ACTIVE_PACKAGE_PRICE_USD }, active: { $ne: false } },
    { $set: { active: false } }
  );
}

