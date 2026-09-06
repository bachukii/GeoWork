// საკადასტრო კოდის lookup.
//
// ⚠️ ეს არის დროებითი, დეტერმინისტული MOCK.
// რეალურ ვერსიაში აქ უნდა ჩაჯდეს NAPR-ის WFS/API მოთხოვნა და
// დაბრუნდეს ნამდვილი გეომეტრია + ფართობი.
// იმისთვის რომ CORS-ს გვერდი ავუაროთ, ეს ზარი სერვერზე (Netlify Function
// ან Supabase Edge Function) უნდა გავიტანოთ და აქედან მხოლოდ fetch გავაკეთოთ.

const REGION_BY_PREFIX = {
  "01": "თბილისი", "72": "მცხეთა", "81": "რუსთავი", "66": "გორი",
  "03": "ქუთაისი", "05": "ბათუმი", "53": "თელავი", "43": "ზუგდიდი",
};

const TBILISI_DISTRICTS = [
  "დიდი დიღომი","საბურთალო","ვაკე","გლდანი","ისანი","ვარკეთილი","ნაძალადევი",
];

export function lookupCadastral(raw) {
  const code = String(raw || "").trim();
  if (!/^\d{2}\.\d{2}\.\d{2}\.\d{3}(\.\d{3})?$/.test(code)) return null;

  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;

  const prefix = code.slice(0, 2);
  const region = REGION_BY_PREFIX[prefix] || "თბილისი";
  const place =
    region === "თბილისი"
      ? `თბილისი, ${TBILISI_DISTRICTS[h % TBILISI_DISTRICTS.length]}`
      : region;

  return { region, place, area: 350 + (h % 2800), mock: true };
}
