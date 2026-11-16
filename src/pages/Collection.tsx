import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ProductGrid } from "../components/ProductCard";
import { EmptyState } from "../components/Ui";
import { HERO, MEN_CATEGORIES, WOMEN_CATEGORIES } from "../data";
import { useTitle } from "../hooks";
import { useStore } from "../store";
import type { Gender, Product } from "../types";

type Mode = "men" | "women" | "new" | "trending" | "season";

const PRICES = [
  { id: "u100", label: "Under $100", min: 0, max: 100 },
  { id: "mid", label: "$100 – $250", min: 100, max: 250 },
  { id: "high", label: "$250 – $500", min: 250, max: 500 },
  { id: "top", label: "$500 and above", min: 500, max: 100000 },
];

export function Collection({ mode }: { mode: Mode }) {
  const { season } = useParams();
  const { products, hiddenCategories } = useStore();
  const seasonName = season?.toLowerCase() === "winter" ? "Winter" : "Evening";
  const title =
    mode === "men"
      ? "Men"
      : mode === "women"
        ? "Women"
        : mode === "new"
          ? "New Arrivals"
          : mode === "trending"
            ? "Trending Now"
            : seasonName === "Winter"
              ? "Winter Atelier"
              : "The Evening Edit";
  useTitle(title);

  const [categories, setCategories] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [price, setPrice] = useState<string | null>(null);
  const [sort, setSort] = useState("featured");
  const [gender, setGender] = useState<Gender | "all">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setCategories([]);
    setSizes([]);
    setColors([]);
    setPrice(null);
    setSort("featured");
    setGender("all");
  }, [mode, season]);

  const base = useMemo(() => {
    return products.filter((product) => {
      if (product.archived) return false;
      if (hiddenCategories.includes(`${product.gender}:${product.category}`)) return false;
      if (mode === "men" && product.gender !== "men") return false;
      if (mode === "women" && product.gender !== "women") return false;
      if (mode === "new" && !product.newest) return false;
      if (mode === "trending" && !product.trending) return false;
      if (mode === "season" && product.season !== seasonName) return false;
      return true;
    });
  }, [products, hiddenCategories, mode, seasonName]);

  const categoryOptions = useMemo(() => {
    if (mode === "men") return MEN_CATEGORIES;
    if (mode === "women") return WOMEN_CATEGORIES;
    return Array.from(new Set(base.map((product) => product.category)));
  }, [base, mode]);

  const sizeOptions = useMemo(() => Array.from(new Set(base.flatMap((product) => product.sizes))), [base]);
  const colorOptions = useMemo(() => {
    const map = new Map<string, string>();
    base.forEach((product) => product.colors.forEach((color) => map.set(color.name, color.hex)));
    return Array.from(map.entries());
  }, [base]);

  const shown = useMemo(() => {
    const range = PRICES.find((item) => item.id === price);
    let list = base.filter((product) => {
      if (gender !== "all" && product.gender !== gender) return false;
      if (categories.length && !categories.includes(product.category)) return false;
      if (sizes.length && !product.sizes.some((size) => sizes.includes(size))) return false;
      if (colors.length && !product.colors.some((color) => colors.includes(color.name))) return false;
      if (range && (product.price < range.min || product.price >= range.max)) return false;
      return true;
    });
    list = [...list].sort((a, b) => compare(a, b, sort));
    return list;
  }, [base, gender, categories, sizes, colors, price, sort]);

  const banner =
    mode === "men" ? HERO.men : mode === "women" ? HERO.women : mode === "new" ? HERO.new : mode === "trending" ? HERO.trending : seasonName === "Winter" ? HERO.winter : HERO.evening;

  const lede =
    mode === "men"
      ? "Shirts, tailoring, denim, kurtas, and the shoes that finish them."
      : mode === "women"
        ? "Tops, dresses, sarees, lehengas, and evening cloth — ready to try on."
        : mode === "new"
          ? "The latest cloth to arrive on the rail."
          : mode === "trending"
            ? "Pieces the fitting room has been asked for again."
            : seasonName === "Winter"
              ? "Coats, wool, and the layers that earn their keep."
              : "Dinner jackets, sarees, and gowns for after dark.";

  function toggle(list: string[], value: string, set: (next: string[]) => void) {
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  const clear = () => {
    setCategories([]);
    setSizes([]);
    setColors([]);
    setPrice(null);
    setGender("all");
  };

  const filterBody = (
    <div className="filter-stack">
      {mode !== "men" && mode !== "women" && (
        <fieldset>
          <legend>Collection</legend>
          {(["all", "men", "women"] as const).map((option) => (
            <button key={option} className={`chip ${gender === option ? "on" : ""}`} onClick={() => setGender(option)} type="button">
              {option === "all" ? "All" : option === "men" ? "Men" : "Women"}
            </button>
          ))}
        </fieldset>
      )}
      <fieldset>
        <legend>Category</legend>
        {categoryOptions.map((category) => (
          <label key={category} className="check">
            <input type="checkbox" checked={categories.includes(category)} onChange={() => toggle(categories, category, setCategories)} />
            {category}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Price</legend>
        {PRICES.map((option) => (
          <button key={option.id} type="button" className={`chip ${price === option.id ? "on" : ""}`} onClick={() => setPrice(price === option.id ? null : option.id)}>
            {option.label}
          </button>
        ))}
      </fieldset>
      <fieldset>
        <legend>Size</legend>
        <div className="chip-wrap">
          {sizeOptions.map((size) => (
            <button key={size} type="button" className={`chip ${sizes.includes(size) ? "on" : ""}`} onClick={() => toggle(sizes, size, setSizes)}>
              {size}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Color</legend>
        <div className="chip-wrap">
          {colorOptions.map(([name, hex]) => (
            <button key={name} type="button" className={`chip color-chip ${colors.includes(name) ? "on" : ""}`} onClick={() => toggle(colors, name, setColors)}>
              <i style={{ background: hex }} />
              {name}
            </button>
          ))}
        </div>
      </fieldset>
      <button type="button" className="text-btn" onClick={clear}>
        Clear filters
      </button>
    </div>
  );

  return (
    <>
      <section className="banner">
        <img src={banner} alt="" />
        <div className="banner-copy">
          <p className="eyebrow">Aurelle</p>
          <h1>{title}</h1>
          <p>{lede}</p>
        </div>
      </section>
      <div className="shop">
        <aside className="filters">{filterBody}</aside>
        <div>
          <div className="toolbar">
            <p>{shown.length} {shown.length === 1 ? "piece" : "pieces"}</p>
            <div>
              <button className="btn btn-ghost filter-toggle" type="button" onClick={() => setFiltersOpen(true)}>
                Filters
              </button>
              <label>
                <span className="sr">Sort</span>
                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                  <option value="featured">Featured</option>
                  <option value="new">Newest</option>
                  <option value="price-asc">Price · Low to high</option>
                  <option value="price-desc">Price · High to low</option>
                  <option value="rating">Top rated</option>
                </select>
              </label>
            </div>
          </div>
          {shown.length === 0 ? (
            <EmptyState title="Nothing in this edit." text="Clear a filter, or browse the full rail." action={<button className="btn btn-primary" onClick={clear}>Clear filters</button>} />
          ) : (
            <ProductGrid products={shown} />
          )}
        </div>
      </div>
      {filtersOpen && (
        <div className="modal-wrap" onMouseDown={() => setFiltersOpen(false)}>
          <div className="modal filter-modal" role="dialog" aria-label="Filters" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2>Filters</h2>
              <button className="text-btn" onClick={() => setFiltersOpen(false)}>
                Done
              </button>
            </div>
            {filterBody}
          </div>
        </div>
      )}
    </>
  );
}

function compare(a: Product, b: Product, sort: string) {
  if (sort === "price-asc") return a.price - b.price;
  if (sort === "price-desc") return b.price - a.price;
  if (sort === "rating") return b.rating - a.rating;
  if (sort === "new") return Number(b.newest) - Number(a.newest);
  return Number(b.bestseller) - Number(a.bestseller) || b.rating - a.rating;
}
