import { useMemo, useState } from 'react';
import { Crosshair, Flame, Gamepad2, Grid2X2, Joystick, Loader2, Puzzle, Search, Shield, ShieldCheck, Sparkles, Star, Swords, UsersRound, WandSparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusLine } from '../components/StatusLine.jsx';
import { money } from '../lib/format.js';
import { displayImageUrl, hideBrokenImage } from '../lib/images.js';

const categoryIcons = {
  All: Sparkles,
  MOBA: Swords,
  FPS: Crosshair,
  RPG: WandSparkles,
  Strategy: Puzzle,
  'Battle Royale': Shield,
  Survival: Flame,
  Social: UsersRound
};

function CategoryIcon({ category, size = 15 }) {
  const Icon = categoryIcons[category] || Joystick;
  return <Icon className="categoryIcon" size={size} aria-hidden="true" />;
}

export function Catalog({ games, loading, error }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const categories = useMemo(() => ['All', ...Array.from(new Set(games.map((game) => game.category).filter(Boolean)))], [games]);
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return games.filter((game) => {
      const matchesCategory = category === 'All' || game.category === category;
      const matchesSearch = !text || [game.name, game.category, game.publisher].filter(Boolean).join(' ').toLowerCase().includes(text);
      return matchesCategory && matchesSearch;
    });
  }, [category, games, query]);

  return (
    <main className="catalogPage">
      <section className="catalogIntro" id="games">
        <div>
          <h2>Game Catalog</h2>
          <p>Browse & top up your favorite games</p>
        </div>
        <label className="searchBox">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search games..." />
        </label>
      </section>

      <div className="categoryStrip" aria-label="Game categories">
        {categories.map((item) => (
          <button className={item === category ? 'active' : ''} key={item} onClick={() => setCategory(item)} type="button">
            <CategoryIcon category={item} />
            {item}
          </button>
        ))}
      </div>
      <div className="catalogTools">
        <span>Sort by: <strong>Most Popular</strong></span>
        <span>{filtered.length} games</span>
        <button type="button" aria-label="Grid view"><Grid2X2 size={18} /></button>
      </div>

      {loading && <StatusLine icon={<Loader2 className="spin" />} text="Loading catalog" />}
      {error && <StatusLine tone="bad" icon={<ShieldCheck />} text={error} />}
      <div className="gameGrid">
        {filtered.map((game, index) => (
          <button className="gameCard" key={game._id || game.slug} onClick={() => navigate(`/games/${game.slug}`)} type="button">
            <span className="gameImage">
              {displayImageUrl(game) ? <img src={displayImageUrl(game)} alt="" onError={hideBrokenImage} /> : <Gamepad2 />}
              <em>{index === 0 ? 'HOT' : index === 1 ? 'NEW' : 'TOP'}</em>
              <i><Star size={13} /> {(4.9 - Math.min(index, 4) * 0.1).toFixed(1)}</i>
            </span>
            <span className="gameMeta">
              <strong>{game.shortName || game.name}</strong>
              <small>{game.description || `Fast ${game.currencyLabel || 'credit'} top-ups with KHQR checkout.`}</small>
            </span>
            <span className="gameFooter">
              <span>{game.lowestPrice ? money(game.lowestPrice) : 'Soon'}</span>
              <span className="pill">Top Up</span>
            </span>
            <span className="catalogMeta">
              <small>{game.packageCount || 0}</small>
              <small><CategoryIcon category={game.category} size={12} /> {game.category || 'Game'}</small>
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}
