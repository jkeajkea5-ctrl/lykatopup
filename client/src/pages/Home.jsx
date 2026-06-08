import { BadgeCheck, CircleDollarSign, Crown, Gamepad2, Gem, Search, ShieldCheck, Sparkles, Star, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusLine } from '../components/StatusLine.jsx';
import { money } from '../lib/format.js';
import { displayImageUrl, hideBrokenImage } from '../lib/images.js';

const categoryShortcuts = [
  { label: 'Diamonds', icon: Gem },
  { label: 'Coins', icon: CircleDollarSign },
  { label: 'Battle Pass', icon: Crown },
  { label: 'Credits', icon: Star },
  { label: 'Vouchers', icon: Ticket }
];

export function Home({ games, loading, error }) {
  const navigate = useNavigate();
  const featured = games.slice(0, 6);
  const popular = games.slice(0, 6);

  return (
    <main className="storeHome">
      <section className="storeHero">
        <div className="heroCopy">
          <h1>Top Up Your Favorite Games</h1>
          <p>Browse Cambodia game packages with clean pricing, KHQR payment, and order tracking.</p>
          <div className="heroActions">
            <button className="primary" onClick={() => navigate('/catalog')} type="button">
              <Gamepad2 size={19} /> Browse Games
            </button>
            <button className="secondary" onClick={() => navigate('/contact')} type="button">
              <Search size={19} /> Contact Us
            </button>
          </div>
        </div>
        <div className="heroGameStrip" aria-hidden="true">
          {games.slice(0, 3).map((game) => (
            <span key={`hero-${game._id || game.slug}`}>
              {displayImageUrl(game) ? <img src={displayImageUrl(game)} alt="" onError={hideBrokenImage} /> : <Gamepad2 />}
            </span>
          ))}
        </div>
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
              <button key={item.label} type="button" onClick={() => navigate('/catalog')}>
                <span><Icon size={22} /></span>
                <strong>{item.label}</strong>
              </button>
            );
          })}
        </div>
      </section>

      {loading && <StatusLine icon={<Sparkles className="spin" />} text="Loading catalog" />}
      {error && <StatusLine tone="bad" icon={<ShieldCheck />} text={error} />}

      <section className="storeSection">
        <div className="compactSectionHead">
          <h2>Featured Games</h2>
          <button type="button" onClick={() => navigate('/catalog')}>See all</button>
        </div>
        <div className="featuredScroller homeFeatured" aria-label="Featured games">
          {featured.map((game, index) => (
            <button className="featuredCard" key={`home-${game._id || game.slug}`} onClick={() => navigate(`/games/${game.slug}`)} type="button">
              <span className="featuredImage">
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
              <span className="popularImage">{displayImageUrl(game) ? <img src={displayImageUrl(game)} alt="" onError={hideBrokenImage} /> : <Gamepad2 />}</span>
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

