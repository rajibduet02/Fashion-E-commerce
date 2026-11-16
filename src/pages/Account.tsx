import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ProductGrid } from "../components/ProductCard";
import { EmptyState } from "../components/Ui";
import { useTitle } from "../hooks";
import { money } from "../lib";
import { useStore } from "../store";
import type { Address, Profile, SavedCard } from "../types";

const TABS = [
  ["profile", "Personal profile"],
  ["orders", "My orders"],
  ["wishlist", "Wishlist"],
  ["looks", "Saved AI looks"],
  ["addresses", "Addresses"],
  ["payments", "Payment methods"],
  ["settings", "Account settings"],
] as const;

export function Account() {
  const { tab } = useParams();
  const current = TABS.some(([id]) => id === tab) ? tab! : "profile";
  useTitle("Account");
  const store = useStore();

  return (
    <div className="wrap account">
      <aside>
        <p className="eyebrow">{store.profile.tier}</p>
        <h1>{store.profile.name}</h1>
        <p className="quiet">Member since {store.profile.memberSince}</p>
        <nav>
          {TABS.map(([id, label]) => (
            <Link key={id} to={`/account/${id}`} className={current === id ? "on" : ""}>
              {label}
            </Link>
          ))}
          <Link to="/wardrobe">My virtual wardrobe</Link>
        </nav>
      </aside>
      <section>
        {current === "profile" && <ProfilePane />}
        {current === "orders" && <OrdersPane />}
        {current === "wishlist" && <WishlistPane />}
        {current === "looks" && <LooksPane />}
        {current === "addresses" && <AddressPane />}
        {current === "payments" && <PaymentPane />}
        {current === "settings" && <SettingsPane />}
      </section>
    </div>
  );
}

function ProfilePane() {
  const { profile, updateProfile } = useStore();
  const [form, setForm] = useState(profile);
  return (
    <form
      className="panel"
      onSubmit={(event) => {
        event.preventDefault();
        updateProfile(form);
      }}
    >
      <h2>Personal profile</h2>
      <label>
        Name
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      </label>
      <label>
        Email
        <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      </label>
      <label>
        Phone
        <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
      </label>
      <label>
        Birthday
        <input type="date" value={form.birthday} onChange={(event) => setForm({ ...form, birthday: event.target.value })} />
      </label>
      <button className="btn btn-primary" type="submit">
        Save profile
      </button>
    </form>
  );
}

function OrdersPane() {
  const { orders } = useStore();
  if (!orders.length) return <EmptyState title="No orders yet." text="When you place an order, it will be kept here." />;
  return (
    <div className="stack">
      <h2>My orders</h2>
      {orders.map((order) => (
        <article key={order.id} className="panel order">
          <header>
            <div>
              <strong>{order.id}</strong>
              <p className="quiet">{order.placedAt}</p>
            </div>
            <span className={`pill ${order.status.toLowerCase()}`}>{order.status}</span>
          </header>
          {order.items.map((item) => (
            <div key={`${order.id}-${item.productId}-${item.size}`} className="sum-line">
              <img src={item.image} alt="" />
              <span>
                <Link to={`/product/${item.productId}`}>{item.name}</Link>
                <small>
                  {item.color} · {item.size} · ×{item.qty}
                </small>
              </span>
              <em>{money(item.price * item.qty)}</em>
            </div>
          ))}
          <p className="quiet">
            {order.method} · {order.address}
          </p>
          <p className="total">
            <span>Total</span>
            <strong>{money(order.total)}</strong>
          </p>
        </article>
      ))}
    </div>
  );
}

function WishlistPane() {
  const { wishlist, products } = useStore();
  const items = wishlist.flatMap((id) => {
    const product = products.find((item) => item.id === id && !item.archived);
    return product ? [product] : [];
  });
  if (!items.length) {
    return (
      <EmptyState
        title="Your wishlist is quiet."
        text="Hearts on a product card keep a piece here."
        action={
          <Link className="btn btn-primary" to="/new">
            Browse new arrivals
          </Link>
        }
      />
    );
  }
  return (
    <div>
      <h2>Wishlist</h2>
      <ProductGrid products={items} />
    </div>
  );
}

function LooksPane() {
  const { looks, products, removeLook } = useStore();
  if (!looks.length) {
    return (
      <EmptyState
        title="No saved looks."
        text="Generate a visualization and save it to your wardrobe."
        action={
          <Link className="btn btn-gold" to="/try-on">
            Try it with AI
          </Link>
        }
      />
    );
  }
  return (
    <div>
      <div className="section-head">
        <h2>Saved AI looks</h2>
        <Link to="/wardrobe">Open wardrobe</Link>
      </div>
      <div className="look-grid">
        {looks.map((look) => {
          const product = products.find((item) => item.id === look.productId);
          return (
            <article key={look.id}>
              <img src={look.result} alt="" />
              <div>
                <strong>{product?.name}</strong>
                <p>
                  {look.color} · {look.size}
                </p>
                <button className="text-btn" onClick={() => removeLook(look.id)}>
                  Remove
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function AddressPane() {
  const { addresses, addAddress, removeAddress } = useStore();
  const [open, setOpen] = useState(false);
  const blank: Address = { id: "", label: "Home", line1: "", line2: "", city: "", region: "", postal: "", country: "United States", phone: "" };
  const [form, setForm] = useState(blank);
  return (
    <div className="stack">
      <div className="section-head">
        <h2>Addresses</h2>
        <button className="btn btn-ghost" onClick={() => setOpen((value) => !value)}>
          Add address
        </button>
      </div>
      {open && (
        <form
          className="panel"
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.line1 || !form.city) return;
            addAddress({ ...form, id: crypto.randomUUID() });
            setForm(blank);
            setOpen(false);
          }}
        >
          <label>
            Label
            <input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} />
          </label>
          <label>
            Street
            <input required value={form.line1} onChange={(event) => setForm({ ...form, line1: event.target.value })} />
          </label>
          <div className="split">
            <label>
              City
              <input required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
            </label>
            <label>
              Postal code
              <input value={form.postal} onChange={(event) => setForm({ ...form, postal: event.target.value })} />
            </label>
          </div>
          <button className="btn btn-primary" type="submit">
            Save address
          </button>
        </form>
      )}
      {addresses.map((address) => (
        <article key={address.id} className="panel">
          <strong>{address.label}</strong>
          <p>
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ""}
            <br />
            {address.city}, {address.region} {address.postal}
            <br />
            {address.country}
          </p>
          <button className="text-btn" onClick={() => removeAddress(address.id)}>
            Remove
          </button>
        </article>
      ))}
    </div>
  );
}

function PaymentPane() {
  const { payments, addPayment, removePayment } = useStore();
  const [number, setNumber] = useState("");
  const [exp, setExp] = useState("");
  const [name, setName] = useState("");
  return (
    <div className="stack">
      <h2>Payment methods</h2>
      <p className="quiet">Only the last four digits are kept in this browser. Full card numbers are never stored.</p>
      {payments.map((card) => (
        <article key={card.id} className="panel card-tile">
          <div>
            <strong>
              {card.brand} ···· {card.last4}
            </strong>
            <p className="quiet">
              {card.name} · Exp {card.exp}
            </p>
          </div>
          <button className="text-btn" onClick={() => removePayment(card.id)}>
            Remove
          </button>
        </article>
      ))}
      <form
        className="panel"
        onSubmit={(event) => {
          event.preventDefault();
          const digits = number.replace(/\s/g, "");
          if (digits.length < 4 || !name || !exp) return;
          const card: SavedCard = {
            id: crypto.randomUUID(),
            brand: digits.startsWith("4") ? "Visa" : digits.startsWith("5") ? "Mastercard" : "Card",
            last4: digits.slice(-4),
            exp,
            name,
          };
          addPayment(card);
          setNumber("");
          setExp("");
          setName("");
        }}
      >
        <h3>Add a card</h3>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="split">
          <label>
            Card number
            <input value={number} onChange={(event) => setNumber(event.target.value)} inputMode="numeric" />
          </label>
          <label>
            Expiry
            <input value={exp} placeholder="MM/YY" onChange={(event) => setExp(event.target.value)} />
          </label>
        </div>
        <button className="btn btn-primary" type="submit">
          Save card
        </button>
      </form>
    </div>
  );
}

function SettingsPane() {
  const { profile, updateProfile } = useStore();
  const [form, setForm] = useState<Profile>(profile);
  function toggle(key: "notifyOrders" | "notifyLooks" | "notifyLetters") {
    setForm((current) => ({ ...current, [key]: !current[key] }));
  }
  return (
    <form
      className="panel"
      onSubmit={(event) => {
        event.preventDefault();
        updateProfile(form);
      }}
    >
      <h2>Account settings</h2>
      {(
        [
          ["notifyOrders", "Order updates"],
          ["notifyLooks", "When a saved look is ready to revisit"],
          ["notifyLetters", "Letters from the atelier"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="check">
          <input type="checkbox" checked={form[key]} onChange={() => toggle(key)} />
          {label}
        </label>
      ))}
      <button className="btn btn-primary" type="submit">
        Save settings
      </button>
    </form>
  );
}
