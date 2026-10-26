import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

const componentsData = [
  {
    title: "Resistor",
    org: "Vishay",
    mpn: "10 kΩ, ¼ W",
    category: "Passive Components",
    summary: "10 kΩ, ¼ W through-hole carbon film / metal film resistor. Indicative budget price: 0.64–2.00. Standard 5% tolerance, suitable for pull-up/pull-down and bias networks.",
    imageUrl: "/components-image/components-1.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 1.2,
        currency: "INR",
        quantity: 1,
        stock: 50000,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=10k%20resistor%201%2F4w",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 1.45,
        currency: "INR",
        quantity: 1,
        stock: 25000,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=10k+resistor+1%2F4w",
        checkedAt: "2026-10-26"
      }
    ]
  },
  {
    title: "Capacitor",
    org: "Panasonic",
    mpn: "100 µF, 25 V",
    category: "Passive Components",
    summary: "100 µF, 25 V radial aluminum electrolytic capacitor. Indicative budget price: 1.65–9.50. Ideal for power supply filtering, decoupling, and audio smoothing circuits.",
    imageUrl: "/components-image/components-2.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 4.8,
        currency: "INR",
        quantity: 1,
        stock: 15000,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=100uF%2025V%20capacitor",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 5.2,
        currency: "INR",
        quantity: 1,
        stock: 12000,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=100uF+25V+capacitor",
        checkedAt: "2026-10-26"
      }
    ]
  },
  {
    title: "Red LED",
    org: "Kingbright",
    mpn: "5 mm",
    category: "Optoelectronics",
    summary: "5 mm diffused red through-hole LED. Indicative budget price: 0.90–2.00 each. Forward voltage ~1.8V–2.2V, 20mA max, standard indicator diode.",
    imageUrl: "/components-image/components-3.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 1.4,
        currency: "INR",
        quantity: 1,
        stock: 30000,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=5mm%20red%20led",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 1.6,
        currency: "INR",
        quantity: 1,
        stock: 20000,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=5mm+red+led",
        checkedAt: "2026-10-26"
      }
    ]
  },
  {
    title: "Diode",
    org: "ON Semiconductor",
    mpn: "1N4007",
    category: "Semiconductors",
    summary: "1N4007 1A 1000V general-purpose silicon rectifier diode. Indicative budget price: 1.00–2.50 each. Standard DO-41 package for AC-to-DC rectification and polarity protection.",
    imageUrl: "/components-image/components-4.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 1.8,
        currency: "INR",
        quantity: 1,
        stock: 40000,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=1N4007",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 2.1,
        currency: "INR",
        quantity: 1,
        stock: 35000,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=1N4007",
        checkedAt: "2026-10-26"
      }
    ]
  },
  {
    title: "Zener Diode",
    org: "Vishay",
    mpn: "1N4733A, 5.1 V",
    category: "Semiconductors",
    summary: "1N4733A, 5.1 V 1W through-hole Zener diode. Indicative budget price: 2–10. Provides stable voltage reference and clamp protection in DO-41 glass package.",
    imageUrl: "/components-image/components-5.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 4.5,
        currency: "INR",
        quantity: 1,
        stock: 18000,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=1N4733A",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 5.0,
        currency: "INR",
        quantity: 1,
        stock: 14000,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=1N4733A",
        checkedAt: "2026-10-26"
      }
    ]
  },
  {
    title: "NPN Transistor",
    org: "Nexperia",
    mpn: "BC547",
    category: "Semiconductors",
    summary: "BC547 general-purpose NPN bipolar junction transistor in TO-92 package. Indicative budget price: 1–5 each. Max collector current 100mA, 45V Vce, high gain for switching and audio preamps.",
    imageUrl: "/components-image/components-6.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 2.8,
        currency: "INR",
        quantity: 1,
        stock: 22000,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=BC547",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 3.2,
        currency: "INR",
        quantity: 1,
        stock: 18000,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=BC547",
        checkedAt: "2026-10-26"
      }
    ]
  },
  {
    title: "MOSFET",
    org: "Infineon Technologies",
    mpn: "IRFZ44N",
    category: "Semiconductors",
    summary: "IRFZ44N 55V 49A N-channel power MOSFET in TO-220AB package. Indicative budget price: 15–40. Ultra-low RDS(on) ~17.5mΩ, fast switching for motor drivers, SMPS, and high-current relays.",
    imageUrl: "/components-image/components-7.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 28.0,
        currency: "INR",
        quantity: 1,
        stock: 8500,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=IRFZ44N",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 32.5,
        currency: "INR",
        quantity: 1,
        stock: 6200,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=IRFZ44N",
        checkedAt: "2026-10-26"
      }
    ]
  },
  {
    title: "Op-Amp IC",
    org: "Texas Instruments",
    mpn: "LM358",
    category: "Integrated Circuits / Amplifiers",
    summary: "LM358 dual operational amplifier in DIP-8 / SOIC-8. Indicative budget price: 5–25. Single-supply 3V–32V operation, rail-to-rail common mode ground sensing for sensor conditioning.",
    imageUrl: "/components-image/components-8.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 14.5,
        currency: "INR",
        quantity: 1,
        stock: 16000,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=LM358",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 16.0,
        currency: "INR",
        quantity: 1,
        stock: 12000,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=LM358",
        checkedAt: "2026-10-26"
      }
    ]
  },
  {
    title: "Timer IC",
    org: "Texas Instruments",
    mpn: "NE555",
    category: "Integrated Circuits / Timing",
    summary: "NE555 precision timing IC in DIP-8 package. Indicative budget price: 3–15. Versatile monostable and astable multi-vibrator oscillator for pulse generation and PWM control.",
    imageUrl: "/components-image/components-9.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 9.8,
        currency: "INR",
        quantity: 1,
        stock: 25000,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=NE555",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 11.2,
        currency: "INR",
        quantity: 1,
        stock: 19000,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=NE555",
        checkedAt: "2026-10-26"
      }
    ]
  },
  {
    title: "Voltage Regulator",
    org: "STMicroelectronics",
    mpn: "LM7805",
    category: "Power Management / Voltage Regulators",
    summary: "LM7805 5V 1.5A positive linear voltage regulator in TO-220 package. Indicative budget price: 5–25. Features internal current limiting, thermal shutdown, and safe-area compensation.",
    imageUrl: "/components-image/components-10.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 15.0,
        currency: "INR",
        quantity: 1,
        stock: 14000,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=LM7805",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 17.5,
        currency: "INR",
        quantity: 1,
        stock: 10500,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=LM7805",
        checkedAt: "2026-10-26"
      }
    ]
  },
  {
    title: "Microcontroller",
    org: "Microchip Technology",
    mpn: "ATmega328P",
    category: "Embedded Processors / Microcontrollers",
    summary: "ATmega328P 8-bit AVR RISC microcontroller with 32KB flash, 2KB SRAM, 1KB EEPROM in 28-pin DIP. Indicative budget price: 110–250. Clock speed up to 20MHz with low-power picopower technology.",
    imageUrl: "/components-image/components-11.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 185.0,
        currency: "INR",
        quantity: 1,
        stock: 9200,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=ATMEGA328P-PU",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 195.0,
        currency: "INR",
        quantity: 1,
        stock: 7800,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=ATMEGA328P-PU",
        checkedAt: "2026-10-26"
      }
    ]
  },
  {
    title: "Arduino Uno R3",
    org: "Arduino",
    mpn: "Arduino Uno R3",
    category: "Development Boards",
    summary: "Arduino Uno R3 development board based on ATmega328P with USB interface, 14 digital I/O pins, 6 analog inputs, 16MHz crystal resonator, and 5V power supply regulation. Indicative budget price: 399–900.",
    imageUrl: "/components-image/components-12.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 580.0,
        currency: "INR",
        quantity: 1,
        stock: 450,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=Arduino%20Uno%20R3",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 620.0,
        currency: "INR",
        quantity: 1,
        stock: 380,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=Arduino+Uno+R3",
        checkedAt: "2026-10-26"
      }
    ]
  },
  {
    title: "ESP32 Board",
    org: "Espressif Systems",
    mpn: "ESP32-WROOM-32",
    category: "IoT / Development Boards",
    summary: "ESP32-WROOM-32 Wi-Fi + Bluetooth + BLE microcontroller development board with dual-core Xtensa 32-bit LX6, 520KB SRAM, 4MB SPI Flash, and rich peripheral interfaces. Indicative budget price: 200–600.",
    imageUrl: "/components-image/components-13.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 340.0,
        currency: "INR",
        quantity: 1,
        stock: 3500,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=ESP32-WROOM-32",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 365.0,
        currency: "INR",
        quantity: 1,
        stock: 2900,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=ESP32-WROOM-32",
        checkedAt: "2026-10-26"
      }
    ]
  },
  {
    title: "NodeMCU",
    org: "AI-Thinker",
    mpn: "ESP8266 / ESP-12E",
    category: "IoT / Development Boards",
    summary: "NodeMCU ESP8266 ESP-12E IoT development board with integrated 802.11 b/g/n Wi-Fi, micro-USB CP2102/CH340 interface, and onboard PCB antenna. Indicative budget price: 180–350.",
    imageUrl: "/components-image/components-14.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 245.0,
        currency: "INR",
        quantity: 1,
        stock: 2200,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=ESP8266%20NodeMCU",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 270.0,
        currency: "INR",
        quantity: 1,
        stock: 1800,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=ESP8266+NodeMCU",
        checkedAt: "2026-10-26"
      }
    ]
  },
  {
    title: "Ultrasonic Sensor",
    org: "ElecFreaks",
    mpn: "HC-SR04",
    category: "Sensors / Distance",
    summary: "HC-SR04 non-contact ultrasonic distance measuring module. Indicative budget price: 49–150. Operating range 2cm to 400cm with 3mm precision, 5V trigger and echo pulses.",
    imageUrl: "/components-image/components-15.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 85.0,
        currency: "INR",
        quantity: 1,
        stock: 1200,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=HC-SR04",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 95.0,
        currency: "INR",
        quantity: 1,
        stock: 980,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=HC-SR04",
        checkedAt: "2026-10-26"
      }
    ]
  },
  {
    title: "Temperature Sensor",
    org: "Texas Instruments",
    mpn: "LM35",
    category: "Sensors / Temperature",
    summary: "LM35 precision centigrade analog temperature sensor in TO-92 package. Indicative budget price: 30–100. Linear +10mV/°C scale factor, rated for -55°C to +150°C range without external calibration.",
    imageUrl: "/components-image/components-16.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 62.0,
        currency: "INR",
        quantity: 1,
        stock: 4200,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=LM35",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 68.0,
        currency: "INR",
        quantity: 1,
        stock: 3500,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=LM35",
        checkedAt: "2026-10-26"
      }
    ]
  },
  {
    title: "Temperature & Humidity Sensor",
    org: "Aosong",
    mpn: "DHT11",
    category: "Sensors / Temperature & Humidity",
    summary: "DHT11 digital composite temperature and relative humidity sensor with calibrated digital signal output. Indicative budget price: 55–150. Measurement range 20-90% RH and 0-50°C.",
    imageUrl: "/components-image/components-17.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 89.0,
        currency: "INR",
        quantity: 1,
        stock: 2600,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=DHT11",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 98.0,
        currency: "INR",
        quantity: 1,
        stock: 2100,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=DHT11",
        checkedAt: "2026-10-26"
      }
    ]
  },
  {
    title: "Light Sensor",
    org: "Generic",
    mpn: "5 mm LDR",
    category: "Sensors / Light",
    summary: "5 mm light dependent photoresistor (LDR / CdS cell). Indicative budget price: 5–30. Resistance drops from ~1MΩ in complete darkness down to ~10kΩ in ambient light.",
    imageUrl: "/components-image/components-18.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 12.0,
        currency: "INR",
        quantity: 1,
        stock: 8000,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=5mm%20LDR",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 15.0,
        currency: "INR",
        quantity: 1,
        stock: 6500,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=5mm+LDR",
        checkedAt: "2026-10-26"
      }
    ]
  },
  {
    title: "Relay Module",
    org: "Songle",
    mpn: "5 V, single channel",
    category: "Switching / Relay Modules",
    summary: "5 V single-channel optocoupler-isolated relay module with status LED indicator and screw terminals. Indicative budget price: 40–100. Rated for AC 250V/10A and DC 30V/10A switching loads.",
    imageUrl: "/components-image/components-19.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 65.0,
        currency: "INR",
        quantity: 1,
        stock: 3100,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=5v%20relay%20module",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 72.0,
        currency: "INR",
        quantity: 1,
        stock: 2400,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=5v+relay+module",
        checkedAt: "2026-10-26"
      }
    ]
  },
  {
    title: "Breadboard",
    org: "BusBoard Prototype Systems",
    mpn: "830-point",
    category: "Prototyping",
    summary: "830-point solderless tie-point breadboard with dual power distribution rails and peelable self-adhesive back. Indicative budget price: 69–150. Standard 0.1 inch hole pitch for DIP ICs and components.",
    imageUrl: "/components-image/components-20.png",
    offers: [
      {
        seller: "DigiKey India",
        price: 110.0,
        currency: "INR",
        quantity: 1,
        stock: 1500,
        moq: 1,
        sellerUrl: "https://www.digikey.in/en/products/result?keywords=830%20point%20breadboard",
        checkedAt: "2026-10-26"
      },
      {
        seller: "Mouser India",
        price: 125.0,
        currency: "INR",
        quantity: 1,
        stock: 1100,
        moq: 1,
        sellerUrl: "https://www.mouser.in/c/?q=830+point+breadboard",
        checkedAt: "2026-10-26"
      }
    ]
  }
];

async function run() {
  console.log("1. Deleting all previous Products listings from Supabase...");
  const { data: existing, error: fetchErr } = await supabase
    .from("listings")
    .select("id, title")
    .eq("kind", "Products");

  if (fetchErr) {
    console.error("Error fetching existing:", fetchErr);
    process.exit(1);
  }

  console.log(`Found ${existing?.length || 0} existing Products. Deleting...`);
  if (existing && existing.length > 0) {
    const ids = existing.map((x) => x.id);
    const { error: delErr } = await supabase.from("listings").delete().in("id", ids);
    if (delErr) {
      console.error("Error deleting:", delErr);
      process.exit(1);
    }
    console.log("Deleted old components successfully.");
  }

  console.log("2. Inserting 20 requested products...");
  const rowsToInsert = componentsData.map((comp) => ({
    kind: "Products",
    title: comp.title,
    organization: comp.org,
    city: "Online",
    summary: comp.summary,
    tags: [comp.category],
    source_url: comp.offers[0].sellerUrl,
    details: {
      mpn: comp.mpn,
      category: comp.category,
      imageUrl: comp.imageUrl,
      offers: comp.offers
    },
    verification_status: "verified",
    verified: true,
    is_published: true,
    is_expired: false,
    updated_at: new Date().toISOString()
  }));

  const { data: inserted, error: insErr } = await supabase
    .from("listings")
    .insert(rowsToInsert)
    .select("id, title");

  if (insErr) {
    console.error("Insert error:", insErr);
    process.exit(1);
  }

  console.log(`Successfully inserted ${inserted?.length || 0} components!`);
  for (const item of inserted) {
    console.log(` - ${item.title} (${item.id})`);
  }
}

run();
