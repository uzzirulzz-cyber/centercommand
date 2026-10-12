import Link from 'next/link';
import PlayBeatOrbitMark from '../components/PlayBeatOrbitMark';

export default function Home() {
  return (
    <main className="pb-landing-page">
      <div className="pb-landing-grid" aria-hidden="true" />
      <section className="pb-landing-content" aria-labelledby="landing-title">
        <PlayBeatOrbitMark size="hero" className="pb-landing-emblem" />
        <p className="pb-landing-kicker"><span /> PLAYBEAT DIGITAL</p>
        <h1 id="landing-title">Your digital world,<br /><em>in motion.</em></h1>
        <p className="pb-landing-copy">One connected home for PlayBeat products, live experiences, and business operations.</p>
        <div className="pb-landing-actions">
          <Link href="/admin" className="pb-landing-primary">Open dashboard <span aria-hidden="true">↗</span></Link>
          <Link href="/admin/signin" className="pb-landing-secondary">Administrator sign in</Link>
        </div>
        <p className="pb-landing-footnote">A connected PlayBeat Digital experience</p>
      </section>
    </main>
  );
}
