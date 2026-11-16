import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState } from "../components/Ui";
import { useTitle } from "../hooks";
import { money } from "../lib";
import { useStore } from "../store";

export function Wardrobe() {
  useTitle("Virtual Wardrobe");
  const { photos, looks, boards, products, removePhoto, removeLook, addBoard, removeBoard, assignLook, tryOns } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const triedIds = useMemo(() => {
    const ids = [...looks.map((look) => look.productId), ...tryOns.map((event) => event.productId)];
    return Array.from(new Set(ids));
  }, [looks, tryOns]);

  function togglePick(id: string) {
    setPicked((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length === 2) return [current[1], id];
      return [...current, id];
    });
  }

  const compared = picked.flatMap((id) => {
    const look = looks.find((item) => item.id === id);
    return look ? [look] : [];
  });

  return (
    <div className="wrap section wardrobe">
      <div className="section-head">
        <div>
          <p className="eyebrow">Your atelier</p>
          <h1>Virtual wardrobe</h1>
          <p className="lede">Photographs, composed looks, and the collections you keep returning to.</p>
        </div>
        <Link className="btn btn-gold" to="/try-on">
          Open fitting room
        </Link>
      </div>

      <section>
        <h2>Saved photographs</h2>
        {photos.length === 0 ? (
          <EmptyState title="No photographs yet." text="Upload one in the fitting room and it will wait here." />
        ) : (
          <div className="photo-grid">
            {photos.map((photo) => (
              <article key={photo.id}>
                <img src={photo.src} alt={photo.label} />
                <div>
                  <strong>{photo.label}</strong>
                  <div className="row-actions">
                    <button className="text-btn" onClick={() => navigate("/try-on", { state: { photo: photo.src } })}>
                      Try on
                    </button>
                    <button className="text-btn" onClick={() => removePhoto(photo.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="section-head">
          <h2>Saved AI looks</h2>
          {picked.length > 0 && <p className="quiet">{picked.length} selected for comparison</p>}
        </div>
        {looks.length === 0 ? (
          <EmptyState
            title="No looks saved."
            text="Compose a visualization and save it. You can compare two, or gather them into a collection."
            action={
              <Link className="btn btn-primary" to="/try-on">
                Try it with AI
              </Link>
            }
          />
        ) : (
          <div className="look-grid">
            {looks.map((look) => {
              const product = products.find((item) => item.id === look.productId);
              return (
                <article key={look.id} className={picked.includes(look.id) ? "picked" : ""}>
                  <img src={look.result} alt={product ? `${product.name} visualization` : "Saved look"} />
                  <div>
                    <strong>{product?.name ?? "Archived piece"}</strong>
                    <p>
                      {look.color} · {look.size}
                    </p>
                    <label className="check">
                      <input type="checkbox" checked={picked.includes(look.id)} onChange={() => togglePick(look.id)} />
                      Compare
                    </label>
                    <label>
                      <span className="sr">Add to collection</span>
                      <select defaultValue="" onChange={(event) => event.target.value && assignLook(event.target.value, look.id)}>
                        <option value="">Add to collection</option>
                        {boards.map((board) => (
                          <option key={board.id} value={board.id}>
                            {board.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="row-actions">
                      <Link className="text-btn" to={`/try-on?product=${look.productId}&color=${encodeURIComponent(look.color)}`}>
                        Try again
                      </Link>
                      <button className="text-btn" onClick={() => removeLook(look.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {compared.length === 2 && (
          <div className="compare-dock">
            {compared.map((look) => {
              const product = products.find((item) => item.id === look.productId);
              return (
                <figure key={look.id}>
                  <img src={look.result} alt="" />
                  <figcaption>
                    <strong>{product?.name}</strong>
                    <span>
                      {look.color} · {product ? money(product.price) : ""}
                    </span>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2>Collections</h2>
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            addBoard(name);
            setName("");
          }}
        >
          <label htmlFor="board-name">New collection</label>
          <input id="board-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Sunday ceremony" />
          <button className="btn btn-primary" type="submit">
            Create
          </button>
        </form>
        <div className="board-grid">
          {boards.map((board) => (
            <article key={board.id}>
              <header>
                <h3>{board.name}</h3>
                <button className="text-btn" onClick={() => removeBoard(board.id)}>
                  Delete
                </button>
              </header>
              {board.lookIds.length === 0 ? (
                <p className="quiet">Nothing filed here yet.</p>
              ) : (
                <div className="board-photos">
                  {board.lookIds.map((id) => {
                    const look = looks.find((item) => item.id === id);
                    return look ? <img key={id} src={look.result} alt="" /> : null;
                  })}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Previously tried</h2>
        {triedIds.length === 0 ? (
          <p className="quiet">Pieces you generate will be listed here.</p>
        ) : (
          <div className="rail">
            {triedIds.map((id) => {
              const product = products.find((item) => item.id === id);
              if (!product) return null;
              return (
                <Link key={id} to={`/product/${id}`} className="mini">
                  <img src={product.images[0]} alt="" />
                  <span>{product.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
