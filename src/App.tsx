import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CircuitBoard,
  Clock3,
  Compass,
  Cpu,
  ExternalLink,
  Filter,
  GraduationCap,
  Layers3,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  LogOut,
  X,
} from "lucide-react";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import brandLogo from "../ece logo 1.png";
import projectPricesInRupees from "../shared/project-prices.json";

const PLATFORM_NAME = "TechCircuit Hub";
const PLATFORM_TAGLINE = "Discover. Learn. Build. Innovate.";
const PENDING_ORDER_KEY = "techcircuit-pending-order:";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

type CheckoutCustomer = {
  name: string;
  email: string;
  phone: string;
};

type CheckoutOrderResponse = {
  order_id: string;
  payment_session_id: string;
  gateway_mode: "sandbox" | "production";
};

type CashfreeCheckoutResult = {
  error?: { message?: string };
} | void;

type CashfreeCheckout = {
  checkout(options: { paymentSessionId: string; redirectTarget: "_self" }): Promise<CashfreeCheckoutResult>;
};

declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => CashfreeCheckout;
  }
}

type Page =
  | "Home"
  | "Manufacturing"
  | "PCB Design"
  | "Internships"
  | "Training"
  | "Products"
  | "Projects"
  | "Cart"
  | "Checkout"
  | "PaymentResult"
  | "Learn"
  | "Hackathons"
  | "Saved"
  | "Dashboard"
  | "Admin";

type Listing = {
  id: string;
  kind: Exclude<Page, "Home" | "Saved" | "Dashboard" | "Admin" | "Cart" | "Checkout" | "PaymentResult">;
  title: string;
  organization: string;
  city: string;
  summary: string;
  tags: string[];
  projectCategory?: string;
  projectPrice?: number;
  imageUrl?: string;
  sourceUrl?: string;
  verified?: boolean;
  featured?: boolean;
  mode?: string;
  duration?: string;
  eligibility?: string;
  components?: string[];
  updated?: string;
};

const listingKinds: Listing["kind"][] = [
  "Manufacturing",
  "PCB Design",
  "Internships",
  "Training",
  "Products",
  "Projects",
  "Hackathons",
];

const projectImageUrls = import.meta.glob<string>("../Our Project image/ece *.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const homeShowcaseImages = Object.entries(import.meta.glob<string>("../home image/card *.png", {
  eager: true,
  query: "?url",
  import: "default",
}))
  .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
  .map(([, imageUrl]) => imageUrl);

const projectGroups = [
  {
    category: "PCB Design",
    tags: ["PCB Design", "Electronics"],
    components: ["PCB", "Power circuit", "Protection"],
    summary: "A PCB design concept covering circuit architecture, board layout, protection and testing.",
    titles: [
      "Smart DC Power Supply with Protection Circuit",
      "IoT-Based Energy Monitoring PCB",
      "Portable Battery Management System PCB",
      "Automatic Fan Speed Controller PCB",
      "Multi-Channel Sensor Interface PCB",
      "LED Driver and Lighting Control PCB",
      "USB-C Based Power Delivery and Monitoring PCB",
    ],
  },
  {
    category: "Microcontroller-Based Project",
    tags: ["Microcontroller", "Embedded Systems"],
    components: ["Microcontroller", "Sensors", "Control circuit"],
    summary: "A microcontroller project concept focused on embedded control, sensing and automation.",
    titles: [
      "Smart Traffic Light Control System Using Microcontroller",
      "Automatic Railway Gate Control System",
      "Digital Temperature and Humidity Monitoring System",
      "Smart Water Tank Level Controller",
      "Password-Based Electronic Door Lock",
      "Automatic Street Light Control System",
      "Microcontroller-Based Industrial Motor Protection System",
    ],
  },
  {
    category: "IoT Project",
    tags: ["IoT", "Connected Devices"],
    components: ["Microcontroller", "Sensors", "Wireless connectivity"],
    summary: "An IoT project concept connecting sensors, devices and data for monitoring and automation.",
    titles: [
      "IoT-Based Smart Energy Monitoring System",
      "Smart Agriculture Monitoring and Irrigation System",
      "IoT-Based Smart Waste Management System",
      "Smart Home Automation and Security System",
      "IoT-Based Air Quality Monitoring System",
      "Smart Water Quality Monitoring System",
      "IoT-Based Industrial Equipment Monitoring System",
    ],
  },
  {
    category: "Medical-Based IoT Project",
    tags: ["IoT", "Health Monitoring"],
    components: ["Wearable sensors", "Microcontroller", "Alert system"],
    summary: "A medical IoT student concept for remote monitoring and notifications; not a medical device.",
    titles: [
      "IoT-Based Patient Health Monitoring System",
      "Remote Heart Rate and SpO₂ Monitoring System",
      "IoT-Based Smart Medicine Reminder System",
      "Wearable Health Monitoring and Alert System",
      "IoT-Based Temperature and Pulse Monitoring System",
      "Remote Patient Monitoring System with Cloud Dashboard",
      "Smart Hospital Bed Monitoring System",
    ],
  },
  {
    category: "Final Year Project",
    tags: ["Final Year", "Research Concept"],
    components: ["Embedded system", "Data analysis", "Prototype"],
    summary: "A final-year project concept combining embedded systems, data analysis and real-world validation.",
    titles: [
      "AI-Based Smart Traffic Monitoring and Violation Detection",
      "IoT-Based Smart Energy Management for Buildings",
      "AI-Assisted Wearable Health Monitoring System",
      "Smart Agriculture System with IoT and Predictive Analytics",
      "Industrial Equipment Predictive Maintenance Using IoT and AI",
      "Autonomous Fire Detection and Emergency Alert System",
      "Smart Factory Monitoring and Control Using IoT",
    ],
  },
  {
    category: "Mini Project",
    tags: ["Mini Project", "Embedded Systems"],
    components: ["Microcontroller", "Input sensors", "Prototype"],
    summary: "A focused mini project concept suitable for prototyping and embedded-systems practice.",
    titles: [
      "Arduino-Based Smart Parking System",
      "ESP32-Based Home Automation System",
      "Bluetooth-Controlled Robot",
      "Automatic Plant Irrigation System",
      "RFID-Based Attendance System",
      "Digital Notice Board Using IoT",
      "Ultrasonic-Based Smart Obstacle Detection System",
    ],
  },
] as const;

const projectListings: Listing[] = projectGroups.flatMap((group, groupIndex) =>
  group.titles.map((title, projectIndex) => {
    const imageNumber = groupIndex * 7 + projectIndex + 1;
    return {
      id: `sample-project-${imageNumber}`,
      kind: "Projects",
      title,
      organization: "Student project concept",
      city: "Research concept",
      summary: group.summary,
      tags: [...group.tags],
      components: [...group.components],
      projectCategory: group.category,
      projectPrice: projectPricesInRupees[imageNumber - 1],
      imageUrl: projectImageUrls[`../Our Project image/ece ${imageNumber}.png`],
    };
  }),
);

const navigationItems: { label: string; page: Page }[] = [
  { label: "Home", page: "Home" },
  { label: "Components", page: "Products" },
  { label: "Project", page: "Projects" },
  { label: "Internship", page: "Internships" },
  { label: "Training", page: "Training" },
  { label: "Hackathon", page: "Hackathons" },
  { label: "Resources", page: "Learn" },
  { label: "Collection", page: "Saved" },
];

const catalog: Listing[] = [
  {
    id: "sample-manufacturing-1",
    kind: "Manufacturing",
    title: "Prototype-to-production electronics",
    organization: "Sample Circuit Works",
    city: "Chennai, Tamil Nadu",
    summary:
      "Illustrative manufacturer profile covering low-volume assembly, functional testing and custom electronics.",
    tags: ["PCB assembly", "Prototyping", "Custom electronics"],
  },
  {
    id: "sample-manufacturing-2",
    kind: "Manufacturing",
    title: "Small-batch hardware manufacturing",
    organization: "Sample Hardware Studio",
    city: "Bengaluru, Karnataka",
    summary:
      "Example directory entry for teams exploring enclosure integration and small-run hardware builds.",
    tags: ["Box build", "Prototyping", "Testing"],
  },
  {
    id: "sample-pcb-1",
    kind: "PCB Design",
    title: "Multilayer PCB design & review",
    organization: "Sample Board Lab",
    city: "Chennai, Tamil Nadu",
    summary:
      "Illustrative PCB service profile with schematic capture, layout review and fabrication-ready outputs.",
    tags: ["PCB design", "Multilayer", "Design review"],
  },
  {
    id: "sample-pcb-2",
    kind: "PCB Design",
    title: "Prototype fabrication & assembly",
    organization: "Sample Prototype Circuitry",
    city: "Hyderabad, Telangana",
    summary:
      "Example provider profile for prototype boards and assembly workflows. Contact details are not published.",
    tags: ["Fabrication", "PCB assembly", "Prototype"],
  },
  {
    id: "sample-training-1",
    kind: "Training",
    title: "Embedded systems foundations",
    organization: "Sample Learning Lab",
    city: "Online",
    summary:
      "Sample course outline: microcontroller fundamentals, peripheral interfaces and a guided lab project.",
    tags: ["Embedded Systems", "Microcontrollers", "C"],
    mode: "Online",
    duration: "6 weeks",
    eligibility: "Beginners",
  },
  {
    id: "sample-training-2",
    kind: "Training",
    title: "IoT prototyping with connected devices",
    organization: "Sample Learning Lab",
    city: "Pune, Maharashtra",
    summary:
      "Illustrative learning path covering device connectivity, sensor data and basic cloud integration.",
    tags: ["IoT", "Sensors", "Prototyping"],
    mode: "Hybrid",
    duration: "4 weeks",
    eligibility: "Basic electronics",
  },
  ...projectListings,
];

const resources = [
  {
    title: "ESP-IDF Programming Guide",
    publisher: "Espressif Systems",
    category: "Official documentation",
    href: "https://docs.espressif.com/projects/esp-idf/en/stable/esp32/",
  },
  {
    title: "Arduino Language Reference",
    publisher: "Arduino",
    category: "Official documentation",
    href: "https://docs.arduino.cc/language-reference/",
  },
  {
    title: "KiCad Documentation",
    publisher: "KiCad",
    category: "PCB design guide",
    href: "https://docs.kicad.org/",
  },
  {
    title: "STM32 Documentation",
    publisher: "STMicroelectronics",
    category: "Component information",
    href: "https://www.st.com/en/microcontrollers-microprocessors/stm32-32-bit-arm-cortex-mcus.html",
  },
];

const categories = [
  { name: "Manufacturing" as Page, caption: "Find your build partner", icon: CircuitBoard, color: "mint" },
  { name: "PCB Design" as Page, caption: "From schematic to board", icon: Layers3, color: "peach" },
  { name: "Internships" as Page, caption: "Explore sourced openings", icon: GraduationCap, color: "blue" },
  { name: "Training" as Page, caption: "Build practical skills", icon: Sparkles, color: "lavender" },
  { name: "Products" as Page, caption: "Discover components", icon: Cpu, color: "yellow" },
  { name: "Projects" as Page, caption: "Browse project ideas", icon: Compass, color: "rose" },
];

const intro: Record<Listing["kind"], { eyebrow: string; title: string; description: string }> = {
  Manufacturing: {
    eyebrow: "MANUFACTURING DIRECTORY",
    title: "Find a partner to make it real.",
    description: "Explore electronics manufacturing, prototyping and assembly capabilities in one place.",
  },
  "PCB Design": {
    eyebrow: "PCB SERVICE DIRECTORY",
    title: "Move from circuit to board.",
    description: "Explore PCB design, fabrication, assembly and prototype support.",
  },
  Internships: {
    eyebrow: "STUDENT OPPORTUNITIES",
    title: "Find your next learning opportunity.",
    description: "Browse internships only when a provider or trusted source has submitted a verifiable link.",
  },
  Training: {
    eyebrow: "TRAINING & COURSES",
    title: "Learn by building, not just watching.",
    description: "Review course topics, delivery modes and prerequisites before you reach out.",
  },
  Products: {
    eyebrow: "PRODUCT DISCOVERY",
    title: "Find the right part for your next build.",
    description: "Explore component categories and seller links. Prices and stock appear only when confirmed.",
  },
  Projects: {
    eyebrow: "PROJECT DISCOVERY",
    title: "Find the right project to build.",
    description: "Browse ready-made project kits or request a specification tailored to your needs.",
  },
  Hackathons: {
    eyebrow: "HACKATHON DISCOVERY",
    title: "Find a challenge worth building for.",
    description: "Explore source-linked electronics, embedded systems and IoT hackathons when organizers publish verified details.",
  },
  Learn: {
    eyebrow: "RESEARCH & LEARNING HUB",
    title: "A better place to start learning.",
    description: "Explore source-linked documentation and guides from established technology publishers.",
  },
};

const emptyMessages: Partial<Record<Page, { title: string; text: string }>> = {
  Internships: {
    title: "No verified opportunities just yet",
    text: "We only publish internships submitted by an authorized admin with a working source or official application link.",
  },
  Products: {
    title: "No seller listings published yet",
    text: "Product listings will appear here after an authorized admin verifies the seller source. No placeholder prices or stock are shown.",
  },
  Hackathons: {
    title: "No verified hackathons published yet",
    text: "We only list events with an organizer source or official registration link. Check back when verified event details are available.",
  },
};

let supabaseClient: SupabaseClient | null | undefined;

function getSupabase(): SupabaseClient | null {
  if (supabaseClient !== undefined) return supabaseClient;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  supabaseClient = url && key ? createClient(url, key) : null;
  return supabaseClient;
}

function App() {
  const [paymentOrderId] = useState(() => new URLSearchParams(window.location.search).get("payment_order_id") ?? "");
  const [page, setPage] = useState<Page>(() => paymentOrderId ? "PaymentResult" : "Home");
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("All locations");
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("techcircuit-saved") ?? "[]") as string[];
    } catch {
      return [];
    }
  });
  const [cartIds, setCartIds] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("techcircuit-cart") ?? "[]") as unknown;
      return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string" && /^sample-project-\d+$/.test(id)) : [];
    } catch {
      return [];
    }
  });
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [enquiry, setEnquiry] = useState<Listing | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [remoteListings, setRemoteListings] = useState<Listing[]>([]);
  const [dataError, setDataError] = useState("");
  const [student, setStudent] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("techcircuit-saved", JSON.stringify(savedIds));
  }, [savedIds]);

  useEffect(() => {
    localStorage.setItem("techcircuit-cart", JSON.stringify(cartIds));
  }, [cartIds]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    const client = supabase;
    void client.auth.getSession().then(({ data, error }) => {
      if (error) {
        setDataError("Could not restore your student session.");
        return;
      }
      setStudent(data.session?.user ?? null);
    }).catch(() => setDataError("Could not restore your student session."));
    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      setStudent(session?.user ?? null);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    const client = supabase;
    async function loadListings() {
      try {
        const { data, error } = await client
          .from("listings")
          .select("id, kind, title, organization, city, summary, tags, source_url, verified, featured, mode, duration, eligibility, components, updated_at")
          .eq("is_published", true);
        if (error) {
          setDataError(`Live listings could not be loaded: ${error.message}`);
          return;
        }
        setRemoteListings(
          (data ?? []).map((row) => ({
            id: row.id,
            kind: row.kind as Listing["kind"],
            title: row.title,
            organization: row.organization,
            city: row.city,
            summary: row.summary,
            tags: row.tags ?? [],
            sourceUrl: row.source_url ?? undefined,
            verified: row.verified,
            featured: row.featured,
            mode: row.mode ?? undefined,
            duration: row.duration ?? undefined,
            eligibility: row.eligibility ?? undefined,
            components: row.components ?? [],
            updated: row.updated_at,
          })),
        );
      } catch {
        setDataError("Live listings could not be loaded. Please try again later.");
      }
    }
    void loadListings();
  }, []);

  const listings = useMemo(() => [...remoteListings, ...catalog], [remoteListings]);
  const selectedListings = listings.filter((item) => item.kind === "Products" && compareIds.includes(item.id));

  useEffect(() => {
    document.title = `${PLATFORM_NAME} — ${PLATFORM_TAGLINE}`;
  }, []);

  function navigate(next: Page) {
    setPage(next);
    setMenuOpen(false);
    setQuery("");
    setSearchText("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addProjectToCart(id: string) {
    setCartIds((current) => current.includes(id) ? current : [...current, id]);
    navigate("Cart");
  }

  function removeProjectFromCart(id: string) {
    setCartIds((current) => current.filter((cartId) => cartId !== id));
  }

  async function beginCheckout(customer: CheckoutCustomer) {
    if (cartIds.length === 0) throw new Error("Your cart is empty.");
    const response = await fetch(`${API_BASE_URL}/api/checkout/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectIds: cartIds, customer }),
    });
    const payload = await response.json() as CheckoutOrderResponse | { error?: string };
    if (!response.ok) {
      throw new Error("error" in payload && payload.error ? payload.error : "Could not create your payment order.");
    }
    if (!("payment_session_id" in payload) || !payload.payment_session_id || !payload.order_id) {
      throw new Error("The payment server returned an invalid order response.");
    }
    if (!window.Cashfree) {
      throw new Error("Secure checkout could not load. Refresh the page and try again.");
    }
    localStorage.setItem(`${PENDING_ORDER_KEY}${payload.order_id}`, JSON.stringify(cartIds));
    const checkout = window.Cashfree({ mode: payload.gateway_mode });
    const result = await checkout.checkout({
      paymentSessionId: payload.payment_session_id,
      redirectTarget: "_self",
    });
    if (result?.error) throw new Error(result.error.message ?? "Payment checkout could not be opened.");
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(searchText.trim());
    if (page === "Home") {
      const text = searchText.toLowerCase();
      if (text.includes("intern")) navigate("Internships");
      else if (text.includes("pcb")) navigate("PCB Design");
      else if (text.includes("training") || text.includes("course")) navigate("Training");
      else if (text.includes("hackathon")) navigate("Hackathons");
      else if (text.includes("resource") || text.includes("learn")) navigate("Learn");
      else if (text.includes("component") || text.includes("esp32") || text.includes("product")) navigate("Products");
      else if (text.includes("project")) navigate("Projects");
      else if (text.includes("manufactur") || text.includes("company")) navigate("Manufacturing");
      else navigate("Projects");
      setQuery(searchText.trim());
    }
  }

  function toggleSaved(id: string) {
    setSavedIds((current) => current.includes(id) ? current.filter((saved) => saved !== id) : [...current, id]);
  }

  function toggleCompare(id: string) {
    setCompareIds((current) => current.includes(id) ? current.filter((selected) => selected !== id) : current.length < 3 ? [...current, id] : current);
  }

  function startExplore() {
    document.getElementById("explore")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="app-shell">
      <div className="announcement">
        <span className="announcement-dot" />
        A research-first directory for the electronics ecosystem
        <ArrowRight size={14} />
      </div>
      <header className="site-header">
        <button className="brand" onClick={() => navigate("Home")} aria-label={`${PLATFORM_NAME} home`}>
          <img className="brand-logo" src={brandLogo} alt={PLATFORM_NAME} />
        </button>
        <nav className={`main-nav ${menuOpen ? "nav-open" : ""}`} aria-label="Main navigation">
          {navigationItems.map((item) => (
            <button className={page === item.page ? "nav-link active" : "nav-link"} key={item.label} onClick={() => navigate(item.page)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className={page === "Cart" ? "header-cart-button active" : "header-cart-button"}
            type="button"
            onClick={() => navigate("Cart")}
            aria-label={`Open cart${cartIds.length ? `, ${cartIds.length} ${cartIds.length === 1 ? "project" : "projects"}` : ", empty"}`}
            title="Cart"
          >
            <ShoppingCart size={18} />
            {cartIds.length > 0 && <span className="header-cart-count">{cartIds.length}</span>}
          </button>
          {student ? (
            <button className="student-profile-button" onClick={() => navigate("Dashboard")} aria-label="Open student dashboard">
              <span className="student-avatar"><UserRound size={17} /></span><span className="student-profile-label">My dashboard</span>
            </button>
          ) : (
            <button className="sign-button" onClick={() => setAuthOpen(true)}>Sign in <ArrowRight size={14} /></button>
          )}
          <button className="menu-toggle" aria-label="Toggle navigation" onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>

      {page === "Home" ? (
        <HomePage
          searchText={searchText}
          setSearchText={setSearchText}
          submitSearch={submitSearch}
          navigate={navigate}
          startExplore={startExplore}
          listings={listings}
        />
      ) : page === "Admin" ? (
        <AdminPage />
      ) : page === "Dashboard" ? (
        <StudentDashboard student={student} navigate={navigate} listings={listings} savedIds={savedIds} toggleSaved={toggleSaved} />
      ) : page === "Cart" ? (
        <ProjectCartPage listings={listings} cartIds={cartIds} removeProject={removeProjectFromCart} onCheckout={() => navigate("Checkout")} onContinueShopping={() => navigate("Projects")} />
      ) : page === "Checkout" ? (
        <ProjectCheckoutPage listings={listings} cartIds={cartIds} onSubmitCheckout={beginCheckout} onBackToCart={() => navigate("Cart")} />
      ) : page === "PaymentResult" ? (
        <PaymentResultPage orderId={paymentOrderId} apiBaseUrl={API_BASE_URL} cartIds={cartIds} setCartIds={setCartIds} onContinue={() => navigate("Projects")} />
      ) : page === "Saved" ? (
        <SavedPage listings={listings} savedIds={savedIds} toggleSaved={toggleSaved} setEnquiry={setEnquiry} />
      ) : (
        <DirectoryPage
          page={page}
          listings={listings}
          query={query}
          searchText={searchText}
          setSearchText={setSearchText}
          submitSearch={submitSearch}
          city={city}
          setCity={setCity}
          savedIds={savedIds}
          toggleSaved={toggleSaved}
          compareIds={compareIds}
          toggleCompare={toggleCompare}
          setEnquiry={setEnquiry}
          addProjectToCart={addProjectToCart}
        />
      )}

      {dataError && <div className="toast-error" role="status"><CircleHelp size={16} /> {dataError}</div>}
      {page === "Home" && <HowItWorks />}
      <Footer navigate={navigate} />
      {page === "Products" && selectedListings.length > 0 && (
        <div className="compare-dock">
          <div className="compare-label"><Layers3 size={17} /> <b>{selectedListings.length} selected</b> <span>Compare components</span></div>
          <div className="compare-names">{selectedListings.map((item) => <span key={item.id}>{item.title}</span>)}</div>
          <button className="button button-dark button-small" disabled={selectedListings.length < 2} onClick={() => document.getElementById("comparison")?.scrollIntoView({ behavior: "smooth" })}>{selectedListings.length < 2 ? "Select one more" : "Compare"} <ArrowRight size={14} /></button>
          <button className="icon-button" aria-label="Clear comparison" onClick={() => setCompareIds([])}><X size={17} /></button>
        </div>
      )}
      {enquiry && <EnquiryModal listing={enquiry} onClose={() => setEnquiry(null)} />}
      {authOpen && <StudentAuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}

function HomePage({
  searchText,
  setSearchText,
  submitSearch,
  navigate,
  startExplore,
  listings,
}: {
  searchText: string;
  setSearchText: (value: string) => void;
  submitSearch: (event: React.FormEvent<HTMLFormElement>) => void;
  navigate: (page: Page) => void;
  startExplore: () => void;
  listings: Listing[];
}) {
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const [showcasePaused, setShowcasePaused] = useState(false);
  const featuredProjects = listings.filter((item) => item.kind === "Projects" && item.imageUrl).slice(0, 2);

  useEffect(() => {
    if (showcasePaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches || homeShowcaseImages.length < 2) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setShowcaseIndex((index) => (index + 1) % homeShowcaseImages.length);
    }, 5500);
    return () => window.clearInterval(intervalId);
  }, [showcasePaused]);

  const changeShowcaseSlide = (direction: -1 | 1) => {
    setShowcaseIndex((index) => (index + direction + homeShowcaseImages.length) % homeShowcaseImages.length);
  };

  return (
    <main>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> THE CIRCUIT STARTS HERE</div>
            <h1>Discover the world of <em>embedded systems,</em> IoT & electronics.</h1>
            <p className="hero-description">Find manufacturing companies, PCB services, internships, training programs, products, and projects — all in one platform.</p>
            <form className="hero-search" onSubmit={submitSearch}>
              <Search size={20} />
              <input aria-label="What are you looking for?" placeholder="What are you looking for?" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
              <button className="button button-dark" type="submit">Search <ArrowRight size={16} /></button>
            </form>
            <button className="button button-primary hero-cta" onClick={startExplore}>Start exploring <ArrowDownRight size={16} /></button>
          </div>
          <div
            className="hero-showcase"
            role="region"
            aria-label="Homepage showcase"
            aria-roledescription="carousel"
            onMouseEnter={() => setShowcasePaused(true)}
            onMouseLeave={() => setShowcasePaused(false)}
            onFocus={() => setShowcasePaused(true)}
            onBlur={() => setShowcasePaused(false)}
          >
            <div className="showcase-frame" aria-live="off">
              <img
                key={showcaseIndex}
                className="showcase-slide"
                src={homeShowcaseImages[showcaseIndex]}
                alt={`TechCircuit Hub showcase ${showcaseIndex + 1} of ${homeShowcaseImages.length}`}
              />
            </div>
            <div className="showcase-controls">
              <button className="showcase-arrow" type="button" aria-label="Previous showcase card" onClick={() => changeShowcaseSlide(-1)}>
                <ChevronLeft size={17} />
              </button>
              <div className="showcase-dots" aria-label="Choose showcase card">
                {homeShowcaseImages.map((_, index) => (
                  <button
                    key={index}
                    className={`showcase-dot${index === showcaseIndex ? " active" : ""}`}
                    type="button"
                    aria-label={`Showcase card ${index + 1}`}
                    aria-current={index === showcaseIndex ? "true" : undefined}
                    onClick={() => setShowcaseIndex(index)}
                  />
                ))}
              </div>
              <button className="showcase-arrow" type="button" aria-label="Next showcase card" onClick={() => changeShowcaseSlide(1)}>
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
          <div className="hero-stats">
            <div><strong>01</strong><span>Discover<br />the ecosystem</span></div>
            <i />
            <div><strong>02</strong><span>Review<br />your options</span></div>
            <i />
            <div><strong>03</strong><span>Build what<br />comes next</span></div>
          </div>
        </div>
        <div className="hero-grid" />
      </section>

      <section className="section categories-section" id="explore">
        <div className="section-heading">
          <div><div className="eyebrow"><span className="eyebrow-line" /> EXPLORE THE ECOSYSTEM</div><h2>Where do you want to <em>plug in?</em></h2></div>
          <p>One destination to find the people, skills and building blocks behind your next idea.</p>
        </div>
        <div className="category-grid">
          {categories.map(({ name, caption, icon: Icon, color }, index) => (
            <button className="category-card" key={name} onClick={() => navigate(name)}>
              <div className={`category-icon ${color}`}><Icon size={22} /></div>
              <span className="category-number">0{index + 1}</span>
              <strong>{name}</strong>
              <span className="category-caption">{caption}</span>
              <span className="category-arrow"><ArrowUpRight size={17} /></span>
            </button>
          ))}
        </div>
      </section>

      <section className="feature-band">
        <div className="feature-copy">
          <div className="eyebrow eyebrow-light"><span className="eyebrow-line" /> BUILT FOR CURIOUS MINDS</div>
          <h2>Go beyond the search.<br /><em>Make informed moves.</em></h2>
          <p>Research the details, understand what matters, and make your next step with confidence. No noise. Just a clearer way into electronics.</p>
          <button className="button button-primary" onClick={() => navigate("Projects")}>Explore project ideas <ArrowRight size={16} /></button>
        </div>
        <div className="feature-steps">
          {[
            ["01", "Discover", "Find services, courses & project ideas."],
            ["02", "Research", "See capabilities, sources & details."],
            ["03", "Plan", "Shortlist possibilities side by side."],
            ["04", "Enquire", "Connect directly when you're ready."],
          ].map(([number, label, text]) => (
            <div className="feature-step" key={number}><span>{number}</span><div><strong>{label}</strong><p>{text}</p></div><ArrowUpRight size={16} /></div>
          ))}
        </div>
        <div className="feature-circuit">TC<span>H</span></div>
      </section>

      <section className="section spotlight-section">
        <div className="section-heading">
          <div><div className="eyebrow"><span className="eyebrow-line" /> A GOOD PLACE TO BEGIN</div><h2>Ideas for your <em>next build.</em></h2></div>
          <button className="text-link" onClick={() => navigate("Projects")}>Browse all projects <ArrowRight size={16} /></button>
        </div>
        <div className="featured-project-list">
          {featuredProjects.map((item, index) => (
            <article className="featured-project-card" key={item.id}>
              <div className="featured-project-image">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={`${item.title} project`} loading="lazy" />
                ) : (
                  <div className="featured-project-placeholder"><CircuitBoard size={42} /></div>
                )}
                <span>PROJECT CONCEPT</span>
              </div>
              <div className="featured-project-content">
                <div className="featured-project-kicker">CONCEPT {String(index + 1).padStart(2, "0")} <span>STUDENT BUILD IDEA</span></div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <div className="tag-row">{item.tags.slice(0, 3).map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
                <button className="featured-project-link" onClick={() => navigate("Projects")}>
                  Explore project <ArrowRight size={15} />
                </button>
                <span className="featured-project-note">IDEA TO INSPIRE YOUR NEXT BUILD</span>
              </div>
            </article>
          ))}
          {featuredProjects.length === 0 && (
            <p className="featured-project-empty">Projects will appear here when they are available.</p>
          )}
        </div>
      </section>

      <section className="trust-strip">
        <div className="trust-icon"><ShieldCheck size={22} /></div>
        <div><strong>Clear about what’s real.</strong><p>Sample content is labeled. Opportunities and seller listings require source links before publishing.</p></div>
        <div className="trust-pills"><span><Check size={13} /> Source-aware</span><span><Check size={13} /> Student-first</span><span><Check size={13} /> No invented prices</span></div>
      </section>
    </main>
  );
}

function DirectoryPage({
  page,
  listings,
  query,
  searchText,
  setSearchText,
  submitSearch,
  city,
  setCity,
  savedIds,
  toggleSaved,
  compareIds,
  toggleCompare,
  setEnquiry,
  addProjectToCart,
}: {
  page: Listing["kind"];
  listings: Listing[];
  query: string;
  searchText: string;
  setSearchText: (value: string) => void;
  submitSearch: (event: React.FormEvent<HTMLFormElement>) => void;
  city: string;
  setCity: (value: string) => void;
  compareIds: string[];
  toggleCompare: (id: string) => void;
  setEnquiry: (listing: Listing) => void;
  addProjectToCart: (id: string) => void;
  savedIds: string[];
  toggleSaved: (id: string) => void;
}) {
  const info = intro[page];
  const isLearn = page === "Learn";
  const isProjects = page === "Projects";
  const [projectView, setProjectView] = useState<"ready-made" | "customize">("ready-made");
  const [customizationProjectId, setCustomizationProjectId] = useState<string | null>(null);
  const [specificationProject, setSpecificationProject] = useState<Listing | null>(null);
  const [projectCategory, setProjectCategory] = useState("All categories");
  const projectCategoryOptions = Array.from(new Set(listings.filter((item) => item.kind === "Projects").map((item) => item.projectCategory).filter((category): category is string => Boolean(category))));
  const filtered = listings.filter((item) => item.kind === page && (!isProjects || projectCategory === "All categories" || item.projectCategory === projectCategory) && (city === "All locations" || item.city.toLowerCase().includes(city.toLowerCase())) && (!query || `${item.title} ${item.organization} ${item.city} ${item.tags.join(" ")} ${item.summary} ${item.projectCategory ?? ""}`.toLowerCase().includes(query.toLowerCase())));
  const customizationProject = listings.find((item) => item.id === customizationProjectId);
  const cityOptions = Array.from(new Set(listings.filter((item) => item.kind === page && item.city !== "Online" && item.city !== "Research concept").map((item) => item.city.split(",")[0]))).sort();
  const opportunityFields: Record<string, string> = {
    Manufacturing: "Services, assembly, prototyping & custom work",
    "PCB Design": "Design, fabrication, assembly & consultation",
    Training: "Course mode, duration & eligibility",
  };
  return (
    <main className="directory-page">
      <section className="directory-hero">
        <div className="directory-hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> {info.eyebrow}</div>
          <h1>{info.title}</h1><p>{info.description}</p>
          <form className="directory-search" onSubmit={submitSearch}><Search size={18} /><input placeholder={`Search ${page.toLowerCase()}…`} value={searchText} onChange={(event) => setSearchText(event.target.value)} /><button type="submit" className="button button-dark">Search</button></form>
          {page === "Internships" && <div className="sourcing-note"><ShieldCheck size={17} /><span>Every opportunity needs an official or source-linked listing. No invented openings.</span></div>}
          {page === "Products" && <div className="sourcing-note"><ShieldCheck size={17} /><span>Prices and availability are shown only when confirmed by the seller.</span></div>}
        </div>
        <div className="directory-hero-art"><div className="hero-art-label">{page === "Projects" ? "RESEARCH / BUILD / REPEAT" : "DISCOVER / COMPARE / CONNECT"}</div><div className="directory-art-chip">{isProjects ? <Cpu size={55} /> : page === "Internships" || page === "Training" ? <GraduationCap size={55} /> : page === "Products" ? <CircuitBoard size={55} /> : <Layers3 size={55} />}</div><div className="art-small-label">{PLATFORM_NAME.toUpperCase()} <span>•</span> FIELD NOTES {new Date().getFullYear()}</div></div>
      </section>

      {isLearn ? (
        <section className="directory-content">
          <div className="results-heading"><div><span className="eyebrow"><span className="eyebrow-line" /> TRUSTED STARTING POINTS</span><h2>Learn from the <em>source.</em></h2></div><span className="count-label">{resources.length} RESOURCES</span></div>
          <div className="resource-grid">
            {resources.map((item) => <ResourceCard item={item} key={item.title} isSaved={savedIds.includes(resourceId(item.title))} onSave={() => toggleSaved(resourceId(item.title))} />)}
          </div>
          <div className="resource-disclaimer"><ShieldCheck size={18} /><div><strong>Source-first learning</strong><p>These links point to official publisher documentation. Links are provided for discovery; publication dates are not displayed when they are not reliably available.</p></div></div>
        </section>
      ) : (
        <section className="directory-content">
          {isProjects && (
            <div className="project-mode-tabs" aria-label="Project options">
              <button className={projectView === "ready-made" ? "project-mode-tab active" : "project-mode-tab"} onClick={() => setProjectView("ready-made")}>Ready-made projects</button>
              <button className={projectView === "customize" ? "project-mode-tab active" : "project-mode-tab"} onClick={() => setProjectView("customize")}>Project customization</button>
            </div>
          )}
          {isProjects && projectView === "customize" ? (
            <section className="project-customize-panel">
              <div className="eyebrow"><span className="eyebrow-line" /> CUSTOM PROJECT REQUEST</div>
              <h2>{customizationProject ? `Customize ${customizationProject.title}` : "Make a project your own."}</h2>
              <p>Tell us which project you want customized. The Google Form link will be added here when it’s ready.</p>
              <button className="button button-outline" type="button" disabled>Google Form coming soon <ArrowUpRight size={15} /></button>
              {customizationProject && <button className="project-back-link" type="button" onClick={() => setProjectView("ready-made")}>Back to ready-made projects</button>}
            </section>
          ) : (
          <>
          <div className="directory-toolbar">
            <div className="results-heading"><div><span className="eyebrow"><span className="eyebrow-line" /> {isProjects ? "STUDENT RESEARCH" : "DIRECTORY RESULTS"}</span><h2>{isProjects ? "Project ideas." : "Explore your options."}</h2></div><span className="count-label">{filtered.length} {isProjects ? "PROJECTS" : filtered.length === 1 ? "RESULT" : "RESULTS"}</span></div>
            <div className="filter-controls"><label className="filter-label"><SlidersHorizontal size={15} /> FILTER</label>{isProjects ? <label className="select-wrap"><select aria-label="Filter projects by category" value={projectCategory} onChange={(event) => setProjectCategory(event.target.value)}><option>All categories</option>{projectCategoryOptions.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={14} /></label> : <label className="select-wrap"><MapPin size={15} /><select aria-label="Filter by city" value={city} onChange={(event) => setCity(event.target.value)}><option>All locations</option>{cityOptions.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={14} /></label>}<button className="filter-chip" onClick={() => { setCity("All locations"); setProjectCategory("All categories"); setSearchText(""); }}>Clear filters <X size={13} /></button></div>
          </div>
          {(page === "Internships" || page === "Products") && filtered.length === 0 ? <EmptyState page={page} /> : filtered.length > 0 ? (
            <>
              <div className="listing-grid">
                {filtered.map((item, index) => <ListingCard key={item.id} listing={item} index={index} isSaved={savedIds.includes(item.id)} onSave={() => toggleSaved(item.id)} compareIds={compareIds} onCompare={() => toggleCompare(item.id)} onEnquire={() => setEnquiry(item)} isProjects={isProjects} canCompare={page === "Products"} onOrderNow={() => addProjectToCart(item.id)} onOpenSpecification={() => setSpecificationProject(item)} />)}
              </div>
              {page === "Products" && selectedComparison(filtered, compareIds).length > 1 && (
                <section className="comparison-section" id="comparison"><div className="eyebrow"><span className="eyebrow-line" /> COMPONENT COMPARISON</div><h2>Compare your component shortlist.</h2><div className="comparison-table"><div className="comparison-row comparison-head"><strong>Component</strong>{selectedComparison(filtered, compareIds).map((item) => <strong key={item.id}>{item.title}</strong>)}</div><div className="comparison-row"><span>Category</span>{selectedComparison(filtered, compareIds).map((item) => <span key={item.id}>{item.tags.join(", ")}</span>)}</div><div className="comparison-row"><span>Organization</span>{selectedComparison(filtered, compareIds).map((item) => <span key={item.id}>{item.organization}</span>)}</div><div className="comparison-row"><span>Location</span>{selectedComparison(filtered, compareIds).map((item) => <span key={item.id}>{item.city}</span>)}</div></div></section>
              )}
            </>
          ) : <EmptyState page={page} />}
          {opportunityFields[page] && filtered.length > 0 && <p className="listing-footnote"><Filter size={13} /> Review {opportunityFields[page].toLowerCase()} before you enquire.</p>}
          </>
          )}
        </section>
      )}
      {specificationProject && (
        <div className="modal-overlay" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setSpecificationProject(null); }}>
          <section className="project-spec-modal" role="dialog" aria-modal="true" aria-labelledby="project-spec-title">
            <button className="modal-close" onClick={() => setSpecificationProject(null)} aria-label="Close specification"><X size={19} /></button>
            {specificationProject.imageUrl && <img className="project-spec-image" src={specificationProject.imageUrl} alt={`${specificationProject.title} project`} />}
            <div className="project-spec-content">
              <div className="project-category">{specificationProject.projectCategory}</div>
              <h2 id="project-spec-title">{specificationProject.title}</h2>
              {specificationProject.projectPrice !== undefined && <div className="project-price">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(specificationProject.projectPrice)}</div>}
              <p>{specificationProject.summary}</p>
              <h3>Specification overview</h3>
              <div className="tag-row">{specificationProject.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
              <ul>{specificationProject.components?.map((component) => <li key={component}>{component}</li>)}</ul>
              <p className="project-spec-note">Project concept for educational prototyping. Final components and scope can be customized.</p>
              <div className="project-spec-actions">
                <button className="button button-dark" onClick={() => { addProjectToCart(specificationProject.id); setSpecificationProject(null); }}>Order now</button>
                <button className="button button-outline" onClick={() => { setCustomizationProjectId(specificationProject.id); setProjectView("customize"); setSpecificationProject(null); }}>Customization</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function selectedComparison(listings: Listing[], ids: string[]) {
  return listings.filter((item) => ids.includes(item.id));
}

function resourceId(title: string) {
  return `resource:${title}`;
}

function ResourceCard({
  item,
  isSaved,
  onSave,
}: {
  item: (typeof resources)[number];
  isSaved: boolean;
  onSave: () => void;
}) {
  return (
    <article className="resource-card">
      <button className="resource-save" aria-label={isSaved ? "Remove saved resource" : "Save resource"} onClick={onSave}>
        {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
      </button>
      <div className="resource-icon"><ExternalLink size={20} /></div>
      <span className="resource-category">{item.category}</span>
      <h3>{item.title}</h3>
      <p>Published by {item.publisher}. Link opens the publisher’s documentation.</p>
      <a href={item.href} target="_blank" rel="noreferrer" className="text-link">Open source <ArrowUpRight size={15} /></a>
    </article>
  );
}

function projectPrice(item: Listing) {
  return item.projectPrice ?? 0;
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function ProjectCartPage({
  listings,
  cartIds,
  removeProject,
  onCheckout,
  onContinueShopping,
}: {
  listings: Listing[];
  cartIds: string[];
  removeProject: (id: string) => void;
  onCheckout: () => void;
  onContinueShopping: () => void;
}) {
  const projects = cartIds.map((id) => listings.find((item) => item.id === id && item.kind === "Projects")).filter((item): item is Listing => Boolean(item));
  const total = projects.reduce((sum, item) => sum + projectPrice(item), 0);

  return (
    <main className="directory-page checkout-page">
      <section className="directory-hero checkout-hero">
        <div className="directory-hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> YOUR PROJECT ORDER</div>
          <h1>Review your <em>cart.</em></h1>
          <p>Check the project details and total before continuing to secure payment.</p>
        </div>
        <div className="directory-hero-art"><div className="hero-art-label">REVIEW / CONFIRM / BUILD</div><div className="directory-art-chip"><ShoppingCart size={48} /></div><div className="art-small-label">{projects.length} PROJECT{projects.length === 1 ? "" : "S"} IN CART</div></div>
      </section>
      <section className="directory-content checkout-content">
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><ShoppingCart size={23} /></div>
            <span className="eyebrow"><span className="eyebrow-line" /> YOUR CART IS EMPTY</span>
            <h3>Choose a project to get started.</h3>
            <p>Ready-made project orders will stay in your cart while you browse.</p>
            <button className="button button-primary" type="button" onClick={onContinueShopping}>Browse projects <ArrowRight size={15} /></button>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-items">
              {projects.map((item) => (
                <article className="cart-item" key={item.id}>
                  {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <div className="cart-item-placeholder"><CircuitBoard size={25} /></div>}
                  <div className="cart-item-info">
                    <span className="project-card-category">{item.projectCategory}</span>
                    <h2>{item.title}</h2>
                    <p>{item.summary}</p>
                    {item.components?.length ? <p className="cart-item-spec"><strong>Components:</strong> {item.components.join(", ")}</p> : null}
                    <button className="text-link cart-remove" type="button" onClick={() => removeProject(item.id)}>Remove</button>
                  </div>
                  <strong className="cart-item-price">{formatPrice(projectPrice(item))}</strong>
                </article>
              ))}
              <button className="button button-outline" type="button" onClick={onContinueShopping}>Continue shopping</button>
            </div>
            <aside className="cart-summary">
              <span className="eyebrow"><span className="eyebrow-line" /> ORDER SUMMARY</span>
              <h2>Your total.</h2>
              <div className="cart-summary-row"><span>Projects ({projects.length})</span><strong>{formatPrice(total)}</strong></div>
              <div className="cart-summary-row"><span>Delivery & taxes</span><span>Calculated after checkout</span></div>
              <div className="cart-summary-total"><span>Subtotal</span><strong>{formatPrice(total)}</strong></div>
              <p>Final payable amount and delivery details will be confirmed before payment.</p>
              <button className="button button-dark cart-checkout-button" type="button" onClick={onCheckout}>Continue to checkout <ArrowRight size={16} /></button>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

function ProjectCheckoutPage({
  listings,
  cartIds,
  onSubmitCheckout,
  onBackToCart,
}: {
  listings: Listing[];
  cartIds: string[];
  onSubmitCheckout: (customer: CheckoutCustomer) => Promise<void>;
  onBackToCart: () => void;
}) {
  const projects = cartIds.map((id) => listings.find((item) => item.id === id && item.kind === "Projects")).filter((item): item is Listing => Boolean(item));
  const total = projects.reduce((sum, item) => sum + projectPrice(item), 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await onSubmitCheckout({
        name: String(form.get("name") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim(),
      });
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Could not start checkout. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="directory-page checkout-page">
      <section className="directory-hero checkout-hero">
        <div className="directory-hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> SECURE PROJECT CHECKOUT</div>
          <h1>Almost ready to <em>build.</em></h1>
          <p>Enter your contact details to continue to payment and receive your order updates.</p>
        </div>
        <div className="directory-hero-art"><div className="hero-art-label">YOUR ORDER / YOUR DETAILS</div><div className="directory-art-chip"><ShieldCheck size={48} /></div><div className="art-small-label">SECURE PAYMENT SESSION</div></div>
      </section>
      <section className="directory-content checkout-content">
        {projects.length === 0 ? (
          <div className="empty-state"><div className="empty-icon"><ShoppingCart size={23} /></div><span className="eyebrow"><span className="eyebrow-line" /> NO ITEMS TO CHECK OUT</span><h3>Your cart is empty.</h3><p>Add a ready-made project before continuing to checkout.</p><button className="button button-primary" type="button" onClick={onBackToCart}>Return to cart <ArrowRight size={15} /></button></div>
        ) : (
          <div className="checkout-layout">
            <form className="checkout-form" onSubmit={handleSubmit}>
              <div><span className="eyebrow"><span className="eyebrow-line" /> CONTACT DETAILS</span><h2>Where should we reach you?</h2></div>
              <label htmlFor="checkout-name">Full name</label>
              <input id="checkout-name" name="name" autoComplete="name" required maxLength={100} />
              <label htmlFor="checkout-email">Email address</label>
              <input id="checkout-email" name="email" type="email" autoComplete="email" required maxLength={254} />
              <label htmlFor="checkout-phone">Mobile number</label>
              <input id="checkout-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" pattern="[0-9+() .-]{8,20}" required title="Enter a valid mobile number." />
              {error && <p className="checkout-error" role="alert">{error}</p>}
              <button className="button button-dark cart-checkout-button" type="submit" disabled={submitting}>
                {submitting ? "Preparing secure checkout…" : <>Continue to payment <ArrowRight size={16} /></>}
              </button>
              <button className="text-link checkout-back" type="button" onClick={onBackToCart}>Back to cart</button>
            </form>
            <aside className="cart-summary checkout-summary">
              <span className="eyebrow"><span className="eyebrow-line" /> ORDER SUMMARY</span>
              <h2>{projects.length} project{projects.length === 1 ? "" : "s"}</h2>
              {projects.map((item) => <div className="checkout-summary-item" key={item.id}><span>{item.title}</span><strong>{formatPrice(projectPrice(item))}</strong></div>)}
              <div className="cart-summary-total"><span>Subtotal</span><strong>{formatPrice(total)}</strong></div>
              <p>Any delivery costs will be shown before you confirm payment.</p>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

function PaymentResultPage({
  orderId,
  apiBaseUrl,
  cartIds,
  setCartIds,
  onContinue,
}: {
  orderId: string;
  apiBaseUrl: string;
  cartIds: string[];
  setCartIds: Dispatch<SetStateAction<string[]>>;
  onContinue: () => void;
}) {
  const [status, setStatus] = useState<"checking" | "PAID" | "PENDING" | "FAILED" | "error">(orderId ? "checking" : "error");
  const [message, setMessage] = useState(orderId ? "Confirming payment status…" : "No payment order was provided.");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    async function verifyPayment() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/checkout/orders/${encodeURIComponent(orderId)}`);
        const payload = await response.json() as { order_status?: string; error?: string };
        if (!response.ok) throw new Error(payload.error || "Could not confirm payment status.");
        const orderStatus = payload.order_status?.toUpperCase();
        if (cancelled) return;
        if (orderStatus === "PAID") {
          const storedIds = localStorage.getItem(`${PENDING_ORDER_KEY}${orderId}`);
          const purchasedIds = storedIds ? JSON.parse(storedIds) as unknown : [];
          const paidIds = Array.isArray(purchasedIds) ? purchasedIds.filter((id): id is string => typeof id === "string") : [];
          setCartIds((current) => current.filter((id) => !paidIds.includes(id)));
          localStorage.removeItem(`${PENDING_ORDER_KEY}${orderId}`);
          setStatus("PAID");
          setMessage("Payment confirmed. Your project order is complete.");
        } else if (orderStatus === "ACTIVE") {
          setStatus("PENDING");
          setMessage("Payment is not confirmed yet. Your cart is saved; you can try again or check back shortly.");
        } else {
          setStatus("FAILED");
          setMessage("Payment was not completed. Your cart is saved so you can try again.");
        }
      } catch (verificationError) {
        if (cancelled) return;
        setStatus("error");
        setMessage(verificationError instanceof Error ? verificationError.message : "Could not confirm payment status.");
      }
    }
    void verifyPayment();
    return () => { cancelled = true; };
  }, [apiBaseUrl, orderId, retry, setCartIds]);

  return (
    <main className="directory-page checkout-page">
      <section className={`payment-result ${status === "PAID" ? "payment-success" : ""}`}>
        <div className="empty-icon">{status === "PAID" ? <Check size={24} /> : status === "checking" ? <Clock3 size={24} /> : <CircleHelp size={24} />}</div>
        <span className="eyebrow"><span className="eyebrow-line" /> PAYMENT STATUS</span>
        <h1>{status === "PAID" ? "Order confirmed." : status === "checking" ? "Checking your payment…" : status === "PENDING" ? "Payment pending." : "Payment not confirmed."}</h1>
        <p role="status">{message}</p>
        {orderId && <span className="payment-order-id">Order reference: {orderId}</span>}
        <div className="payment-result-actions">
          {status !== "PAID" && status !== "checking" && <button className="button button-outline" type="button" onClick={() => { setStatus("checking"); setMessage("Confirming payment status…"); setRetry((current) => current + 1); }}>Check again</button>}
          <button className="button button-dark" type="button" onClick={onContinue}>{status === "PAID" ? "Continue browsing" : cartIds.length ? "Return to cart" : "Browse projects"} <ArrowRight size={15} /></button>
        </div>
      </section>
    </main>
  );
}

function SavedPage({
  listings,
  savedIds,
  toggleSaved,
  setEnquiry,
}: {
  listings: Listing[];
  savedIds: string[];
  toggleSaved: (id: string) => void;
  setEnquiry: (listing: Listing) => void;
}) {
  const savedListings = listings.filter((item) => savedIds.includes(item.id));
  const savedResources = resources.filter((item) => savedIds.includes(resourceId(item.title)));
  return (
    <main className="directory-page">
      <section className="directory-hero">
        <div className="directory-hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> YOUR RESEARCH SHORTLIST</div>
          <h1>Keep your discoveries <em>close.</em></h1>
          <p>Your saved projects, providers and learning resources stay in this browser.</p>
        </div>
        <div className="directory-hero-art"><div className="hero-art-label">SAVE / RETURN / BUILD</div><div className="directory-art-chip"><Bookmark size={48} /></div><div className="art-small-label">PRIVATE TO THIS BROWSER</div></div>
      </section>
      <section className="directory-content">
        <div className="results-heading"><div><span className="eyebrow"><span className="eyebrow-line" /> SAVED FOR LATER</span><h2>Your shortlist.</h2></div><span className="count-label">{savedListings.length + savedResources.length} SAVED</span></div>
        {savedListings.length === 0 && savedResources.length === 0 ? (
          <div className="empty-state"><div className="empty-icon"><Bookmark size={23} /></div><span className="eyebrow"><span className="eyebrow-line" /> BUILD YOUR SHORTLIST</span><h3>Nothing saved just yet.</h3><p>Use the bookmark icon on a directory listing or learning resource to keep it here for later.</p></div>
        ) : (
          <>
            {savedListings.length > 0 && <div className="listing-grid">{savedListings.map((item, index) => <ListingCard key={item.id} listing={item} index={index} isSaved onSave={() => toggleSaved(item.id)} compareIds={[]} onCompare={() => undefined} onEnquire={() => setEnquiry(item)} isProjects={item.kind === "Projects"} />)}</div>}
            {savedResources.length > 0 && <div className="resource-grid saved-resources">{savedResources.map((item) => <ResourceCard item={item} key={item.title} isSaved onSave={() => toggleSaved(resourceId(item.title))} />)}</div>}
          </>
        )}
      </section>
    </main>
  );
}

function ListingCard({
  listing,
  index,
  isSaved,
  onSave,
  compareIds,
  onCompare,
  onEnquire,
  isProjects,
  canCompare = false,
  onOrderNow,
  onOpenSpecification,
}: {
  listing: Listing;
  index: number;
  isSaved: boolean;
  onSave: () => void;
  compareIds: string[];
  onCompare: () => void;
  onEnquire: () => void;
  isProjects: boolean;
  canCompare?: boolean;
  onOrderNow?: () => void;
  onOpenSpecification?: () => void;
}) {
  const live = !listing.id.startsWith("sample-");
  const visual = ["tile-mint", "tile-peach", "tile-blue"][index % 3];
  return (
    <article className="listing-card">
      <div className={`listing-visual ${isProjects ? "project-visual" : visual}`}>
        {isProjects && listing.imageUrl ? onOpenSpecification ? <button className="project-image-trigger" type="button" onClick={onOpenSpecification} aria-label={`Open specification for ${listing.title}`}><img className="project-image" src={listing.imageUrl} alt="" loading="lazy" decoding="async" /></button> : <img className="project-image" src={listing.imageUrl} alt={`${listing.title} project`} loading="lazy" decoding="async" /> : isProjects ? onOpenSpecification ? <button className="project-image-trigger project-image-placeholder" type="button" onClick={onOpenSpecification}><CircuitBoard size={42} /><span>Project image not provided</span></button> : <div className="project-image-placeholder"><CircuitBoard size={42} /><span>Project image not provided</span></div> : (
          <>
        <span className={live ? "status-badge live-badge" : "status-badge sample-badge"}>{live ? listing.verified ? "✓ VERIFIED" : "SOURCE LINKED" : "SAMPLE DATA"}</span>
        <div className="visual-circuit"><CircuitBoard size={50} strokeWidth={1.1} /><span className="visual-orbit" /></div>
        <span className="visual-number">TC / {String(index + 1).padStart(2, "0")}</span>
          </>
        )}
        {isProjects && <span className="status-badge sample-badge project-badge">STUDENT CONCEPT</span>}
        <button className="save-button" aria-label={isSaved ? "Remove saved listing" : "Save listing"} onClick={onSave}>{isSaved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}</button>
      </div>
      <div className="listing-body">
        {isProjects && listing.projectCategory && <div className="project-category">{listing.projectCategory}</div>}
        <div className="listing-location"><MapPin size={14} /> {listing.city}</div>
        {isProjects && onOpenSpecification ? <button className="project-title-button" type="button" onClick={onOpenSpecification}><h3>{listing.title}</h3></button> : <h3>{listing.title}</h3>}{isProjects && listing.projectPrice !== undefined ? <div className="project-price">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(listing.projectPrice)}</div> : <div className="listing-org">{listing.organization}</div>}
        <p className="listing-summary">{listing.summary}</p>
        {listing.mode && <div className="listing-facts"><span><Sparkles size={13} /> {listing.mode}</span>{listing.duration && <span><Clock3 size={13} /> {listing.duration}</span>}{listing.eligibility && <span>{listing.eligibility}</span>}</div>}
        <div className="tag-row">{listing.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
        <div className="listing-actions">
          {isProjects ? <>{onOrderNow && <button className="button button-dark button-small" onClick={onOrderNow}>Order now</button>}{onOpenSpecification && <button className="button button-outline button-small" onClick={onOpenSpecification}>Spec</button>}</> : canCompare ? <button className={compareIds.includes(listing.id) ? "button button-primary button-small" : "button button-outline button-small"} onClick={onCompare}>{compareIds.includes(listing.id) ? <Check size={14} /> : <Layers3 size={14} />}{compareIds.includes(listing.id) ? "Added" : "Compare"}</button> : <button className="button button-outline button-small" onClick={onEnquire}>Enquire <ArrowRight size={14} /></button>}
          {listing.sourceUrl && <a href={listing.sourceUrl} target="_blank" rel="noreferrer" className="text-link">Source <ExternalLink size={13} /></a>}
          {!isProjects && !listing.sourceUrl && <span className="no-contact-note">Sample profile · no contact details</span>}
          {isProjects && <span className="no-contact-note">Concept · no provider</span>}
        </div>
      </div>
    </article>
  );
}

function EmptyState({ page }: { page: Page }) {
  const message = emptyMessages[page] ?? { title: "No listings match yet", text: "Try another search or check back as more source-linked listings are reviewed." };
  return <div className="empty-state"><div className="empty-icon">{page === "Products" ? <Cpu size={24} /> : <GraduationCap size={24} />}</div><span className="eyebrow"><span className="eyebrow-line" /> VERIFIED INFORMATION ONLY</span><h3>{message.title}</h3><p>{message.text}</p><span className="empty-footnote"><ShieldCheck size={14} /> We don't invent listings to fill the page.</span></div>;
}

function HowItWorks() {
  return <section className="how-strip"><span>YOUR JOURNEY</span><div>DISCOVER <ArrowRight size={14} /> RESEARCH <ArrowRight size={14} /> SPECIFY <ArrowRight size={14} /> BUILD <ArrowRight size={14} /> LEARN</div><span className="how-ornament">TCH / 001</span></section>;
}

function Footer({ navigate }: { navigate: (page: Page) => void }) {
  return <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><button className="brand brand-footer" onClick={() => navigate("Home")} aria-label={`${PLATFORM_NAME} home`}><img className="brand-logo" src={brandLogo} alt={PLATFORM_NAME} /></button><p>{PLATFORM_TAGLINE}<br />A clearer way into the electronics ecosystem.</p></div><div className="footer-links"><div><strong>EXPLORE</strong><button onClick={() => navigate("Products")}>Components</button><button onClick={() => navigate("Projects")}>Projects</button><button onClick={() => navigate("Internships")}>Internships</button><button onClick={() => navigate("Training")}>Training</button></div><div><strong>GET INSPIRED</strong><button onClick={() => navigate("Hackathons")}>Hackathons</button><button onClick={() => navigate("Learn")}>Resources</button><button onClick={() => navigate("Saved")}>Collection</button><button onClick={() => navigate("Admin")}>Partner portal</button></div></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} {PLATFORM_NAME} <span className="sample-dot" /> BRAND NAME EDITABLE</span><span>Built for the curious, by design.</span></div></footer>;
}

function EnquiryModal({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    if (listing.id.startsWith("sample-")) {
      setSent(true);
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setError("Enquiry delivery is not configured yet.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("enquiries").insert({
        listing_id: listing.id,
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        message: String(form.get("message") ?? ""),
      });
      if (insertError) {
        setError(`Could not send enquiry: ${insertError.message}`);
        return;
      }
      setSent(true);
    } catch {
      setError("Could not send enquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }
  return <div className="modal-overlay" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="enquiry-modal" role="dialog" aria-modal="true" aria-labelledby="enquiry-title"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button>{sent ?   <div className="success-state"><div className="success-icon"><Check size={24} /></div><div className="eyebrow"><span className="eyebrow-line" /> {listing.id.startsWith("sample-") ? "ENQUIRY PREVIEW" : "ENQUIRY SENT"}</div><h2>{listing.id.startsWith("sample-") ? "Thanks for your interest." : "Your enquiry is on its way."}</h2><p>{listing.id.startsWith("sample-") ? "This is an illustrative profile. No enquiry was sent to a provider." : "Your enquiry was sent to the platform and can be reviewed by an administrator."}</p><button className="button button-dark" onClick={onClose}>Back to discovery <ArrowRight size={15} /></button></div> : <><div className="eyebrow"><span className="eyebrow-line" /> SEND AN ENQUIRY</div><h2 id="enquiry-title">Start a conversation.</h2><p className="modal-context">You're enquiring about <strong>{listing.title}</strong> from {listing.organization}.</p><form className="enquiry-form" onSubmit={submit}><label>Your name<input name="name" required placeholder="e.g. Asha Kumar" /></label><label>Email address<input name="email" type="email" required placeholder="you@example.com" /></label><label>What would you like to know?<textarea name="message" required rows={4} placeholder="Share a little about your project or question…" /></label>{listing.id.startsWith("sample-") && <div className="modal-sample-warning"><CircleHelp size={15} /> This is a sample profile. No contact details are available.</div>}{error && <div className="admin-message" role="alert">{error}</div>}<button className="button button-dark" type="submit" disabled={submitting}>{submitting ? "Sending…" : listing.id.startsWith("sample-") ? "Preview enquiry" : "Send enquiry"} <ArrowRight size={15} /></button></form></>}</section></div>;
}

function StudentAuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const configured = Boolean(getSupabase());

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const supabase = getSupabase();
    if (!supabase) {
      setError("Student accounts are unavailable until Supabase is configured.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (signUpError) {
          const rateLimited =
            signUpError.code === "over_email_send_rate_limit" ||
            signUpError.message.toLowerCase().includes("email rate limit exceeded");
          setError(
            rateLimited
              ? "Supabase has temporarily rate-limited signup emails. Wait before trying again, continue with Google, or turn off Confirm email in Supabase to register without a confirmation email."
              : `Could not create account: ${signUpError.message}`,
          );
          return;
        }
        if (data.session) {
          onClose();
          return;
        }
        setMessage("Account created. Email confirmation is still enabled in Supabase. Turn off Confirm email in Authentication settings to sign in without email confirmation.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(
            signInError.code === "invalid_credentials"
              ? "No account was found for these details, or the password is incorrect. If you haven't registered, create a student account."
              : `Sign-in failed: ${signInError.message}`,
          );
          return;
        }
        onClose();
      }
    } catch {
      setError("Could not complete the account request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Student accounts are unavailable until Supabase is configured.");
      return;
    }
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (oauthError) setError(`Could not continue with Google: ${oauthError.message}`);
    } catch {
      setError("Could not connect to Google sign-in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="enquiry-modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="student-auth-title">
        <button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <div className="admin-lock"><UserRound size={23} /></div>
        <div className="eyebrow"><span className="eyebrow-line" /> STUDENT ACCOUNT</div>
        <h2 id="student-auth-title">{mode === "signup" ? "Join the circuit." : "Welcome back."}</h2>
        <p className="modal-context">Save your discoveries and keep your learning shortlist in one place.</p>
        {!configured && <div className="modal-sample-warning"><CircleHelp size={15} /> Connect Supabase to enable student accounts.</div>}
        <form className="enquiry-form" onSubmit={submit}>
          {mode === "signup" && <label>Your name<input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label>}
          <label>Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <label>Password<input required type="password" minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label>
          {error && <div className="admin-message" role="alert">{error}</div>}
          {message && <div className="auth-success" role="status">{message}</div>}
          {configured && <button className="button button-dark" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create student account" : "Sign in"} <ArrowRight size={15} /></button>}
        </form>
        {configured && (
          <>
            <div className="auth-divider" aria-hidden="true"><span>OR</span></div>
            <button className="button button-outline google-auth-button" type="button" onClick={signInWithGoogle} disabled={busy}>
              {busy ? "Please wait…" : "Continue with Google"}
            </button>
          </>
        )}
        <p className="auth-switch">{mode === "signup" ? "Already have an account?" : "New to TechCircuit Hub?"} <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setMessage(""); }}>{mode === "signup" ? "Sign in" : "Create a student account"}</button></p>
      </section>
    </div>
  );
}

function StudentDashboard({
  student,
  navigate,
  listings,
  savedIds,
  toggleSaved,
}: {
  student: User | null;
  navigate: (page: Page) => void;
  listings: Listing[];
  savedIds: string[];
  toggleSaved: (id: string) => void;
}) {
  const [message, setMessage] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileName, setProfileName] = useState(student?.user_metadata.name ?? "");
  const [institution, setInstitution] = useState("");
  const [course, setCourse] = useState("");
  const [location, setLocation] = useState("");
  const [interests, setInterests] = useState("");
  const savedListings = listings.filter((listing) => savedIds.includes(listing.id));
  const displayName = profileName || student?.email?.split("@")[0] || "Student";

  useEffect(() => {
    if (!student) return;
    const currentStudent = student;
    const supabase = getSupabase();
    if (!supabase) return;
    const client = supabase;
    let active = true;
    setProfileLoading(true);
    async function loadProfile() {
      try {
        const { data, error } = await client
          .from("profiles")
          .select("display_name, institution, course, city, interests")
          .eq("id", currentStudent.id)
          .maybeSingle();
        if (!active) return;
        if (error) {
          setProfileError(`Could not load your profile: ${error.message}`);
          return;
        }
        setProfileName(data?.display_name || currentStudent.user_metadata.name || "");
        setInstitution(data?.institution ?? "");
        setCourse(data?.course ?? "");
        setLocation(data?.city ?? "");
        setInterests((data?.interests ?? []).join(", "));
      } catch {
        if (active) setProfileError("Could not load your profile. Please try again.");
      } finally {
        if (active) setProfileLoading(false);
      }
    }
    void loadProfile();
    return () => { active = false; };
  }, [student]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!student) return;
    const currentStudent = student;
    const supabase = getSupabase();
    if (!supabase) {
      setProfileError("Profile editing is unavailable until Supabase is configured.");
      return;
    }
    const client = supabase;
    setProfileError("");
    setMessage("");
    setProfileSaving(true);
    try {
      const { data, error } = await client
        .from("profiles")
        .update({
          display_name: profileName.trim(),
          institution: institution.trim(),
          course: course.trim(),
          city: location.trim(),
          interests: interests.split(",").map((item) => item.trim()).filter(Boolean),
        })
        .eq("id", currentStudent.id)
        .select("id")
        .maybeSingle();
      if (error) {
        setProfileError(`Could not save your profile: ${error.message}`);
        return;
      }
      if (!data) {
        setProfileError("Your student profile was not found. Please sign out and sign in again.");
        return;
      }
      setMessage("Your student profile was saved.");
    } catch {
      setProfileError("Could not save your profile. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function signOut() {
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage(`Could not sign out: ${error.message}`);
      return;
    }
    navigate("Home");
  }

  if (!student) {
    return (
      <main className="directory-page">
        <section className="directory-content">
          <div className="empty-state"><div className="empty-icon"><UserRound size={23} /></div><span className="eyebrow"><span className="eyebrow-line" /> STUDENT DASHBOARD</span><h3>Sign in to view your dashboard.</h3><p>Student accounts are optional. You can keep exploring without signing in.</p><button className="button button-dark" onClick={() => navigate("Home")}>Continue browsing <ArrowRight size={15} /></button></div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> STUDENT DASHBOARD</div>
          <h1>Good to see you, <em>{displayName}.</em></h1>
          <p>Your saved discoveries and next steps, all in one place.</p>
        </div>
        <button className="button button-outline button-small" onClick={signOut}><LogOut size={14} /> Sign out</button>
      </section>
      <section className="dashboard-content">
        <div className="dashboard-summary">
          <article><span className="dashboard-metric-icon"><UserRound size={17} /></span><span>ACCOUNT</span><strong>Student</strong><small>{student.email}</small></article>
          <article><span className="dashboard-metric-icon"><Bookmark size={17} /></span><span>SAVED LISTINGS</span><strong>{savedIds.length}</strong><small>Stored on this browser</small></article>
          <article><span className="dashboard-metric-icon"><Layers3 size={17} /></span><span>SHORTLIST</span><strong>{savedListings.length}</strong><small>Directory items saved</small></article>
        </div>
        <section className="student-profile-section">
          <div className="dashboard-section-head"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR DETAILS</div><h2>Student profile</h2></div><span className="profile-private-note"><ShieldCheck size={14} /> Private to your account</span></div>
          <form className="student-profile-form" onSubmit={saveProfile}>
            <label>Full name<input required value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Your name" /></label>
            <label>Email address<input value={student.email ?? ""} readOnly aria-readonly="true" /></label>
            <label>College / institution<input value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="Your college or institution" /></label>
            <label>Course / year<input value={course} onChange={(event) => setCourse(event.target.value)} placeholder="e.g. ECE · 3rd year" /></label>
            <label>City<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Your city" /></label>
            <label>Interests<input value={interests} onChange={(event) => setInterests(event.target.value)} placeholder="Embedded, IoT, PCB design" /><small>Separate interests with commas.</small></label>
            {(profileLoading || profileSaving) && <p className="profile-status" role="status">{profileLoading ? "Loading your profile…" : "Saving profile…"}</p>}
            {profileError && <p className="admin-message profile-status" role="alert">{profileError}</p>}
            {message && <p className="auth-success profile-status" role="status">{message}</p>}
            <button className="button button-dark profile-save" type="submit" disabled={profileLoading || profileSaving}>{profileSaving ? "Saving…" : "Save profile"} <Check size={15} /></button>
          </form>
        </section>
        <div className="dashboard-section-head"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR RESEARCH</div><h2>Saved discoveries</h2></div><button className="text-link" onClick={() => navigate("Saved")}>Open collection <ArrowRight size={15} /></button></div>
        {savedListings.length === 0 ? <div className="empty-state dashboard-empty"><div className="empty-icon"><Bookmark size={22} /></div><h3>Your collection is ready when you are.</h3><p>Save project ideas, providers and opportunities as you explore the platform.</p><button className="button button-primary" onClick={() => navigate("Projects")}>Explore projects <ArrowRight size={15} /></button></div> : <div className="dashboard-saved-list">{savedListings.map((listing) => <article key={listing.id}><div><span>{listing.kind}</span><h3>{listing.title}</h3><p>{listing.organization} · {listing.city}</p></div><button className="icon-button dashboard-remove" aria-label={`Remove ${listing.title} from saved listings`} onClick={() => toggleSaved(listing.id)}><X size={17} /></button></article>)}</div>}
      </section>
    </main>
  );
}

function AdminPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState<Listing["kind"]>("Manufacturing");
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [city, setCity] = useState("");
  const [summary, setSummary] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    async function restoreAdminSession() {
      try {
        const { data, error } = await client.auth.getSession();
        if (error) {
          setMessage(`Could not restore session: ${error.message}`);
          return;
        }
        if (data.session) await checkAdmin(client, data.session.user.id, setIsAdmin, setMessage);
      } catch {
        setMessage("Could not restore the admin session.");
      }
    }
    void restoreAdminSession();
  }, [supabase]);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setMessage("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(`Sign-in failed: ${error.message}`);
      return;
    }
    await checkAdmin(supabase, data.user.id, setIsAdmin, setMessage);
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setMessage(`Sign-out failed: ${error.message}`);
    else { setIsAdmin(false); setMessage("Signed out."); }
  }

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !isAdmin) return;
    setMessage("");
    const { error } = await supabase.from("listings").insert({
      kind, title, organization, city, summary,
      source_url: sourceUrl,
      tags: [],
      updated_at: new Date().toISOString(),
      is_published: false,
    });
    if (error) {
      setMessage(`Could not save listing: ${error.message}`);
      return;
    }
    setTitle(""); setOrganization(""); setCity(""); setSummary(""); setSourceUrl("");
    setMessage("Draft saved for review. Publish it after checking its source and details.");
  }

  return <main className="admin-page"><section className="admin-hero"><div className="eyebrow"><span className="eyebrow-line" /> PARTNER & ADMIN PORTAL</div><h1>Keep the ecosystem <em>grounded in facts.</em></h1><p>Manage source-linked opportunities and provider listings. Drafts stay unpublished until an authorized admin verifies them.</p></section><section className="admin-content">{!supabase ? <div className="admin-connect"><div className="admin-lock"><ShieldCheck size={26} /></div><span className="eyebrow"><span className="eyebrow-line" /> SECURE ADMIN ACCESS</span><h2>Connect your Supabase project.</h2><p>Admin sign-in and listing management are ready to connect. Add your project URL and anon key to the local environment to enable secure access.</p><div className="env-block"><code>VITE_SUPABASE_URL=your-project-url</code><code>VITE_SUPABASE_ANON_KEY=your-anon-key</code></div><p className="admin-security-note"><ShieldCheck size={16} /> Admin access is enforced by database roles and row-level security policies — never by a client-side password.</p></div> : !isAdmin ? <div className="admin-login"><div className="admin-lock"><ShieldCheck size={26} /></div><span className="eyebrow"><span className="eyebrow-line" /> AUTHORIZED ADMINS ONLY</span><h2>Sign in to manage listings.</h2><p>Student browsing never requires an account. Admin privileges are granted securely in the database.</p><form onSubmit={signIn} className="admin-form"><label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label><button className="button button-dark" type="submit">Sign in securely <ArrowRight size={15} /></button></form>{message && <p className="admin-message" role="status">{message}</p>}</div> : <div className="admin-workspace">  <div className="admin-workspace-head"><div><span className="eyebrow"><span className="eyebrow-line" /> LISTING WORKSPACE</span><h2>Add a source-linked listing.</h2></div><button className="button button-outline button-small" onClick={signOut}>Sign out</button></div><p className="admin-help">All new submissions are drafts. Add a source URL for every listing and verify the details before publishing.</p><form className="admin-form admin-form-grid" onSubmit={publish}><label>Listing type<select value={kind} onChange={(event) => setKind(event.target.value as Listing["kind"])}>{listingKinds.map((name) => <option key={name}>{name}</option>)}</select></label><label>Title<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Provider / organization<input required value={organization} onChange={(event) => setOrganization(event.target.value)} /></label><label>Location<input required value={city} onChange={(event) => setCity(event.target.value)} /></label><label className="admin-full">Summary<textarea required rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} /></label><label className="admin-full">Source or official URL<input type="url" required value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://" /></label><button className="button button-dark admin-full" type="submit">Save unpublished draft <ArrowRight size={15} /></button></form>{message && <p className="admin-message" role="status">{message}</p>}<p className="admin-security-note"><ShieldCheck size={16} /> Database row-level security requires your account to have the admin role.</p></div>}</section></main>;
}

async function checkAdmin(
  supabase: SupabaseClient,
  id: string,
  setIsAdmin: (isAdmin: boolean) => void,
  setMessage: (message: string) => void,
) {
  const { data, error } = await supabase.from("profiles").select("role").eq("id", id).maybeSingle();
  if (error) {
    setIsAdmin(false);
    setMessage(`Could not check admin access: ${error.message}`);
    return;
  }
  const admin = data?.role === "admin";
  setIsAdmin(admin);
  setMessage(admin ? "" : "This account does not have admin access.");
}

export default App;
