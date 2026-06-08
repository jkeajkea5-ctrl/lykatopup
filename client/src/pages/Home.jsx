import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CircleDollarSign, Crown, Gamepad2, Gem, Search, ShieldCheck, Sparkles, Star, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusLine } from '../components/StatusLine.jsx';
import { money } from '../lib/format.js';
import { displayImageUrl, hideBrokenImage, imageFrameClass } from '../lib/images.js';

const categoryShortcuts = [
  { label: 'Diamonds', icon: Gem, filters: { q: 'Diamonds' } },
  { label: 'Coins', icon: CircleDollarSign, filters: { q: 'Coins' } },
  { label: 'Battle Pass', icon: Crown, filters: { q: 'Battle Pass' } },
  { label: 'Credits', icon: Star, filters: { q: 'Credits' } },
  { label: 'Vouchers', icon: Ticket, filters: { q: 'Vouchers' } }
];

function hasKhmerText(value = '') {
  return /[\u1780-\u17ff]/.test(value);
}

function catalogFilterUrl(filters = {}) {
  const params = new URLSearchParams(filters);
  return `/catalog?${params.toString()}`;
}

export function Home({ games, storefront, loading, error }) {
  const navigate = useNavigate();
  const slides = useMemo(() => {
    const managedSlides = (storefront?.slides || []).filter((slide) => slide.active !== false && slide.imageUrl);
    if (managedSlides.length) {
      return managedSlides.map((slide, index) => ({
        ...slide,
        key: slide.id || `${slide.title}-${index}`,
        title: slide.title,
        subtitle: slide.subtitle,
        ctaLabel: slide.ctaLabel || 'Top Up Now',
        image: displayImageUrl({ slug: slide.gameSlug, imageUrl: slide.imageUrl }) || slide.imageUrl,
        gameSlug: slide.gameSlug
      }));
    }
    return games.slice(0, 3).map((game) => ({
      key: game._id || game.slug,
      title: game.shortName || game.name,
      subtitle: `${game.currencyLabel || 'Credits'} packages from ${game.lowestPrice ? money(game.lowestPrice) : 'today'} with KHQR payment and order tracking.`,
      ctaLabel: 'Top Up Now',
      image: displayImageUrl(game),
      gameSlug: game.slug,
      category: game.category,
      lowestPrice: game.lowestPrice
    }));
  }, [games, storefront?.slides]);
  const [activeSlide, setActiveSlide] = useState(0);
  const featured = games.slice(0, 6);
  const popular = games.slice(0, 6);
  const currentSlide = slides[activeSlide] || null;

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    if (activeSlide >= slides.length) setActiveSlide(0);
  }, [activeSlide, slides.length]);

  return (
    <main className="storeHome">
      <section className="storeHero">
        <div className="heroCopy">
          <span className="heroBadge"><Sparkles size={15} /> Featured Top-Up</span>
          <h1 className={hasKhmerText(currentSlide?.title) ? 'khmerText' : ''}>{currentSlide?.title || 'Top Up Your Favorite Games'}</h1>
          <p className={hasKhmerText(currentSlide?.subtitle) ? 'khmerText' : ''}>
            {currentSlide?.subtitle || 'Browse Cambodia game packages with clean pricing, secure checkout, and instant delivery. Top up your account and get back to gaming in minutes.'}
          </p>
          <div className="heroActions">
            <button className={`primary ${hasKhmerText(currentSlide?.ctaLabel) ? 'khmerText' : ''}`} onClick={() => navigate(currentSlide?.gameSlug ? `/games/${currentSlide.gameSlug}` : '/catalog')} type="button">
              <Gamepad2 size={19} /> {currentSlide?.ctaLabel || 'Top Up Now'}
            </button>
            <button className="secondary" onClick={() => navigate('/orders')} type="button">
              <Search size={19} /> Track Order
            </button>
          </div>
          <div className="heroDots" aria-label="Featured game slides">
            {slides.map((game, index) => (
              <button
                aria-label={`Show ${game.title}`}
                className={index === activeSlide ? 'active' : ''}
                key={`hero-dot-${game.key}`}
                onClick={() => setActiveSlide(index)}
                type="button"
              />
            ))}
          </div>
        </div>
        <button
          className="heroSlideMedia"
          onClick={() => navigate(currentSlide?.gameSlug ? `/games/${currentSlide.gameSlug}` : '/catalog')}
          type="button"
        >
          {currentSlide?.image ? (
            <img src={currentSlide.image} alt="" onError={hideBrokenImage} />
          ) : (
            <Gamepad2 size={46} />
          )}
          <span>
            <strong>{currentSlide?.category || 'Game'}</strong>
            <small>{currentSlide?.lowestPrice ? `From ${money(currentSlide.lowestPrice)}` : currentSlide?.ctaLabel || 'Available now'}</small>
          </span>
        </button>
      </section>

      <label className="homeSearch">
        <Search size={20} />
        <input placeholder="Search games..." onFocus={() => navigate('/catalog')} readOnly />
        <button type="button" onClick={() => navigate('/catalog')}>Search</button>
      </label>

      <section className="storeSection">
        <div className="compactSectionHead">
          <h2>Top-Up Categories</h2>
          <button type="button" onClick={() => navigate('/catalog')}>See all</button>
        </div>
        <div className="categoryTiles">
          {categoryShortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} type="button" onClick={() => navigate(catalogFilterUrl(item.filters))}>
                <span><Icon size={22} /></span>
                <strong>{item.label}</strong>
              </button>
            );
          })}
        </div>
      </section>

      {error && <StatusLine tone="bad" icon={<ShieldCheck />} text={error} />}

      <section className="storeSection">
        <div className="compactSectionHead">
          <h2>Featured Games</h2>
          <button type="button" onClick={() => navigate('/catalog')}>See all</button>
        </div>
        <div className="featuredScroller homeFeatured" aria-label="Featured games">
          {featured.map((game, index) => (
            <button className="featuredCard" key={`home-${game._id || game.slug}`} onClick={() => navigate(`/games/${game.slug}`)} type="button">
              <span className={`featuredImage${imageFrameClass(game)}`}>
                {displayImageUrl(game) ? <img src={displayImageUrl(game)} alt="" onError={hideBrokenImage} /> : <Gamepad2 />}
                <em>{index === 0 ? 'HOT' : index === 1 ? 'NEW' : 'TOP'}</em>
              </span>
              <span>
                <strong>{game.shortName || game.name}</strong>
                <small>{game.lowestPrice ? `From ${money(game.lowestPrice)}` : 'Available soon'}</small>
              </span>
              <span className="miniTopup">Top Up</span>
            </button>
          ))}
        </div>
      </section>

      <section className="storeSection">
        <div className="compactSectionHead">
          <h2>Popular Games</h2>
          <button type="button" onClick={() => navigate('/catalog')}>View all</button>
        </div>
        <div className="popularGrid">
          {popular.map((game, index) => (
            <button className="popularCard" key={`popular-${game._id || game.slug}`} onClick={() => navigate(`/games/${game.slug}`)} type="button">
              <span className={`popularImage${imageFrameClass(game)}`}>{displayImageUrl(game) ? <img src={displayImageUrl(game)} alt="" onError={hideBrokenImage} /> : <Gamepad2 />}</span>
              <span>
                <strong>{game.shortName || game.name}</strong>
                <small>{game.category || 'Game'}</small>
                <em><Star size={13} /> {(4.9 - index * 0.1).toFixed(1)}</em>
              </span>
            </button>
          ))}
        </div>
        <div className="storePerks">
          <span><Sparkles size={22} /> <strong>Instant<br />Delivery</strong></span>
          <span><ShieldCheck size={22} /> <strong>100%<br />Secure</strong></span>
          <span><BadgeCheck size={22} /> <strong>24/7<br />Support</strong></span>
        </div>
      </section>
    </main>
  );
}
