window.CONFIG = {
  brand: "Faux Swiss",
  tagline: "Swiss-inspired design. Made for every day.",
  intro: "A curated collection of watches you can wear every day. Browse the range, then get in touch to enquire.",
  currency: "USD",

  autoSlide: false,
  strapGuides: {
    "daytona-oysterflex": {
      title: "Strap size guide",
      note: "Find your wrist size in the first column. The two letters are the strap lengths to fit on each side.",
      cols: ["Wrist (in)", "Wrist (cm)", "6 o'clock side", "12 o'clock side"],
      rows: [["5.04 – 5.43", "12.8 – 13.8", "C", "D"], ["5.43 – 5.91", "13.8 – 15.0", "C", "E"], ["5.91 – 6.26", "15.0 – 15.9", "D", "E"], ["6.26 – 6.69", "15.9 – 17.0", "D", "F"], ["6.69 – 7.09", "17.0 – 18.0", "E", "F"], ["7.09 – 7.52", "18.0 – 19.1", "E", "G"], ["7.52 – 7.91", "19.1 – 20.1", "F", "G"], ["7.95 – 8.39", "20.2 – 21.3", "F", "H"], ["8.39 – 8.86", "21.3 – 22.5", "G", "H"], ["8.86 – 9.25", "22.5 – 23.5", "H", "H"]]
    },
    "yachtmaster-oysterflex": {
      title: "Strap size guide",
      note: "Find your wrist size in the first column. The two letters are the strap lengths to fit on each side.",
      cols: ["Wrist (in)", "Wrist (cm)", "6 o'clock side", "12 o'clock side"],
      rows: [["4.80 – 5.19", "12.2 – 13.2", "C", "D"], ["5.20 – 5.50", "13.2 – 14.0", "C", "E"], ["5.51 – 5.99", "14.0 – 15.2", "D", "E"], ["6.00 – 6.37", "15.2 – 16.2", "D", "F"], ["6.38 – 6.80", "16.2 – 17.3", "E", "F"], ["6.81 – 7.19", "17.3 – 18.3", "E", "G"], ["7.20 – 7.59", "18.3 – 19.3", "F", "G"], ["7.60 – 7.99", "19.3 – 20.3", "F", "H"], ["8.00 – 8.43", "20.3 – 21.4", "G", "H"], ["8.44 – 8.82", "21.4 – 22.4", "H", "H"]]
    }
  },
  carousels: { brands: ["Rolex", "Patek Philippe", "Audemars Piguet"], seconds: 4 },

  map: {
    title: "Worldwide delivery",
    caption: "Shipped from Hong Kong to customers around the world.",
    hub: { name: "Hong Kong", lat: 22.3, lon: 114.2 },
    cities: [
      { n: "London", lat: 51.5, lon: -0.1, big: true }, { n: "Frankfurt", lat: 50.1, lon: 8.7 },
      { n: "Paris", lat: 48.9, lon: 2.4 }, { n: "Amsterdam", lat: 52.4, lon: 4.9 }, { n: "Zurich", lat: 47.4, lon: 8.5, big: true },
      { n: "Milan", lat: 45.5, lon: 9.2, big: true },
      { n: "Cairo", lat: 30.0, lon: 31.2 }, { n: "Mumbai", lat: 19.1, lon: 72.9 },
      { n: "Bangkok", lat: 13.8, lon: 100.5 },
      { n: "Madrid", lat: 40.4, lon: -3.7 }, { n: "Rome", lat: 41.9, lon: 12.5 },
      { n: "Stockholm", lat: 59.3, lon: 18.1 }, { n: "Moscow", lat: 55.8, lon: 37.6, big: true },
      { n: "Dubai", lat: 25.2, lon: 55.3, big: true }, { n: "Lagos", lat: 6.5, lon: 3.4 },
      { n: "Accra", lat: 5.6, lon: -0.2 }, { n: "Nairobi", lat: -1.3, lon: 36.8 },
      { n: "Johannesburg", lat: -26.2, lon: 28.0, big: true }, { n: "Singapore", lat: 1.35, lon: 103.8, big: true },
      { n: "Jakarta", lat: -6.2, lon: 106.8 }, { n: "Seoul", lat: 37.6, lon: 127.0 },
      { n: "Tokyo", lat: 35.7, lon: 139.7, big: true }, { n: "Perth", lat: -32.0, lon: 115.9 },
      { n: "Sydney", lat: -33.9, lon: 151.2, big: true }, { n: "Melbourne", lat: -37.8, lon: 145.0 },
      { n: "Auckland", lat: -36.9, lon: 174.8 },
      { n: "Vancouver", lat: 49.3, lon: -123.1 }, { n: "Los Angeles", lat: 34.0, lon: -118.2 },
      { n: "Mexico City", lat: 19.4, lon: -99.1 }, { n: "Toronto", lat: 43.7, lon: -79.4 },
      { n: "New York", lat: 40.7, lon: -74.0 }, { n: "Miami", lat: 25.8, lon: -80.2 },
      { n: "Bogotá", lat: 4.7, lon: -74.1 }, { n: "Lima", lat: -12.0, lon: -77.0 },
      { n: "São Paulo", lat: -23.5, lon: -46.6, big: true }, { n: "Buenos Aires", lat: -34.6, lon: -58.4 },
      { n: "Santiago", lat: -33.4, lon: -70.7 }
    ]
  },

  popularSearches: ["Best sellers", "Sport", "Classic", "Rolex", "For her"],

  themes: {
    blue: { bg: "#e8f1fc", soft: "#f3f8fe", accent: "#1a56b0", deep: "#0f3d85", line: "#c8dbf2" },
    green: { bg: "#e6f4ec", soft: "#f2faf5", accent: "#1f7a4f", deep: "#135a38", line: "#c4e2d1" },
    red: { bg: "#fbe9ec", soft: "#fdf4f5", accent: "#a3293c", deep: "#7a1c2c", line: "#efc9cf" },
    grey: { bg: "#eceef2", soft: "#f6f7f9", accent: "#3a3f4d", deep: "#20242e", line: "#d3d6de" },
    brown: { bg: "#f6ede2", soft: "#fbf6ef", accent: "#8a5a2b", deep: "#653f1a", line: "#e6d3bb" },
    teal: { bg: "#e4f4f6", soft: "#f1fafb", accent: "#17788f", deep: "#0f5668", line: "#c1e1e7" },
    purple: { bg: "#efe9f8", soft: "#f7f3fc", accent: "#6a3fa8", deep: "#4b2a7c", line: "#d9cdee" },
    silver: { bg: "#eef0f3", soft: "#f7f8fa", accent: "#5b6575", deep: "#3e4655", line: "#d8dce3" }
  },
  showShippingCare: false,
  catalogMode: true,
  showPrices: false,
  legalPages: { privacy: true, warranty: false },
  announcement: ["Enquiries via WhatsApp", "Concierge service", "Fast replies"],

  hero: { type: "image", src: "", poster: "", images: [] },

  brands: ["Rolex", "Patek Philippe", "Audemars Piguet", "Richard Mille", "Vacheron Constantin", "Omega", "Panerai", "Cartier", "DiW"],

  brandCollections: {
    "Rolex": ["Daytona", "Datejust 31", "Datejust 36", "Datejust 41", "Day-Date 40", "GMT-Master II", "Submariner", "Land-Dweller", "Sky-Dweller", "Oyster Perpetual 36", "Oyster Perpetual 41", "Yacht-Master"],
    "Patek Philippe": ["Nautilus", "Aquanaut"],
    "Audemars Piguet": ["Royal Oak", "Royal Oak Offshore 44", "Royal Oak Offshore Diver", "Royal Oak Mini"]
  },
  customBrands: ["Brand A", "Brand B", "Brand C", "Brand D"],
  bestSellerCategories: ["Category 1", "Category 2", "Category 3", "Category 4"],
  bestSellerBrands: ["Rolex", "Patek Philippe", "Audemars Piguet", "Richard Mille", "Vacheron Constantin", "Omega"],

  contact: {
    type: "whatsapp",
    whatsapp: "85252179149", // <--- CHANGE THIS to your real number (no + or spaces)
    email: "hello@fauxswiss.cc", 
    buttonLabel: "Enquire about this piece"
  },

  store: {
    address: "No 119 Finance St, Central, Hong Kong",
    hours: "Online, always open."
  },

  social: {
    instagram: "",
    facebook: ""
  }
};
