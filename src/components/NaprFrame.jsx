import React, { useState } from "react";
import { naprPortalUrl } from "../lib/geo";

// საჯარო რეესტრის რუკა iframe-ით.
//
// ⚠️ მნიშვნელოვანი შეზღუდვა: iframe სხვა დომენზეა და ბრაუზერი
// კრძალავს მისი შიგთავსის წაკითხვას. ანუ ნაკვეთის მოხაზულობის
// ავტომატურად გადმოტანა აქედან შეუძლებელია — კოდით პოულობ,
// ხედავ საზღვრებს და კონტურს ჩვენს რუკაზე ხელით ხაზავ.
export default function NaprFrame({ lat, lng, height = 420 }) {
  const [loaded, setLoaded] = useState(false);

  const src = lat && lng
    ? naprPortalUrl(lat, lng, 18)
    : "https://maps.gov.ge/map/portal/";

  return (
    <div>
      <div style={{ position: "relative", border: "1px solid var(--hair-2)", borderRadius: "var(--r)", overflow: "hidden" }}>
        {!loaded && (
          <div className="center" style={{ position: "absolute", inset: 0, background: "var(--surface)", zIndex: 1 }}>
            რუკა იტვირთება…
          </div>
        )}
        <iframe
          src={src}
          title="საჯარო რეესტრის საკადასტრო რუკა"
          onLoad={() => setLoaded(true)}
          style={{ width: "100%", height, border: "none", display: "block" }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="warn" style={{ marginTop: 8 }}>
        ეს საჯარო რეესტრის რუკაა. მოძებნე ნაკვეთი კოდით, დაიმახსოვრე საზღვრები,
        შემდეგ გადადი „ჩვენს რუკაზე" და კონტური იქ მონიშნე.
        <div className="muted" style={{ fontSize: 11, marginTop: 5 }}>
          ავტომატურად გადმოტანა შეუძლებელია — რუკა სხვა საიტისაა და
          ბრაუზერი მისი მონაცემების წაკითხვას კრძალავს.
        </div>
      </div>

      <a className="btn2 btn-sm" href={src} target="_blank" rel="noreferrer"
        style={{ textDecoration: "none", display: "inline-block", marginTop: 8 }}>
        ცალკე ფანჯარაში გახსნა
      </a>
    </div>
  );
}
