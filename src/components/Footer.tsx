import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <p className="logo">
            <span className="logo-mark" />
            <strong>AURELLE</strong>
          </p>
          <p>A fashion house with a fitting room that travels. Cloth first. The preview is a visualization, never a promise of fit.</p>
        </div>
        <div>
          <h2>Shop</h2>
          <Link to="/men">Men</Link>
          <Link to="/women">Women</Link>
          <Link to="/new">New arrivals</Link>
          <Link to="/trending">Trending</Link>
          <Link to="/edit/evening">The Evening Edit</Link>
          <Link to="/edit/winter">Winter Atelier</Link>
        </div>
        <div>
          <h2>Client care</h2>
          <Link to="/care#shipping">Shipping</Link>
          <Link to="/care#returns">Returns</Link>
          <Link to="/care#size">Size guide</Link>
          <Link to="/care#contact">Contact</Link>
          <Link to="/try-on">AI Try-On</Link>
          <Link to="/mirror">Smart mirror</Link>
          <Link to="/trial">Live trial</Link>
          <Link to="/wardrobe">Virtual wardrobe</Link>
        </div>
        <div>
          <h2>The house</h2>
          <Link to="/care#house">Our atelier</Link>
          <Link to="/account">Your account</Link>
          <Link to="/admin">Atelier desk</Link>
          <a href="mailto:hello@aurelle.atelier">hello@aurelle.atelier</a>
          <p className="visit">By appointment · 18 Mercer Street · New York</p>
        </div>
      </div>
      <div className="fine">
        <span>© {new Date().getFullYear()} Aurelle Atelier</span>
        <span>Try-on previews are visualizations. Fit, fabric, and color may vary.</span>
      </div>
    </footer>
  );
}
