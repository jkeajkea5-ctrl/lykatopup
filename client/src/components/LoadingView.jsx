import { Sparkles } from 'lucide-react';

export function LoadingView({ title = 'Loading Lyka Topup', subtitle = 'Preparing games and packages...', splash = false }) {
  return (
    <main className={`loadingPage${splash ? ' loadingSplash' : ''}`} aria-busy="true" aria-live="polite">
      <section className="loadingPanel">
        <div className="loadingBrand">
          <span className="loadingLogo">
            <img src="/lyka-logo.png" alt="" decoding="async" />
          </span>
          <span>
            <strong>{title}</strong>
            <small>{subtitle}</small>
          </span>
        </div>
        <div className="loadingOrb" aria-hidden="true">
          <Sparkles size={28} />
        </div>
        <div className="loadingBar" aria-hidden="true">
          <span />
        </div>
        <div className="loadingSkeleton" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      </section>
    </main>
  );
}
