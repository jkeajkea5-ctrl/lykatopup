import { useDeferredValue, useMemo } from 'react';
import { ArrowDownUp, Crosshair, Flame, Gamepad2, Joystick, Puzzle, Search, Shield, ShieldCheck, Sparkles, Star, Swords, UsersRound, WandSparkles } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StatusLine } from '../components/StatusLine.jsx';
import { money } from '../lib/format.js';
import { displayImageUrl, hideBrokenImage, imageFrameClass } from '../lib/images.js';

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

const sortOptions = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'price-asc', label: 'Price Low' },
  { value: 'price-desc', label: 'Price High' },
  { value: 'az', label: 'A-Z' }
];

function CategoryIcon({ category, size = 15 }) {
  const Icon = categoryIcons[category] || Joystick;
  return <Icon className="categoryIcon" size={size} aria-hidden="true" />;
}

export function Catalog({ games, loading, error }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const categories = useMemo(() => ['All', ...Array.from(new Set(games.map((game) => game.category).filter(Boolean)))], [games]);
  const categoryParam = searchParams.get('category') || 'All';
  const category = categories.includes(categoryParam) ? categoryParam : 'All';
  const query = searchParams.get('q') || '';
  const deferredQuery = useDeferredValue(query);
  const sort = sortOptions.some((option) => option.value === searchParams.get('sort')) ? searchParams.get('sort') : 'popular';
  const activeSort = sortOptions.find((option) => option.value === sort) || sortOptions[0];

  function updateFilters(nextFilters) {
    const next = new URLSearchParams(searchParams);
    Object.entries(nextFilters).forEach(([key, value]) => {
      if (!value || value === 'All' || value === 'popular') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    setSearchParams(next);
  }

  function cycleSort() {
    const currentIndex = sortOptions.findIndex((option) => option.value === sort);
    const nextSort = sortOptions[(currentIndex + 1) % sortOptions.length];
    updateFilters({ sort: nextSort.value });
  }

  const filtered = useMemo(() => {
    const text = deferredQuery.trim().toLowerCase();
    const results = games.filter((game) => {
      const matchesCategory = category === 'All' || game.category === category;
      const searchable = [
        game.name,
        game.shortName,
        game.category,
        game.publisher,
        game.currencyLabel,
        game.description,
        game.slug
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !text || searchable.includes(text);
      return matchesCategory && matchesSearch;
    });
    return [...results].sort((left, right) => {
      if (sort === 'price-asc') {
        const leftPrice = left.lowestPrice ?? Number.POSITIVE_INFINITY;
        const rightPrice = right.lowestPrice ?? Number.POSITIVE_INFINITY;
        if (!Number.isFinite(leftPrice) && !Number.isFinite(rightPrice)) return 0;
        return leftPrice - rightPrice;
      }
      if (sort === 'price-desc') {
        const leftPrice = left.lowestPrice ?? Number.NEGATIVE_INFINITY;
        const rightPrice = right.lowestPrice ?? Number.NEGATIVE_INFINITY;
        if (!Number.isFinite(leftPrice) && !Number.isFinite(rightPrice)) return 0;
        return rightPrice - leftPrice;
      }
      if (sort === 'az') {
        return (left.shortName || left.name || '').localeCompare(right.shortName || right.name || '');
      }
      return 0;
    });
  }, [category, deferredQuery, games, sort]);

  return (
    <main className="catalogPage">
      <section className="catalogIntro" id="games">
        <div>
          <h2>Game Catalog</h2>
          <p>Browse & top up your favorite games</p>
        </div>
        <label className="searchBox">
          <Search size={18} />
          <input value={query} onChange={(event) => updateFilters({ q: event.target.value })} placeholder="Search games..." />
        </label>
      </section>

      <div className="categoryStrip" aria-label="Game categories">
        {categories.map((item) => (
          <button aria-pressed={item === category} className={item === category ? 'active' : ''} key={item} onClick={() => updateFilters({ category: item })} type="button">
            <CategoryIcon category={item} />
            {item}
          </button>
        ))}
      </div>
      <div className="catalogTools">
        <span>Sort by: <strong>{activeSort.label}</strong></span>
        <span>{filtered.length} games</span>
        <button type="button" onClick={cycleSort} aria-label={`Change sort, currently ${activeSort.label}`}><ArrowDownUp size={18} /></button>
      </div>

      {error && <StatusLine tone="bad" icon={<ShieldCheck />} text={error} />}
      <div className="gameGrid">
        {filtered.map((game, index) => (
          <button className="gameCard" key={game._id || game.slug} onClick={() => navigate(`/games/${game.slug}`)} type="button">
            <span className={`gameImage${imageFrameClass(game)}`}>
              {displayImageUrl(game) ? <img src={displayImageUrl(game)} alt="" loading="lazy" decoding="async" onError={hideBrokenImage} /> : <Gamepad2 />}
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
