import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ProductGrid } from "../components/ProductCard";
import { EmptyState } from "../components/Ui";
import { useTitle } from "../hooks";
import { matchesQuery } from "../lib";
import { useStore } from "../store";

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  useEffect(() => setQuery(initial), [initial]);
  useTitle(initial ? `Search “${initial}”` : "Search");
  const { products } = useStore();
  const results = useMemo(
    () => products.filter((product) => !product.archived && matchesQuery(product, initial)),
    [products, initial],
  );

  return (
    <div className="wrap section">
      <p className="eyebrow">Search</p>
      <h1>{initial ? `Results for “${initial}”` : "Search the atelier"}</h1>
      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault();
          setParams(query.trim() ? { q: query.trim() } : {});
        }}
      >
        <label htmlFor="q">Looking for</label>
        <input id="q" value={query} onChange={(event) => setQuery(event.target.value)} />
        <button className="btn btn-primary" type="submit">
          Search
        </button>
      </form>
      {!initial ? (
        <p className="quiet">
          Try “saree”, “suit”, or “coat”. Or browse <Link to="/women">women</Link> and <Link to="/men">men</Link>.
        </p>
      ) : results.length === 0 ? (
        <EmptyState title="No pieces match." text="Check the spelling, or browse a collection instead." />
      ) : (
        <>
          <p className="quiet">{results.length} pieces</p>
          <ProductGrid products={results} />
        </>
      )}
    </div>
  );
}

export function WishlistPage() {
  useTitle("Wishlist");
  const { wishlist, products } = useStore();
  const items = wishlist.flatMap((id) => {
    const product = products.find((item) => item.id === id && !item.archived);
    return product ? [product] : [];
  });
  return (
    <div className="wrap section">
      <p className="eyebrow">Saved</p>
      <h1>Wishlist</h1>
      {items.length === 0 ? (
        <EmptyState
          title="Nothing saved yet."
          text="Use the heart on a piece to keep it here."
          action={
            <Link className="btn btn-primary" to="/new">
              Explore collection
            </Link>
          }
        />
      ) : (
        <ProductGrid products={items} />
      )}
    </div>
  );
}

export function NotFound() {
  useTitle("Not found");
  return (
    <div className="wrap section">
      <div className="empty">
        <h2>This page isn’t on the rail.</h2>
        <p>The link may have moved. The collection is still here.</p>
        <Link className="btn btn-primary" to="/">
          Back home
        </Link>
      </div>
    </div>
  );
}
