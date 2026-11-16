import { Link } from "react-router-dom";
import { offPercent, money } from "../lib";
import { useStore } from "../store";
import type { Product } from "../types";
import { IconHeart } from "./Icons";
import { Stars } from "./Ui";

export function ProductCard({ product }: { product: Product }) {
  const { wishlist, toggleWish } = useStore();
  const wished = wishlist.includes(product.id);
  const off = offPercent(product.price, product.compareAt);

  return (
    <article className="pcard">
      <div className="pcard-media">
        <Link to={`/product/${product.id}`}>
          <img src={product.images[0]} alt={product.name} />
        </Link>
        <button
          className={`wish ${wished ? "on" : ""}`}
          aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={wished}
          onClick={() => toggleWish(product.id)}
        >
          <IconHeart filled={wished} />
        </button>
        {product.stock === 0 && <span className="ribbon">Sold out</span>}
        {off > 0 && product.stock > 0 && <span className="ribbon sale">−{off}%</span>}
        <Link className="pcard-try" to={`/try-on?product=${product.id}`}>
          Try it with AI
        </Link>
      </div>
      <div className="pcard-body">
        <p className="pcard-cat">{product.category}</p>
        <Link to={`/product/${product.id}`} className="pcard-name">
          {product.name}
        </Link>
        <div className="pcard-meta">
          {product.reviews > 0 ? (
            <>
              <Stars value={product.rating} />
              <span>{product.rating.toFixed(1)} ({product.reviews})</span>
            </>
          ) : (
            <span>New</span>
          )}
        </div>
        <div className="pcard-price">
          <strong>{money(product.price)}</strong>
          {product.compareAt && <s>{money(product.compareAt)}</s>}
        </div>
        <div className="dots" aria-label="Available colors">
          {product.colors.map((color) => (
            <span key={color.name} style={{ background: color.hex }} title={color.name} />
          ))}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="pgrid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
