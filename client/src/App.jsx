import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { useBootstrap } from './hooks/useBootstrap.js';
import { Admin } from './pages/Admin.jsx';
import { Catalog } from './pages/Catalog.jsx';
import { ContactUs } from './pages/ContactUs.jsx';
import { GameDetail } from './pages/GameDetail.jsx';
import { Home } from './pages/Home.jsx';
import { Profile } from './pages/Profile.jsx';

export function App() {
  const bootstrap = useBootstrap();
  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lyka_auth'));
    } catch {
      return null;
    }
  });

  return (
    <Routes>
      <Route element={<Layout auth={auth} setAuth={setAuth} />}>
        <Route index element={<Home {...bootstrap} />} />
        <Route path="catalog" element={<Catalog {...bootstrap} />} />
        <Route path="contact" element={<ContactUs />} />
        <Route path="profile" element={<Profile setAuth={setAuth} />} />
        <Route path="games/:slug" element={<GameDetail />} />
        <Route path="admin" element={<Admin auth={auth} />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  );
}

