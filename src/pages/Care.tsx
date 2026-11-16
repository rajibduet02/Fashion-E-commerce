import { useState } from "react";
import { SizeGuide } from "../components/Ui";
import { useTitle } from "../hooks";
import { useStore } from "../store";

export function Care() {
  useTitle("Client care");
  const { toast } = useStore();
  const [guide, setGuide] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <div className="wrap section care">
      <p className="eyebrow">Client care</p>
      <h1>The practical things, said plainly.</h1>
      <section id="shipping">
        <h2>Shipping</h2>
        <p>Standard delivery is complimentary over $150, otherwise $12, and arrives in 4–7 days. Express is $28 and arrives in 2–3 days. Atelier same-day is $45 in select cities and is confirmed after you place the order.</p>
      </section>
      <section id="returns">
        <h2>Returns</h2>
        <p>Unworn pieces with tags can come back within 14 days. Sarees and embroidered ceremonial wear are inspected on return. The AI preview is not a reason code by itself — if the cloth differs from what you expected, write to us and we will look at it with you.</p>
      </section>
      <section id="size">
        <h2>Size guide</h2>
        <p>Measure over light clothing. Jackets prefer the larger size when you are between; bias dresses prefer the smaller.</p>
        <button className="btn btn-ghost" onClick={() => setGuide(true)}>
          Open the chart
        </button>
      </section>
      <section id="house">
        <h2>The house</h2>
        <p>Aurelle is a fashion atelier with a fitting room attached. We design and edit men’s and women’s clothing, including sarees, kurtis, and tailoring, and we let you preview a look on your own photograph before you buy. The preview is a visualization. The garment is the garment.</p>
        <p>Appointments are held at 18 Mercer Street, New York.</p>
      </section>
      <section id="contact">
        <h2>Contact</h2>
        {sent ? (
          <p className="joined">Message received. We’ll reply within one working day.</p>
        ) : (
          <form
            className="panel"
            onSubmit={(event) => {
              event.preventDefault();
              setSent(true);
              toast("Message received.");
            }}
          >
            <label>
              Name
              <input required name="name" />
            </label>
            <label>
              Email
              <input required type="email" name="email" />
            </label>
            <label>
              Message
              <textarea required name="message" rows={5} />
            </label>
            <button className="btn btn-primary" type="submit">
              Send
            </button>
          </form>
        )}
      </section>
      {guide && <SizeGuide onClose={() => setGuide(false)} />}
    </div>
  );
}
