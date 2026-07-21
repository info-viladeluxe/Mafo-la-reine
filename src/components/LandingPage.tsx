import { Header } from './Header';
import { Hero } from './Hero';
import { Trust } from './Trust';
import { Features } from './Features';
import { Africa } from './Africa';
import { Testimonials } from './Testimonials';
import { Pricing } from './Pricing';
import { About } from './About';
import { FAQ } from './FAQ';
import { FinalCTA } from './FinalCTA';
import { Footer } from './Footer';
import type { LegalPage } from './LegalPageView';

export function LandingPage({ onAuth, onLegalClick }: { onAuth: () => void; onLegalClick?: (page: LegalPage) => void }) {
  return (
    <div className="min-h-screen bg-sable-100 dark:bg-indigo-400">
      <Header onAuth={onAuth} />
      <main>
        <Hero onAuth={onAuth} />
        <Trust />
        <Features />
        <Africa />
        <Testimonials />
        <Pricing onAuth={onAuth} />
        <About />
        <FAQ />
        <FinalCTA onAuth={onAuth} />
      </main>
      <Footer onLegalClick={onLegalClick} />
    </div>
  );
}
