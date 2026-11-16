import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { discountFor, matchesQuery, money, shippingFor } from "../lib";
import { useStore } from "../store";
import { IconBag, IconClose, IconHeart, IconMenu, IconSearch, IconUser } from "./Icons";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/men", label: "Men" },
  { to: "/women", label: "Women" },
  { to: "/new", label: "New Arrivals" },
  { to: "/trending", label: "Trending" },
  { to: "/try-on", label: "AI Try-On" },
  { to: "/mirror", label: "Mirror" },
  { to: "/trial", label: "Live Trial" },
];

export function Header() {
  const { products, cart, wishlist, cartOpen, setCartOpen, updateQty, removeFromCart, activeCoupon } = useStore();
  const [menu, setMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenu(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menu || searchOpen || cartOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu, searchOpen, cartOpen]);

  const lines = cart.flatMap((line) => {
    const product = products.find((item) => item.id === line.productId);
    return product ? [{ ...line, product }] : [];
  });
  const count = lines.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  const discount = discountFor(subtotal, activeCoupon);
  const shipping = shippingFor(subtotal, "standard");

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return products.filter((product) => !product.archived && matchesQuery(product, query)).slice(0, 6);
  }, [products, query]);

  return (
    <>
      <div className="announce">Complimentary shipping over $150 · AI fitting room open · Free returns within 14 days</div>
      <header className="header">
        <div className="header-inner">
          <button className="icon-btn burger" aria-label="Open menu" onClick={() => setMenu(true)}>
            <IconMenu />
          </button>
          <Link to="/" className="logo" aria-label="Aurelle home">
            <span className="logo-mark" />
            <span>
              <strong>AURELLE</strong>
              <small>AI Atelier</small>
            </span>
          </Link>
          <nav className="nav" aria-label="Primary">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="tools">
            <button className="icon-btn" aria-label="Search" onClick={() => setSearchOpen(true)}>
              <IconSearch />
            </button>
            <Link className="icon-btn" to="/wishlist" aria-label={`Wishlist, ${wishlist.length} saved`}>
              <IconHeart />
              {wishlist.length > 0 && <span className="badge">{wishlist.length}</span>}
            </Link>
            <Link className="icon-btn account-link" to="/account" aria-label="Account">
              <IconUser />
            </Link>
            <button className="icon-btn" aria-label={`Bag, ${count} items`} onClick={() => setCartOpen(true)}>
              <IconBag />
              {count > 0 && <span className="badge">{count}</span>}
            </button>
          </div>
        </div>
      </header>

      {menu && (
        <div className="mobile-menu">
          <div className="mobile-head">
            <span className="logo">
              <span className="logo-mark" />
              <strong>AURELLE</strong>
            </span>
            <button className="icon-btn" aria-label="Close menu" onClick={() => setMenu(false)}>
              <IconClose />
            </button>
          </div>
          <nav>
            {LINKS.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
            <Link to="/wardrobe">Virtual Wardrobe</Link>
            <Link to="/account">Account</Link>
          </nav>
        </div>
      )}

      {searchOpen && (
        <div className="search-screen">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!query.trim()) return;
              navigate(`/search?q=${encodeURIComponent(query.trim())}`);
              setSearchOpen(false);
            }}
          >
            <IconSearch />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search cloth, category, or color"
              aria-label="Search the atelier"
            />
            <button type="button" className="icon-btn" aria-label="Close search" onClick={() => setSearchOpen(false)}>
              <IconClose />
            </button>
          </form>
          <div className="search-list">
            {query.trim() && results.length === 0 && <p className="quiet">Nothing matches “{query.trim()}”.</p>}
            {results.map((product) => (
              <Link key={product.id} to={`/product/${product.id}`} className="search-item">
                <img src={product.images[0]} alt="" />
                <span>
                  <strong>{product.name}</strong>
                  <small>
                    {product.gender === "men" ? "Men" : "Women"} · {product.category}
                  </small>
                </span>
                <em>{money(product.price)}</em>
              </Link>
            ))}
          </div>
        </div>
      )}

      {cartOpen && (
        <>
          <div className="overlay" onClick={() => setCartOpen(false)} />
          <aside className="drawer" role="dialog" aria-label="Shopping bag">
            <div className="drawer-head">
              <h2>Your bag</h2>
              <button className="icon-btn" aria-label="Close bag" onClick={() => setCartOpen(false)}>
                <IconClose />
              </button>
            </div>
            <div className="drawer-body">
              {lines.length === 0 && (
                <div className="empty tight">
                  <h2>Your bag is empty.</h2>
                  <p>When a piece is right, it will wait here.</p>
                  <Link className="btn btn-primary" to="/new" onClick={() => setCartOpen(false)}>
                    Explore collection
                  </Link>
                </div>
              )}
              {lines.map((line) => (
                <article key={line.id} className="line">
                  <img src={line.product.images[0]} alt="" />
                  <div>
                    <strong>{line.product.name}</strong>
                    <p>
                      {line.color} · {line.size}
                    </p>
                    <div className="qty">
                      <button aria-label="Decrease quantity" onClick={() => updateQty(line.id, line.qty - 1)}>
                        −
                      </button>
                      <span>{line.qty}</span>
                      <button aria-label="Increase quantity" onClick={() => updateQty(line.id, line.qty + 1)}>
                        +
                      </button>
                    </div>
                    <button className="text-btn" onClick={() => removeFromCart(line.id)}>
                      Remove
                    </button>
                  </div>
                  <em>{money(line.product.price * line.qty)}</em>
                </article>
              ))}
            </div>
            {lines.length > 0 && (
              <div className="drawer-foot">
                <p>
                  <span>Subtotal</span>
                  <strong>{money(subtotal)}</strong>
                </p>
                {discount > 0 && (
                  <p>
                    <span>Discount</span>
                    <strong>−{money(discount)}</strong>
                  </p>
                )}
                <p>
                  <span>Shipping</span>
                  <strong>{shipping === 0 ? "Complimentary" : money(shipping)}</strong>
                </p>
                <p className="total">
                  <span>Total</span>
                  <strong>{money(subtotal - discount + shipping)}</strong>
                </p>
                <Link className="btn btn-ghost btn-full" to="/cart" onClick={() => setCartOpen(false)}>
                  View bag
                </Link>
                <Link className="btn btn-primary btn-full" to="/checkout" onClick={() => setCartOpen(false)}>
                  Checkout
                </Link>
              </div>
            )}
          </aside>
        </>
      )}
    </>
  );
}
