import { useEffect, useState } from 'react';
import { ImagePlus, LogIn, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Stat } from '../components/Stat.jsx';
import { StatusLine } from '../components/StatusLine.jsx';
import { request } from '../lib/api.js';
import { money } from '../lib/format.js';
import { displayImageUrl, hideBrokenImage } from '../lib/images.js';

function hasKhmerText(value = '') {
  return /[\u1780-\u17ff]/.test(value);
}

export function Admin({ auth }) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [storefront, setStorefront] = useState(null);
  const [slides, setSlides] = useState([]);
  const [savingSlides, setSavingSlides] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (auth?.role !== 'admin') return;
    request('/api/admin/summary')
      .then(setSummary)
      .catch((err) => setError(err.message));
    request('/api/admin/storefront')
      .then((data) => {
        setStorefront(data);
        setSlides((data.slides || []).map(normalizeSlide));
      })
      .catch((err) => setError(err.message));
  }, [auth]);

  function normalizeSlide(slide = {}, index = 0) {
    return {
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      ctaLabel: slide.ctaLabel || 'Top Up Now',
      imageUrl: slide.imageUrl || '',
      gameSlug: slide.gameSlug || '',
      active: slide.active !== false,
      sortOrder: Number(slide.sortOrder || index + 1)
    };
  }

  function updateSlide(index, field, value) {
    setSlides((current) => current.map((slide, slideIndex) => (slideIndex === index ? { ...slide, [field]: value } : slide)));
  }

  function addSlide() {
    const fallbackGame = storefront?.catalog?.featuredGameSlugs?.[0] || 'mobile-legends';
    setSlides((current) => [
      ...current,
      normalizeSlide({
        title: '\u1794\u17D2\u179A\u17BC\u1798\u17C9\u17BC\u179F\u17B7\u1793\u1790\u17D2\u1798\u17B8\u1796\u17B8 Lyka',
        subtitle: '\u1794\u1789\u17D2\u1785\u17BC\u179B\u179A\u17BC\u1794\u1797\u17B6\u1796\u179F\u17D2\u179B\u17B6\u1799 \u1793\u17B7\u1784\u1797\u17D2\u1787\u17B6\u1794\u17CB\u1791\u17C5\u17A0\u17D2\u1782\u17C1\u1798\u17D4',
        ctaLabel: '\u1794\u1789\u17D2\u1785\u17BC\u179B\u17A5\u17A1\u17BC\u179C',
        imageUrl: '/game-banners/mlbb.jpg',
        gameSlug: fallbackGame,
        active: true,
        sortOrder: current.length + 1
      })
    ]);
  }

  function removeSlide(index) {
    setSlides((current) => current.filter((_, slideIndex) => slideIndex !== index).map((slide, slideIndex) => ({ ...slide, sortOrder: slideIndex + 1 })));
  }

  async function saveSlides() {
    setSavingSlides(true);
    setError('');
    setMessage('');
    try {
      const cleanSlides = slides
        .map((slide, index) => ({
          ...slide,
          title: slide.title.trim(),
          subtitle: slide.subtitle.trim(),
          ctaLabel: slide.ctaLabel.trim() || 'Top Up Now',
          imageUrl: slide.imageUrl.trim(),
          gameSlug: slide.gameSlug.trim(),
          sortOrder: Number(slide.sortOrder || index + 1),
          active: Boolean(slide.active)
        }))
        .filter((slide) => slide.title && slide.imageUrl);
      const data = await request('/api/admin/storefront/slides', {
        method: 'PUT',
        body: JSON.stringify({ slides: cleanSlides })
      });
      setSlides((data.slides || []).map(normalizeSlide));
      setMessage('Slides saved. Home page will update after cache refresh.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingSlides(false);
    }
  }

  if (auth?.role !== 'admin') {
    return (
      <main className="authWrap">
        <section className="authPanel">
          <span className="authIcon"><ShieldCheck size={26} /></span>
          <h1>Admin access</h1>
          <p>Login with the Lyka admin email and password to manage the store.</p>
          <button className="primary wide" onClick={() => navigate('/admin/login')} type="button">
            <LogIn size={18} /> Admin login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="sectionHead">
        <div>
          <h2>Admin dashboard</h2>
          <p>{auth.admin?.email}</p>
        </div>
      </section>
      {error && <StatusLine tone="bad" icon={<ShieldCheck />} text={error} />}
      <div className="statGrid">
        <Stat label="Games" value={summary?.games ?? '--'} />
        <Stat label="Packages" value={summary?.packages ?? '--'} />
        <Stat label="Orders" value={summary?.orders ?? '--'} />
        <Stat label="Revenue" value={summary ? money(summary.revenue) : '--'} />
      </div>
      <section className="adminPanel">
        <div className="adminPanelHead">
          <div>
            <h3><ImagePlus size={18} /> Home Image Slides</h3>
            <p>Manage the dynamic image slider shown under the header.</p>
          </div>
          <button className="secondary" onClick={addSlide} type="button">
            <Plus size={17} /> Add Slide
          </button>
        </div>
        <div className="slideEditorList">
          {slides.map((slide, index) => {
            const previewUrl = displayImageUrl({ slug: slide.gameSlug, imageUrl: slide.imageUrl }) || slide.imageUrl;
            return (
              <div className="slideEditorCard" key={`slide-editor-${index}`}>
                <div className="slidePreview">
                  {previewUrl ? <img src={previewUrl} alt="" onError={hideBrokenImage} /> : <ImagePlus size={28} />}
                </div>
                <div className="slideFields">
                <label>
                  <span>Title</span>
                  <input className={hasKhmerText(slide.title) ? 'khmerText' : ''} value={slide.title} onChange={(event) => updateSlide(index, 'title', event.target.value)} placeholder="Slide title" />
                </label>
                <label>
                  <span>Subtitle</span>
                  <textarea className={hasKhmerText(slide.subtitle) ? 'khmerText' : ''} value={slide.subtitle} onChange={(event) => updateSlide(index, 'subtitle', event.target.value)} placeholder="Short promotion text" rows={2} />
                </label>
                <div className="adminMiniGrid">
                  <label>
                    <span>Image URL</span>
                    <input value={slide.imageUrl} onChange={(event) => updateSlide(index, 'imageUrl', event.target.value)} placeholder="/game-banners/mlbb.jpg" />
                  </label>
                  <label>
                    <span>Game Slug</span>
                    <input value={slide.gameSlug} onChange={(event) => updateSlide(index, 'gameSlug', event.target.value)} placeholder="mobile-legends" />
                  </label>
                  <label>
                    <span>CTA</span>
                    <input className={hasKhmerText(slide.ctaLabel) ? 'khmerText' : ''} value={slide.ctaLabel} onChange={(event) => updateSlide(index, 'ctaLabel', event.target.value)} placeholder="Top Up Now" />
                  </label>
                  <label>
                    <span>Order</span>
                    <input min="1" type="number" value={slide.sortOrder} onChange={(event) => updateSlide(index, 'sortOrder', event.target.value)} />
                  </label>
                </div>
                <div className="slideEditorActions">
                  <label className="checkRow">
                    <input checked={slide.active} onChange={(event) => updateSlide(index, 'active', event.target.checked)} type="checkbox" />
                    <span>Active</span>
                  </label>
                  <button className="secondary" onClick={() => removeSlide(index)} type="button">
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </div>
            </div>
            );
          })}
          {!slides.length && <p className="emptyAdminState">No slides yet. Add one to control the home slider.</p>}
        </div>
        <div className="adminSaveRow">
          <button className="primary" disabled={savingSlides} onClick={saveSlides} type="button">
            <Save size={17} /> {savingSlides ? 'Saving...' : 'Save Slides'}
          </button>
        </div>
        {message && <StatusLine tone="good" icon={<ShieldCheck />} text={message} />}
      </section>
    </main>
  );
}
