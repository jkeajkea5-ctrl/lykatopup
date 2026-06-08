export const gamePriority = ['mobile-legends', 'free-fire', 'pubg-mobile'];

export const imageOverrides = {
  'pubg-mobile': '/game-banners/pubg.jpg',
  'mobile-legends': '/game-banners/mlbb.jpg',
  'free-fire': '/game-banners/freefire.jpg',
  'honor-of-kings': '/game-banners/honor-of-kings.jpg',
  'magic-chess-go-go': '/game-banners/magic-chess-go-go.jpg',
  'valorant-cambodia': '/game-banners/valorant-cambodia.png',
  'blood-strike': '/game-banners/blood-strike.jpg',
  'genshin-impact-cambodia': '/game-banners/genshin-impact-cambodia.jpg',
  'honkai-star-rail': '/game-banners/honkai-star-rail.jpg',
  'zenless-zone-zero': '/game-banners/zenless-zone-zero.jpg',
  'wuthering-waves': '/game-banners/wuthering-waves.jpg',
  'delta-force': '/game-banners/delta-force.jpg',
  'arena-breakout': '/game-banners/arena-breakout.jpg',
  'call-of-duty-mobile-garena': '/game-banners/cod-mobile.jpg',
  'identity-v': '/game-banners/identity-v.jpg',
  'wild-rift-cambodia': '/game-banners/wild-rift.jpg',
  'farlight-84': '/game-banners/farlight-84.jpg',
  zepeto: '/game-banners/zepeto.jpg'
};

const logoImageSlugs = new Set(['valorant-cambodia']);

export function hideBrokenImage(event) {
  event.currentTarget.style.display = 'none';
}

function usableImageUrl(url) {
  if (!url || String(url).startsWith('/game-image/')) return '';
  if (/^https?:\/\//i.test(String(url))) return '';
  return url;
}

export function displayImageUrl(game) {
  return imageOverrides[game?.slug] || usableImageUrl(game?.imageUrl);
}

export function imageFrameClass(game) {
  return logoImageSlugs.has(game?.slug) ? ' logoImageFrame' : '';
}

export function sortGames(games = []) {
  return [...games].sort((left, right) => {
    const leftIndex = gamePriority.indexOf(left.slug);
    const rightIndex = gamePriority.indexOf(right.slug);
    if (leftIndex !== -1 || rightIndex !== -1) {
      return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
    }
    return Number(left.sortOrder || 0) - Number(right.sortOrder || 0) || left.name.localeCompare(right.name);
  });
}
