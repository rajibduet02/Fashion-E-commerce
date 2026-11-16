import { Link } from "react-router-dom";
import { EmptyState } from "../components/Ui";
import { useTitle } from "../hooks";
import { discountFor, money, shippingFor } from "../lib";
import { useStore } from "../store";
import { ProductGrid } from "../components/ProductCard";

export function CartPage() {
  useTitle("Bag");
  const { products, cart, updateQty, removeFromCart, toggleWish, activeCoupon } = useStore();
  const lines = cart.flatMap((line) => {
    const product = products.find((item) => item.id === line.productId);
    return product ? [{ ...line, product }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  const discount = discountFor(subtotal, activeCoupon);
  const shipping = shippingFor(subtotal, "standard");
  const suggestions = products.filter((product) => !product.archived && !cart.some((line) => line.productId === product.id)).slice(0, 4);
  const remainder = Math.max(0, 150 - subtotal);

  return (
    <div className="wrap section cart-page">
      <p className="eyebrow">Shopping bag</p>
      <h1>Your selection</h1>
      {lines.length === 0 ? (
        <EmptyState
          title="Your bag is empty."
          text="The fitting room can help you decide, or you can go straight to the rail."
          action={
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/new">
                Explore collection
              </Link>
              <Link className="btn btn-ghost" to="/try-on">
                Try it with AI
              </Link>
            </div>
          }
        />
      ) : (
        <div className="cart-layout">
          <div>
            {lines.map((line) => (
              <article key={line.id} className="cart-line">
                <Link to={`/product/${line.product.id}`}>
                  <img src={line.product.images[0]} alt={line.product.name} />
                </Link>
                <div>
                  <h2>{line.product.name}</h2>
                  <p>
                    {line.color} · Size {line.size}
                  </p>
                  <p className="quiet">{money(line.product.price)}</p>
                  <div className="qty">
                    <button aria-label="Decrease quantity" onClick={() => updateQty(line.id, line.qty - 1)}>
                      −
                    </button>
                    <span>{line.qty}</span>
                    <button aria-label="Increase quantity" onClick={() => updateQty(line.id, line.qty + 1)}>
                      +
                    </button>
                  </div>
                  <div className="row-actions">
                    <button className="text-btn" onClick={() => toggleWish(line.product.id)}>
                      Save to wishlist
                    </button>
                    <button className="text-btn" onClick={() => removeFromCart(line.id)}>
                      Remove
                    </button>
                  </div>
                </div>
                <strong>{money(line.product.price * line.qty)}</strong>
              </article>
            ))}
          </div>
          <aside className="summary">
            <h2>Summary</h2>
            <p>
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </p>
            <p>
              <span>Discount {activeCoupon ? `(${activeCoupon.code})` : ""}</span>
              <strong>{discount ? `−${money(discount)}` : "—"}</strong>
            </p>
            <p>
              <span>Shipping</span>
              <strong>{shipping === 0 ? "Complimentary" : money(shipping)}</strong>
            </p>
            <p className="total">
              <span>Total</span>
              <strong>{money(subtotal - discount + shipping)}</strong>
            </p>
            <p className="quiet">
              {remainder > 0 ? `Add ${money(remainder)} for complimentary shipping.` : "Complimentary shipping is applied."}
            </p>
            <p className="quiet">Taxes and duties, where required, are collected on delivery.</p>
            <Link className="btn btn-primary btn-full" to="/checkout">
              Checkout
            </Link>
          </aside>
        </div>
      )}
      {suggestions.length > 0 && lines.length > 0 && (
        <section className="section">
          <h2>You may also consider</h2>
          <ProductGrid products={suggestions} />
        </section>
      )}
    </div>
  );
}
