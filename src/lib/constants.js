export const REGIONS = [
  "თბილისი","მცხეთა","რუსთავი","გორი","ქუთაისი",
  "ბათუმი","თელავი","ზუგდიდი","ახალციხე","ოზურგეთი",
];

export const SERVICE_GROUPS = {
  "საკადასტრო": [
    "საკადასტრო აზომვითი ნახაზი",
    "გამიჯვნა",
    "გაერთიანება",
    "ნაკვეთის საზღვრების დადგენა",
  ],
  "ტოპოგრაფია": [
    "ტოპოგრაფიული აზომვა",
    "რელიეფის გადაღება",
    "სამშენებლო მოედნის ტოპო",
  ],
  "შიდა აზომვა": [
    "ბინის აზომვა",
    "სახლის აზომვა",
    "კომერციული ფართის აზომვა",
    "ოთახების აზომვა",
  ],
  "სხვა": [
    "დაკვალვა",
    "წითელი ხაზები",
    "შენობის აზომვა",
    "სპეციალური სამუშაო",
  ],
};

export const ALL_SERVICES = Object.values(SERVICE_GROUPS).flat();

export const STATUS = {
  open:       { label: "შეთავაზებების მოლოდინი", cls: "s-open",       icon: "○" },
  selected:   { label: "ამზომველი არჩეულია",     cls: "s-selected",   icon: "◔" },
  scheduled:  { label: "დაგეგმილია",              cls: "s-scheduled",  icon: "◑" },
  inprogress: { label: "მიმდინარეობს",            cls: "s-inprogress", icon: "◕" },
  processing: { label: "დამუშავება",              cls: "s-processing", icon: "◐" },
  done:       { label: "დასრულებულია",            cls: "s-done",       icon: "●" },
  rated:      { label: "შეფასებულია",             cls: "s-rated",      icon: "★" },
  cancel:     { label: "გაუქმებული",              cls: "s-cancel",     icon: "✕" },
};

export const FLOW = ["open","selected","scheduled","inprogress","processing","done","rated"];

export const DEADLINES = ["რაც შეიძლება მალე","1–3 დღე","3–7 დღე","კონკრეტული თარიღი"];

export const COMPLAINT_KINDS = [
  "სამუშაო არ შესრულდა",
  "ამზომველი არ გამოცხადდა",
  "ფასი შეიცვალა",
  "სხვა პრობლემა",
];

export const money = (n) => (Number(n) || 0).toLocaleString("ka-GE") + " ₾";
export const m2 = (n) => (Number(n) || 0).toLocaleString("ka-GE") + " მ²";
export const timeOf = (s) =>
  new Date(s).toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" });
export const dateOf = (s) =>
  new Date(s).toLocaleDateString("ka-GE", { day: "2-digit", month: "2-digit", year: "2-digit" });
