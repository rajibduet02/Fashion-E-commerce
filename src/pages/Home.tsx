import { Link } from "react-router-dom";
import { ProductCard } from "../components/ProductCard";
import { HERO, TESTIMONIALS } from "../data";
import { useTitle } from "../hooks";
import { useStore } from "../store";
import { useState } from "react";

const MARQUEE = ["Tailored", "Draped", "Tried on you", "Sarees", "Suits", "Evening", "Denim", "Atelier"];

export function Home() {
  useTitle("Home");
  const { products } = useStore();
  const visible = products.filter((product) => !product.archived);
  const men = visible.filter((product) => product.gender === "men").slice(0, 4);
  const women = visible.filter((product) => product.gender === "women").slice(0, 4);
  const trending = visible.filter((product) => product.trending).slice(0, 8);
  const newest = visible.filter((product) => product.newest).slice(0, 4);
  const best = visible.filter((product) => product.bestseller).slice(0, 4);
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Autumn / Winter 2026</p>
          <h1>
            Discover Your Style.
            <em> Try Before You Buy.</em>
          </h1>
          <p className="lede">Experience AI-powered virtual fashion fitting and shop with confidence.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/new">
              Explore Collection
            </Link>
            <Link className="btn btn-ghost" to="/try-on">
              Try It With AI
            </Link>
          </div>
          <ul className="hero-notes">
            <li>
              <strong>12k</strong>
              <span>looks composed</span>
            </li>
            <li>
              <strong>14 days</strong>
              <span>to change your mind</span>
            </li>
            <li>
              <strong>$150</strong>
              <span>for complimentary shipping</span>
            </li>
          </ul>
        </div>
        <div className="hero-stage">
          <img className="hero-main" src={HERO.woman} alt="Woman in a black evening look, one hand in her hair" />
          <img className="hero-inset" src={HERO.man} alt="Man seated in a light tailored suit" />
          <p className="hero-caption">House portrait · Autumn / Winter</p>
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...MARQUEE, ...MARQUEE].map((word, index) => (
            <span key={`${word}-${index}`}>{word}</span>
          ))}
        </div>
      </div>

      <section className="ritual wrap">
        <div className="section-head">
          <p className="eyebrow">The fitting room</p>
          <h2>Three quiet steps.</h2>
        </div>
        <ol className="ritual-grid">
          <li>
            <span>01</span>
            <h3>Bring a photograph</h3>
            <p>Upload, drop, or use the camera. A full-length frame and even light give the clearest preview.</p>
          </li>
          <li>
            <span>02</span>
            <h3>Choose the cloth</h3>
            <p>Men’s and women’s ateliers share one room — color, cut, and category, without a second account.</p>
          </li>
          <li>
            <span>03</span>
            <h3>See it on you</h3>
            <p>Compare before and after, save the look, then carry the same size and color into your bag.</p>
          </li>
        </ol>
      </section>

      <section className="gender">
        <Link to="/men" className="gender-photo">
          <img src={HERO.men} alt="Man in a tailored coat, seated" />
        </Link>
        <div className="gender-copy">
          <p className="eyebrow">Men’s collection</p>
          <h2>A quieter shoulder. A longer coat.</h2>
          <p>Tailoring, denim, kurtas, and evening cloth — each one ready for the fitting room before it reaches a box.</p>
          <Link className="btn btn-primary" to="/men">
            Shop men
          </Link>
        </div>
      </section>
      <div className="wrap pgrid home-grid">
        {men.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <section className="gender flip">
        <div className="gender-copy">
          <p className="eyebrow">Women’s collection</p>
          <h2>Drape, column, and ceremony.</h2>
          <p>Dresses, sarees, lehengas, and tailoring. Try the border, the gown, or the coat against your own photograph.</p>
          <Link className="btn btn-primary" to="/women">
            Shop women
          </Link>
        </div>
        <Link to="/women" className="gender-photo">
          <img src={HERO.women} alt="Woman in a sand coat, looking back" />
        </Link>
      </section>
      <div className="wrap pgrid home-grid">
        {women.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <section className="wrap section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Trending now</p>
            <h2>What the fitting room keeps returning to.</h2>
          </div>
          <Link to="/trending">View all</Link>
        </div>
        <div className="rail">
          {trending.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="wrap section">
        <div className="section-head">
          <div>
            <p className="eyebrow">New arrivals</p>
            <h2>Just pressed.</h2>
          </div>
          <Link to="/new">View all</Link>
        </div>
        <div className="pgrid">
          {newest.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="wrap section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Best sellers</p>
            <h2>Pieces people keep.</h2>
          </div>
          <Link to="/trending">Shop the edit</Link>
        </div>
        <div className="pgrid">
          {best.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="wrap section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Seasonal collections</p>
            <h2>Two rooms, one season.</h2>
          </div>
        </div>
        <div className="season-grid">
          <Link to="/edit/evening" className="season-card">
            <img src={HERO.evening} alt="Blush evening gown" />
            <div>
              <p className="eyebrow">01</p>
              <h3>The Evening Edit</h3>
              <span>Enter</span>
            </div>
          </Link>
          <Link to="/edit/winter" className="season-card">
            <img src={HERO.winter} alt="Man in a dark overcoat" />
            <div>
              <p className="eyebrow">02</p>
              <h3>Winter Atelier</h3>
              <span>Enter</span>
            </div>
          </Link>
        </div>
      </section>

      <section className="ai-band">
        <div>
          <p className="eyebrow">AI virtual try-on</p>
          <h2>See it on you, before it ships.</h2>
          <p>
            Upload a photograph, choose a color, and compose a visualization in the fitting room. Save it to your wardrobe, compare two looks, then check out in the size you actually considered.
          </p>
          <ul>
            <li>Your photo stays in this browser.</li>
            <li>Before and after, side by side.</li>
            <li>A preview — fit and fabric can still differ.</li>
          </ul>
          <Link className="btn btn-gold" to="/try-on">
            Try It With AI
          </Link>
        </div>
        <img src={HERO.atelier} alt="Garments hanging in the atelier" />
      </section>

      <section className="wrap section">
        <div className="section-head">
          <div>
            <p className="eyebrow">From the fitting room</p>
            <h2>Notes from clients.</h2>
          </div>
        </div>
        <div className="quotes">
          {TESTIMONIALS.map((note) => (
            <figure key={note.name}>
              <blockquote>“{note.quote}”</blockquote>
              <figcaption>
                <strong>{note.name}</strong>
                <span>{note.meta}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="letter">
        <div>
          <p className="eyebrow">Letters from the atelier</p>
          <h2>A few notes a season. No weekly noise.</h2>
          <p>New cloth, fitting-room stories, and the occasional private appointment.</p>
        </div>
        {joined ? (
          <p className="joined">You’re on the list. We’ll write when there is something worth the paper.</p>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!email.includes("@")) return;
              setJoined(true);
            }}
          >
            <label htmlFor="letter-email">Email</label>
            <div>
              <input
                id="letter-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@ateliermail.com"
              />
              <button className="btn btn-primary" type="submit">
                Subscribe
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
