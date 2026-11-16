import { useEffect, type ReactNode } from "react";
import { useStore } from "../store";
import { IconClose } from "./Icons";

export function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <span className="stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= rounded ? "on" : ""}>
          ★
        </span>
      ))}
    </span>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <button key={toast.id} className={`toast ${toast.tone}`} onClick={() => dismissToast(toast.id)}>
          {toast.message}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-wrap" role="presentation" onMouseDown={onClose}>
      <div
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SizeGuide({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Size guide" onClose={onClose}>
      <p className="quiet">
        Measure over light clothing. If you sit between sizes, choose the larger for jackets and the smaller for bias dresses.
        Sarees are free size; the blouse piece is unstitched. Shoes follow European sizing.
      </p>
      <table className="data">
        <thead>
          <tr>
            <th>Size</th>
            <th>Chest</th>
            <th>Waist</th>
            <th>Hip</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["XS", "32 in", "25 in", "35 in"],
            ["S", "35 in", "28 in", "38 in"],
            ["M", "38 in", "31 in", "41 in"],
            ["L", "42 in", "35 in", "44 in"],
            ["XL", "46 in", "39 in", "48 in"],
          ].map((row) => (
            <tr key={row[0]}>
              {row.map((cell) => (
                <td key={cell}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="quiet">Suits marked 46–54 follow European jacket sizes. Denim is listed by waist.</p>
    </Modal>
  );
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}
