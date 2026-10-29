import { writeFileSync } from "node:fs";

const rawData = [
  { sNo: 1, category: "Passive components", title: "Resistor assortment", spec: "¼ W, 5%, E12 values; mixed kit", qty: 20, unit: "kits", price: 180, notes: "Prefer sorted, labelled kits" },
  { sNo: 2, category: "Passive components", title: "Resistors 1 kΩ", spec: "¼ W, 5%, axial", qty: 1000, unit: "pcs", price: 0.6, notes: "Price allowance; request bulk quote" },
  { sNo: 3, category: "Passive components", title: "Resistors 10 kΩ", spec: "¼ W, 5%, axial", qty: 1000, unit: "pcs", price: 0.6, notes: "Price allowance; request bulk quote" },
  { sNo: 4, category: "Passive components", title: "Resistors 330 Ω", spec: "¼ W, 5%, axial", qty: 1000, unit: "pcs", price: 0.6, notes: "Price allowance; request bulk quote" },
  { sNo: 5, category: "Passive components", title: "Ceramic capacitors assortment", spec: "10 pF–100 nF, through-hole", qty: 20, unit: "kits", price: 150, notes: "Mixed values" },
  { sNo: 6, category: "Passive components", title: "Electrolytic capacitor assortment", spec: "1 µF–1000 µF, 16–50 V", qty: 20, unit: "kits", price: 220, notes: "Mixed values" },
  { sNo: 7, category: "Passive components", title: "Potentiometer", spec: "10 kΩ linear, panel/PCB mount", qty: 100, unit: "pcs", price: 18, notes: "Indicative" },
  { sNo: 8, category: "Passive components", title: "Trimmer preset", spec: "10 kΩ and 100 kΩ", qty: 100, unit: "pcs", price: 5, notes: "Mixed values" },

  { sNo: 9, category: "Semiconductors", title: "Diode 1N4148", spec: "Small-signal switching diode", qty: 500, unit: "pcs", price: 2.5, notes: "Indicative" },
  { sNo: 10, category: "Semiconductors", title: "Diode 1N4007", spec: "1 A rectifier diode", qty: 500, unit: "pcs", price: 2.5, notes: "Indicative" },
  { sNo: 11, category: "Semiconductors", title: "Zener diode assortment", spec: "3.3 V, 5.1 V, 6.2 V, 12 V", qty: 200, unit: "pcs", price: 4, notes: "Split across voltage ratings" },
  { sNo: 12, category: "Semiconductors", title: "LED assortment", spec: "3/5 mm red, green, yellow, blue", qty: 1000, unit: "pcs", price: 2.5, notes: "Mixed colours" },
  { sNo: 13, category: "Semiconductors", title: "NPN transistor BC547", spec: "TO-92", qty: 300, unit: "pcs", price: 3.5, notes: "Check pinout/lot" },
  { sNo: 14, category: "Semiconductors", title: "PNP transistor BC557", spec: "TO-92", qty: 200, unit: "pcs", price: 3.5, notes: "Check pinout/lot" },
  { sNo: 15, category: "Semiconductors", title: "Power transistor TIP122", spec: "Darlington NPN, TO-220", qty: 50, unit: "pcs", price: 28, notes: "Use heatsink as required" },
  { sNo: 16, category: "Semiconductors", title: "N-channel MOSFET IRFZ44N", spec: "TO-220", qty: 50, unit: "pcs", price: 40, notes: "Check genuine part and rating" },
  { sNo: 17, category: "Semiconductors", title: "Optocoupler PC817", spec: "DIP-4", qty: 100, unit: "pcs", price: 6, notes: "Isolation experiments" },

  { sNo: 18, category: "ICs & digital", title: "NE555 timer IC", spec: "DIP-8", qty: 200, unit: "pcs", price: 8, notes: "Current online listing may vary" },
  { sNo: 19, category: "ICs & digital", title: "LM741 op-amp", spec: "DIP-8", qty: 100, unit: "pcs", price: 12, notes: "For basic op-amp experiments" },
  { sNo: 20, category: "ICs & digital", title: "LM358 op-amp", spec: "DIP-8 dual op-amp", qty: 100, unit: "pcs", price: 12, notes: "Recommended practical alternative" },
  { sNo: 21, category: "ICs & digital", title: "Logic IC 7400", spec: "Quad 2-input NAND, DIP-14", qty: 100, unit: "pcs", price: 12, notes: "TTL family" },
  { sNo: 22, category: "ICs & digital", title: "Logic IC 7402", spec: "Quad 2-input NOR, DIP-14", qty: 100, unit: "pcs", price: 12, notes: "TTL family" },
  { sNo: 23, category: "ICs & digital", title: "Logic IC 7404", spec: "Hex inverter, DIP-14", qty: 100, unit: "pcs", price: 12, notes: "TTL family" },
  { sNo: 24, category: "ICs & digital", title: "Logic IC 7408", spec: "Quad 2-input AND, DIP-14", qty: 100, unit: "pcs", price: 12, notes: "TTL family" },
  { sNo: 25, category: "ICs & digital", title: "Logic IC 7432", spec: "Quad 2-input OR, DIP-14", qty: 100, unit: "pcs", price: 12, notes: "TTL family" },
  { sNo: 26, category: "ICs & digital", title: "D flip-flop 7474", spec: "Dual D flip-flop, DIP-14", qty: 60, unit: "pcs", price: 18, notes: "Confirm compatible logic family" },
  { sNo: 27, category: "ICs & digital", title: "JK flip-flop 7476", spec: "Dual JK flip-flop", qty: 60, unit: "pcs", price: 18, notes: "Confirm pinout" },
  { sNo: 28, category: "ICs & digital", title: "CD4017 counter", spec: "Decade counter, DIP-16", qty: 60, unit: "pcs", price: 15, notes: "CMOS" },
  { sNo: 29, category: "ICs & digital", title: "Voltage regulator 7805", spec: "5 V, TO-220", qty: 100, unit: "pcs", price: 8, notes: "Heatsink if needed" },
  { sNo: 30, category: "ICs & digital", title: "Voltage regulator 7812", spec: "12 V, TO-220", qty: 50, unit: "pcs", price: 10, notes: "Heatsink if needed" },
  { sNo: 31, category: "ICs & digital", title: "Motor driver L293D", spec: "DIP-16", qty: 40, unit: "pcs", price: 65, notes: "Check current limits" },

  { sNo: 32, category: "Prototyping", title: "Solderless breadboard", spec: "830 tie points", qty: 100, unit: "pcs", price: 90, notes: "High-grade ABS housing, phosphor bronze contacts" },
  { sNo: 33, category: "Prototyping", title: "Jumper wire set (Male-Male)", spec: "Male-male, 40 wires", qty: 100, unit: "sets", price: 55, notes: "20 cm length, multi-color ribbon" },
  { sNo: 34, category: "Prototyping", title: "Jumper wire set (Male-Female)", spec: "Male-female, 40 wires", qty: 60, unit: "sets", price: 65, notes: "20 cm length, multi-color ribbon" },
  { sNo: 35, category: "Prototyping", title: "Jumper wire set (Female-Female)", spec: "Female-female, 40 wires", qty: 60, unit: "sets", price: 65, notes: "20 cm length, multi-color ribbon" },
  { sNo: 36, category: "Prototyping", title: "General-purpose PCB", spec: "Dot matrix, approx. 7×9 cm", qty: 100, unit: "pcs", price: 25, notes: "FR2 copper clad prototype perfboard" },
  { sNo: 37, category: "Prototyping", title: "Screw terminal block", spec: "2-way/3-way, 5.08 mm pitch", qty: 200, unit: "pcs", price: 12, notes: "PCB screw clamp connector" },
  { sNo: 38, category: "Prototyping", title: "Dupont connector kit", spec: "2.54 mm housings and crimp pins", qty: 20, unit: "kits", price: 180, notes: "Assorted pin headers & housings" },
  { sNo: 39, category: "Prototyping", title: "Hook-up wire", spec: "Flexible insulated wire, assorted colours", qty: 30, unit: "rolls", price: 180, notes: "22 AWG stranded copper wire" },

  { sNo: 40, category: "Switching & power", title: "Tactile push button", spec: "6×6 mm, through-hole", qty: 500, unit: "pcs", price: 3, notes: "Micro momentary tactile switch" },
  { sNo: 41, category: "Switching & power", title: "Toggle switch", spec: "SPST, panel mount", qty: 50, unit: "pcs", price: 22, notes: "2-pin ON-OFF rocker/toggle switch" },
  { sNo: 42, category: "Switching & power", title: "Relay module", spec: "5 V, 1-channel, opto-isolated", qty: 40, unit: "pcs", price: 90, notes: "10 A 250 VAC switching capacity with LED status" },
  { sNo: 43, category: "Switching & power", title: "Electromechanical relay", spec: "12 V coil, SPDT, 10 A contacts", qty: 50, unit: "pcs", price: 35, notes: "Miniature power relay" },
  { sNo: 44, category: "Switching & power", title: "Bridge rectifier", spec: "2–4 A, suitable voltage rating", qty: 50, unit: "pcs", price: 18, notes: "Full wave silicon bridge rectifier" },
  { sNo: 45, category: "Switching & power", title: "Step-down Transformer", spec: "230 VAC to 12-0-12 VAC, 1 A", qty: 10, unit: "pcs", price: 450, notes: "Center tapped chassis mount transformer" },
  { sNo: 46, category: "Switching & power", title: "DC Power Adapter", spec: "12 V, 2 A, regulated", qty: 30, unit: "pcs", price: 220, notes: "Wall mount SMPS with standard 2.1 mm barrel plug" },
  { sNo: 47, category: "Switching & power", title: "Fuse and holder set", spec: "Assorted low-voltage ratings", qty: 100, unit: "sets", price: 25, notes: "5×20 mm glass fuse set with inline/panel holder" },
  { sNo: 48, category: "Switching & power", title: "Heat sink assortment", spec: "TO-220 compatible", qty: 50, unit: "pcs", price: 25, notes: "Anodized aluminum with mounting screw set" },

  { sNo: 49, category: "Boards & embedded", title: "Arduino-compatible UNO R3", spec: "ATmega328P compatible board + USB cable", qty: 30, unit: "pcs", price: 430, notes: "Complete microcontroller board with bootloader & cable" },
  { sNo: 50, category: "Boards & embedded", title: "ESP32 development board", spec: "ESP32-WROOM-32, USB interface", qty: 40, unit: "pcs", price: 380, notes: "Dual-core Wi-Fi & Bluetooth microcontroller" },
  { sNo: 51, category: "Boards & embedded", title: "NodeMCU ESP8266", spec: "USB development board", qty: 20, unit: "pcs", price: 250, notes: "Lua-based Wi-Fi IoT development board" },
  { sNo: 52, category: "Boards & embedded", title: "USB-to-TTL adapter", spec: "3.3 V/5 V selectable, CP2102/CH340", qty: 20, unit: "pcs", price: 180, notes: "Serial programmer for ESP/Arduino/STM32" },
  { sNo: 53, category: "Boards & embedded", title: "STM32 development board", spec: "STM32F103C8T6 (Blue Pill)", qty: 10, unit: "pcs", price: 300, notes: "ARM Cortex-M3 32-bit development board" },

  { sNo: 54, category: "Sensors & IoT", title: "Temperature sensor LM35", spec: "Precision analog output (10 mV/°C)", qty: 40, unit: "pcs", price: 45, notes: "Calibrated directly in Celsius" },
  { sNo: 55, category: "Sensors & IoT", title: "DHT11 sensor module", spec: "Temperature and humidity digital sensor", qty: 40, unit: "pcs", price: 80, notes: "Calibrated digital signal output" },
  { sNo: 56, category: "Sensors & IoT", title: "DHT22 sensor module", spec: "High accuracy humidity & temperature", qty: 20, unit: "pcs", price: 220, notes: "AM2302 precision sensor" },
  { sNo: 57, category: "Sensors & IoT", title: "Ultrasonic sensor HC-SR04", spec: "Distance measurement module (2 cm - 400 cm)", qty: 40, unit: "pcs", price: 60, notes: "Sonar non-contact ranging module" },
  { sNo: 58, category: "Sensors & IoT", title: "IR obstacle sensor module", spec: "Infrared proximity detector with potentiometer", qty: 40, unit: "pcs", price: 50, notes: "Active infrared line/obstacle sensor" },
  { sNo: 59, category: "Sensors & IoT", title: "PIR motion sensor HC-SR501", spec: "Pyroelectric infrared human body detector", qty: 30, unit: "pcs", price: 110, notes: "Adjustable delay and sensitivity" },
  { sNo: 60, category: "Sensors & IoT", title: "LDR module / photoresistor", spec: "Light dependent resistor sensor module", qty: 50, unit: "pcs", price: 20, notes: "Analog and digital LM393 output" },
  { sNo: 61, category: "Sensors & IoT", title: "MQ-2 gas sensor module", spec: "Smoke, LPG, methane & propane detector", qty: 20, unit: "pcs", price: 120, notes: "Gas detection educational module" },
  { sNo: 62, category: "Sensors & IoT", title: "MPU-6050 IMU module", spec: "3-axis accelerometer + 3-axis gyroscope", qty: 20, unit: "pcs", price: 100, notes: "I2C 6-DOF motion tracking sensor" },
  { sNo: 63, category: "Sensors & IoT", title: "ACS712 current sensor", spec: "Hall-effect current sensor module (20 A/30 A)", qty: 20, unit: "pcs", price: 130, notes: "AC and DC current measurement" },
  { sNo: 64, category: "Sensors & IoT", title: "RFID reader kit RC522", spec: "MFRC522 SPI module + RFID card & key fob", qty: 20, unit: "sets", price: 120, notes: "13.56 MHz contactless reader kit" },
  { sNo: 65, category: "Sensors & IoT", title: "GPS module NEO-6M", spec: "High sensitivity satellite positioning + antenna", qty: 10, unit: "pcs", price: 350, notes: "UART interface with ceramic antenna" },
  { sNo: 66, category: "Sensors & IoT", title: "LCD display 1602", spec: "16×2 character display (HD44780)", qty: 30, unit: "pcs", price: 150, notes: "Alphanumeric blue/yellow backlight" },
  { sNo: 67, category: "Sensors & IoT", title: "OLED display 0.96 inch", spec: "I²C interface, 128×64 resolution (SSD1306)", qty: 20, unit: "pcs", price: 200, notes: "High contrast graphic OLED" },
  { sNo: 68, category: "Sensors & IoT", title: "Servo motor SG90", spec: "Micro servo 9 g (180° rotation)", qty: 30, unit: "pcs", price: 130, notes: "Includes servo arms and screws" },
  { sNo: 69, category: "Sensors & IoT", title: "DC geared motor & wheel", spec: "3–6 V TT dual shaft motor + rubber tyre", qty: 30, unit: "pcs", price: 70, notes: "Robotics chassis drive motor" },
  { sNo: 70, category: "Sensors & IoT", title: "Motor driver module L298N", spec: "Dual H-bridge DC / Stepper driver", qty: 20, unit: "pcs", price: 160, notes: "Drives 2 DC motors or 1 stepper motor" },
  { sNo: 71, category: "Sensors & IoT", title: "Piezo Buzzer", spec: "5 V active audible alarm buzzer", qty: 100, unit: "pcs", price: 12, notes: "Continuous beep tone" },
  { sNo: 72, category: "Sensors & IoT", title: "Breadboard power module", spec: "MB102 3.3 V / 5 V dual rail supply", qty: 30, unit: "pcs", price: 100, notes: "Plugs directly into standard breadboards" },

  { sNo: 73, category: "Electrical lab", title: "Digital multimeter", spec: "6000-count, AC/DC, continuity, resistance & diode test", qty: 20, unit: "pcs", price: 900, notes: "Includes insulated probes and CAT certification" },
  { sNo: 74, category: "Electrical lab", title: "Digital Clamp meter", spec: "AC current, voltage, resistance and continuity", qty: 5, unit: "pcs", price: 1800, notes: "Non-contact AC current testing" },
  { sNo: 75, category: "Electrical lab", title: "Bench DC power supply", spec: "0–30 V, 0–3 A, regulated, CC/CV mode", qty: 10, unit: "pcs", price: 8000, notes: "Digital dual display with current limiting protection" },
  { sNo: 76, category: "Electrical lab", title: "Dual-channel oscilloscope", spec: "100 MHz bandwidth, 1 GSa/s, 2× 100 MHz probes", qty: 4, unit: "pcs", price: 35000, notes: "Color LCD digital storage oscilloscope" },
  { sNo: 77, category: "Electrical lab", title: "Function / Arbitrary waveform generator", spec: "10 MHz, sine, square, triangle, ramp and pulse", qty: 4, unit: "pcs", price: 15000, notes: "DDS signal generator with BNC cables" },
  { sNo: 78, category: "Electrical lab", title: "Digital LCR meter", spec: "Precision capacitance, inductance, and ESR measurement", qty: 2, unit: "pcs", price: 8000, notes: "Includes Kelvin clip test leads" },
  { sNo: 79, category: "Electrical lab", title: "Temperature controlled Soldering station", spec: "60 W–80 W, ESD-safe with stand and sponge", qty: 8, unit: "pcs", price: 1800, notes: "Microprocessor PID temperature control" },
  { sNo: 80, category: "Electrical lab", title: "Desoldering pump (Solder sucker)", spec: "Manual high-suction anti-static desoldering tool", qty: 20, unit: "pcs", price: 150, notes: "Durable aluminum body with Teflon nozzle" },
  { sNo: 81, category: "Electrical lab", title: "Wire stripper and cutter", spec: "Multi-gauge wire stripping pliers (10-22 AWG)", qty: 15, unit: "pcs", price: 250, notes: "Cushioned insulated handles" },
  { sNo: 82, category: "Electrical lab", title: "Crimping tool kit", spec: "Dupont & JST terminal ratcheting crimper", qty: 5, unit: "kits", price: 900, notes: "Includes crimper and assorted connector pins" },
  { sNo: 83, category: "Electrical lab", title: "Solder fume extractor", spec: "Bench-top ESD activated carbon filter fan", qty: 4, unit: "pcs", price: 3500, notes: "Removes noxious flux smoke and fumes" },
  { sNo: 84, category: "Electrical lab", title: "Laboratory Isolation transformer", spec: "230 V input / 230 V output, 1 kVA safety rating", qty: 2, unit: "pcs", price: 12000, notes: "Galvanic electrical isolation for lab workstations" },
  { sNo: 85, category: "Electrical lab", title: "ESD mat and wrist strap set", spec: "Static dissipative rubber mat with grounding cord", qty: 10, unit: "sets", price: 1200, notes: "Protects sensitive ICs and MOS devices" },
  { sNo: 86, category: "Electrical lab", title: "Insulated test lead set", spec: "Banana plug to alligator clips & needle probes", qty: 30, unit: "sets", price: 250, notes: "High flexibility silicone leads (1000 V / 10 A)" },
  { sNo: 87, category: "Electrical lab", title: "Bench power strip", spec: "6-socket surge and overload protected extension", qty: 10, unit: "pcs", price: 900, notes: "Individual power switches with surge indicator" },

  { sNo: 88, category: "Consumables", title: "Solder wire spool", spec: "Lead-free / 60-40 rosin core, 0.8–1.0 mm, 250 g", qty: 20, unit: "rolls", price: 350, notes: "Fast wetting and low spatter" },
  { sNo: 89, category: "Consumables", title: "Soldering Flux paste", spec: "Electronics-grade no-clean rosin flux", qty: 20, unit: "bottles", price: 120, notes: "Easy soldering & residue-free" },
  { sNo: 90, category: "Consumables", title: "Heat-shrink tubing kit", spec: "Assorted diameters (1 mm to 10 mm), 328 pcs", qty: 20, unit: "kits", price: 180, notes: "Flame retardant 2:1 polyolefin sleeve" },
  { sNo: 91, category: "Consumables", title: "Nylon cable ties pack", spec: "Assorted small/medium zip ties (100 mm & 200 mm)", qty: 20, unit: "packs", price: 100, notes: "Self-locking wire management ties" },
  { sNo: 92, category: "Consumables", title: "Component storage organizer box", spec: "Multi-compartment transparent grid box with latch", qty: 30, unit: "pcs", price: 250, notes: "Ideal for SMD & through-hole components" },
];

console.log(`Loaded ${rawData.length} components.`);

// Generate shared/component-prices.json
const pricesMap = {};
for (const item of rawData) {
  const id = `ece-comp-${String(item.sNo).padStart(2, "0")}`;
  pricesMap[id] = item.price;
}
writeFileSync("shared/component-prices.json", JSON.stringify(pricesMap, null, 2), "utf8");
console.log("Wrote shared/component-prices.json");

// Generate src/data/componentsCatalog.ts
const imagePlaceholder = (sNo) => {
  // We have components-1.png to components-20.png in public/components-image/
  if (sNo <= 20) {
    return `/components-image/components-${sNo}.png`;
  }
  return "";
};

const fileHeader = `// ECE Laboratory Electronic Components Catalog (92 Verified Procurement Items)
// Sourced from MSAJCE ECE & VLSI Laboratory Procurement Sheet
// Upgraded for direct component e-commerce sales & institutional procurement.

export interface ComponentOffer {
  seller: string;
  price: number;
  currency: string;
  quantity: number;
  stock: number | null;
  moq: number | null;
  sellerUrl: string;
  checkedAt: string;
}

export interface ComponentDetails {
  mpn: string;
  category: string;
  imageUrl: string;
  offers: ComponentOffer[];
}

export interface ComponentCatalogItem {
  id: string;
  sNo: number;
  kind: "Products";
  title: string;
  category: string;
  specification: string;
  quantity: number;
  unit: string;
  price: number;
  projectPrice: number;
  notes: string;
  organization: string;
  city: string;
  summary: string;
  tags: string[];
  imageUrl: string;
  sourceUrl: string;
  verified: boolean;
  featured: boolean;
  componentDetails: ComponentDetails;
}

export const LEGACY_SAMPLE_PRODUCT_TITLES = new Set([
  "5v voltage regulator",
  "555 timer ic",
  "rectifier diode",
  "12v voltage regulator",
  "8-bit microcontroller",
]);

export const COMPONENT_CATEGORIES = [
  "All",
  "Passive components",
  "Semiconductors",
  "ICs & digital",
  "Prototyping",
  "Switching & power",
  "Boards & embedded",
  "Sensors & IoT",
  "Electrical lab",
  "Consumables",
] as const;

export type ComponentCategory = (typeof COMPONENT_CATEGORIES)[number];

export const ECE_COMPONENTS_CATALOG: ComponentCatalogItem[] = [
`;

const itemsCode = rawData.map((item) => {
  const id = `ece-comp-${String(item.sNo).padStart(2, "0")}`;
  const img = imagePlaceholder(item.sNo);
  const summary = `${item.spec}. Pack of ${item.qty} ${item.unit}. ${item.notes}`.replace(/"/g, '\\"');
  const title = item.title.replace(/"/g, '\\"');
  const spec = item.spec.replace(/"/g, '\\"');
  const notes = item.notes.replace(/"/g, '\\"');
  const cat = item.category;

  return `  {
    id: "${id}",
    sNo: ${item.sNo},
    kind: "Products",
    title: "${title}",
    category: "${cat}",
    specification: "${spec}",
    quantity: ${item.qty},
    unit: "${item.unit}",
    price: ${item.price},
    projectPrice: ${item.price},
    notes: "${notes}",
    organization: "ECE & VLSI Lab",
    city: "Chennai / Online",
    summary: "${summary}",
    tags: ["${cat}", "${item.unit}"],
    imageUrl: "${img}",
    sourceUrl: "",
    verified: true,
    featured: ${item.sNo <= 6 || item.sNo === 49 || item.sNo === 50 || item.sNo === 57 || item.sNo === 73 || item.sNo === 76},
    componentDetails: {
      mpn: "${spec}",
      category: "${cat}",
      imageUrl: "${img}",
      offers: [
        {
          seller: "TechCircuit Lab Direct",
          price: ${item.price},
          currency: "INR",
          quantity: 1,
          stock: ${item.qty * 10},
          moq: 1,
          sellerUrl: "",
          checkedAt: "2026-10-29",
        },
      ],
    },
  },`;
}).join("\n");

const fileFooter = `
];

// For backwards compatibility with existing imports
export const INITIAL_20_COMPONENTS = ECE_COMPONENTS_CATALOG;
`;

writeFileSync("src/data/componentsCatalog.ts", fileHeader + itemsCode + fileFooter, "utf8");
console.log("Wrote src/data/componentsCatalog.ts with 92 components!");

