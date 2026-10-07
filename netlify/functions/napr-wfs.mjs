// ============================================================
// საჯარო რეესტრის WFS proxy — მხოლოდ ნაკვეთის ძებნა კოდით.
//
// NAPR-ის WFS (wblr.napr.gov.ge) მომხმარებელს/პაროლს ითხოვს.
// პაროლი კოდში არ წერია: Netlify → Site configuration →
// Environment variables → NAPR_WFS_AUTH = "მომხმარებელი:პაროლი".
//
// დაცვა: გადის მხოლოდ GET GetFeature ფენაზე SLRWFS:LR_PARCELS_38,
// ფილტრი მხოლოდ CADCODE-ით. ჩაწერის (Transaction) და სხვა მოთხოვნები
// იბლოკება — ანგარიშს შეიძლება რედაქტირების უფლება ჰქონდეს.
// ============================================================

const UPSTREAM = process.env.NAPR_WFS_URL || "https://wblr.napr.gov.ge/data/SLRWFS/ows";
const LAYER = "SLRWFS:LR_PARCELS_38";
// CADCODE = '01.72.14.031.045'  ან  CADCODE LIKE '01.72.14.031%'
const CQL_OK = /^CADCODE (=|LIKE) '[0-9.]{4,40}%?'$/;

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json; charset=utf-8" },
});

export default async (req) => {
  if (req.method !== "GET") return json(405, { error: "method not allowed" });

  const auth = process.env.NAPR_WFS_AUTH;
  if (!auth) return json(503, { error: "NAPR_WFS_AUTH არ არის მითითებული Netlify-ში" });

  // პარამეტრები რეგისტრის გარეშე
  const p = new Map([...new URL(req.url).searchParams].map(([k, v]) => [k.toLowerCase(), v]));
  const type = p.get("typenames") || p.get("typename") || "";
  const cql = (p.get("cql_filter") || "").trim();

  if ((p.get("request") || "").toLowerCase() !== "getfeature") return json(400, { error: "only GetFeature" });
  if (type !== LAYER) return json(400, { error: `only ${LAYER}` });
  if (!CQL_OK.test(cql)) return json(400, { error: "only CADCODE filter" });

  const count = Math.min(Math.max(parseInt(p.get("count") || "5", 10) || 5, 1), 10);
  const url = UPSTREAM + "?service=WFS&version=2.0.0&request=GetFeature"
    + "&typeNames=" + encodeURIComponent(LAYER)
    + "&outputFormat=application/json&srsName=EPSG:32638"
    + "&count=" + count
    + "&CQL_FILTER=" + encodeURIComponent(cql);

  try {
    const res = await fetch(url, {
      headers: { Authorization: "Basic " + Buffer.from(auth).toString("base64"), Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
        "cache-control": res.ok ? "public, max-age=3600" : "no-store",
      },
    });
  } catch (e) {
    return json(502, { error: "NAPR არ პასუხობს: " + e.message });
  }
};
