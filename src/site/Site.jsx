import React, { useEffect, useState } from "react";
import Logo from "../components/Logo";
import Icon from "../components/Icon";
import TriGrid from "../components/TriGrid";
import OrderForm from "./OrderForm";
import { Link, usePath } from "./router";
import { SITE } from "./config";
import { SERVICES, STEPS, WHY, FAQ } from "./content";

const NAV = [
  { to: "/", label: "მთავარი" },
  { to: "/services", label: "მომსახურებები" },
  { to: "/about", label: "ჩვენ შესახებ" },
  { to: "/contact", label: "კონტაქტი" },
];

const TITLES = {
  "/": `${SITE.name} — ${SITE.tagline}`,
  "/services": `მომსახურებები — ${SITE.name}`,
  "/about": `ჩვენ შესახებ — ${SITE.name}`,
  "/contact": `განაცხადი და კონტაქტი — ${SITE.name}`,
};

export default function Site() {
  const { path, search } = usePath();
  const page = TITLES[path] ? path : "404";

  useEffect(() => {
    document.title = TITLES[page] || `გვერდი ვერ მოიძებნა — ${SITE.name}`;
  }, [page]);

  return (
    <div className="lp">
      <Header path={path} />
      <main>
        {page === "/" && <Home />}
        {page === "/services" && <Services />}
        {page === "/about" && <About />}
        {page === "/contact" && <Contact search={search} />}
        {page === "404" && <NotFound />}
      </main>
      <Footer />
    </div>
  );
}

// ---------------- ზედა ზოლი ----------------
function Header({ path }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className="sh">
      <div className="lp-wrap sh-in">
        <Link to="/" onClick={close} className="sh-logo" aria-label={`${SITE.name} — მთავარი`}>
          <Logo size={22} />
        </Link>
        <nav className={`sh-nav ${open ? "open" : ""}`}>
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} onClick={close} className={`sh-a ${path === n.to ? "on" : ""}`}>{n.label}</Link>
          ))}
          <Link to="/contact" onClick={close} className="btn btn-go sh-cta">განაცხადი</Link>
        </nav>
        <button className="sh-burger" aria-label="მენიუ" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <Icon name={open ? "close" : "menu"} size={24} />
        </button>
      </div>
    </header>
  );
}

// ---------------- ქვედა ზოლი ----------------
function Footer() {
  return (
    <footer className="sfoot">
      <div className="lp-wrap sfoot-in">
        <div>
          <Logo size={18} light />
          <p>{SITE.tagline} — {SITE.area}</p>
        </div>
        <div>
          <b>გვერდები</b>
          {NAV.map((n) => <Link key={n.to} to={n.to}>{n.label}</Link>)}
        </div>
        <div>
          <b>მომსახურებები</b>
          {SERVICES.map((s) => <Link key={s.slug} to={`/services#${s.slug}`}>{s.title}</Link>)}
        </div>
        <div>
          <b>კონტაქტი</b>
          <a href={SITE.phoneHref}>{SITE.phone}</a>
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          <span>{SITE.hours}</span>
        </div>
      </div>
      <div className="lp-wrap sfoot-copy">© {new Date().getFullYear()} {SITE.name}</div>
    </footer>
  );
}

// ---------------- მთავარი ----------------
const DEMO_BIDS = [
  { who: "ნ. ბერიძე", tag: "შემოწმებული", stars: "4.9", days: 2, price: 280 },
  { who: "GeoLine LLC", tag: "შემოწმებული", stars: "4.8", days: 1, price: 340 },
  { who: "ლ. კაპანაძე", tag: "", stars: "4.6", days: 3, price: 250 },
];

function Home() {
  return (
    <>
      <section className="lp-hero">
        <TriGrid />
        <div className="lp-wrap lp-hero-grid">
          <div>
            <div className="lp-kicker">{SITE.tagline} · {SITE.area}</div>
            <h1 className="lp-h1">ამზომველს ეძებ?<br /><span>დაელოდე ფასებს.</span></h1>
            <p className="lp-lede">
              დატოვე ერთი განაცხადი — ამზომველები ფასს ერთმანეთისგან დამოუკიდებლად
              გთავაზობენ. ადარებ ფასს, ვადას და შეფასებას. ირჩევ შენ.
            </p>
            <div className="lp-cta">
              <Link to="/contact" className="btn btn-go">განაცხადის გაგზავნა</Link>
              <Link to="/services" className="lp-ghost lp-ghost-lg">მომსახურებები</Link>
            </div>
          </div>

          <div className="lp-demo" aria-label="მაგალითი: შეთავაზებები ერთ განაცხადზე">
            <div className="lp-demo-hdr">
              <div>
                <div className="lp-demo-t">საკადასტრო აზომვითი ნახაზი</div>
                <div className="lp-demo-s">მცხეთა · 850 მ²</div>
              </div>
              <span className="lp-pill">3 შეთავაზება</span>
            </div>
            {DEMO_BIDS.map((b, i) => (
              <div className={`lp-bid ${i === 0 ? "best" : ""}`} key={b.who}>
                <div className="lp-av">{b.who.replace(/[^\p{L}]/gu, "").slice(0, 1)}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="lp-bid-who">{b.who}{b.tag && <em>{b.tag}</em>}</div>
                  <div className="lp-bid-meta">★ {b.stars} · {b.days} დღე</div>
                </div>
                <div className="lp-bid-price mono">{b.price} ₾</div>
              </div>
            ))}
            <div className="lp-demo-foot">
              <Icon name="lock" size={14} /> თითო ამზომველი მხოლოდ საკუთარ ფასს ხედავს
            </div>
            <div className="lp-demo-tag">მაგალითი</div>
          </div>
        </div>
      </section>

      <section className="lp-wrap lp-sec">
        <div className="sec-hd">
          <h2 className="lp-h2">მომსახურებები</h2>
          <Link to="/services" className="lp-link">ყველა დეტალურად →</Link>
        </div>
        <div className="svc-grid">
          {SERVICES.map((s) => (
            <Link key={s.slug} to={`/services#${s.slug}`} className="svc-card">
              <span className="svc-ic"><Icon name={s.icon} size={22} /></span>
              <h3>{s.title}</h3>
              <p>{s.short}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="lp-band">
        <div className="lp-wrap lp-sec">
          <h2 className="lp-h2">როგორ მუშაობს</h2>
          <div className="lp-steps">
            {STEPS.map((x) => (
              <div className="lp-step" key={x.n}>
                <div className="lp-step-n mono">{x.n}</div>
                <h3>{x.t}</h3>
                <p>{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-wrap lp-sec">
        <h2 className="lp-h2">რატომ {SITE.name}</h2>
        <div className="lp-trust">
          {WHY.map((x) => (
            <div key={x.t} className="lp-trust-i">
              <span className="svc-ic"><Icon name={x.icon} size={20} /></span>
              <div><b>{x.t}</b><span>{x.d}</span></div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-wrap lp-sec" style={{ paddingTop: 0 }}>
        <h2 className="lp-h2">ხშირი კითხვები</h2>
        <div className="faq">
          {FAQ.map((x) => (
            <details key={x.q}>
              <summary>{x.q}</summary>
              <p>{x.a}</p>
            </details>
          ))}
        </div>
      </section>

      <CtaBand />
    </>
  );
}

function CtaBand() {
  return (
    <section className="cta-band">
      <TriGrid />
      <div className="lp-wrap cta-in">
        <div>
          <h2>მზად ხარ?</h2>
          <p>განაცხადს ერთი წუთი სჭირდება. შეთავაზებებს უფასოდ მიიღებ.</p>
        </div>
        <Link to="/contact" className="btn btn-go">განაცხადის გაგზავნა</Link>
      </div>
    </section>
  );
}

function PageHead({ title, lede }) {
  return (
    <section className="ph">
      <TriGrid />
      <div className="lp-wrap ph-in">
        <h1>{title}</h1>
        {lede && <p>{lede}</p>}
      </div>
    </section>
  );
}

// ---------------- მომსახურებები ----------------
function Services() {
  // /services#slug — გადახვევა შესაბამის მომსახურებაზე
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <>
      <PageHead title="მომსახურებები"
        lede="რა სამუშაოებზე შეგიძლია განაცხადის დატოვება, როდის გჭირდება თითოეული და რა უნდა მოამზადო." />
      <section className="lp-wrap lp-sec svc-list">
        {SERVICES.map((s) => (
          <article key={s.slug} id={s.slug} className="svc-item">
            <div className="svc-item-hd">
              <span className="svc-ic"><Icon name={s.icon} size={24} /></span>
              <h2>{s.title}</h2>
            </div>
            <p className="svc-about">{s.about}</p>
            <div className="svc-cols">
              <div>
                <b>როდის გჭირდება</b>
                <ul className="lp-list">{s.when.map((w) => <li key={w}>{w}</li>)}</ul>
              </div>
              <div>
                <b>რა მოამზადო</b>
                <ul className="lp-list">{s.need.map((w) => <li key={w}>{w}</li>)}</ul>
              </div>
            </div>
            <Link to={`/contact?service=${encodeURIComponent(s.slug)}`} className="btn btn-go svc-btn">
              განაცხადი ამ მომსახურებაზე
            </Link>
          </article>
        ))}
      </section>
      <CtaBand />
    </>
  );
}

// ---------------- ჩვენ შესახებ ----------------
function About() {
  return (
    <>
      <PageHead title="ჩვენ შესახებ" lede={`${SITE.name} აკავშირებს ადამიანებს, ვისაც აზომვა სჭირდება, ამზომველებთან, ვინც ამ სამუშაოს აკეთებს.`} />
      <section className="lp-wrap lp-sec about">
        <div className="about-txt">
          <h2 className="lp-h2">რატომ შევქმენით</h2>
          <p>
            ამზომველის პოვნა დღეს ნაცნობების რჩევით ან ათობით ნომრის დარეკვით ხდება, ფასები კი ერთი და იმავე
            სამუშაოზე მკვეთრად განსხვავდება. გვინდა, რომ ეს პროცესი მარტივი და გამჭვირვალე იყოს:
            ერთი განაცხადი, რამდენიმე დამოუკიდებელი ფასი და შენი არჩევანი.
          </p>
          <p>
            ამზომველებისთვის კი ეს ახალი შეკვეთების წყაროა — მათ რეგიონში, მათ სპეციალიზაციაზე, სამართლიანი
            კონკურენციით, სადაც სხვისი ფასის ქვემოთ ჩამოწევა შეუძლებელია, რადგან ის არავის უჩანს.
          </p>
          <div className="warn" style={{ marginTop: 18 }}>
            ✎ ეს ტექსტი ნიმუშია — ჩაანაცვლე შენი ისტორიით: ვინ ხართ, რამდენი წლის გამოცდილება გაქვთ,
            რამდენი სამუშაო შეასრულეთ.
          </div>
        </div>
        <div className="about-card">
          <h3>ამზომველი ხარ?</h3>
          <p>მიიღე შეკვეთები შენს რეგიონში. დაგვიკავშირდი და გაგიზიარებთ, როგორ შემოგვიერთდე.</p>
          <a href={SITE.phoneHref} className="btn">{SITE.phone}</a>
          <a href={`mailto:${SITE.email}`} className="btn2" style={{ marginTop: 8, display: "block", textAlign: "center" }}>{SITE.email}</a>
        </div>
      </section>
    </>
  );
}

// ---------------- კონტაქტი / განაცხადი ----------------
function Contact({ search }) {
  const slug = new URLSearchParams(search).get("service");
  const initial = SERVICES.find((s) => s.slug === slug)?.title || "";
  return (
    <>
      <PageHead title="განაცხადი" lede="შეავსე ფორმა და ამზომველების შეთავაზებებს მიიღებ. ან დაგვიკავშირდი პირდაპირ." />
      <section className="lp-wrap lp-sec contact">
        <div className="contact-form">
          <OrderForm key={initial} initialService={initial} />
        </div>
        <aside className="contact-side">
          <h3>კონტაქტი</h3>
          <a className="contact-row" href={SITE.phoneHref}><Icon name="phone" size={18} /> {SITE.phone}</a>
          <a className="contact-row" href={`mailto:${SITE.email}`}><Icon name="mail" size={18} /> {SITE.email}</a>
          <div className="contact-row"><Icon name="clock" size={18} /> {SITE.hours}</div>
          <div className="contact-row"><Icon name="pin" size={18} /> {SITE.area}</div>
        </aside>
      </section>
    </>
  );
}

function NotFound() {
  return (
    <section className="lp-wrap lp-sec" style={{ textAlign: "center", minHeight: "40vh" }}>
      <h1 className="lp-h2">გვერდი ვერ მოიძებნა</h1>
      <p className="muted">შესაძლოა ბმული შეცვლილია.</p>
      <Link to="/" className="btn btn-go" style={{ width: "auto", display: "inline-block", marginTop: 12 }}>მთავარზე დაბრუნება</Link>
    </section>
  );
}
