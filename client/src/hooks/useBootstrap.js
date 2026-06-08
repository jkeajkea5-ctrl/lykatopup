import { useEffect, useState } from 'react';
import { request } from '../lib/api.js';
import { sortGames } from '../lib/images.js';

export function useBootstrap() {
  const [state, setState] = useState({ loading: true, games: [], storefront: null, error: '' });

  useEffect(() => {
    request('/api/storefront/bootstrap')
      .then((data) => setState({ loading: false, games: sortGames(data.games || []), storefront: data.storefront, error: '' }))
      .catch((error) => setState((current) => ({ ...current, loading: false, error: error.message })));
  }, []);

  return state;
}

