import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ProductGrid } from "../components/ProductCard";
import { Modal, SizeGuide, Stars } from "../components/Ui";
import { useTitle } from "../hooks";
import { money, offPercent, reviewsFor } from "../lib";
import { useStore } from "../store";

export function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, addToCart, toggleWish, wishlist } = useStore();
  const product = products.find((item) => item.id === id && !item.archived);
  const [image, setImage] = useState(0);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [guide, setGuide] = useState(false);
  const [zoom, setZoom] = useState(false);

  useTitle(product?.name ?? "Piece");

  useEffect(() => {
    if (!product) return;
    setColor(product.colors[0]?.name ?? "");
    setSize(product.sizes.length === 1 ? product.sizes[0] : "");
    setQty(1);
    setImage(0);
    setSizeError(false);
  }, [product]);

  if (!product) {
    return (
      <div className="wrap section">
        <div className="empty">
          <h2>This piece has left the rail.</h2>
          <p>It may have been archived. The rest of the atelier is still open.</p>
          <Link className="btn btn-primary" to="/">
            Back home
          </Link>
        </div>
      </div>
    );
  }

  const wished = wishlist.includes(product.id);
  const off = offPercent(product.price, product.compareAt);
  const related = products.filter((item) => item.id !== product.id && !item.archived && item.category === product.category).slice(0, 4);
  const reviews = reviewsFor(product.id);

  function requireSize() {
    if (!size) {
      setSizeError(true);
      return false;
    }
    return true;
  }

  function add(thenCheckout = false) {
    if (!product || !requireSize() || product.stock <= 0) return;
    addToCart({ productId: product.id, size, color, qty });
    if (thenCheckout) navigate("/checkout");
  }

  return (
    <div className="wrap">
      <p className="crumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to={product.gender === "men" ? "/men" : "/women"}>{product.gender === "men" ? "Men" : "Women"}</Link>
        <span>/</span>
        <span>{product.category}</span>
      </p>
      <article className="pdp">
        <div className="gallery">
          <button className="gallery-main" onClick={() => setZoom(true)} aria-label="Enlarge photograph">
            <img src={product.images[image] ?? product.images[0]} alt={product.name} />
          </button>
          {product.images.length > 1 && (
            <div className="thumbs">
              {product.images.map((src, index) => (
                <button key={src} className={index === image ? "on" : ""} onClick={() => setImage(index)} aria-label={`Photograph ${index + 1}`}>
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="pdp-info">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <div className="pcard-meta">
            <Stars value={product.rating} />
            <span>
              {product.rating.toFixed(1)} · {product.reviews} reviews
            </span>
          </div>
          <div className="price-row">
            <strong>{money(product.price)}</strong>
            {product.compareAt && <s>{money(product.compareAt)}</s>}
            {off > 0 && <em>−{off}%</em>}
          </div>
          <p className="lede tight">{product.description}</p>

          <div className="choice">
            <div className="choice-label">
              <span>Color</span>
              <strong>{color}</strong>
            </div>
            <div className="swatches">
              {product.colors.map((swatch) => (
                <button
                  key={swatch.name}
                  className={color === swatch.name ? "on" : ""}
                  style={{ background: swatch.hex }}
                  aria-label={swatch.name}
                  aria-pressed={color === swatch.name}
                  onClick={() => setColor(swatch.name)}
                />
              ))}
            </div>
          </div>

          <div className="choice">
            <div className="choice-label">
              <span>Size</span>
              <button className="text-btn" onClick={() => setGuide(true)}>
                Size guide
              </button>
            </div>
            <div className="sizes">
              {product.sizes.map((option) => (
                <button
                  key={option}
                  className={size === option ? "on" : ""}
                  aria-pressed={size === option}
                  onClick={() => {
                    setSize(option);
                    setSizeError(false);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
            {sizeError && <p className="err-text">Choose a size to continue.</p>}
          </div>

          <div className="choice">
            <div className="choice-label">
              <span>Quantity</span>
              <strong>{product.stock === 0 ? "Sold out" : `${product.stock} in the atelier`}</strong>
            </div>
            <div className="qty">
              <button aria-label="Decrease quantity" onClick={() => setQty((value) => Math.max(1, value - 1))}>
                −
              </button>
              <span>{qty}</span>
              <button aria-label="Increase quantity" onClick={() => setQty((value) => Math.min(product.stock || 1, value + 1))}>
                +
              </button>
            </div>
          </div>

          <Link className="btn btn-gold btn-full try-cta" to={`/try-on?product=${product.id}&color=${encodeURIComponent(color)}`}>
            Try it with AI
          </Link>
          <Link className="btn btn-line btn-full mirror-cta" to={`/mirror?product=${product.id}`}>
            See it in the mirror
          </Link>
          <div className="buy-row">
            <button className="btn btn-primary" disabled={product.stock === 0} onClick={() => add(false)}>
              Add to cart
            </button>
            <button className="btn btn-ghost" disabled={product.stock === 0} onClick={() => add(true)}>
              Buy now
            </button>
          </div>
          <button className="text-btn wish-link" onClick={() => toggleWish(product.id)}>
            {wished ? "Saved to wishlist" : "Save to wishlist"}
          </button>

          <section className="info-block">
            <h2>Fabric</h2>
            <p>{product.fabric}</p>
            <ul>
              {product.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </section>
          <section className="info-block">
            <h2>Delivery</h2>
            <ul>
              <li>Complimentary shipping on orders over $150.</li>
              <li>Express arrives in 2–3 days. Atelier same-day is offered in select cities.</li>
              <li>Free returns within 14 days, unworn, with tags.</li>
              <li>The AI preview is a visualization. The garment you receive follows the size and color you select.</li>
            </ul>
          </section>
        </div>
      </article>

      <section className="section">
        <div className="section-head">
          <h2>Reviews</h2>
        </div>
        <div className="reviews">
          {reviews.map((review) => (
            <article key={review.title}>
              <Stars value={review.rating} />
              <h3>{review.title}</h3>
              <p>{review.text}</p>
              <span>
                {review.name} · {review.meta}
              </span>
            </article>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Also in {product.category}</h2>
          </div>
          <ProductGrid products={related} />
        </section>
      )}

      {guide && <SizeGuide onClose={() => setGuide(false)} />}
      {zoom && (
        <Modal title={product.name} onClose={() => setZoom(false)} wide>
          <img className="zoom-img" src={product.images[image] ?? product.images[0]} alt={product.name} />
        </Modal>
      )}
    </div>
  );
}
