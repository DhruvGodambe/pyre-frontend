import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

export const dynamic = 'force-dynamic';

function loadSections() {
  const dir = path.join(process.cwd(), 'content');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort();

  return files.map((file, i) => {
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    const titleMatch = raw.match(/^#\s+(.+)$/m);
    return {
      id: file.replace(/\.md$/, ''),
      num: String(i + 1).padStart(2, '0'),
      title: titleMatch ? titleMatch[1] : file,
      html: marked.parse(raw),
    };
  });
}

export default function BriefingPage() {
  const sections = loadSections();
  const updated = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="shell">
      <aside className="side">
        <div className="side-mark">
          PYRE<span>.</span>
        </div>
        <div className="side-tag">Designer Briefing</div>
        <ul className="toc">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>
                <span className="toc-num">{s.num}</span>
                {s.title}
              </a>
            </li>
          ))}
        </ul>
        <div className="side-foot">
          LIVING DOCUMENT
          <br />
          VIEWED {updated.toUpperCase()}
        </div>
      </aside>

      <main className="main">
        <header className="hero">
          <p className="hero-eyebrow">Confidential · For the PYRE design partner</p>
          <h1>
            The fire needs a <em>face.</em>
          </h1>
          <p>
            Everything you need to design PYRE lives on this page. It is a living document — it
            will be updated continuously as decisions are made, so check back before starting
            each new piece. Locked decisions are marked as such; everything else is open for
            your creative judgment.
          </p>
          <div className="hero-meta">
            <div>
              <strong>Protocol</strong>PYRE — Ethereum / Uniswap V4
            </div>
            <div>
              <strong>Launch</strong>Date TBD — build for readiness
            </div>
            <div>
              <strong>Contact</strong>Via the usual channel
            </div>
          </div>
        </header>

        {sections.map((s) => (
          <section className="section" key={s.id} id={s.id}>
            <div className="section-head">
              <span className="section-num">{s.num}</span>
              <span className="section-rule" />
            </div>
            <div className="prose" dangerouslySetInnerHTML={{ __html: s.html }} />
          </section>
        ))}
      </main>
    </div>
  );
}
