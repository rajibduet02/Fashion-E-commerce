import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/Ui";
import { useTitle } from "../hooks";
import { discountFor, money, shippingFor } from "../lib";
import { useStore } from "../store";
import type { Order } from "../types";

const COUNTRIES = ["United States", "United Kingdom", "India", "Canada", "United Arab Emirates", "France"];

type Method = "standard" | "express" | "atelier";
type Pay = "card" | "paypal" | "cod";

export function Checkout() {
  useTitle("Checkout");
  const { products, cart, profile, addresses, activeCoupon, applyPromo, clearPromo, placeOrder } = useStore();
  const lines = cart.flatMap((line) => {
    const product = products.find((item) => item.id === line.productId);
    return product ? [{ ...line, product }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  const discount = discountFor(subtotal, activeCoupon);
  const [method, setMethod] = useState<Method>("standard");
  const [pay, setPay] = useState<Pay>("card");
  const [code, setCode] = useState(activeCoupon?.code ?? "");
  const [done, setDone] = useState<Order | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const home = addresses[0];
  const [form, setForm] = useState({
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    line1: home?.line1 ?? "",
    line2: home?.line2 ?? "",
    city: home?.city ?? "",
    region: home?.region ?? "",
    postal: home?.postal ?? "",
    country: home?.country ?? "United States",
    cardName: profile.name,
    cardNumber: "",
    exp: "",
    cvc: "",
  });

  const shipping = shippingFor(subtotal, method);
  const total = Math.max(0, subtotal - discount + shipping);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Enter the name for this order.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Enter a valid email.";
    if (form.phone.trim().length < 7) next.phone = "Enter a phone number.";
    if (form.line1.trim().length < 4) next.line1 = "Enter a street address.";
    if (!form.city.trim()) next.city = "Enter a city.";
    if (!form.postal.trim()) next.postal = "Enter a postal code.";
    if (pay === "card") {
      const digits = form.cardNumber.replace(/\s/g, "");
      if (digits.length < 15 || digits.length > 16) next.cardNumber = "Enter a 15 or 16 digit card number.";
      if (!/^\d{2}\/\d{2}$/.test(form.exp)) next.exp = "Use MM/YY.";
      if (form.cvc.length < 3) next.cvc = "Enter the security code.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!lines.length || !validate()) return;
    setPlacing(true);
    const order: Order = {
      id: `AUR-${Math.floor(10000 + Math.random() * 89999)}`,
      placedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      status: "Placed",
      items: lines.map((line) => ({
        productId: line.product.id,
        name: line.product.name,
        image: line.product.images[0],
        size: line.size,
        color: line.color,
        qty: line.qty,
        price: line.product.price,
      })),
      subtotal,
      discount,
      shipping,
      total,
      method: method === "standard" ? "Standard" : method === "express" ? "Express" : "Atelier same-day",
      address: `${form.line1}${form.line2 ? `, ${form.line2}` : ""}, ${form.city}, ${form.region} ${form.postal}, ${form.country}`,
      email: form.email,
    };
    window.setTimeout(() => {
      placeOrder(order);
      setDone(order);
      setPlacing(false);
    }, 700);
  }

  if (done) {
    return (
      <div className="wrap section success">
        <p className="eyebrow">Order {done.id}</p>
        <h1>Your order is placed.</h1>
        <p className="lede">It’s saved to your account under {done.email}. We’ll prepare {done.method.toLowerCase()} delivery to {done.address}.</p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to="/account/orders">
            View orders
          </Link>
          <Link className="btn btn-ghost" to="/">
            Continue browsing
          </Link>
        </div>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="wrap section">
        <EmptyState
          title="Nothing to check out."
          text="Add a piece to your bag first."
          action={
            <Link className="btn btn-primary" to="/new">
              Explore collection
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <form className="wrap section checkout" onSubmit={submit}>
      <div>
        <p className="eyebrow">Checkout</p>
        <h1>Delivery & payment</h1>
        <fieldset className="panel">
          <legend>Customer</legend>
          <label>
            Full name
            <input className={errors.name ? "bad" : ""} value={form.name} onChange={(event) => set("name", event.target.value)} />
            {errors.name && <span className="err-text">{errors.name}</span>}
          </label>
          <div className="split">
            <label>
              Email
              <input className={errors.email ? "bad" : ""} value={form.email} onChange={(event) => set("email", event.target.value)} />
              {errors.email && <span className="err-text">{errors.email}</span>}
            </label>
            <label>
              Phone
              <input className={errors.phone ? "bad" : ""} value={form.phone} onChange={(event) => set("phone", event.target.value)} />
              {errors.phone && <span className="err-text">{errors.phone}</span>}
            </label>
          </div>
        </fieldset>
        <fieldset className="panel">
          <legend>Shipping address</legend>
          {addresses.length > 0 && (
            <label>
              Saved address
              <select
                defaultValue=""
                onChange={(event) => {
                  const found = addresses.find((address) => address.id === event.target.value);
                  if (!found) return;
                  setForm((current) => ({
                    ...current,
                    line1: found.line1,
                    line2: found.line2,
                    city: found.city,
                    region: found.region,
                    postal: found.postal,
                    country: found.country,
                    phone: found.phone || current.phone,
                  }));
                }}
              >
                <option value="">Choose</option>
                {addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.label} — {address.city}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Street
            <input className={errors.line1 ? "bad" : ""} value={form.line1} onChange={(event) => set("line1", event.target.value)} />
            {errors.line1 && <span className="err-text">{errors.line1}</span>}
          </label>
          <label>
            Apartment, suite (optional)
            <input value={form.line2} onChange={(event) => set("line2", event.target.value)} />
          </label>
          <div className="split">
            <label>
              City
              <input className={errors.city ? "bad" : ""} value={form.city} onChange={(event) => set("city", event.target.value)} />
              {errors.city && <span className="err-text">{errors.city}</span>}
            </label>
            <label>
              Region
              <input value={form.region} onChange={(event) => set("region", event.target.value)} />
            </label>
          </div>
          <div className="split">
            <label>
              Postal code
              <input className={errors.postal ? "bad" : ""} value={form.postal} onChange={(event) => set("postal", event.target.value)} />
              {errors.postal && <span className="err-text">{errors.postal}</span>}
            </label>
            <label>
              Country
              <select value={form.country} onChange={(event) => set("country", event.target.value)}>
                {COUNTRIES.map((country) => (
                  <option key={country}>{country}</option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
        <fieldset className="panel">
          <legend>Delivery</legend>
          <div className="methods">
            {(
              [
                ["standard", "Standard", shippingFor(subtotal, "standard") === 0 ? "Complimentary" : money(12), "4–7 days"],
                ["express", "Express", money(28), "2–3 days"],
                ["atelier", "Atelier same-day", money(45), "Select cities"],
              ] as const
            ).map(([id, label, price, note]) => (
              <label key={id} className={method === id ? "on" : ""}>
                <input type="radio" name="method" checked={method === id} onChange={() => setMethod(id)} />
                <span>
                  <strong>{label}</strong>
                  <small>{note}</small>
                </span>
                <em>{price}</em>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="panel">
          <legend>Payment</legend>
          <div className="methods">
            {(
              [
                ["card", "Card", "Visa, Mastercard, Amex"],
                ["paypal", "PayPal", "You’ll confirm in a simulated step"],
                ["cod", "Cash on delivery", "Pay when the parcel arrives"],
              ] as const
            ).map(([id, label, note]) => (
              <label key={id} className={pay === id ? "on" : ""}>
                <input type="radio" name="pay" checked={pay === id} onChange={() => setPay(id)} />
                <span>
                  <strong>{label}</strong>
                  <small>{note}</small>
                </span>
              </label>
            ))}
          </div>
          {pay === "card" && (
            <div className="card-fields">
              <label>
                Name on card
                <input value={form.cardName} onChange={(event) => set("cardName", event.target.value)} />
              </label>
              <label>
                Card number
                <input className={errors.cardNumber ? "bad" : ""} inputMode="numeric" placeholder="4242 4242 4242 4242" value={form.cardNumber} onChange={(event) => set("cardNumber", event.target.value)} />
                {errors.cardNumber && <span className="err-text">{errors.cardNumber}</span>}
              </label>
              <div className="split">
                <label>
                  Expiry
                  <input className={errors.exp ? "bad" : ""} placeholder="MM/YY" value={form.exp} onChange={(event) => set("exp", event.target.value)} />
                  {errors.exp && <span className="err-text">{errors.exp}</span>}
                </label>
                <label>
                  CVC
                  <input className={errors.cvc ? "bad" : ""} placeholder="123" value={form.cvc} onChange={(event) => set("cvc", event.target.value)} />
                  {errors.cvc && <span className="err-text">{errors.cvc}</span>}
                </label>
              </div>
              <p className="quiet">Card numbers are not stored. This checkout is a prototype.</p>
            </div>
          )}
        </fieldset>
      </div>
      <aside className="summary">
        <h2>Order summary</h2>
        {lines.map((line) => (
          <article key={line.id} className="sum-line">
            <img src={line.product.images[0]} alt="" />
            <span>
              <strong>{line.product.name}</strong>
              <small>
                {line.color} · {line.size} · ×{line.qty}
              </small>
            </span>
            <em>{money(line.product.price * line.qty)}</em>
          </article>
        ))}
        <div className="promo">
          <label htmlFor="promo">Promo code</label>
          <div>
            <input
              id="promo"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="AURELLE10"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (applyPromo(code)) setCode(code.trim().toUpperCase());
                }
              }}
            />
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                if (applyPromo(code)) setCode(code.trim().toUpperCase());
              }}
            >
              Apply
            </button>
          </div>
          {activeCoupon && (
            <button type="button" className="text-btn" onClick={clearPromo}>
              Remove {activeCoupon.code}
            </button>
          )}
        </div>
        <p>
          <span>Subtotal</span>
          <strong>{money(subtotal)}</strong>
        </p>
        <p>
          <span>Discount</span>
          <strong>{discount ? `−${money(discount)}` : "—"}</strong>
        </p>
        <p>
          <span>Shipping</span>
          <strong>{shipping === 0 ? "Complimentary" : money(shipping)}</strong>
        </p>
        <p className="total">
          <span>Total</span>
          <strong>{money(total)}</strong>
        </p>
        <button className="btn btn-primary btn-full" type="submit" disabled={placing}>
          {placing ? "Placing order…" : "Place order"}
        </button>
      </aside>
    </form>
  );
}
