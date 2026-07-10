export interface ProvinceData {
  id: string; // matches path IDs in @svg-maps/cambodia (e.g. "siem-reap")
  name: string;
  khmerName: string;
  capital: string;
  population: number;
  area: number; // in sq km
  region: string;
  economy: string;
  coordinates: [number, number]; // [Latitude, Longitude] for calculating user pin distances
}

export const cambodiaProvinces: Record<string, ProvinceData> = {
  "phnom-penh": {
    id: "phnom-penh",
    name: "Phnom Penh",
    khmerName: "ភ្នំពេញ",
    capital: "Phnom Penh",
    population: 2281951,
    area: 679,
    region: "Central Plains",
    economy: "Services, Trade, Real Estate, Tourism",
    coordinates: [11.5564, 104.9282]
  },
  "siem-reap": {
    id: "siem-reap",
    name: "Siem Reap",
    khmerName: "សៀមរាប",
    capital: "Siem Reap",
    population: 1014234,
    area: 10299,
    region: "Tonle Sap Basin",
    economy: "Tourism, Agriculture, Services",
    coordinates: [13.3671, 103.8448]
  },
  "battambang": {
    id: "battambang",
    name: "Battambang",
    khmerName: "បាត់ដំបង",
    capital: "Battambang",
    population: 1036523,
    area: 11702,
    region: "Tonle Sap Basin / Northwest",
    economy: "Agriculture (Rice Bowl), Trade, Tourism",
    coordinates: [13.0957, 103.2022]
  },
  "preah-sihanouk": {
    id: "preah-sihanouk",
    name: "Preah Sihanouk",
    khmerName: "ព្រះសីហនុ",
    capital: "Sihanoukville",
    population: 302887,
    area: 868,
    region: "Coastal",
    economy: "Deep Sea Port, Tourism, Special Economic Zone",
    coordinates: [10.6253, 103.5234]
  },
  "kampong-cham": {
    id: "kampong-cham",
    name: "Kampong Cham",
    khmerName: "កំពង់ចាម",
    capital: "Kampong Cham",
    population: 896000,
    area: 4549,
    region: "Central Plains",
    economy: "Agriculture, Rubber Plantations, Fisheries",
    coordinates: [11.9934, 105.4633]
  },
  "kampot": {
    id: "kampot",
    name: "Kampot",
    khmerName: "កំពត",
    capital: "Kampot",
    population: 585000,
    area: 4873,
    region: "Coastal",
    economy: "Salt & Pepper production, Tourism, Agriculture",
    coordinates: [10.6095, 104.1802]
  },
  "kratie": {
    id: "kratie",
    name: "Kratie",
    khmerName: "ក្រចេះ",
    capital: "Kratie",
    population: 372000,
    area: 11094,
    region: "Plateau / Northeast",
    economy: "Ecotourism (Irrawaddy Dolphins), Agriculture",
    coordinates: [12.5222, 106.0167]
  },
  "mondulkiri": {
    id: "mondulkiri",
    name: "Mondulkiri",
    khmerName: "មណ្ឌលគីរី",
    capital: "Senmonorom",
    population: 90000,
    area: 14288,
    region: "Plateau / Mountainous",
    economy: "Ecotourism, Coffee, Mining, Agriculture",
    coordinates: [12.4553, 107.1882]
  },
  "ratanakiri": {
    id: "ratanakiri",
    name: "Ratanakiri",
    khmerName: "រតនគីរី",
    capital: "Banlung",
    population: 184000,
    area: 10782,
    region: "Plateau / Mountainous",
    economy: "Agriculture (Cashew, Rubber), Ecotourism",
    coordinates: [13.7925, 106.9731]
  },
  "koh-kong": {
    id: "koh-kong",
    name: "Koh Kong",
    khmerName: "កោះកុង",
    capital: "Khemarak Phoumin",
    population: 125000,
    area: 11160,
    region: "Coastal",
    economy: "Ecotourism, Fisheries, Border Trade",
    coordinates: [11.5232, 102.9733]
  },
  "kampong-chhnang": {
    id: "kampong-chhnang",
    name: "Kampong Chhnang",
    khmerName: "កំពង់ឆ្នាំង",
    capital: "Kampong Chhnang",
    population: 486000,
    area: 5521,
    region: "Tonle Sap Basin",
    economy: "Pottery, Fisheries, Agriculture",
    coordinates: [12.2496, 104.6782]
  },
  "pursat": {
    id: "pursat",
    name: "Pursat",
    khmerName: "ពោធិ៍សាត់",
    capital: "Pursat",
    population: 397000,
    area: 12692,
    region: "Tonle Sap Basin / West",
    economy: "Marble Sculpting, Forestry, Agriculture",
    coordinates: [12.5333, 103.9167]
  },
  "kampong-speu": {
    id: "kampong-speu",
    name: "Kampong Speu",
    khmerName: "កំពង់ស្ពឺ",
    capital: "Chbar Mon",
    population: 872000,
    area: 7017,
    region: "Central Plains / West",
    economy: "Palm Sugar production, Garment Factories",
    coordinates: [11.4533, 104.5200]
  },
  "kandal": {
    id: "kandal",
    name: "Kandal",
    khmerName: "កណ្តាល",
    capital: "Ta Khmau",
    population: 1195000,
    area: 3568,
    region: "Central Plains",
    economy: "Garment industry, Agriculture, Trade",
    coordinates: [11.4833, 104.9500]
  },
  "takeo": {
    id: "takeo",
    name: "Takeo",
    khmerName: "តាកែវ",
    capital: "Doun Kaev",
    population: 899000,
    area: 3563,
    region: "Central Plains",
    economy: "Silk Weaving, Agriculture, Aquaculture",
    coordinates: [10.9900, 104.7833]
  },
  "prey-veng": {
    id: "prey-veng",
    name: "Prey Veng",
    khmerName: "ព្រៃវែង",
    capital: "Prey Veng",
    population: 1057000,
    area: 4883,
    region: "Central Plains",
    economy: "Rice Farming, Fisheries, Border Trade",
    coordinates: [11.4833, 105.3250]
  },
  "svay-rieng": {
    id: "svay-rieng",
    name: "Svay Rieng",
    khmerName: "ស្វាយរៀង",
    capital: "Svay Rieng",
    population: 578000,
    area: 2966,
    region: "Central Plains",
    economy: "Bavet Special Economic Zone, Border Trade",
    coordinates: [11.0833, 105.8000]
  },
  "kampong-thom": {
    id: "kampong-thom",
    name: "Kampong Thom",
    khmerName: "កំពង់ធំ",
    capital: "Steung Saen",
    population: 630000,
    area: 13814,
    region: "Tonle Sap Basin / North",
    economy: "Agriculture, Rubbers, Tourism (Sambor Prei Kuk)",
    coordinates: [12.7111, 104.8887]
  },
  "preah-vihear": {
    id: "preah-vihear",
    name: "Preah Vihear",
    khmerName: "ព្រះវិហារ",
    capital: "Tbeng Meanchey",
    population: 251000,
    area: 13788,
    region: "Plateau / North border",
    economy: "Tourism (Temple of Preah Vihear), Forestry",
    coordinates: [13.7900, 104.9800]
  },
  "oddar-meanchey": {
    id: "oddar-meanchey",
    name: "Oddar Meanchey",
    khmerName: "ឧត្តរមានជ័យ",
    capital: "Samraong",
    population: 286000,
    area: 6158,
    region: "Plateau / Northwest border",
    economy: "Border Trade, Agriculture, Forestry",
    coordinates: [14.1818, 103.5178]
  },
  "banteay-meanchey": {
    id: "banteay-meanchey",
    name: "Banteay Meanchey",
    khmerName: "បន្ទាយមានជ័យ",
    capital: "Serei Saophoan",
    population: 861883,
    area: 6679,
    region: "Plateau / Northwest",
    economy: "Poipet Special Economic Zone, Trade, Agriculture",
    coordinates: [13.5857, 102.9910]
  },
  "pailin": {
    id: "pailin",
    name: "Pailin",
    khmerName: "ប៉ៃលិន",
    capital: "Pailin",
    population: 71000,
    area: 803,
    region: "Cardamom Mountains / West",
    economy: "Gems Mining, Agriculture (Corn, Cassava)",
    coordinates: [12.8489, 102.6092]
  },
  "stung-treng": {
    id: "stung-treng",
    name: "Stung Treng",
    khmerName: "ស្ទឹងត្រែង",
    capital: "Stung Treng",
    population: 159000,
    area: 11092,
    region: "Plateau / Northeast border",
    economy: "Hydroelectricity, Forestry, Agriculture",
    coordinates: [13.5259, 105.9683]
  },
  "kep": {
    id: "kep",
    name: "Kep",
    khmerName: "កែប",
    capital: "Kep",
    population: 41700,
    area: 336,
    region: "Coastal",
    economy: "Crab Market, Tourism, Pepper, Aquaculture",
    coordinates: [10.4822, 104.3167]
  },
  "tboung-khmum": {
    id: "tboung-khmum",
    name: "Tboung Khmum",
    khmerName: "ត្បូងឃ្មុំ",
    capital: "Suong",
    population: 776000,
    area: 4928,
    region: "Central Plains",
    economy: "Rubber plantations, Fruit orchards, Agriculture",
    coordinates: [11.9129, 105.8809]
  }
};
