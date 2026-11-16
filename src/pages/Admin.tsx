import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CUSTOMERS, MEN_CATEGORIES, SALES_SERIES, TRYON_SERIES, WEEKDAYS, WOMEN_CATEGORIES } from "../data";
import { useTitle } from "../hooks";
import { img, money, readOverlayFile } from "../lib";
import { isCutout } from "../mirror/outfit";
import { anchorKind, anchorLabel } from "../mirror/geometry";
import { useStore } from "../store";
import type { Gender, OrderStatus, Product } from "../types";

const NAV = [
  ["overview", "Overview"],
  ["products", "Products"],
  ["categories", "Categories"],
  ["inventory", "Inventory"],
  ["orders", "Orders"],
  ["customers", "Customers"],
  ["tryon", "AI try-on"],
  ["coupons", "Coupons"],
] as const;

type Section = (typeof NAV)[number][0];

export function Admin() {
  useTitle("Atelier desk");
  const [section, setSection] = useState<Section>("overview");
  const store = useStore();
  const revenue = 168900 + store.orders.reduce((sum, order) => sum + order.total, 0);
  const orderCount = 240 + store.orders.length;
  const tryTotal = 1486 + store.tryOns.length;

  return (
    <div className="admin">
      <aside className="admin-side">
        <Link to="/" className="logo">
          <span className="logo-mark" />
          <span>
            <strong>AURELLE</strong>
            <small>Atelier desk</small>
          </span>
        </Link>
        <nav>
          {NAV.map(([id, label]) => (
            <button key={id} className={section === id ? "on" : ""} onClick={() => setSection(id)}>
              {label}
            </button>
          ))}
        </nav>
        <Link className="desk-link" to="/">
          View the store
        </Link>
      </aside>
      <main>
        <header className="admin-top">
          <div>
            <p className="eyebrow">Sunday, 15 Nov 2026</p>
            <h1>{NAV.find(([id]) => id === section)?.[1]}</h1>
          </div>
          <p className="quiet">Figures combine sample history with orders and try-ons in this browser.</p>
        </header>
        {section === "overview" && (
          <>
            <div className="kpi-grid">
              <Kpi label="Sales" value={money(revenue)} note="Season to date" />
              <Kpi label="Orders" value={String(orderCount)} note={`${store.orders.length} held in this browser`} />
              <Kpi label="Customers" value="1,864" note="Active client book" />
              <Kpi label="AI try-ons" value={tryTotal.toLocaleString()} note={`${store.tryOns.length} this session`} />
            </div>
            <div className="admin-split">
              <article className="panel">
                <h2>Sales this week</h2>
                <LineChart values={SALES_SERIES} prefix="$" suffix="k" />
              </article>
              <article className="panel">
                <h2>Recent orders</h2>
                <table className="data">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Status</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {store.orders.slice(0, 5).map((order) => (
                      <tr key={order.id}>
                        <td>{order.id}</td>
                        <td>{order.status}</td>
                        <td>{money(order.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            </div>
          </>
        )}
        {section === "products" && <Products />}
        {section === "categories" && <Categories />}
        {section === "inventory" && <Inventory />}
        {section === "orders" && <Orders />}
        {section === "customers" && <Customers />}
        {section === "tryon" && <TryAnalytics total={tryTotal} />}
        {section === "coupons" && <Coupons />}
      </main>
    </div>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="kpi">
      <span>{label}</span>
      <b>{value}</b>
      <small>{note}</small>
    </article>
  );
}

function LineChart({ values, prefix = "", suffix = "" }: { values: number[]; prefix?: string; suffix?: string }) {
  const max = Math.max(...values) * 1.15;
  const width = 520;
  const height = 180;
  const step = width / (values.length - 1);
  const points = values.map((value, index) => `${index * step},${height - (value / max) * (height - 20)}`).join(" ");
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Weekly chart">
        <polyline fill="none" stroke="#B89B72" strokeWidth="2.5" points={points} />
      </svg>
      <div className="chart-labels">
        {WEEKDAYS.map((day, index) => (
          <span key={day}>
            {day}
            <small>
              {prefix}
              {values[index]}
              {suffix}
            </small>
          </span>
        ))}
      </div>
    </div>
  );
}

function Products() {
  const { products, updateStock, setArchived, addProduct, setGarmentAsset, toast } = useStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", gender: "women" as Gender, category: "Dresses", price: "220", stock: "10" });
  const shown = products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()) || product.sku.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="stack">
      <div className="toolbar">
        <input placeholder="Search products" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search products" />
        <button className="btn btn-primary" onClick={() => setOpen((value) => !value)}>
          Add product
        </button>
      </div>
      {open && (
        <form
          className="panel"
          onSubmit={(event) => {
            event.preventDefault();
            const product: Product = {
              id: crypto.randomUUID(),
              sku: `AUR-${Math.floor(3000 + Math.random() * 6000)}`,
              name: draft.name || "Untitled piece",
              gender: draft.gender,
              category: draft.category,
              price: Number(draft.price) || 0,
              rating: 0,
              reviews: 0,
              colors: [
                { name: "Ivory", hex: "#F3EFE7" },
                { name: "Ink", hex: "#171717" },
              ],
              sizes: ["XS", "S", "M", "L", "XL"],
              images: [img("photo-1525507119028-ed4c629a60a3")],
              description: "Added from the atelier desk. Replace the studio photograph before it reaches the homepage.",
              fabric: "To be confirmed.",
              details: ["New from the desk"],
              newest: true,
              stock: Number(draft.stock) || 0,
            };
            addProduct(product);
            setOpen(false);
          }}
        >
          <div className="split">
            <label>
              Name
              <input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </label>
            <label>
              Gender
              <select value={draft.gender} onChange={(event) => setDraft({ ...draft, gender: event.target.value as Gender })}>
                <option value="women">Women</option>
                <option value="men">Men</option>
              </select>
            </label>
          </div>
          <div className="split">
            <label>
              Category
              <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
                {[...new Set([...WOMEN_CATEGORIES, ...MEN_CATEGORIES])].map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              Price
              <input value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} />
            </label>
            <label>
              Stock
              <input value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: event.target.value })} />
            </label>
          </div>
          <button className="btn btn-primary" type="submit">
            Save product
          </button>
        </form>
      )}
      <table className="data">
        <thead>
          <tr>
            <th>Piece</th>
            <th>Category</th>
            <th>Mirror fit</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Overlay</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {shown.map((product) => (
            <tr key={product.id}>
              <td>
                <div className="who">
                  <img src={product.images[0]} alt="" />
                  <span>
                    <strong>{product.name}</strong>
                    <small>
                      {product.sku} · {product.gender}
                    </small>
                  </span>
                </div>
              </td>
              <td>{product.category}</td>
              <td>{anchorLabel(anchorKind(product.category))}</td>
              <td>{money(product.price)}</td>
              <td>
                <input
                  className="stock"
                  type="number"
                  min={0}
                  value={product.stock}
                  onChange={(event) => updateStock(product.id, Number(event.target.value))}
                  aria-label={`Stock for ${product.name}`}
                />
              </td>
              <td>
                <small>{product.overlayImage ? (isCutout(product.overlayImage) ? "Transparent" : "Photo file") : "Catalog photo"}</small>
                <label className="text-btn">
                  Upload
                  <input
                    hidden
                    type="file"
                    accept="image/png,image/webp,image/jpeg"
                    aria-label={`Overlay for ${product.name}`}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      void readOverlayFile(file)
                        .then((overlayImage) => setGarmentAsset(product.id, { overlayImage }))
                        .catch((error: unknown) => toast(error instanceof Error ? error.message : "Could not save that overlay.", "err"));
                    }}
                  />
                </label>
                {product.overlayImage && (
                  <button className="text-btn" type="button" onClick={() => setGarmentAsset(product.id, { overlayImage: "" })}>
                    Clear
                  </button>
                )}
              </td>
              <td>
                <button className="text-btn" onClick={() => setArchived(product.id, !product.archived)}>
                  {product.archived ? "Restore" : "Archive"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Categories() {
  const { products, hiddenCategories, toggleCategory } = useStore();
  const groups = [
    { gender: "men" as const, label: "Men", list: MEN_CATEGORIES },
    { gender: "women" as const, label: "Women", list: WOMEN_CATEGORIES },
  ];
  return (
    <div className="admin-split">
      {groups.map((group) => (
        <article key={group.gender} className="panel">
          <h2>{group.label}</h2>
          {group.list.map((category) => {
            const key = `${group.gender}:${category}`;
            const count = products.filter((product) => product.gender === group.gender && product.category === category && !product.archived).length;
            const hidden = hiddenCategories.includes(key);
            return (
              <div key={key} className="cat-row">
                <span>
                  <strong>{category}</strong>
                  <small>{count} pieces</small>
                </span>
                <button className={`chip ${hidden ? "" : "on"}`} onClick={() => toggleCategory(key)}>
                  {hidden ? "Hidden" : "Visible"}
                </button>
              </div>
            );
          })}
        </article>
      ))}
    </div>
  );
}

function Inventory() {
  const { products, updateStock } = useStore();
  const [lowOnly, setLowOnly] = useState(false);
  const rows = products.filter((product) => !lowOnly || product.stock < 8).slice().sort((a, b) => a.stock - b.stock);
  const value = products.reduce((sum, product) => sum + product.price * product.stock, 0);
  return (
    <div className="stack">
      <div className="kpi-grid">
        <Kpi label="Inventory value" value={money(value)} note="Price × units on hand" />
        <Kpi label="Low stock" value={String(products.filter((product) => product.stock > 0 && product.stock < 8).length)} note="Under 8 units" />
        <Kpi label="Sold out" value={String(products.filter((product) => product.stock === 0).length)} note="Hidden from purchase" />
      </div>
      <label className="check">
        <input type="checkbox" checked={lowOnly} onChange={() => setLowOnly((value) => !value)} />
        Show low and sold-out only
      </label>
      <table className="data">
        <thead>
          <tr>
            <th>Piece</th>
            <th>On hand</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((product) => (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td>
                <input className="stock" type="number" min={0} value={product.stock} onChange={(event) => updateStock(product.id, Number(event.target.value))} aria-label={`Stock for ${product.name}`} />
              </td>
              <td>{product.stock === 0 ? "Sold out" : product.stock < 8 ? "Low" : "Healthy"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Orders() {
  const { orders, updateOrderStatus } = useStore();
  const statuses: OrderStatus[] = ["Placed", "Processing", "Shipped", "Delivered"];
  return (
    <table className="data">
      <thead>
        <tr>
          <th>Order</th>
          <th>Client</th>
          <th>Items</th>
          <th>Total</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td>
              <strong>{order.id}</strong>
              <small>{order.placedAt}</small>
            </td>
            <td>{order.email}</td>
            <td>{order.items.map((item) => item.name).join(", ")}</td>
            <td>{money(order.total)}</td>
            <td>
              <select value={order.status} onChange={(event) => updateOrderStatus(order.id, event.target.value as OrderStatus)} aria-label={`Status for ${order.id}`}>
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Customers() {
  return (
    <table className="data">
      <thead>
        <tr>
          <th>Client</th>
          <th>City</th>
          <th>Orders</th>
          <th>Spent</th>
        </tr>
      </thead>
      <tbody>
        {CUSTOMERS.map((customer) => (
          <tr key={customer.email}>
            <td>
              <strong>{customer.name}</strong>
              <small>{customer.email}</small>
            </td>
            <td>{customer.city}</td>
            <td>{customer.orders}</td>
            <td>{money(customer.spent)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TryAnalytics({ total }: { total: number }) {
  const { tryOns, products, orders } = useStore();
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    tryOns.forEach((event) => map.set(event.productId, (map.get(event.productId) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [tryOns]);
  const tried = new Set(tryOns.map((event) => event.productId));
  const converted = orders.filter((order) => order.items.some((item) => tried.has(item.productId))).length;
  return (
    <div className="stack">
      <div className="kpi-grid">
        <Kpi label="Try-ons" value={total.toLocaleString()} note="History plus this browser" />
        <Kpi label="This session" value={String(tryOns.length)} note="Generated here" />
        <Kpi label="Session orders after a try-on" value={String(converted)} note="Same pieces, this browser" />
        <Kpi label="Most asked" value={counts[0] ? products.find((item) => item.id === counts[0][0])?.name ?? "—" : "Column dress"} note="In this session" />
      </div>
      <article className="panel">
        <h2>Try-ons this week</h2>
        <LineChart values={TRYON_SERIES} />
      </article>
      <article className="panel">
        <h2>Generated in this browser</h2>
        {counts.length === 0 ? (
          <p className="quiet">No try-ons yet. The fitting room will add them here.</p>
        ) : (
          <table className="data">
            <tbody>
              {counts.map(([id, count]) => {
                const product = products.find((item) => item.id === id);
                return (
                  <tr key={id}>
                    <td>{product?.name ?? id}</td>
                    <td>{count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </article>
    </div>
  );
}

function Coupons() {
  const { coupons, addCoupon, toggleCoupon, removeCoupon } = useStore();
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState("10");
  const [note, setNote] = useState("");
  return (
    <div className="stack">
      <form
        className="panel"
        onSubmit={(event) => {
          event.preventDefault();
          const ok = addCoupon({
            code: code.trim().toUpperCase(),
            type,
            value: Number(value) || 0,
            active: true,
            note: note || "Desk coupon",
          });
          if (ok) {
            setCode("");
            setNote("");
          }
        }}
      >
        <h2>New coupon</h2>
        <div className="split">
          <label>
            Code
            <input required value={code} onChange={(event) => setCode(event.target.value)} />
          </label>
          <label>
            Type
            <select value={type} onChange={(event) => setType(event.target.value as "percent" | "amount")}>
              <option value="percent">Percent</option>
              <option value="amount">Amount</option>
            </select>
          </label>
          <label>
            Value
            <input value={value} onChange={(event) => setValue(event.target.value)} />
          </label>
        </div>
        <label>
          Note
          <input value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <button className="btn btn-primary" type="submit">
          Create coupon
        </button>
      </form>
      <table className="data">
        <thead>
          <tr>
            <th>Code</th>
            <th>Offer</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((coupon) => (
            <tr key={coupon.code}>
              <td>
                <strong>{coupon.code}</strong>
                <small>{coupon.note}</small>
              </td>
              <td>{coupon.type === "percent" ? `${coupon.value}%` : money(coupon.value)}</td>
              <td>
                <button className="text-btn" onClick={() => toggleCoupon(coupon.code)}>
                  {coupon.active ? "Active" : "Paused"}
                </button>
              </td>
              <td>
                <button className="text-btn" onClick={() => removeCoupon(coupon.code)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
