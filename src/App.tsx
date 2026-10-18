import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Activity,
  ClipboardList,
  BriefcaseBusiness,
  Bell,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CircuitBoard,
  Code2,
  Clock3,
  Compass,
  Cpu,
  ExternalLink,
  Filter,
  GraduationCap,
  FileText,
  Layers3,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Menu,
  Scale,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UserRound,
  UserCog,
  LogOut,
  X,
} from "lucide-react";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import brandLogo from "../ece logo 1.png";
import internshipOpportunityImage from "../home image/card 1.png";
import hackathonOpportunityImage from "../home image/card 3.png";
import projectPricesInRupees from "../shared/project-prices.json";

const PLATFORM_NAME = "TechCircuit Hub";
const PLATFORM_TAGLINE = "Discover. Learn. Build. Innovate.";
const PROJECT_CUSTOMIZATION_FORM_URL = "https://forms.gle/De35WLbL98SU2kXF7";
const PENDING_ORDER_KEY = "techcircuit-pending-order:";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const STUDENT_INTERESTS = [
  "ECE",
  "VLSI & Chip Design",
  "Embedded Systems",
  "Internet of Things (IoT)",
  "PCB Design",
  "Robotics & Automation",
  "Artificial Intelligence & Machine Learning",
  "FPGA & Verilog",
  "Communication Systems",
  "Power Electronics",
  "Signal Processing",
  "Electric Vehicles",
] as const;
const ACADEMIC_YEARS = ["1st year", "2nd year", "3rd year", "4th year", "Final year", "Postgraduate", "Other"] as const;

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

type StudentDashboardSection = "overview" | "applications" | "notifications" | "profile" | "settings";
type StudentMenuDestination = StudentDashboardSection | "bookmarks";

const studentMenuItems = [
  { id: "overview", label: "Student dashboard", icon: GraduationCap },
  { id: "applications", label: "My Applications & Enrollments", icon: FileText },
  { id: "bookmarks", label: "Bookmarks / Wishlist", icon: Bookmark },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "profile", label: "My Profile", icon: UserRound },
  { id: "settings", label: "Settings & Support", icon: Settings },
] satisfies { id: StudentMenuDestination; label: string; icon: typeof FileText }[];

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
  componentDetails?: ComponentDetails;
};

type TrackableOpportunityKind = Extract<Listing["kind"], "Internships" | "Training" | "Hackathons">;
type TrackableOpportunity = Listing & { kind: TrackableOpportunityKind; sourceUrl: string };
type OpportunityActivityStatus = "visited" | "applied";

type OpportunityActivity = {
  opportunity_id: string;
  opportunity_kind: TrackableOpportunityKind;
  title: string;
  organization: string;
  city: string;
  opportunity_url: string;
  status: OpportunityActivityStatus;
  visited_at: string;
  applied_at: string | null;
  updated_at: string;
};

type AdminOpportunityActivity = OpportunityActivity & {
  user_id: string;
  student_name: string;
  institution: string;
  course: string;
  academic_year: string;
};

type AdminOpportunityListing = {
  id: string;
  kind: TrackableOpportunityKind;
  title: string;
  organization: string;
  city: string;
  summary: string;
  sourceUrl: string;
  isPublished: boolean;
  isExpired: boolean;
  verificationStatus: string;
  updatedAt: string;
};

type ComponentOffer = {
  seller: string;
  price: number;
  currency: string;
  quantity: number;
  stock: number | null;
  moq: number | null;
  sellerUrl: string;
  checkedAt: string;
};

type ComponentOfferDraft = {
  seller: string;
  price: string;
  currency: string;
  quantity: string;
  stock: string;
  moq: string;
  sellerUrl: string;
  checkedAt: string;
};

type ComponentDetails = {
  mpn: string;
  category: string;
  imageUrl: string;
  offers: ComponentOffer[];
};

const OPPORTUNITY_RETURN_KEY = "techcircuit-pending-opportunity";

function isTrackableOpportunity(listing: Listing): listing is TrackableOpportunity {
  return Boolean(listing.sourceUrl) && ["Internships", "Training", "Hackathons"].includes(listing.kind);
}

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
    const imageAssetNumber = imageNumber === 1 ? 2 : imageNumber === 2 ? 1 : imageNumber;
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
      imageUrl: projectImageUrls[`../Our Project image/ece ${imageAssetNumber}.png`],
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
  {
    id: "lead-internship-terminus-vlsi",
    kind: "Internships",
    title: "VLSI Design Engineer Intern",
    organization: "Terminus Circuits",
    city: "Chennai, Tamil Nadu",
    summary: "VLSI / RTL / Verilog. The listing previously reported a stipend of ₹38,000/month; confirm the amount, eligibility and current availability on the listing.",
    tags: ["VLSI", "RTL", "Verilog"],
    sourceUrl: "https://myinternships.in/internships/6a798711f93ef93dac740e73",
    featured: true,
  },
  {
    id: "lead-internship-synergymedica-embedded",
    kind: "Internships",
    title: "Embedded Systems Intern",
    organization: "Synergymedica Healthcare",
    city: "Chennai, Tamil Nadu",
    summary: "Embedded C / IoT / sensors. This link opens a job-search page; find the named role and confirm it is still open before applying.",
    tags: ["Embedded C", "IoT", "Sensors"],
    sourceUrl: "https://in.indeed.com/q-embedded-systems-internships-l-chennai%2C-tamil-nadu-jobs.html",
    featured: true,
  },
  {
    id: "lead-internship-neurostellar-analog",
    kind: "Internships",
    title: "Analog Electronics Intern",
    organization: "Neurostellar",
    city: "Chennai, Tamil Nadu",
    summary: "Analog circuits / electronics. This link opens a job-search page; confirm the specific role and current application status.",
    tags: ["Analog Circuits", "Electronics"],
    sourceUrl: "https://in.indeed.com/q-embedded-systems-internships-l-chennai%2C-tamil-nadu-jobs.html",
    featured: true,
  },
  {
    id: "lead-internship-daloft-uav",
    kind: "Internships",
    title: "UAV Intern",
    organization: "Daloft Aerospace",
    city: "Chennai, Tamil Nadu",
    summary: "UAV / avionics / embedded systems. This link opens a job-search page; confirm the specific role and current application status.",
    tags: ["UAV", "Avionics", "Embedded Systems"],
    sourceUrl: "https://in.indeed.com/q-embedded-systems-internships-l-chennai%2C-tamil-nadu-jobs.html",
    featured: true,
  },
  {
    id: "lead-internship-hertzworkz-embedded",
    kind: "Internships",
    title: "Embedded Engineer Intern",
    organization: "HertzworkZ",
    city: "IIT Madras campus, Chennai",
    summary: "Embedded engineering. The listing was reported as unpaid; check the listing for current availability and terms before applying.",
    tags: ["Embedded Engineering", "Firmware"],
    sourceUrl: "https://in.linkedin.com/jobs/view/embedded-engineer-intern-at-hertzworkz-4478453052",
    featured: true,
  },
  {
    id: "lead-internship-chennai-embedded-iot",
    kind: "Internships",
    title: "Embedded / IoT Internship",
    organization: "Chennai listings",
    city: "Chennai, Tamil Nadu",
    summary: "Embedded hardware / firmware / IoT. This is a job-search page for matching Chennai internships; confirm the exact role and its current status.",
    tags: ["Embedded Hardware", "Firmware", "IoT"],
    sourceUrl: "https://in.indeed.com/q-embedded-internships-l-chennai%2C-tamil-nadu-jobs.html?vjk=c6b556bcc9a3dc89",
    featured: true,
  },
  {
    id: "lead-hackathon-embedathon-2k26",
    kind: "Hackathons",
    title: "EMBEDATHON 2K26",
    organization: "Sasurie College of Engineering",
    city: "Tamil Nadu",
    summary: "Embedded / IoT / robotics. Reported event date: 15 Oct 2026; registration reportedly closed after 14 Oct. Check the event page for updates or late registration.",
    tags: ["Embedded", "IoT", "Robotics"],
    sourceUrl: "https://www.knowafest.com/event/embedathon-2k26",
    featured: true,
  },
  {
    id: "lead-hackathon-hackitsnova-2026",
    kind: "Hackathons",
    title: "HacKITSnova 2026",
    organization: "Karunya Institute",
    city: "Coimbatore, Tamil Nadu",
    summary: "Engineering hackathon. The published deadline reportedly passed on 12 Oct 2026; check for late or spot registration.",
    tags: ["Engineering", "Innovation"],
    sourceUrl: "https://eventopia.in/event/hackitsnova-2026-2026-10-15-y33",
    featured: true,
  },
  {
    id: "lead-hackathon-electronova-2026",
    kind: "Hackathons",
    title: "ElectroNova 2026",
    organization: "E.G.S. Pillay Engineering College",
    city: "Nagapattinam, Tamil Nadu",
    summary: "Hardware / IoT / embedded systems. The deadline was listed as 15 Oct 2026; verify whether registration is still open.",
    tags: ["Hardware", "IoT", "Embedded Systems"],
    sourceUrl: "https://www.knowafest.com/event/electronova-2026-24-hour-hands-on-hackathon",
    featured: true,
  },
  {
    id: "lead-hackathon-innovathon-2k26",
    kind: "Hackathons",
    title: "INNOVATHON 2K26",
    organization: "Mahendra Engineering College",
    city: "Namakkal, Tamil Nadu",
    summary: "Innovation / prototype / pitch. Online registration status needs confirmation; the listing reportedly mentioned spot registration.",
    tags: ["Innovation", "Prototype", "Pitch"],
    sourceUrl: "https://cdn-2.indcareer.com/events/tamil-nadu?filter=past",
    featured: true,
  },
  {
    id: "lead-hackathon-kernel-prime-26",
    kind: "Hackathons",
    title: "Kernel Prime ’26",
    organization: "S.A. Engineering College",
    city: "Chennai, Tamil Nadu",
    summary: "ECE / hardware tracks. Reported dates: 8–9 Oct 2026; the event dates have passed. Check the organizer page for updates.",
    tags: ["ECE", "Hardware"],
    sourceUrl: "https://www.knowafest.com/event/kernel-prime26",
    featured: true,
  },
  {
    id: "lead-hackathon-techx-madras-26",
    kind: "Hackathons",
    title: "TechX Madras ’26",
    organization: "Sri Sai Ram Institute of Technology",
    city: "Chennai, Tamil Nadu",
    summary: "Technology hackathon. Reported dates: 13–14 Oct 2026; the event dates have passed. Check the event page for updates.",
    tags: ["Technology", "Hackathon"],
    sourceUrl: "https://www.techxmadras26.in/",
    featured: true,
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

type Resource = (typeof resources)[number];
type DetailSelection = { type: "listing"; item: Listing } | { type: "resource"; item: Resource };

const categories = [
  { name: "Internships" as Page, caption: "Get hands-on with real industry projects.", icon: GraduationCap, color: "peach" },
  { name: "Training" as Page, caption: "Learn new skills with expert-led courses.", icon: BookOpen, color: "blue" },
  { name: "Hackathons" as Page, caption: "Solve real problems, win and grow.", icon: Sparkles, color: "lavender" },
  { name: "Projects" as Page, caption: "Build, innovate and showcase your skills.", icon: CircuitBoard, color: "mint" },
  { name: "Products" as Page, caption: "Find the right components for your projects.", icon: Cpu, color: "yellow" },
  { name: "Learn" as Page, caption: "Guides, docs and useful learning materials.", icon: FileText, color: "rose" },
];

const showcaseSlides: { title: string; description: string; action: string; page: Page }[] = [
  { title: "Gain real-world experience", description: "Work on live projects and build your career in electronics & IoT.", action: "Explore internships", page: "Internships" },
  { title: "Build skills that move you forward", description: "Learn practical electronics with expert-led training.", action: "Explore training", page: "Training" },
  { title: "Turn ideas into impact", description: "Solve real problems, build with a team and show what you can do.", action: "Explore hackathons", page: "Hackathons" },
  { title: "Get to know your components", description: "Explore the building blocks behind your next circuit.", action: "Browse components", page: "Products" },
  { title: "Find your next project idea", description: "Explore embedded systems and IoT concepts to build on.", action: "Browse projects", page: "Projects" },
  { title: "Learn at your own pace", description: "Find guides, datasheets and trusted learning materials.", action: "Explore resources", page: "Learn" },
];

const intro: Record<Listing["kind"], { eyebrow?: string; title: string; description: string }> = {
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
    title: "Find your next learning opportunity.",
    description: "Browse internships only when a provider or trusted source has submitted a verifiable link.",
  },
  Training: {
    title: "Learn by building, not just watching.",
    description: "Review course topics, delivery modes and prerequisites before you reach out.",
  },
  Products: {
    title: "Find the right part for your next build.",
    description: "Explore component categories and seller links.",
  },
  Projects: {
    title: "Find the right project to build.",
    description: "Browse ready-made project kits or request a specification tailored to your needs.",
  },
  Hackathons: {
    title: "Find a challenge worth building for.",
    description: "Explore source-linked electronics, embedded systems and IoT hackathons when organizers publish verified details.",
  },
  Learn: {
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
  const [page, setPage] = useState<Page>(() => {
    if (window.location.pathname.replace(/\/+$/, "") === "/admin") return "Admin";
    return paymentOrderId ? "PaymentResult" : "Home";
  });
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
  const [detailSelection, setDetailSelection] = useState<DetailSelection | null>(null);
  const detailReturnScroll = useRef(0);
  const [customizationRequestId, setCustomizationRequestId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [studentMenuOpen, setStudentMenuOpen] = useState(false);
  const [studentSection, setStudentSection] = useState<StudentDashboardSection>("overview");
  const [remoteListings, setRemoteListings] = useState<Listing[]>([]);
  const [dataError, setDataError] = useState("");
  const [student, setStudent] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authRecovery, setAuthRecovery] = useState(false);
  const [pendingOpportunityPrompt, setPendingOpportunityPrompt] = useState<Listing | null>(null);
  const [opportunityActivitySaving, setOpportunityActivitySaving] = useState(false);
  const [opportunityActivityError, setOpportunityActivityError] = useState("");
  const [opportunityActivityRevision, setOpportunityActivityRevision] = useState(0);
  const opportunityPromptCheckInProgress = useRef(false);

  useEffect(() => {
    function restoreRoute() {
      const path = window.location.pathname.replace(/\/+$/, "");
      setPage(path === "/admin"
        ? "Admin"
        : new URLSearchParams(window.location.search).has("payment_order_id") ? "PaymentResult" : "Home");
      setDetailSelection(null);
    }
    window.addEventListener("popstate", restoreRoute);
    return () => window.removeEventListener("popstate", restoreRoute);
  }, []);

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
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const isRecoveryCallback = new URLSearchParams(window.location.search).get("type") === "recovery" || hashParams.get("type") === "recovery";
    const isOAuthCallback = !isRecoveryCallback && (new URLSearchParams(window.location.search).has("code") || hashParams.has("access_token"));
    void client.auth.getSession().then(({ data, error }) => {
      if (error) {
        setDataError("Could not restore your student session.");
        return;
      }
      if (data.session?.user) {
        setStudent(data.session.user);
        if (isRecoveryCallback) {
          setAuthRecovery(true);
          setAuthOpen(true);
        }
        if (isOAuthCallback) setPage("Dashboard");
      }
    }).catch(() => setDataError("Could not restore your student session."));
    const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
      setStudent(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") {
        setAuthRecovery(true);
        setAuthOpen(true);
      }
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
          .select("id, kind, title, organization, city, summary, tags, source_url, verified, featured, components, details, updated_at")
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
            components: row.components ?? [],
            updated: row.updated_at,
            componentDetails: row.kind === "Products" ? parseComponentDetails(row.details) : undefined,
          })),
        );
      } catch {
        setDataError("Live listings could not be loaded. Please try again later.");
      }
    }
    void loadListings();
    window.addEventListener("techcircuit:listings-updated", loadListings);
    return () => window.removeEventListener("techcircuit:listings-updated", loadListings);
  }, []);

  const listings = useMemo(() => [...remoteListings, ...catalog], [remoteListings]);

  useEffect(() => {
    if (!student) return;
    const currentStudent = student;
    let active = true;
    async function showOpportunityPromptOnReturn() {
      if (!active || opportunityPromptCheckInProgress.current) return;
      let pending: { opportunityId: string; userId: string } | null = null;
      try {
        const stored = sessionStorage.getItem(OPPORTUNITY_RETURN_KEY);
        if (!stored) return;
        pending = JSON.parse(stored) as { opportunityId: string; userId: string };
      } catch {
        setDataError("Could not restore the opportunity follow-up. Please reopen the opportunity.");
        return;
      }
      if (!pending || typeof pending.opportunityId !== "string" || typeof pending.userId !== "string") {
        sessionStorage.removeItem(OPPORTUNITY_RETURN_KEY);
        setDataError("The saved opportunity follow-up was invalid. Please reopen the opportunity.");
        return;
      }
      if (pending.userId !== currentStudent.id) {
        sessionStorage.removeItem(OPPORTUNITY_RETURN_KEY);
        setDataError("The opportunity follow-up was started under a different account. Reopen the source while signed in to track it.");
        return;
      }
      const opportunity = listings.find((listing) => listing.id === pending?.opportunityId);
      if (!opportunity || !isTrackableOpportunity(opportunity)) return;
      sessionStorage.removeItem(OPPORTUNITY_RETURN_KEY);
      setOpportunityActivityError("");
      setPendingOpportunityPrompt(opportunity);
      opportunityPromptCheckInProgress.current = true;
      const client = getSupabase();
      try {
        if (client) {
          const { data, error } = await client
            .from("opportunity_activity")
            .select("status")
            .eq("user_id", currentStudent.id)
            .eq("opportunity_id", opportunity.id)
            .maybeSingle();
          if (!active) return;
          if (error) {
            setOpportunityActivityError(`Could not check existing opportunity activity: ${error.message}`);
          } else if (data?.status === "applied") {
            setPendingOpportunityPrompt(null);
          }
        }
      } catch {
        if (active) setOpportunityActivityError("Could not check existing opportunity activity. You can still save your answer below.");
      } finally {
        opportunityPromptCheckInProgress.current = false;
      }
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void showOpportunityPromptOnReturn();
    };
    const handleReturn = () => { void showOpportunityPromptOnReturn(); };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleReturn);
    window.addEventListener("pageshow", handleReturn);
    const returnCheck = window.setInterval(() => {
      if (document.visibilityState === "visible") void showOpportunityPromptOnReturn();
    }, 500);
    if (document.visibilityState === "visible") void showOpportunityPromptOnReturn();
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleReturn);
      window.removeEventListener("pageshow", handleReturn);
      window.clearInterval(returnCheck);
    };
  }, [student, listings]);

  useEffect(() => {
    document.title = `${PLATFORM_NAME} — ${PLATFORM_TAGLINE}`;
  }, []);

  function navigate(next: Page) {
    const nextPath = next === "Admin" ? "/admin" : "/";
    if (window.location.pathname !== nextPath) window.history.pushState({}, "", nextPath);
    setDetailSelection(null);
    setPage(next);
    setMenuOpen(false);
    setStudentMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openListingDetails(item: Listing) {
    detailReturnScroll.current = window.scrollY;
    setDetailSelection({ type: "listing", item });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openResourceDetails(item: Resource) {
    detailReturnScroll.current = window.scrollY;
    setDetailSelection({ type: "resource", item });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeDetails() {
    setDetailSelection(null);
    window.requestAnimationFrame(() => window.scrollTo({ top: detailReturnScroll.current, behavior: "smooth" }));
  }

  function openProjectCustomization(item: Listing) {
    setCustomizationRequestId(item.id);
    setDetailSelection(null);
    setPage("Projects");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openStudentDestination(destination: StudentMenuDestination) {
    if (destination === "bookmarks") {
      navigate("Saved");
      return;
    }
    setStudentSection(destination);
    navigate("Dashboard");
  }

  function prepareOpportunityFollowUp(listing: Listing) {
    if (!student || !isTrackableOpportunity(listing)) return;
    try {
      sessionStorage.setItem(OPPORTUNITY_RETURN_KEY, JSON.stringify({
        opportunityId: listing.id,
        userId: student.id,
      }));
    } catch {
      setDataError("Could not prepare the opportunity follow-up. Your browser may be blocking session storage.");
    }
  }

  async function saveOpportunityActivity(listing: Listing, status: OpportunityActivityStatus) {
    if (!student || !isTrackableOpportunity(listing)) {
      setOpportunityActivityError("Sign in to save opportunity activity to your student account.");
      return;
    }
    const client = getSupabase();
    if (!client) {
      setOpportunityActivityError("Opportunity tracking is unavailable until Supabase is configured.");
      return;
    }
    const now = new Date().toISOString();
    setOpportunityActivityError("");
    setOpportunityActivitySaving(true);
    try {
      const { error } = await client.from("opportunity_activity").upsert({
        user_id: student.id,
        opportunity_id: listing.id,
        opportunity_kind: listing.kind,
        title: listing.title,
        organization: listing.organization,
        city: listing.city,
        opportunity_url: listing.sourceUrl,
        status,
        visited_at: now,
        applied_at: status === "applied" ? now : null,
        updated_at: now,
      }, { onConflict: "user_id,opportunity_id" });
      if (error) {
        setOpportunityActivityError(`Could not save this opportunity: ${error.message}`);
        return;
      }
      setOpportunityActivityRevision((revision) => revision + 1);
      setPendingOpportunityPrompt(null);
    } catch {
      setOpportunityActivityError("Could not save this opportunity. Please try again.");
    } finally {
      setOpportunityActivitySaving(false);
    }
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

  function toggleSaved(id: string) {
    setSavedIds((current) => current.includes(id) ? current.filter((saved) => saved !== id) : [...current, id]);
  }

  function toggleCompare(id: string) {
    setCompareIds((current) => current.includes(id) ? current.filter((selected) => selected !== id) : current.length < 3 ? [...current, id] : current);
  }

  function startExplore() {
    document.getElementById("explore")?.scrollIntoView({ behavior: "smooth" });
  }

  if (page === "Admin") return <AdminPage onExit={() => navigate("Home")} />;

  return (
    <div className={`app-shell${page === "Home" ? " home-shell" : ""}${page === "Projects" && !detailSelection ? " projects-shell" : ""}`}>
      <header className="site-header">
        <button className="brand" onClick={() => navigate("Home")} aria-label={`${PLATFORM_NAME} home`}>
          <img className="brand-logo" src={brandLogo} alt={PLATFORM_NAME} />
        </button>
        <nav id="main-navigation" className={`main-nav ${menuOpen ? "nav-open" : ""}`} aria-label="Main navigation">
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
            <div className="student-menu-wrap">
              <button
                className="student-profile-button"
                type="button"
                onClick={() => setStudentMenuOpen((open) => !open)}
                aria-label="Open student account menu"
                title="Student dashboard and account options"
                aria-expanded={studentMenuOpen}
                aria-haspopup="menu"
              >
                <span className="student-avatar"><UserRound size={17} /></span>
                <span className="student-profile-label">Account</span>
                <ChevronDown size={14} />
              </button>
              {studentMenuOpen && (
                <div className="student-menu" role="menu" aria-label="Student menu">
                  <div className="student-menu-account">
                    <strong>Student account</strong>
                    <span>{student.email}</span>
                  </div>
                  {studentMenuItems.map(({ id, label, icon: Icon }) => (
                    <button key={id} type="button" role="menuitem" onClick={() => openStudentDestination(id)}>
                      <Icon size={16} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button className="sign-button" onClick={() => setAuthOpen(true)}>Sign in <ArrowRight size={14} /></button>
          )}
          <button className="menu-toggle" aria-label={menuOpen ? "Close site navigation" : "Open site navigation"} title="Site navigation" aria-controls="main-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
            <span className="menu-toggle-label">{menuOpen ? "Close" : "Menu"}</span>
          </button>
        </div>
      </header>

      {detailSelection ? (
        <ListingDetailPage
          selection={detailSelection}
          isSaved={detailSelection.type === "listing" ? savedIds.includes(detailSelection.item.id) : savedIds.includes(resourceId(detailSelection.item.title))}
          onBack={closeDetails}
          onSave={() => detailSelection.type === "listing" ? toggleSaved(detailSelection.item.id) : toggleSaved(resourceId(detailSelection.item.title))}
          onTrackOpportunity={detailSelection.type === "listing" ? prepareOpportunityFollowUp : undefined}
          onEnquire={detailSelection.type === "listing" && !["Projects", "Products", "Internships", "Hackathons"].includes(detailSelection.item.kind) ? () => setEnquiry(detailSelection.item) : undefined}
          onOrder={detailSelection.type === "listing" && detailSelection.item.kind === "Projects" ? () => addProjectToCart(detailSelection.item.id) : undefined}
          onCustomize={detailSelection.type === "listing" && detailSelection.item.kind === "Projects" ? () => openProjectCustomization(detailSelection.item) : undefined}
        />
      ) : page === "Home" ? (
        <HomePage
          navigate={navigate}
          startExplore={startExplore}
          listings={listings}
          addProjectToCart={addProjectToCart}
          onViewListing={openListingDetails}
        />
      ) : page === "Dashboard" ? (
        <StudentDashboard student={student} section={studentSection} setSection={setStudentSection} navigate={navigate} listings={listings} savedIds={savedIds} onViewListing={openListingDetails} opportunityActivityRevision={opportunityActivityRevision} onUpdateOpportunityActivity={(activity, status) => void saveOpportunityActivity({ id: activity.opportunity_id, kind: activity.opportunity_kind, title: activity.title, organization: activity.organization, city: activity.city, sourceUrl: activity.opportunity_url, summary: "", tags: [] }, status)} />
      ) : page === "Cart" ? (
        <ProjectCartPage listings={listings} cartIds={cartIds} removeProject={removeProjectFromCart} onCheckout={() => navigate("Checkout")} onContinueShopping={() => navigate("Projects")} onViewListing={openListingDetails} />
      ) : page === "Checkout" ? (
        <ProjectCheckoutPage listings={listings} cartIds={cartIds} onSubmitCheckout={beginCheckout} onBackToCart={() => navigate("Cart")} />
      ) : page === "PaymentResult" ? (
        <PaymentResultPage orderId={paymentOrderId} apiBaseUrl={API_BASE_URL} cartIds={cartIds} setCartIds={setCartIds} onContinue={() => navigate("Projects")} />
      ) : page === "Saved" ? (
        <SavedPage listings={listings} savedIds={savedIds} toggleSaved={toggleSaved} setEnquiry={setEnquiry} onViewListing={openListingDetails} onViewResource={openResourceDetails} />
      ) : page === "Products" ? (
        <ComponentCatalogPage listings={listings} />
      ) : (
        <DirectoryPage
          page={page}
          listings={listings}
          city={city}
          setCity={setCity}
          savedIds={savedIds}
          toggleSaved={toggleSaved}
          compareIds={compareIds}
          toggleCompare={toggleCompare}
          setEnquiry={setEnquiry}
          addProjectToCart={addProjectToCart}
          onViewListing={openListingDetails}
          onViewResource={openResourceDetails}
          customizationRequestId={customizationRequestId}
          onCustomizationRequestHandled={() => setCustomizationRequestId(null)}
        />
      )}

      {dataError && <div className="toast-error" role="status"><CircleHelp size={16} /> {dataError}</div>}
      {page === "Home" && !detailSelection && <HowItWorks />}
      <Footer navigate={navigate} />
      {enquiry && <EnquiryModal listing={enquiry} onClose={() => setEnquiry(null)} />}
      {authOpen && <StudentAuthModal isPasswordRecovery={authRecovery} onClose={() => setAuthOpen(false)} onAuthenticated={(user) => { setStudent(user); setStudentSection("overview"); setAuthRecovery(false); navigate("Dashboard"); }} />}
      {pendingOpportunityPrompt && <OpportunityReturnPrompt listing={pendingOpportunityPrompt} busy={opportunityActivitySaving} error={opportunityActivityError} onChoose={(status) => void saveOpportunityActivity(pendingOpportunityPrompt, status)} />}
    </div>
  );
}

function HomePage({
  navigate,
  startExplore,
  listings,
  addProjectToCart,
  onViewListing,
}: {
  navigate: (page: Page) => void;
  startExplore: () => void;
  listings: Listing[];
  addProjectToCart: (id: string) => void;
  onViewListing: (listing: Listing) => void;
}) {
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const [showcasePaused, setShowcasePaused] = useState(false);
  const featuredProjects = ["Microcontroller-Based Project", "IoT Project", "PCB Design"]
    .map((category) => listings.find((item) => item.kind === "Projects" && item.projectCategory === category && item.imageUrl))
    .filter((item): item is Listing => Boolean(item));
  const featuredInternships = listings
    .filter((item) => item.kind === "Internships" && item.featured && item.sourceUrl)
    .sort((left, right) => Number(Boolean(right.featured)) - Number(Boolean(left.featured)))
    .slice(0, 2);
  const featuredHackathons = listings
    .filter((item) => item.kind === "Hackathons" && item.featured && item.sourceUrl)
    .sort((left, right) => Number(Boolean(right.featured)) - Number(Boolean(left.featured)))
    .slice(0, 2);

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
  const activeSlide = showcaseSlides[showcaseIndex % showcaseSlides.length];

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <h1>Discover embedded systems, IoT &amp; electronics.</h1>
            <p>Learn, build and grow with real projects, expert guidance and industry-ready skills.</p>
            <div className="home-hero-actions">
              <button className="button button-primary" onClick={startExplore}>Start exploring <ArrowRight size={16} /></button>
              <button className="home-text-link" onClick={() => navigate("Projects")}>Buy a project <ArrowRight size={16} /></button>
            </div>
          </div>
        </div>
      </section>

      <section className="home-content">
        <div
            className="home-showcase"
            role="region"
            aria-label="Explore learning opportunities"
            aria-roledescription="carousel"
            onMouseEnter={() => setShowcasePaused(true)}
            onMouseLeave={() => setShowcasePaused(false)}
            onFocus={() => setShowcasePaused(true)}
            onBlur={() => setShowcasePaused(false)}
          >
            <div className="home-showcase-art" aria-live="off">
              <button className="home-showcase-arrow previous" type="button" aria-label="Previous spotlight" onClick={() => changeShowcaseSlide(-1)}>
                <ChevronLeft size={20} />
              </button>
              <img
                key={showcaseIndex}
                className="home-showcase-image"
                src={homeShowcaseImages[showcaseIndex]}
                alt={`${activeSlide.page} spotlight`}
              />
              <button className="home-showcase-arrow next" type="button" aria-label="Next spotlight" onClick={() => changeShowcaseSlide(1)}>
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="home-showcase-copy">
              <span>{activeSlide.page === "Products" ? "COMPONENTS" : activeSlide.page.toUpperCase()}</span>
              <h2>{activeSlide.title}</h2>
              <p>{activeSlide.description}</p>
              <button className="button button-primary" onClick={() => navigate(activeSlide.page)}>{activeSlide.action} <ArrowRight size={15} /></button>
            </div>
            <div className="home-showcase-dots" aria-label="Choose spotlight">
                {homeShowcaseImages.map((_, index) => (
                  <button
                    key={index}
                    className={`home-showcase-dot${index === showcaseIndex ? " active" : ""}`}
                    type="button"
                    aria-label={`Show spotlight ${index + 1}`}
                    aria-current={index === showcaseIndex ? "true" : undefined}
                    onClick={() => setShowcaseIndex(index)}
                  />
                ))}
            </div>
        </div>
        <section className="home-categories" id="explore">
          <h2>Explore the Ecosystem</h2>
          <div className="home-category-grid">
          {categories.map(({ name, caption, icon: Icon, color }) => (
            <button className="home-category-card" key={name} onClick={() => navigate(name)}>
              <span className={`home-category-icon ${color}`}><Icon size={22} /></span>
              <span className="home-category-copy"><strong>{name === "Products" ? "Components" : name === "Learn" ? "Resources" : name}</strong><small>{caption}</small></span>
            </button>
          ))}
          </div>
        </section>

        <section className="home-projects">
          <div className="home-section-heading"><h2>Projects for Sale</h2><button className="home-text-link" onClick={() => navigate("Projects")}>View all <ArrowRight size={16} /></button></div>
          <div className="home-project-grid home-card-rail" aria-label="Projects for sale">
          {featuredProjects.map((item) => (
            <article className="home-project-card" key={item.id}>
              <div className="home-project-image">
                {item.imageUrl && <img src={item.imageUrl} alt={`${item.title} project`} loading="lazy" />}
                <span>Sample</span>
              </div>
              <div className="home-project-content">
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <div className="home-project-tags">{item.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>
                {item.projectPrice !== undefined && <strong className="home-project-price">{formatPrice(item.projectPrice)}</strong>}
                <button className="home-project-link" type="button" onClick={() => onViewListing(item)}>View details <ArrowRight size={14} /></button>
                <button className="home-project-order" onClick={() => addProjectToCart(item.id)}>Order now <ArrowRight size={15} /></button>
              </div>
            </article>
          ))}
          </div>
        </section>

        <HomeOpportunitySection
          title="Internship Opportunities"
          page="Internships"
          listings={featuredInternships}
          emptyMessage="No verified internship opportunities are available right now."
          navigate={navigate}
          onViewListing={onViewListing}
        />
        <HomeOpportunitySection
          title="Hackathons"
          page="Hackathons"
          listings={featuredHackathons}
          emptyMessage="No verified hackathon opportunities are available right now."
          navigate={navigate}
          onViewListing={onViewListing}
        />

        <section className="home-trust-strip">
          <span className="home-trust-icon"><ShieldCheck size={22} /></span>
          <span><strong>Clear about what’s real.</strong><small>Real projects, clear guidance, source-linked opportunities.</small></span>
        </section>
      </section>
    </main>
  );
}

function HomeOpportunitySection({
  title,
  page,
  listings,
  emptyMessage,
  navigate,
  onViewListing,
}: {
  title: string;
  page: "Internships" | "Hackathons";
  listings: Listing[];
  emptyMessage: string;
  navigate: (page: Page) => void;
  onViewListing: (listing: Listing) => void;
}) {
  return (
    <section className="home-opportunities">
      <div className="home-section-heading">
        <h2>{title}</h2>
        <button className="home-text-link" onClick={() => navigate(page)}>View all <ArrowRight size={16} /></button>
      </div>
      <div className="home-opportunity-rail home-card-rail" aria-label={`${title} previews`}>
        {listings.length > 0 ? listings.map((listing) => (
          <article className="home-opportunity-card" key={listing.id}>
            <div className="home-opportunity-image">
              <img src={page === "Internships" ? internshipOpportunityImage : hackathonOpportunityImage} alt={`${page} opportunities`} loading="lazy" decoding="async" />
              <span className="home-opportunity-label">SOURCE-LINKED LEAD</span>
            </div>
            <h3>{listing.title}</h3>
            <p>{listing.summary}</p>
            <div className="home-opportunity-meta">
              <span>{listing.organization}</span>
              <span>{listing.city}</span>
            </div>
            <div className="home-opportunity-tags">{listing.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            <button className="home-project-link" type="button" onClick={() => onViewListing(listing)}>View details <ArrowRight size={14} /></button>
          </article>
        )) : (
          <article className="home-opportunity-card home-opportunity-empty">
            <span className="home-opportunity-label">VERIFIED LISTINGS</span>
            <p>{emptyMessage}</p>
            <button className="home-project-link" onClick={() => navigate(page)}>Browse {page.toLowerCase()} <ArrowRight size={15} /></button>
          </article>
        )}
      </div>
    </section>
  );
}

function DirectoryPage({
  page,
  listings,
  city,
  setCity,
  savedIds,
  toggleSaved,
  compareIds,
  toggleCompare,
  setEnquiry,
  addProjectToCart,
  onViewListing,
  onViewResource,
  customizationRequestId,
  onCustomizationRequestHandled,
}: {
  page: Listing["kind"];
  listings: Listing[];
  city: string;
  setCity: (value: string) => void;
  compareIds: string[];
  toggleCompare: (id: string) => void;
  setEnquiry: (listing: Listing) => void;
  addProjectToCart: (id: string) => void;
  onViewListing: (listing: Listing) => void;
  onViewResource: (resource: Resource) => void;
  customizationRequestId: string | null;
  onCustomizationRequestHandled: () => void;
  savedIds: string[];
  toggleSaved: (id: string) => void;
}) {
  const info = intro[page];
  const isLearn = page === "Learn";
  const isProjects = page === "Projects";
  const [projectView, setProjectView] = useState<"ready-made" | "customize">("ready-made");
  const [directoryView, setDirectoryView] = useState<"browse" | "saved">("browse");
  const [customizationProjectId, setCustomizationProjectId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All categories");
  const categoryOptions = Array.from(new Set(listings.filter((item) => item.kind === page).flatMap((item) => item.projectCategory ? [item.projectCategory] : item.tags))).sort();
  const filtered = listings.filter((item) => item.kind === page && (isProjects || directoryView === "browse" || savedIds.includes(item.id)) && (selectedCategory === "All categories" || item.projectCategory === selectedCategory || item.tags.includes(selectedCategory)) && (city === "All locations" || item.city.toLowerCase().includes(city.toLowerCase())));
  const filteredResources = resources.filter((item) => (directoryView === "browse" || savedIds.includes(resourceId(item.title))) && (selectedCategory === "All categories" || item.category === selectedCategory));
  const resourceCategories = Array.from(new Set(resources.map((item) => item.category))).sort();
  const customizationProject = listings.find((item) => item.id === customizationProjectId);
  useEffect(() => {
    if (!customizationRequestId) return;
    setCustomizationProjectId(customizationRequestId);
    setProjectView("customize");
    onCustomizationRequestHandled();
  }, [customizationRequestId, onCustomizationRequestHandled]);
  const cityOptions = Array.from(new Set(listings.filter((item) => item.kind === page && item.city !== "Online" && item.city !== "Research concept").map((item) => item.city.split(",")[0]))).sort();
  const opportunityFields: Record<string, string> = {
    Manufacturing: "Services, assembly, prototyping & custom work",
    "PCB Design": "Design, fabrication, assembly & consultation",
    Training: "Course mode, duration & eligibility",
  };
  useEffect(() => {
    setSelectedCategory("All categories");
    setDirectoryView("browse");
    setCity("All locations");
  }, [page]);
  return (
    <main className={`directory-page${isProjects ? " projects-directory" : ""}`}>
      <section className="directory-hero">
        <div className="directory-hero-copy">
          {info.eyebrow && <div className="eyebrow"><span className="eyebrow-line" /> {info.eyebrow}</div>}
          <h1>{info.title}</h1><p>{info.description}</p>
          {page === "Internships" && <div className="sourcing-note"><ShieldCheck size={17} /><span>Source-linked opportunity leads. Confirm the exact role, eligibility, stipend, fees and application status before applying.</span></div>}
        </div>
        <div className="directory-hero-art"><div className="hero-art-label">{page === "Projects" ? "RESEARCH / BUILD / REPEAT" : "DISCOVER / COMPARE / CONNECT"}</div><div className="directory-art-chip">{isProjects ? <Cpu size={55} /> : page === "Internships" || page === "Training" ? <GraduationCap size={55} /> : page === "Products" ? <CircuitBoard size={55} /> : <Layers3 size={55} />}</div><div className="art-small-label">{PLATFORM_NAME.toUpperCase()} <span>•</span> FIELD NOTES {new Date().getFullYear()}</div></div>
      </section>

      {isLearn ? (
        <section className="directory-content">
          <div className="project-mode-tabs" aria-label="Learning resource views">
            <button className={directoryView === "browse" ? "project-mode-tab active" : "project-mode-tab"} onClick={() => setDirectoryView("browse")}>Browse resources</button>
            <button className={directoryView === "saved" ? "project-mode-tab active" : "project-mode-tab"} onClick={() => setDirectoryView("saved")}>Saved resources</button>
          </div>
          <div className="directory-toolbar">
            <div className="results-heading projects-results-heading"><h2>{directoryView === "saved" ? "Saved resources." : "Learning resources."}</h2></div>
            <label className="select-wrap project-category-filter"><select aria-label="Filter resources by category" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}><option>All categories</option>{resourceCategories.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={14} /></label>
            <span className="count-label projects-count">{filteredResources.length} RESOURCES</span>
          </div>
          <div className="resource-grid">
            {filteredResources.map((item) => <ResourceCard item={item} key={item.title} isSaved={savedIds.includes(resourceId(item.title))} onSave={() => toggleSaved(resourceId(item.title))} onViewDetails={() => onViewResource(item)} />)}
          </div>
          {filteredResources.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><BookOpen size={23} /></div>
              <span className="eyebrow"><span className="eyebrow-line" /> LEARNING RESOURCES</span>
              <h3>{directoryView === "saved" ? "No saved resources yet." : "No resources in this category."}</h3>
              <p>{directoryView === "saved" ? "Save a learning resource to keep it in your collection." : "Choose another category to explore the available learning resources."}</p>
            </div>
          ) : <div className="resource-disclaimer"><ShieldCheck size={18} /><div><strong>Source-first learning</strong><p>These links point to official publisher documentation. Links are provided for discovery; publication dates are not displayed when they are not reliably available.</p></div></div>}
        </section>
      ) : (
        <section className="directory-content">
          {isProjects && (
            <div className="project-mode-tabs" aria-label="Project options">
              <button className={projectView === "ready-made" ? "project-mode-tab active" : "project-mode-tab"} onClick={() => setProjectView("ready-made")}>Ready-made projects</button>
              <button className={projectView === "customize" ? "project-mode-tab active" : "project-mode-tab"} onClick={() => setProjectView("customize")}>Project customization</button>
            </div>
          )}
          {!isProjects && (
            <div className="project-mode-tabs" aria-label={`${page} listing views`}>
              <button className={directoryView === "browse" ? "project-mode-tab active" : "project-mode-tab"} onClick={() => setDirectoryView("browse")}>Browse {page.toLowerCase()}</button>
              <button className={directoryView === "saved" ? "project-mode-tab active" : "project-mode-tab"} onClick={() => setDirectoryView("saved")}>Saved {page.toLowerCase()}</button>
            </div>
          )}
          {isProjects && projectView === "customize" ? (
            <section className="project-customize-panel">
              <div className="eyebrow"><span className="eyebrow-line" /> CUSTOM PROJECT REQUEST</div>
              <h2>{customizationProject ? `Customize ${customizationProject.title}` : "Make a project your own."}</h2>
              <p>Tell us which project you want customized using the project request form.</p>
              <a className="button button-outline" href={PROJECT_CUSTOMIZATION_FORM_URL} target="_blank" rel="noreferrer">Open Google Form <ArrowUpRight size={15} /></a>
              {customizationProject && <button className="project-back-link" type="button" onClick={() => setProjectView("ready-made")}>Back to ready-made projects</button>}
            </section>
          ) : (
          <>
          <div className="directory-toolbar">
            {isProjects ? (
              <>
                <div className="results-heading projects-results-heading"><h2>Project ideas.</h2></div>
                <label className="select-wrap project-category-filter"><select aria-label="Filter projects by category" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}><option>All categories</option>{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={14} /></label>
                <span className="count-label projects-count">{filtered.length} PROJECTS</span>
              </>
            ) : (
              <>
                <div className="results-heading projects-results-heading"><h2>{directoryView === "saved" ? `Saved ${page.toLowerCase()}.` : page === "Products" ? "Product ideas." : page === "Internships" ? "Internship ideas." : page === "Training" ? "Training ideas." : "Hackathon ideas."}</h2></div>
                <div className="directory-filter-actions">
                  <label className="select-wrap project-category-filter"><select aria-label={`Filter ${page.toLowerCase()} by category`} value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}><option>All categories</option>{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={14} /></label>
                  <label className="select-wrap location-category-filter"><MapPin size={13} /><select aria-label="Filter by city" value={city} onChange={(event) => setCity(event.target.value)}><option>All locations</option>{cityOptions.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={14} /></label>
                  <button className="filter-chip" onClick={() => { setCity("All locations"); setSelectedCategory("All categories"); }}>Clear filters <X size={13} /></button>
                </div>
                <span className="count-label projects-count">{filtered.length} {page.toUpperCase()}</span>
              </>
            )}
          </div>
          {(page === "Internships" || page === "Products") && filtered.length === 0 ? <EmptyState page={page} /> : filtered.length > 0 ? (
            <>
              <div className={`listing-grid${isProjects ? " projects-listing-grid" : ""}${page === "Training" ? " training-listing-grid" : ""}${page === "Internships" || page === "Hackathons" ? " opportunity-listing-grid" : ""}`}>
                {filtered.map((item, index) => <ListingCard key={item.id} listing={item} index={index} isSaved={savedIds.includes(item.id)} onSave={() => toggleSaved(item.id)} compareIds={compareIds} onCompare={() => toggleCompare(item.id)} onEnquire={() => setEnquiry(item)} isProjects={isProjects} canCompare={page === "Products"} onOrderNow={() => addProjectToCart(item.id)} onViewDetails={() => onViewListing(item)} />)}
              </div>
              {page === "Products" && selectedComparison(filtered, compareIds).length > 1 && (
                <section className="comparison-section" id="comparison"><div className="eyebrow"><span className="eyebrow-line" /> COMPONENT COMPARISON</div><h2>Compare your component shortlist.</h2><div className="comparison-table"><div className="comparison-row comparison-head"><strong>Component</strong>{selectedComparison(filtered, compareIds).map((item) => <strong key={item.id}>{item.title}</strong>)}</div><div className="comparison-row"><span>Category</span>{selectedComparison(filtered, compareIds).map((item) => <span key={item.id}>{item.tags.join(", ")}</span>)}</div><div className="comparison-row"><span>Organization</span>{selectedComparison(filtered, compareIds).map((item) => <span key={item.id}>{item.organization}</span>)}</div><div className="comparison-row"><span>Location</span>{selectedComparison(filtered, compareIds).map((item) => <span key={item.id}>{item.city}</span>)}</div></div></section>
              )}
            </>
          ) : <EmptyState page={page} />}
          {opportunityFields[page] && filtered.length > 0 && <p className="listing-footnote"><Filter size={13} /> Review {opportunityFields[page].toLowerCase()} before you enquire.</p>}
          {page === "Internships" && filtered.length > 0 && <p className="listing-footnote"><ShieldCheck size={13} /> Never pay a recruiter to secure an internship. Apply through an official company page where possible, and verify event fees directly with the organizer before paying.</p>}
          </>
          )}
        </section>
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
  onViewDetails,
}: {
  item: Resource;
  isSaved: boolean;
  onSave: () => void;
  onViewDetails: () => void;
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
      <button type="button" className="text-link" onClick={onViewDetails}>View details <ArrowRight size={15} /></button>
    </article>
  );
}

function ListingDetailPage({
  selection,
  isSaved,
  onBack,
  onSave,
  onTrackOpportunity,
  onEnquire,
  onOrder,
  onCustomize,
}: {
  selection: DetailSelection;
  isSaved: boolean;
  onBack: () => void;
  onSave: () => void;
  onTrackOpportunity?: (listing: Listing) => void;
  onEnquire?: () => void;
  onOrder?: () => void;
  onCustomize?: () => void;
}) {
  if (selection.type === "resource") {
    const resource = selection.item;
    return (
      <main className="detail-page">
        <div className="detail-content">
          <button className="detail-back" type="button" onClick={onBack}><ChevronLeft size={16} /> Back to results</button>
          <section className="detail-panel resource-detail-panel">
            <div className="detail-visual resource-detail-visual"><BookOpen size={54} strokeWidth={1.2} /></div>
            <div className="detail-copy">
              <div className="eyebrow"><span className="eyebrow-line" /> {resource.category}</div>
              <h1>{resource.title}</h1>
              <p className="detail-summary">Published by {resource.publisher}. This resource links to the publisher’s official documentation and is provided as a trusted starting point for learning.</p>
              <div className="detail-facts"><span><BookOpen size={15} /> {resource.category}</span><span><ShieldCheck size={15} /> Official publisher source</span></div>
              <div className="detail-actions">
                <a className="button button-dark" href={resource.href} target="_blank" rel="noreferrer">Open publisher source <ArrowUpRight size={15} /></a>
                <button className="button button-outline" type="button" onClick={onSave}>{isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}{isSaved ? "Saved" : "Save resource"}</button>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const listing = selection.item;
  const isProject = listing.kind === "Projects";
  const isOpportunity = ["Internships", "Training", "Hackathons"].includes(listing.kind);
  const detailImage = isProject ? listing.imageUrl : listing.kind === "Internships" ? internshipOpportunityImage : listing.kind === "Hackathons" ? hackathonOpportunityImage : undefined;
  const isSample = listing.id.startsWith("sample-");
  return (
    <main className="detail-page">
      <div className="detail-content">
        <button className="detail-back" type="button" onClick={onBack}><ChevronLeft size={16} /> Back to results</button>
        <section className="detail-panel">
          <div className={`detail-visual${detailImage ? " has-detail-image" : ""}`}>
            {detailImage ? <img src={detailImage} alt={`${listing.title} preview`} /> : <><CircuitBoard size={58} strokeWidth={1.1} /><span>{listing.kind.toUpperCase()} / TECHCIRCUIT HUB</span></>}
            {isProject && <span className="detail-visual-badge">STUDENT CONCEPT</span>}
          </div>
          <div className="detail-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> {listing.projectCategory ?? listing.kind}</div>
            <h1>{listing.title}</h1>
            <p className="detail-byline">{isProject ? "Student project concept" : listing.organization} <span>·</span> {listing.city}</p>
            {isProject && listing.projectPrice !== undefined && <div className="detail-price">{formatPrice(listing.projectPrice)}</div>}
            <p className="detail-summary">{listing.summary}</p>
            {(listing.mode || listing.duration || listing.eligibility) && (
              <div className="detail-facts">
                {listing.mode && <span><Sparkles size={15} /> {listing.mode}</span>}
                {listing.duration && <span><Clock3 size={15} /> {listing.duration}</span>}
                {listing.eligibility && <span><GraduationCap size={15} /> {listing.eligibility}</span>}
              </div>
            )}
            {listing.tags.length > 0 && <div className="tag-row detail-tags">{listing.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>}
            {listing.components && listing.components.length > 0 && (
              <section className="detail-section">
                <h2>{isProject ? "Specification overview" : "What's included"}</h2>
                <ul className="detail-components">{listing.components.map((component) => <li key={component}>{component}</li>)}</ul>
              </section>
            )}
            {listing.sourceUrl && (
              <section className="detail-section detail-source">
                <h2>Source and verification</h2>
                <p>{listing.verified ? "This listing is marked as verified. Confirm current availability and requirements with the provider." : "Check the provider’s official page for current availability, requirements, and complete details."}</p>
                <a className="text-link" href={listing.sourceUrl} target="_blank" rel="noreferrer" onClick={() => onTrackOpportunity?.(listing)}>{isTrackableOpportunity(listing) ? "Visit opportunity source" : "Visit official source"} <ArrowUpRight size={15} /></a>
              </section>
            )}
            {isSample && <p className="detail-notice"><CircleHelp size={15} /> Illustrative sample listing. Contact details and current availability have not been provided.</p>}
            {isProject && <p className="detail-notice"><ShieldCheck size={15} /> Educational project concept. Final components and scope can be customized.</p>}
            {isOpportunity && <p className="detail-notice"><ShieldCheck size={15} /> Opportunity details can change. Verify deadlines, eligibility, fees, and application status with the organizer.</p>}
            <div className="detail-actions">
              {onOrder && <button className="button button-dark" type="button" onClick={onOrder}>Order now <ArrowRight size={15} /></button>}
              {onCustomize && <button className="button button-outline" type="button" onClick={onCustomize}>Customize project <ArrowRight size={15} /></button>}
              {onEnquire && <button className="button button-dark" type="button" onClick={onEnquire}>Enquire <ArrowRight size={15} /></button>}
              <button className="button button-outline" type="button" onClick={onSave}>{isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}{isSaved ? "Saved" : "Save for later"}</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function parseComponentDetails(value: unknown): ComponentDetails | undefined {
  if (!value || typeof value !== "object") return undefined;
  const details = value as Record<string, unknown>;
  if (typeof details.mpn !== "string" || !details.mpn.trim()) return undefined;
  const offers = Array.isArray(details.offers)
    ? details.offers.flatMap((value): ComponentOffer[] => {
      if (!value || typeof value !== "object") return [];
      const offer = value as Record<string, unknown>;
      const sellerUrl = typeof offer.sellerUrl === "string" ? safeExternalUrl(offer.sellerUrl) : "";
      if (
        typeof offer.seller !== "string"
        || !sellerUrl
        || typeof offer.price !== "number"
        || !Number.isFinite(offer.price)
        || typeof offer.currency !== "string"
        || !/^[A-Z]{3}$/.test(offer.currency)
      ) return [];
      return [{
        seller: offer.seller,
        price: offer.price,
        currency: offer.currency,
        quantity: typeof offer.quantity === "number" && offer.quantity > 0 ? offer.quantity : 1,
        stock: typeof offer.stock === "number" && offer.stock >= 0 ? offer.stock : null,
        moq: typeof offer.moq === "number" && offer.moq > 0 ? offer.moq : null,
        sellerUrl,
        checkedAt: typeof offer.checkedAt === "string" ? offer.checkedAt : "",
      }];
    })
    : [];
  return {
    mpn: details.mpn.trim(),
    category: typeof details.category === "string" ? details.category : "",
    imageUrl: typeof details.imageUrl === "string" ? safeExternalUrl(details.imageUrl) : "",
    offers,
  };
}

function uniqueComponentListings(listings: Listing[]): Listing[] {
  const productsByMpn = new Map<string, Listing>();
  for (const product of listings) {
    const details = product.componentDetails;
    if (!details) continue;
    const mpn = details.mpn.trim().toLowerCase();
    const existing = productsByMpn.get(mpn);
    if (!existing?.componentDetails) {
      productsByMpn.set(mpn, product);
      continue;
    }

    const offers = [...existing.componentDetails.offers];
    for (const offer of details.offers) {
      const existingOfferIndex = offers.findIndex((candidate) =>
        candidate.sellerUrl === offer.sellerUrl
        && candidate.currency === offer.currency
        && candidate.quantity === offer.quantity,
      );
      if (existingOfferIndex === -1) {
        offers.push(offer);
      } else if (offer.checkedAt > offers[existingOfferIndex].checkedAt) {
        offers[existingOfferIndex] = offer;
      }
    }
    productsByMpn.set(mpn, {
      ...existing,
      componentDetails: { ...existing.componentDetails, offers },
    });
  }
  return [...productsByMpn.values()];
}

function ComponentCatalogPage({ listings }: { listings: Listing[] }) {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 4;
  const products = uniqueComponentListings(
    listings.filter((listing) => listing.kind === "Products" && listing.componentDetails),
  );
  const matchingProducts = products.filter((product) => {
    if (!query) return true;
    const details = product.componentDetails;
    const searchable = `${product.title} ${product.organization} ${details?.mpn ?? ""} ${details?.category ?? ""}`.toLowerCase();
    return searchable.includes(query.toLowerCase());
  });

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = searchInput.trim().replace(/\s+/g, " ");
    setQuery(normalizedQuery);
    setCurrentPage(1);
  }

  const pageCount = Math.ceil(matchingProducts.length / pageSize);
  const visibleProducts = matchingProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <main className="directory-page component-catalog-page">
      <section className="directory-hero component-catalog-hero">
        <div className="directory-hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> COMPONENT PRICE COMPARISON</div>
          <h1>Find the right part, <em>compare sellers.</em></h1>
          <p>Search admin-verified components and compare seller prices, stock and order links. Purchases happen on each seller’s site; this page does not sell components.</p>
          <form className="component-search-form" onSubmit={(event) => void search(event)}>
            <label className="sr-only" htmlFor="component-search">Search by component name or manufacturer part number</label>
            <input id="component-search" type="search" minLength={2} maxLength={80} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search a part, e.g. ESP32-WROOM-32 or NE555" />
            <button className="button button-dark" type="submit">Search components <ArrowRight size={15} /></button>
          </form>
        </div>
        <div className="directory-hero-art"><div className="hero-art-label">SEARCH / COMPARE / BUY</div><div className="directory-art-chip"><Scale size={48} /></div><div className="art-small-label">SELLER PRICES &amp; STOCK</div></div>
      </section>
      <section className="directory-content component-catalog-content">
        <div className="component-catalog-note"><ShieldCheck size={17} /><span>Offers are entered by an authorized admin from seller pages. Prices and stock can change; compare only prices in the same currency and confirm details with the retailer before purchase.</span></div>
        {query && matchingProducts.length === 0 && (
          <div className="empty-state"><div className="empty-icon"><Cpu size={23} /></div><h3>No listed parts match that search.</h3><p>Try another part name or manufacturer part number.</p></div>
        )}
        {matchingProducts.length > 0 && (
          <>
            <div className="component-search-summary"><h2>{query ? `Results for “${query}”` : "Verified component offers"}</h2><span>{matchingProducts.length} component{matchingProducts.length === 1 ? "" : "s"}</span></div>
            <div className="component-part-list">
              {visibleProducts.map((product) => {
                const details = product.componentDetails;
                if (!details) return null;
                const offers = [...details.offers].sort((left, right) =>
                  left.currency.localeCompare(right.currency) || left.price - right.price || left.seller.localeCompare(right.seller),
                );
                return (
                  <article className="component-part-card" key={product.id}>
                    <div className="component-part-heading">
                      {details.imageUrl ? <img className="component-part-image" src={details.imageUrl} alt={product.title} loading="lazy" /> : <div className="component-part-image component-part-image-placeholder"><Cpu size={30} /></div>}
                      <div>
                        {details.category && <span className="component-part-category">{details.category}</span>}
                        <h3>{product.title}</h3>
                        <p>{product.organization !== "Not specified" ? `${product.organization} · ` : ""}MPN: <strong>{details.mpn}</strong></p>
                        <p className="component-part-description">{product.summary}</p>
                      </div>
                      <span className="component-part-offer-count">{offers.length} seller offer{offers.length === 1 ? "" : "s"}</span>
                    </div>
                    {offers.length > 0 ? (
                      <div className="component-offer-table">
                        <div className="component-offer-row component-offer-header"><span>Seller</span><span>Price (same currency)</span><span>Availability / MOQ</span><span>Buy</span></div>
                        {offers.map((offer, index) => {
                          const checkedAt = offer.checkedAt ? new Date(`${offer.checkedAt}T00:00:00`) : null;
                          return (
                            <div className="component-offer-row" key={`${offer.seller}-${index}`}>
                              <span className="component-seller-name">{offer.seller}{checkedAt && !Number.isNaN(checkedAt.getTime()) ? <small>Checked {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(checkedAt)}</small> : null}</span>
                              <span className="component-offer-price">
                                {offer.price.toLocaleString(undefined, { maximumFractionDigits: 4 })} {offer.currency} / unit
                                {offer.quantity > 1 && <small>price at quantity {offer.quantity}+</small>}
                              </span>
                              <span className="component-offer-stock">
                                {offer.stock === null ? "Stock not listed" : `${offer.stock.toLocaleString()} in stock`}
                                {offer.moq !== null && <small>MOQ {offer.moq}</small>}
                              </span>
                              <span><a className="button button-outline button-small" href={offer.sellerUrl} target="_blank" rel="noreferrer">Visit seller <ArrowUpRight size={13} /></a></span>
                            </div>
                          );
                        })}
                      </div>
                    ) : <p className="component-no-offers">Seller offers are not available for this component yet.</p>}
                  </article>
                );
              })}
            </div>
            {pageCount > 1 && (
              <nav className="component-pagination" aria-label="Component pages">
                <button className="button button-outline button-small" type="button" onClick={() => setCurrentPage((page) => page - 1)} disabled={currentPage === 1}>
                  <ChevronLeft size={14} /> Previous
                </button>
                <span>Page {currentPage} of {pageCount}</span>
                <button className="button button-outline button-small" type="button" onClick={() => setCurrentPage((page) => page + 1)} disabled={currentPage === pageCount}>
                  Next <ChevronRight size={14} />
                </button>
              </nav>
            )}
          </>
        )}
        {!query && matchingProducts.length === 0 && <div className="empty-state component-search-empty"><div className="empty-icon"><Cpu size={23} /></div><h3>Verified component comparisons are coming soon.</h3><p>Our team is preparing the first components with sourced seller prices and product images. No estimated prices are displayed.</p></div>}
      </section>
    </main>
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
  onViewListing,
}: {
  listings: Listing[];
  cartIds: string[];
  removeProject: (id: string) => void;
  onCheckout: () => void;
  onContinueShopping: () => void;
  onViewListing: (listing: Listing) => void;
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
                    <button className="cart-item-title" type="button" onClick={() => onViewListing(item)}>{item.title}</button>
                    <p>{item.summary}</p>
                    {item.components?.length ? <p className="cart-item-spec"><strong>Components:</strong> {item.components.join(", ")}</p> : null}
                    <button className="text-link" type="button" onClick={() => onViewListing(item)}>View details <ArrowRight size={14} /></button>
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
  onViewListing,
  onViewResource,
}: {
  listings: Listing[];
  savedIds: string[];
  toggleSaved: (id: string) => void;
  setEnquiry: (listing: Listing) => void;
  onViewListing: (listing: Listing) => void;
  onViewResource: (resource: Resource) => void;
}) {
  const savedListings = listings.filter((item) => savedIds.includes(item.id));
  const savedResources = resources.filter((item) => savedIds.includes(resourceId(item.title)));
  const [savedView, setSavedView] = useState<"listings" | "resources">(() => savedListings.length || !savedResources.length ? "listings" : "resources");
  const [savedCategory, setSavedCategory] = useState("All categories");
  const listingCategories = Array.from(new Set(savedListings.flatMap((item) => item.projectCategory ? [item.projectCategory] : item.tags))).sort();
  const resourceCategories = Array.from(new Set(savedResources.map((item) => item.category))).sort();
  const categories = savedView === "listings" ? listingCategories : resourceCategories;
  const filteredListings = savedListings.filter((item) => savedCategory === "All categories" || item.projectCategory === savedCategory || item.tags.includes(savedCategory));
  const filteredResources = savedResources.filter((item) => savedCategory === "All categories" || item.category === savedCategory);
  const savedCount = savedView === "listings" ? filteredListings.length : filteredResources.length;
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
        <div className="project-mode-tabs" aria-label="Saved item types">
          <button className={savedView === "listings" ? "project-mode-tab active" : "project-mode-tab"} onClick={() => { setSavedView("listings"); setSavedCategory("All categories"); }}>Saved listings</button>
          <button className={savedView === "resources" ? "project-mode-tab active" : "project-mode-tab"} onClick={() => { setSavedView("resources"); setSavedCategory("All categories"); }}>Saved resources</button>
        </div>
        <div className="directory-toolbar">
          <div className="results-heading projects-results-heading"><h2>{savedView === "listings" ? "Saved listings." : "Saved resources."}</h2></div>
          <label className="select-wrap project-category-filter"><select aria-label="Filter saved items by category" value={savedCategory} onChange={(event) => setSavedCategory(event.target.value)}><option>All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={14} /></label>
          <span className="count-label projects-count">{savedCount} SAVED</span>
        </div>
        {savedCount === 0 ? (
          <div className="empty-state"><div className="empty-icon"><Bookmark size={23} /></div><span className="eyebrow"><span className="eyebrow-line" /> BUILD YOUR SHORTLIST</span><h3>{savedCategory !== "All categories" ? "No saved items in this category." : savedView === "listings" ? "No saved listings yet." : "No saved resources yet."}</h3><p>{savedCategory !== "All categories" ? "Choose another category to view the rest of your saved items." : "Use the bookmark icon on a directory listing or learning resource to keep it here for later."}</p></div>
        ) : (
          <>
            {savedView === "listings" ? <div className="listing-grid">{filteredListings.map((item, index) => <ListingCard key={item.id} listing={item} index={index} isSaved onSave={() => toggleSaved(item.id)} compareIds={[]} onCompare={() => undefined} onEnquire={() => setEnquiry(item)} isProjects={item.kind === "Projects"} onViewDetails={() => onViewListing(item)} />)}</div> : <div className="resource-grid saved-resources">{filteredResources.map((item) => <ResourceCard item={item} key={item.title} isSaved onSave={() => toggleSaved(resourceId(item.title))} onViewDetails={() => onViewResource(item)} />)}</div>}
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
  onViewDetails,
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
  onViewDetails: () => void;
}) {
  const live = !listing.id.startsWith("sample-");
  const isOpportunity = listing.kind === "Internships" || listing.kind === "Hackathons";
  const visual = ["tile-mint", "tile-peach", "tile-blue"][index % 3];
  return (
    <article className={`listing-card${isOpportunity ? " opportunity-listing-card" : ""}`}>
      <div className={`listing-visual ${isProjects ? "project-visual" : visual}`}>
        {isProjects && listing.imageUrl ? <button className="project-image-trigger" type="button" onClick={onViewDetails} aria-label={`View details for ${listing.title}`}><img className="project-image" src={listing.imageUrl} alt="" loading="lazy" decoding="async" /></button> : isProjects ? <button className="project-image-trigger project-image-placeholder" type="button" onClick={onViewDetails} aria-label={`View details for ${listing.title}`}><CircuitBoard size={42} /><span>Project image not provided</span></button> : isOpportunity ? (
          <img className="opportunity-card-image" src={listing.kind === "Internships" ? internshipOpportunityImage : hackathonOpportunityImage} alt={`${listing.kind} opportunities`} loading="lazy" decoding="async" />
        ) : (
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
        <button className="project-title-button" type="button" onClick={onViewDetails}><h3>{listing.title}</h3></button>{isProjects && listing.projectPrice !== undefined ? <div className="project-price">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(listing.projectPrice)}</div> : <div className="listing-org">{listing.organization}</div>}
        <p className="listing-summary">{listing.summary}</p>
        {listing.mode && <div className="listing-facts"><span><Sparkles size={13} /> {listing.mode}</span>{listing.duration && <span><Clock3 size={13} /> {listing.duration}</span>}{listing.eligibility && <span>{listing.eligibility}</span>}</div>}
        <div className="tag-row">{listing.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
        <div className="listing-actions">
          <button type="button" className="button button-outline button-small" onClick={onViewDetails}>View details <ArrowRight size={14} /></button>
          {isProjects && onOrderNow && <button className="button button-dark button-small" onClick={onOrderNow}>Order now</button>}
          {!isProjects && canCompare && <button className={compareIds.includes(listing.id) ? "button button-primary button-small" : "button button-outline button-small"} onClick={onCompare}>{compareIds.includes(listing.id) ? <Check size={14} /> : <Layers3 size={14} />}{compareIds.includes(listing.id) ? "Added" : "Compare"}</button>}
          {!isProjects && !canCompare && !isOpportunity && <button className="button button-outline button-small" onClick={onEnquire}>Enquire <ArrowRight size={14} /></button>}
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

function StudentAuthModal({ isPasswordRecovery, onClose, onAuthenticated }: { isPasswordRecovery: boolean; onClose: () => void; onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<"signin" | "signup" | "recover" | "updatePassword">(isPasswordRecovery ? "updatePassword" : "signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const configured = Boolean(getSupabase());

  useEffect(() => {
    if (isPasswordRecovery) {
      setMode("updatePassword");
      setError("");
      setMessage("");
    }
  }, [isPasswordRecovery]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    const supabase = getSupabase();
    if (!supabase) {
      setError("Student accounts are unavailable until Supabase is configured.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "recover") {
        const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: window.location.origin,
        });
        if (recoveryError) {
          setError(`Could not send a password reset email: ${recoveryError.message}`);
          return;
        }
        setMessage("If an account exists for this email, a password reset link will arrive shortly. Check your inbox and spam folder.");
      } else if (mode === "updatePassword") {
        if (password !== confirmPassword) {
          setError("The passwords do not match.");
          return;
        }
        const { data, error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
          setError(`Could not update your password: ${updateError.message}`);
          return;
        }
        if (data.user) onAuthenticated(data.user);
        onClose();
      } else if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { name } },
        });
        if (signUpError) {
          const alreadyRegistered =
            signUpError.code === "user_already_exists" ||
            signUpError.message.toLowerCase().includes("already registered");
          if (alreadyRegistered) {
            setMode("signin");
            setPassword("");
            setMessage("This email already has an account. Log in with your password, continue with Google if you originally signed up with Google, or choose Forgot password.");
            return;
          }
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
        if (data.session && data.user) {
          onAuthenticated(data.user);
          onClose();
          return;
        }
        setMessage("Account created. Email confirmation is still enabled in Supabase. Turn off Confirm email in Authentication settings to sign in without email confirmation.");
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (signInError) {
          if (signInError.code === "email_not_confirmed") {
            setError("Your email address has not been confirmed yet. Check your inbox for the confirmation link, or request a new password reset email if you no longer have it.");
            return;
          }
          if (signInError.code === "invalid_credentials") {
            setPassword("");
            setMode("recover");
            setMessage("Those sign-in details were not accepted. If you created this account with email and password, send a reset link below. If you used Google, go back to log in and choose Continue with Google.");
            return;
          }
          setError(
            `Sign-in failed: ${signInError.message}`,
          );
          return;
        }
        if (data.user) onAuthenticated(data.user);
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
        <h2 id="student-auth-title">{mode === "signup" ? "Join the circuit." : mode === "recover" ? "Reset your password." : mode === "updatePassword" ? "Choose a new password." : "Welcome back."}</h2>
        <p className="modal-context">{mode === "recover" ? "Enter the email address on your account and we’ll send a password reset link." : mode === "updatePassword" ? "Choose a new password for your student account." : "Create an account or log in. Complete your student profile the first time you enter."}</p>
        {!isPasswordRecovery && mode !== "recover" && <div className="auth-mode-tabs" role="tablist" aria-label="Student account action">
          <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); setMessage(""); }}>Create account</button>
          <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setError(""); setMessage(""); }}>Log in</button>
        </div>}
        {!configured && <div className="modal-sample-warning"><CircleHelp size={15} /> Connect Supabase to enable student accounts.</div>}
        <form className="enquiry-form" onSubmit={submit}>
          {mode === "signup" && <label>Your name<input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label>}
          {mode !== "updatePassword" && <label>Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>}
          {mode !== "recover" && <label>{mode === "updatePassword" ? "New password" : "Password"}<input required type="password" minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label>}
          {mode === "updatePassword" && <label>Confirm new password<input required type="password" minLength={6} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter the new password again" /></label>}
          {mode === "signin" && <button className="auth-recovery-link" type="button" onClick={() => { setMode("recover"); setError(""); setMessage(""); }}>Forgot password?</button>}
          {error && <div className="admin-message" role="alert">{error}</div>}
          {message && <div className="auth-success" role="status">{message}</div>}
          {configured && <button className="button button-dark" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create student account" : mode === "recover" ? "Send reset link" : mode === "updatePassword" ? "Update password" : "Sign in"} <ArrowRight size={15} /></button>}
        </form>
        {(mode === "recover" || mode === "updatePassword") && <button className="auth-recovery-link" type="button" onClick={() => { setMode("signin"); setError(""); setMessage(""); }}>Back to log in</button>}
        {configured && (mode === "signin" || mode === "signup") && (
          <>
            <div className="auth-divider" aria-hidden="true"><span>OR</span></div>
            <button className="button button-outline google-auth-button" type="button" onClick={signInWithGoogle} disabled={busy}>
              {busy ? "Please wait…" : "Continue with Google"}
            </button>
          </>
        )}
        <p className="auth-flow-note">New students create an account. Returning students log in. Student details are required before entering the student area.</p>
      </section>
    </div>
  );
}

function OpportunityReturnPrompt({
  listing,
  busy,
  error,
  onChoose,
}: {
  listing: Listing;
  busy: boolean;
  error: string;
  onChoose: (status: OpportunityActivityStatus) => void;
}) {
  return (
    <div className="modal-overlay opportunity-return-overlay" role="presentation">
      <section className="enquiry-modal opportunity-return-modal" role="dialog" aria-modal="true" aria-labelledby="opportunity-return-title">
        <div className="admin-lock"><BriefcaseBusiness size={23} /></div>
        <div className="eyebrow"><span className="eyebrow-line" /> OPPORTUNITY FOLLOW-UP</div>
        <h2 id="opportunity-return-title">Did you apply or register?</h2>
        <p className="modal-context"><strong>{listing.title}</strong> from {listing.organization}. Your answer is saved privately to your student account; the provider does not confirm it.</p>
        {error && <div className="admin-message" role="alert">{error}</div>}
        <div className="opportunity-return-actions">
          <button className="button button-primary" type="button" disabled={busy} onClick={() => onChoose("applied")}>
            {busy ? "Saving…" : "Yes, mark as applied"}
          </button>
          <button className="button button-outline" type="button" disabled={busy} onClick={() => onChoose("visited")}>
            Just visited
          </button>
        </div>
      </section>
    </div>
  );
}

function StudentDashboard({
  student,
  section,
  setSection,
  navigate,
  listings,
  savedIds,
  onViewListing,
  opportunityActivityRevision,
  onUpdateOpportunityActivity,
}: {
  student: User | null;
  section: StudentDashboardSection;
  setSection: (section: StudentDashboardSection) => void;
  navigate: (page: Page) => void;
  listings: Listing[];
  savedIds: string[];
  onViewListing: (listing: Listing) => void;
  opportunityActivityRevision: number;
  onUpdateOpportunityActivity: (activity: OpportunityActivity, status: OpportunityActivityStatus) => void;
}) {
  const [message, setMessage] = useState("");
  const [opportunityActivities, setOpportunityActivities] = useState<OpportunityActivity[]>([]);
  const [opportunityActivityLoading, setOpportunityActivityLoading] = useState(Boolean(student));
  const [opportunityActivityLoadError, setOpportunityActivityLoadError] = useState("");
  const [profileLoading, setProfileLoading] = useState(Boolean(student));
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileSetupRequired, setProfileSetupRequired] = useState(false);
  const [profileLoadAttempt, setProfileLoadAttempt] = useState(0);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileLoadError, setProfileLoadError] = useState("");
  const [profileName, setProfileName] = useState(student?.user_metadata.name ?? "");
  const [institution, setInstitution] = useState("");
  const [course, setCourse] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [location, setLocation] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const savedListings = listings.filter((listing) => savedIds.includes(listing.id));
  const savedResources = resources.filter((resource) => savedIds.includes(resourceId(resource.title)));
  const savedProjects = savedListings.filter((listing) => listing.kind === "Projects");
  const appliedOpportunityCount = opportunityActivities.filter((activity) => activity.status === "applied" && activity.opportunity_kind === "Internships").length;
  const appliedEnrollmentCount = opportunityActivities.filter((activity) => activity.status === "applied" && activity.opportunity_kind === "Training").length;
  const trackedHackathonCount = opportunityActivities.filter((activity) => activity.opportunity_kind === "Hackathons").length;
  const recommendedListings = listings
    .filter((listing) => ["Internships", "Training", "Hackathons", "Projects"].includes(listing.kind))
    .map((listing) => {
      const searchable = `${listing.title} ${listing.summary} ${listing.tags.join(" ")} ${listing.projectCategory ?? ""}`.toLowerCase();
      const matchCount = interests.filter((interest) => searchable.includes(interest.toLowerCase())).length;
      return { listing, matchCount };
    })
    .sort((left, right) => right.matchCount - left.matchCount)
    .slice(0, 4)
    .map(({ listing }) => listing);
  const displayName = profileName || student?.email?.split("@")[0] || "Student";
  const quickAccess = [
    { label: "Internships", description: "Find your next opportunity", page: "Internships" as Page, icon: BriefcaseBusiness, tone: "blue" },
    { label: "Training", description: "Build practical skills", page: "Training" as Page, icon: GraduationCap, tone: "green" },
    { label: "Hackathons", description: "Learn by making together", page: "Hackathons" as Page, icon: Code2, tone: "purple" },
    { label: "Resources", description: "Explore trusted study guides", page: "Learn" as Page, icon: BookOpen, tone: "cyan" },
    { label: "Projects", description: "Discover your next build", page: "Projects" as Page, icon: Cpu, tone: "orange" },
    { label: "Component comparison", description: "Compare parts for your build", page: "Products" as Page, icon: Scale, tone: "pink" },
  ];
  const sectionTitle: Record<StudentDashboardSection, string> = {
    overview: "Student dashboard",
    applications: "My Applications & Enrollments",
    notifications: "Notifications",
    profile: "My Profile",
    settings: "Settings & Support",
  };

  useEffect(() => {
    if (!student) {
      setOpportunityActivities([]);
      setOpportunityActivityLoading(false);
      setOpportunityActivityLoadError("");
      return;
    }
    const currentStudent = student;
    const client = getSupabase();
    let active = true;
    setOpportunityActivityLoading(true);
    setOpportunityActivityLoadError("");
    async function loadOpportunityActivities() {
      if (!client) {
        setOpportunityActivityLoadError("Opportunity tracking is unavailable until Supabase is configured.");
        setOpportunityActivityLoading(false);
        return;
      }
      try {
        const { data, error } = await client
          .from("opportunity_activity")
          .select("opportunity_id, opportunity_kind, title, organization, city, opportunity_url, status, visited_at, applied_at, updated_at")
          .eq("user_id", currentStudent.id)
          .order("updated_at", { ascending: false });
        if (!active) return;
        if (error) {
          setOpportunityActivityLoadError(`Could not load your opportunity activity: ${error.message}`);
          return;
        }
        setOpportunityActivities((data ?? []).map((row) => ({
          opportunity_id: row.opportunity_id,
          opportunity_kind: row.opportunity_kind as TrackableOpportunityKind,
          title: row.title,
          organization: row.organization,
          city: row.city,
          opportunity_url: row.opportunity_url,
          status: row.status === "applied" ? "applied" : "visited",
          visited_at: row.visited_at,
          applied_at: row.applied_at,
          updated_at: row.updated_at,
        })));
      } catch {
        if (active) setOpportunityActivityLoadError("Could not load your opportunity activity. Please try again.");
      } finally {
        if (active) setOpportunityActivityLoading(false);
      }
    }
    void loadOpportunityActivities();
    return () => { active = false; };
  }, [student, opportunityActivityRevision]);

  useEffect(() => {
    if (!student) return;
    const currentStudent = student;
    const supabase = getSupabase();
    if (!supabase) {
      setProfileLoadError("Student profile setup is unavailable until Supabase is configured.");
      setProfileLoading(false);
      setProfileLoaded(true);
      setProfileSetupRequired(true);
      return;
    }
    const client = supabase;
    let active = true;
    setProfileLoading(true);
    setProfileLoadError("");
    async function loadProfile() {
      try {
        const { data, error } = await client
          .from("profiles")
          .select("display_name, institution, course, academic_year, city, interests")
          .eq("id", currentStudent.id)
          .maybeSingle();
        if (!active) return;
        if (error) {
          setProfileLoadError(`Could not load your profile: ${error.message}`);
          return;
        }
        const name = data?.display_name || currentStudent.user_metadata.name || "";
        const selectedInterests = data?.interests ?? [];
        setProfileName(name);
        setInstitution(data?.institution ?? "");
        setCourse(data?.course ?? "");
        setAcademicYear(data?.academic_year ?? "");
        setLocation(data?.city ?? "");
        setInterests(selectedInterests);
        const complete = Boolean(name.trim() && data?.institution?.trim() && data?.course?.trim() && data?.academic_year?.trim() && selectedInterests.length);
        setProfileSetupRequired(!complete);
        if (!complete) setSection("profile");
      } catch {
        if (active) setProfileLoadError("Could not load your profile. Please try again.");
      } finally {
        if (active) {
          setProfileLoading(false);
          setProfileLoaded(true);
        }
      }
    }
    void loadProfile();
    return () => { active = false; };
  }, [student, profileLoadAttempt, setSection]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!student) return;
    if (!profileName.trim() || !institution.trim() || !course.trim() || !academicYear) {
      setProfileError("Enter your name, institution, course and academic year to continue.");
      return;
    }
    if (interests.length === 0) {
      setProfileError("Choose at least one area of interest to continue.");
      return;
    }
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
          academic_year: academicYear,
          city: location.trim(),
          interests,
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
      setProfileSetupRequired(false);
      if (profileSetupRequired) setSection("overview");
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
    setMessage("");
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

  if (!profileLoaded || profileLoading || profileLoadError) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-hero">
          <div><div className="eyebrow"><span className="eyebrow-line" /> STUDENT PROFILE SETUP</div><h1>One quick step <em>before you begin.</em></h1><p>We’ll prepare your student space once your profile is ready.</p></div>
          <button className="button button-outline button-small" onClick={signOut}><LogOut size={14} /> Sign out</button>
        </section>
        <section className="dashboard-content">
          <div className="empty-state dashboard-menu-empty">
            <div className="empty-icon">{profileLoading ? <Clock3 size={23} /> : <CircleHelp size={23} />}</div>
            <span className="eyebrow"><span className="eyebrow-line" /> VERIFYING STUDENT PROFILE</span>
            <h3>{profileLoading ? "Checking your student details…" : "We couldn’t load your profile."}</h3>
            <p>{profileLoading ? "Your student area will open after we confirm your academic details and interests." : profileLoadError || "Try again to continue."}</p>
            {!profileLoading && <button className="button button-primary" type="button" onClick={() => setProfileLoadAttempt((attempt) => attempt + 1)}>Try again <ArrowRight size={15} /></button>}
          </div>
        </section>
      </main>
    );
  }

  const profileSection = (
    <section
      className={`student-profile-section${profileSetupRequired ? " student-setup-modal" : ""}`}
      role={profileSetupRequired ? "dialog" : undefined}
      aria-modal={profileSetupRequired ? true : undefined}
      aria-labelledby={profileSetupRequired ? "student-setup-title" : undefined}
    >
      <div className="dashboard-section-head"><div><div className="eyebrow"><span className="eyebrow-line" /> {profileSetupRequired ? "STUDENT DETAILS" : "YOUR DETAILS"}</div><h2 id={profileSetupRequired ? "student-setup-title" : undefined}>{profileSetupRequired ? "Set up your student profile" : "Student profile"}</h2>{profileSetupRequired && <p className="profile-setup-intro">Tell us about your studies and choose the engineering areas you want to explore.</p>}</div><span className="profile-private-note"><ShieldCheck size={14} /> Private to your account</span></div>
      <form className="student-profile-form" onSubmit={saveProfile}>
        <label>Full name<input required value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Your full name" /></label>
        <label>Email address<input value={student.email ?? ""} readOnly aria-readonly="true" /></label>
        <label>College / institution<input required value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="Your college or institution" /></label>
        <label>Course / branch<input required value={course} onChange={(event) => setCourse(event.target.value)} placeholder="e.g. Electronics and Communication Engineering" /></label>
        <label>Academic year<select required value={academicYear} onChange={(event) => setAcademicYear(event.target.value)}><option value="">Select your year</option>{ACADEMIC_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
        <label>City <span>(optional)</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Your city" /></label>
        <fieldset className="student-interest-fieldset">
          <legend>What areas interest you? <span>Select one or more</span></legend>
          <div className="student-interest-options">
            {STUDENT_INTERESTS.map((interest) => (
              <label key={interest} className={interests.includes(interest) ? "student-interest-option selected" : "student-interest-option"}>
                <input type="checkbox" checked={interests.includes(interest)} onChange={() => setInterests((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest])} />
                <span>{interest}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {(profileLoading || profileSaving) && <p className="profile-status" role="status">{profileLoading ? "Loading your profile…" : "Saving profile…"}</p>}
        {profileError && <p className="admin-message profile-status" role="alert">{profileError}</p>}
        {message && <p className="auth-success profile-status" role="status">{message}</p>}
        <button className="button button-primary profile-save" type="submit" disabled={profileLoading || profileSaving}>{profileSaving ? "Saving your profile…" : profileSetupRequired ? "Save details and continue" : "Save profile"} <Check size={15} /></button>
      </form>
    </section>
  );

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> {profileSetupRequired ? "STEP 3 · STUDENT DETAILS" : `STUDENT MENU / ${sectionTitle[section].toUpperCase()}`}</div>
          <h1>{profileSetupRequired ? "Let’s set up your student profile." : section === "overview" ? <>Good to see you, <em>{displayName}.</em></> : sectionTitle[section]}</h1>
          <p>{profileSetupRequired ? "Add your academic details and learning interests to continue." : section === "overview" ? `Your journey in ${course || "electronics"} continues here.` : "Manage your learning journey and student account."}</p>
          {section === "overview" && !profileSetupRequired && (
            <button className="dashboard-focus-chip" type="button" onClick={() => setSection("profile")}>
              <Sparkles size={15} /> Focus areas: {interests.slice(0, 2).join(", ")}{interests.length > 2 ? ` +${interests.length - 2}` : ""}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
        <div className="dashboard-hero-actions">
          {section === "overview" && !profileSetupRequired && <div className="dashboard-quote">“Small steps in learning today, big circuits in your future.”</div>}
          <button className="button button-outline button-small" onClick={signOut}><LogOut size={14} /> Sign out</button>
        </div>
      </section>
      <section className="dashboard-content">
        {section === "overview" && !profileSetupRequired && (
          <>
            <section className="dashboard-home-section">
              <div className="dashboard-section-head"><div><h2>Quick access</h2><p>Explore and take the next step in your learning journey.</p></div></div>
              <div className="dashboard-quick-grid">
                {quickAccess.map(({ label, description, page: destination, icon: Icon, tone }) => (
                  <button className={`dashboard-quick-card tone-${tone}`} key={label} type="button" onClick={() => navigate(destination)}>
                    <span className="dashboard-quick-icon"><Icon size={22} /></span>
                    <span className="dashboard-quick-copy"><strong>{label}</strong><small>{description}</small></span>
                    <span className="dashboard-quick-arrow"><ArrowUpRight size={17} /></span>
                  </button>
                ))}
              </div>
            </section>

            <section className="dashboard-home-section">
              <div className="dashboard-section-head"><div><h2>My progress</h2><p>Your saved learning and profile activity.</p></div><button className="text-link" type="button" onClick={() => navigate("Saved")}>View bookmarks <ArrowRight size={15} /></button></div>
              <div className="dashboard-progress-grid">
                <article className="progress-card tone-blue"><span className="dashboard-metric-icon"><BriefcaseBusiness size={17} /></span><span>APPLICATIONS</span><strong>{opportunityActivityLoading || opportunityActivityLoadError ? "—" : appliedOpportunityCount}</strong><small>{opportunityActivityLoadError ? "Could not load opportunity activity" : "Self-reported internship applications"}</small></article>
                <article className="progress-card tone-green"><span className="dashboard-metric-icon"><GraduationCap size={17} /></span><span>ENROLLMENTS</span><strong>{opportunityActivityLoading || opportunityActivityLoadError ? "—" : appliedEnrollmentCount}</strong><small>{opportunityActivityLoadError ? "Could not load opportunity activity" : "Self-reported training enrollments"}</small></article>
                <article className="progress-card tone-purple"><span className="dashboard-metric-icon"><Code2 size={17} /></span><span>HACKATHONS</span><strong>{opportunityActivityLoading || opportunityActivityLoadError ? "—" : trackedHackathonCount}</strong><small>{opportunityActivityLoadError ? "Could not load opportunity activity" : "Visits and registrations tracked"}</small></article>
                <article className="progress-card tone-cyan"><span className="dashboard-metric-icon"><BookOpen size={17} /></span><span>RESOURCES SAVED</span><strong>{savedResources.length}</strong><small>In your bookmarks</small></article>
                <article className="progress-card tone-orange"><span className="dashboard-metric-icon"><Cpu size={17} /></span><span>PROJECTS SAVED</span><strong>{savedProjects.length}</strong><small>Ideas in your collection</small></article>
                <article className="progress-card tone-pink"><span className="dashboard-metric-icon"><Sparkles size={17} /></span><span>FOCUS AREAS</span><strong>{interests.length}</strong><small>Selected in your profile</small></article>
              </div>
            </section>

            <section className="dashboard-home-section">
              <div className="dashboard-section-head"><div><h2>Recommended for you</h2><p>Discover projects and opportunities related to your interests.</p></div><button className="text-link" type="button" onClick={() => navigate("Projects")}>Explore all <ArrowRight size={15} /></button></div>
              {recommendedListings.length > 0 ? (
                <div className="dashboard-recommend-grid">
                  {recommendedListings.map((listing, index) => (
                    <article className="dashboard-recommend-card" key={listing.id}>
                      <div className={`dashboard-recommend-image tone-${["blue", "green", "purple", "orange"][index % 4]}`}>
                        {listing.kind === "Projects" && listing.imageUrl ? <img src={listing.imageUrl} alt="" loading="lazy" /> : <GraduationCap size={24} />}
                        <span>{listing.kind === "Projects" ? "Project" : listing.kind === "Hackathons" ? "Hackathon" : listing.kind === "Internships" ? "Internship" : "Training"}</span>
                      </div>
                      <div className="dashboard-recommend-content">
                        <span>{listing.organization}</span>
                        <h3>{listing.title}</h3>
                        <p>{listing.summary}</p>
                        <button className="dashboard-recommend-link" type="button" onClick={() => onViewListing(listing)}>
                          View details <ArrowRight size={14} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state dashboard-empty"><div className="empty-icon"><Compass size={22} /></div><h3>More recommendations are on the way.</h3><p>Browse projects and learning opportunities to get started.</p><button className="button button-primary" type="button" onClick={() => navigate("Projects")}>Explore projects <ArrowRight size={15} /></button></div>
              )}
            </section>
          </>
        )}
        {section === "applications" && !profileSetupRequired && (
          <section className="opportunity-activity-section">
            <div className="dashboard-section-head"><div><span className="eyebrow"><span className="eyebrow-line" /> YOUR LEARNING JOURNEY</span><h2>Applications &amp; enrollments</h2><p>Track the opportunities you visited. Application status is based on your answer, not provider confirmation.</p></div></div>
            {opportunityActivityLoading ? (
              <p className="profile-status" role="status">Loading your opportunity activity…</p>
            ) : opportunityActivityLoadError ? (
              <p className="admin-message profile-status" role="alert">{opportunityActivityLoadError}</p>
            ) : opportunityActivities.length === 0 ? (
              <div className="empty-state dashboard-menu-empty">
                <div className="empty-icon"><FileText size={23} /></div>
                <h3>No opportunity activity yet.</h3>
                <p>Open an internship, training, or hackathon source link. When you return, choose whether you applied or just visited.</p>
                <div className="dashboard-menu-actions">
                  <button className="button button-primary" type="button" onClick={() => navigate("Internships")}>Explore internships <ArrowRight size={15} /></button>
                  <button className="button button-outline" type="button" onClick={() => navigate("Training")}>Browse training <ArrowRight size={15} /></button>
                  <button className="button button-outline" type="button" onClick={() => navigate("Hackathons")}>Browse hackathons <ArrowRight size={15} /></button>
                </div>
              </div>
            ) : (
              <div className="opportunity-activity-list">
                {opportunityActivities.map((activity) => (
                  <article className="opportunity-activity-card" key={activity.opportunity_id}>
                    <div className="opportunity-activity-copy">
                      <span className="opportunity-activity-kind">{activity.opportunity_kind}</span>
                      <h3>{activity.title}</h3>
                      <p>{activity.organization} · {activity.city}</p>
                      <span className={`opportunity-activity-status ${activity.status}`}>
                        {activity.status === "applied" ? "Marked applied" : "Just visited"}
                      </span>
                      <small>Updated {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(activity.updated_at))}</small>
                    </div>
                    <div className="opportunity-activity-actions">
                      <a className="button button-outline button-small" href={activity.opportunity_url} target="_blank" rel="noreferrer">Open listing <ArrowUpRight size={14} /></a>
                      <button className="text-link" type="button" onClick={() => onUpdateOpportunityActivity(activity, activity.status === "applied" ? "visited" : "applied")}>
                        {activity.status === "applied" ? "Change to just visited" : "Mark as applied"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
        {section === "notifications" && !profileSetupRequired && (
          <div className="empty-state dashboard-menu-empty">
            <div className="empty-icon"><Bell size={23} /></div>
            <span className="eyebrow"><span className="eyebrow-line" /> UPDATES</span>
            <h3>You’re all caught up.</h3>
            <p>There are no notifications yet. Application and enrollment updates are not currently delivered through the platform.</p>
          </div>
        )}
        {section === "settings" && !profileSetupRequired && (
          <div className="dashboard-settings-grid">
            <article className="dashboard-settings-card">
              <span className="dashboard-metric-icon"><Settings size={18} /></span>
              <span className="eyebrow"><span className="eyebrow-line" /> ACCOUNT SETTINGS</span>
              <h2>Keep your student details up to date.</h2>
              <p>Manage your profile information and account email from your student profile.</p>
              <button className="text-link" type="button" onClick={() => setSection("profile")}>Open my profile <ArrowRight size={15} /></button>
            </article>
            <article className="dashboard-settings-card">
              <span className="dashboard-metric-icon"><LifeBuoy size={18} /></span>
              <span className="eyebrow"><span className="eyebrow-line" /> SUPPORT & RESOURCES</span>
              <h2>Find trusted learning resources.</h2>
              <p>Browse official documentation and learning references for electronics, embedded systems and IoT.</p>
              <button className="text-link" type="button" onClick={() => navigate("Learn")}>Browse resources <ArrowRight size={15} /></button>
            </article>
          </div>
        )}
        {profileSetupRequired ? (
          <div className="modal-overlay student-setup-overlay" role="presentation">
            {profileSection}
          </div>
        ) : section === "profile" ? profileSection : null}
      </section>
    </main>
  );
}

type AdminSection = "overview" | "publish" | "activity" | "profile";

function AdminPage({ onExit }: { onExit: () => void }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSection, setAdminSection] = useState<AdminSection>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState<Listing["kind"]>("Manufacturing");
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [city, setCity] = useState("");
  const [summary, setSummary] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [opportunityActivities, setOpportunityActivities] = useState<AdminOpportunityActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState("");
  const [activityRefreshRevision, setActivityRefreshRevision] = useState(0);
  const [opportunityRows, setOpportunityRows] = useState<AdminOpportunityListing[]>([]);
  const [opportunityRowsLoading, setOpportunityRowsLoading] = useState(true);
  const [opportunityRowsError, setOpportunityRowsError] = useState("");
  const [opportunityRowsRefreshRevision, setOpportunityRowsRefreshRevision] = useState(0);
  const [productRows, setProductRows] = useState<Listing[]>([]);
  const [editingProductId, setEditingProductId] = useState("");
  const [mpn, setMpn] = useState("");
  const [componentCategory, setComponentCategory] = useState("");
  const [componentImageUrl, setComponentImageUrl] = useState("");
  const [offerDrafts, setOfferDrafts] = useState<[ComponentOfferDraft, ComponentOfferDraft]>([
    newComponentOfferDraft(),
    newComponentOfferDraft(),
  ]);

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
        if (data.session) {
          const authorized = await checkAdmin(client, data.session.user.id, setIsAdmin, setMessage);
          if (authorized) setAdminEmail(data.session.user.email ?? "");
        }
      } catch {
        setMessage("Could not restore the admin session.");
      }
    }
    void restoreAdminSession();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !isAdmin) return;
    void loadAdminComponentListings(supabase)
      .then(setProductRows)
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not load component listings."));
  }, [supabase, isAdmin]);

  useEffect(() => {
    if (!supabase || !isAdmin) return;
    let active = true;
    setActivityLoading(true);
    setActivityError("");
    void loadAdminOpportunityActivities(supabase)
      .then((activities) => { if (active) setOpportunityActivities(activities); })
      .catch((error: unknown) => { if (active) setActivityError(error instanceof Error ? error.message : "Could not load student opportunity activity."); })
      .finally(() => { if (active) setActivityLoading(false); });
    return () => { active = false; };
  }, [supabase, isAdmin, activityRefreshRevision]);

  useEffect(() => {
    if (!supabase || !isAdmin) return;
    let active = true;
    setOpportunityRowsLoading(true);
    setOpportunityRowsError("");
    void loadAdminOpportunityListings(supabase)
      .then((rows) => { if (active) setOpportunityRows(rows); })
      .catch((error: unknown) => { if (active) setOpportunityRowsError(error instanceof Error ? error.message : "Could not load opportunity listings."); })
      .finally(() => { if (active) setOpportunityRowsLoading(false); });
    return () => { active = false; };
  }, [supabase, isAdmin, opportunityRowsRefreshRevision]);

  async function toggleOpportunityPublication(listing: AdminOpportunityListing) {
    if (!supabase || !isAdmin) return;
    setMessage("");
    const nextPublished = !listing.isPublished;
    const { error } = await supabase
      .from("listings")
      .update({
        is_published: nextPublished,
        is_expired: false,
        verification_status: nextPublished && listing.verificationStatus === "pending" ? "source-linked" : listing.verificationStatus,
        verified: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", listing.id);
    if (error) {
      setMessage(`Could not ${nextPublished ? "publish" : "unpublish"} opportunity: ${error.message}`);
      return;
    }
    setMessage(nextPublished ? "Opportunity published." : "Opportunity unpublished.");
    setOpportunityRowsRefreshRevision((revision) => revision + 1);
    window.dispatchEvent(new Event("techcircuit:listings-updated"));
  }

  function editComponent(id: string) {
    setEditingProductId(id);
    if (!id) {
      setTitle("");
      setOrganization("");
      setCity("");
      setSummary("");
      setSourceUrl("");
      setMpn("");
      setComponentCategory("");
      setComponentImageUrl("");
      setOfferDrafts([newComponentOfferDraft(), newComponentOfferDraft()]);
      return;
    }
    const product = productRows.find((item) => item.id === id);
    const details = product?.componentDetails;
    if (!product || !details) return;
    setTitle(product.title);
    setOrganization(product.organization);
    setSummary(product.summary);
    setSourceUrl(product.sourceUrl ?? "");
    setMpn(details.mpn);
    setComponentCategory(details.category);
    setComponentImageUrl(details.imageUrl);
    setOfferDrafts([
      componentOfferToDraft(details.offers[0]),
      componentOfferToDraft(details.offers[1]),
    ]);
  }

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setMessage("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(`Sign-in failed: ${error.message}`);
      return;
    }
    const authorized = await checkAdmin(supabase, data.user.id, setIsAdmin, setMessage);
    if (authorized) {
      setAdminEmail(data.user.email ?? "");
      setAdminSection("overview");
    } else {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) setMessage(`This account is not an admin, and sign-out failed: ${signOutError.message}`);
    }
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setMessage(`Sign-out failed: ${error.message}`);
    else {
      setIsAdmin(false);
      setAdminEmail("");
      setMessage("");
      onExit();
    }
  }

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !isAdmin) return;
    setMessage("");
    if (kind === "Products") {
      const enteredOffers = offerDrafts.filter((offer) =>
        Boolean(offer.seller.trim() || offer.price.trim() || offer.sellerUrl.trim()),
      );
      const normalizedOffers = enteredOffers.map((offer) => {
        const price = Number(offer.price);
        const quantity = Number(offer.quantity);
        const stock = offer.stock ? Number(offer.stock) : null;
        const moq = offer.moq ? Number(offer.moq) : null;
        return {
          seller: offer.seller.trim(),
          price,
          currency: offer.currency.trim().toUpperCase(),
          quantity,
          stock,
          moq,
          sellerUrl: safeExternalUrl(offer.sellerUrl.trim()),
          checkedAt: offer.checkedAt,
        };
      });
      const invalidOffer = normalizedOffers.some((offer) =>
        !offer.seller
        || !Number.isFinite(offer.price)
        || offer.price <= 0
        || !/^[A-Z]{3}$/.test(offer.currency)
        || !Number.isInteger(offer.quantity)
        || offer.quantity < 1
        || (offer.stock !== null && (!Number.isInteger(offer.stock) || offer.stock < 0))
        || (offer.moq !== null && (!Number.isInteger(offer.moq) || offer.moq < 1))
        || !offer.sellerUrl
        || !offer.checkedAt
      );
      if (!title.trim() || !organization.trim() || !summary.trim() || !mpn.trim() || normalizedOffers.length === 0 || invalidOffer) {
        setMessage("Enter the component details and at least one complete seller offer with a valid https link, price, currency and check date.");
        return;
      }
      if (componentImageUrl.trim() && !safeExternalUrl(componentImageUrl.trim())) {
        setMessage("The component image must use a valid https URL.");
        return;
      }
      const productValues = {
        kind: "Products",
        title: title.trim(),
        organization: organization.trim(),
        city: "Online",
        summary: summary.trim(),
        source_url: normalizedOffers[0].sellerUrl,
        tags: componentCategory.trim() ? [componentCategory.trim()] : [],
        details: {
          mpn: mpn.trim(),
          category: componentCategory.trim(),
          imageUrl: componentImageUrl.trim() ? safeExternalUrl(componentImageUrl.trim()) : "",
          offers: normalizedOffers,
        },
        verification_status: "verified",
        verified: true,
        is_published: true,
        is_expired: false,
        updated_at: new Date().toISOString(),
      };
      const result = editingProductId
        ? await supabase.from("listings").update(productValues).eq("id", editingProductId)
        : await supabase.from("listings").insert(productValues);
      if (result.error) {
        setMessage(`Could not save component: ${result.error.message}`);
        return;
      }
      window.dispatchEvent(new Event("techcircuit:listings-updated"));
      const wasEditing = Boolean(editingProductId);
      try {
        setProductRows(await loadAdminComponentListings(supabase));
      } catch (error) {
        setMessage(error instanceof Error ? `Component saved, but the admin list could not refresh: ${error.message}` : "Component saved, but the admin list could not refresh.");
        return;
      }
      editComponent("");
      setMessage(wasEditing ? "Component and seller offers updated." : "Component published with two seller offers.");
      return;
    }
    if (["Internships", "Training", "Hackathons"].includes(kind)) {
      const opportunityUrl = safeExternalUrl(sourceUrl.trim());
      if (!title.trim() || !organization.trim() || !city.trim() || !summary.trim() || !opportunityUrl) {
        setMessage("Enter the opportunity details and a valid https source or official application link.");
        return;
      }
      const { error } = await supabase.from("listings").insert({
        kind,
        title: title.trim(),
        organization: organization.trim(),
        city: city.trim(),
        summary: summary.trim(),
        source_url: opportunityUrl,
        tags: [],
        verification_status: "source-linked",
        verified: false,
        is_published: true,
        is_expired: false,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        setMessage(`Could not publish opportunity: ${error.message}`);
        return;
      }
      setTitle("");
      setOrganization("");
      setCity("");
      setSummary("");
      setSourceUrl("");
      setMessage("Source-linked opportunity published.");
      setOpportunityRowsRefreshRevision((revision) => revision + 1);
      window.dispatchEvent(new Event("techcircuit:listings-updated"));
      return;
    }
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

  function renderOfferEditor(index: number) {
    const offer = offerDrafts[index];
    const update = (field: keyof ComponentOfferDraft, value: string) => {
      setOfferDrafts((current) => index === 0
        ? [{ ...current[0], [field]: value }, current[1]]
        : [current[0], { ...current[1], [field]: value }]);
    };
    return (
      <fieldset className="component-admin-offer">
        <legend>Seller offer {index + 1}</legend>
        <label>Retailer<input required={index === 0} value={offer.seller} onChange={(event) => update("seller", event.target.value)} placeholder={index === 0 ? "DigiKey" : "Mouser (optional)"} /></label>
        <label>Price per unit<input required={index === 0} type="number" min="0.0001" step="any" value={offer.price} onChange={(event) => update("price", event.target.value)} /></label>
        <label>Currency code<input required={index === 0} minLength={3} maxLength={3} value={offer.currency} onChange={(event) => update("currency", event.target.value)} placeholder="USD" /></label>
        <label>Price quantity<input required={index === 0} type="number" min="1" step="1" value={offer.quantity} onChange={(event) => update("quantity", event.target.value)} /></label>
        <label>Stock (optional)<input type="number" min="0" step="1" value={offer.stock} onChange={(event) => update("stock", event.target.value)} /></label>
        <label>Minimum order (optional)<input type="number" min="1" step="1" value={offer.moq} onChange={(event) => update("moq", event.target.value)} /></label>
        <label className="admin-full">Seller product URL<input required={index === 0} type="url" value={offer.sellerUrl} onChange={(event) => update("sellerUrl", event.target.value)} placeholder="https://" /></label>
        <label className="admin-full">Price checked on<input required={index === 0} type="date" value={offer.checkedAt} onChange={(event) => update("checkedAt", event.target.value)} /></label>
      </fieldset>
    );
  }

  return (
    <div className="admin-app">
        {!supabase ? (
          <div className="admin-login-screen">
            <div className="admin-login-brand"><img className="brand-logo" src={brandLogo} alt={PLATFORM_NAME} /><button className="button button-outline button-small" onClick={onExit}>Back to website</button></div>
            <div className="admin-login">
              <div className="admin-lock"><ShieldCheck size={26} /></div>
              <span className="eyebrow"><span className="eyebrow-line" /> SECURE ADMIN ACCESS</span>
              <h2>Connect your Supabase project.</h2>
              <p>Admin sign-in and listing management require your Supabase project configuration.</p>
              <div className="env-block"><code>VITE_SUPABASE_URL=your-project-url</code><code>VITE_SUPABASE_ANON_KEY=your-anon-key</code></div>
              <p className="admin-security-note"><ShieldCheck size={16} /> Admin access is enforced by database roles and row-level security policies — never by a client-side password.</p>
            </div>
          </div>
        ) : !isAdmin ? (
          <div className="admin-login-screen">
            <div className="admin-login-brand"><img className="brand-logo" src={brandLogo} alt={PLATFORM_NAME} /><button className="button button-outline button-small" onClick={onExit}>Back to website</button></div>
            <div className="admin-login">
              <div className="admin-lock"><ShieldCheck size={26} /></div>
              <span className="eyebrow"><span className="eyebrow-line" /> AUTHORIZED ADMINS ONLY</span>
              <h2>Admin sign in.</h2>
              <p>Use your Supabase admin account. Admin permissions are granted securely in the database.</p>
              <form onSubmit={signIn} className="admin-form">
                <label>Email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
                <button className="button button-dark" type="submit">Sign in securely <ArrowRight size={15} /></button>
              </form>
              {message && <p className="admin-message" role="status">{message}</p>}
            </div>
          </div>
        ) : (
          <div className="admin-layout">
            {mobileMenuOpen && <button className="admin-drawer-backdrop" type="button" aria-label="Close admin menu" onClick={() => setMobileMenuOpen(false)} />}
            <aside className={`admin-sidebar${mobileMenuOpen ? " mobile-open" : ""}`}>
              <button className="admin-sidebar-brand" type="button" onClick={() => setAdminSection("overview")}><img className="brand-logo" src={brandLogo} alt={PLATFORM_NAME} /><span>ADMIN CONSOLE</span></button>
              <div className="admin-sidebar-label">WORKSPACE</div>
              <nav id="admin-dashboard-navigation" className="admin-side-nav" aria-label="Admin dashboard">
                {([
                  { id: "overview", label: "Overview", icon: LayoutDashboard },
                  { id: "publish", label: "Publish & manage", icon: ClipboardList },
                  { id: "activity", label: "Student activity", icon: Activity },
                  { id: "profile", label: "Admin profile", icon: UserCog },
                ] as const).map(({ id, label, icon: Icon }) => (
                  <button className={adminSection === id ? "admin-side-link active" : "admin-side-link"} key={id} type="button" onClick={() => { setAdminSection(id); setMobileMenuOpen(false); }}>
                    <Icon size={17} /><span>{label}</span>
                    {id === "activity" && opportunityActivities.length > 0 && <span className="admin-side-count">{opportunityActivities.length}</span>}
                  </button>
                ))}
              </nav>
              <div className="admin-sidebar-bottom">
                <div className="admin-sidebar-user"><span className="admin-sidebar-avatar"><UserRound size={17} /></span><span><strong>Administrator</strong><small>{adminEmail}</small></span></div>
                <button className="admin-side-link admin-logout" type="button" onClick={() => void signOut()}><LogOut size={17} /><span>Log out</span></button>
                <button className="admin-side-link admin-back-site" type="button" onClick={onExit}><ArrowLeft size={17} /><span>Back to website</span></button>
              </div>
            </aside>
            <section className="admin-main">
              <header className="admin-topbar">
                <div className="admin-topbar-start">
                  <button className="admin-menu-toggle" type="button" aria-label={mobileMenuOpen ? "Close admin menu" : "Open admin menu"} aria-expanded={mobileMenuOpen} aria-controls="admin-dashboard-navigation" onClick={() => setMobileMenuOpen((open) => !open)}>
                    {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
                  </button>
                  <div><span>ADMIN CONTROL CENTER</span><h1>{adminSection === "overview" ? "Overview" : adminSection === "publish" ? "Publish & manage" : adminSection === "activity" ? "Student activity" : "Admin profile"}</h1></div>
                </div>
                <div className="admin-topbar-account"><span className="admin-sidebar-avatar"><UserRound size={17} /></span><span>{adminEmail}</span></div>
              </header>
              <div className="admin-content admin-view">
            {adminSection === "overview" && (
              <section className="admin-dashboard-overview">
                <div className="admin-welcome-card"><div><span className="eyebrow"><span className="eyebrow-line" /> ADMIN WORKSPACE</span><h2>Welcome back.</h2><p>Manage opportunities and components, and review student follow-up from one place.</p></div><ShieldCheck size={30} /></div>
                <div className="admin-metric-grid">
                  <button className="admin-metric-card" type="button" onClick={() => setAdminSection("publish")}><span>OPPORTUNITIES</span><strong>{opportunityRows.filter((listing) => listing.isPublished).length}</strong><small>Published opportunities</small></button>
                  <button className="admin-metric-card" type="button" onClick={() => setAdminSection("publish")}><span>COMPONENTS</span><strong>{productRows.length}</strong><small>Catalog entries</small></button>
                  <button className="admin-metric-card" type="button" onClick={() => setAdminSection("activity")}><span>STUDENT ACTIVITY</span><strong>{opportunityActivities.length}</strong><small>Visit and application updates</small></button>
                </div>
                <section className="admin-overview-section">
                  <div className="admin-subsection-head"><div><span className="eyebrow"><span className="eyebrow-line" /> RECENT UPDATES</span><h3>Latest student activity</h3></div><button className="text-link" type="button" onClick={() => setAdminSection("activity")}>View all activity <ArrowRight size={14} /></button></div>
                  {activityLoading ? <p className="admin-help">Loading activity…</p> : activityError ? <p className="admin-message" role="alert">{activityError}</p> : opportunityActivities.length === 0 ? <p className="admin-help">Student activity will appear here when students track opportunities.</p> : (
                    <div className="admin-record-list">{opportunityActivities.slice(0, 5).map((activity) => (
                      <article className="admin-record admin-activity-record" key={`${activity.user_id}-${activity.opportunity_id}`}>
                        <div className="admin-record-copy"><span className={`opportunity-activity-status ${activity.status}`}>{activity.status === "applied" ? "Student marked applied / registered" : "Student visited"}</span><h4>{activity.title}</h4><p>{activity.student_name} · {activity.opportunity_kind} · {activity.organization}</p></div>
                        <button className="button button-outline button-small" type="button" onClick={() => setAdminSection("activity")}>View activity</button>
                      </article>
                    ))}</div>
                  )}
                </section>
              </section>
            )}
            {adminSection === "publish" && (
              <section className="admin-publish-section">
                <p className="admin-help">Publish official source-linked opportunities or manage the sourced component catalog.</p>
                <div className="admin-workspace">
                  <div className="admin-workspace-head"><div><span className="eyebrow"><span className="eyebrow-line" /> CONTENT MANAGEMENT</span><h2>Publish new content.</h2></div></div>
                  <p className="admin-help">Only database-authorized admins can publish listings. Verify every opportunity with its official source.</p>
                  <form className="admin-form admin-form-grid" onSubmit={publish}>
              <label>Listing type<select value={kind} onChange={(event) => { setKind(event.target.value as Listing["kind"]); setMessage(""); }}>{listingKinds.map((name) => <option key={name}>{name}</option>)}</select></label>
              {kind === "Products" ? (
                <>
                  <label className="admin-full">Edit existing component (or select “Add new component”)<select value={editingProductId} onChange={(event) => editComponent(event.target.value)}><option value="">Add new component</option>{productRows.map((product) => <option value={product.id} key={product.id}>{product.title} · {product.componentDetails?.mpn}</option>)}</select></label>
                  <label>Component name<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
                  <label>Manufacturer<input required value={organization} onChange={(event) => setOrganization(event.target.value)} /></label>
                  <label>Manufacturer part number<input required value={mpn} onChange={(event) => setMpn(event.target.value)} /></label>
                  <label>Category<input value={componentCategory} onChange={(event) => setComponentCategory(event.target.value)} /></label>
                  <label className="admin-full">Description<textarea required rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
                  <label className="admin-full">Component image URL (https)<input type="url" value={componentImageUrl} onChange={(event) => setComponentImageUrl(event.target.value)} placeholder="https://" /></label>
                  <div className="component-admin-offers admin-full">{renderOfferEditor(0)}{renderOfferEditor(1)}</div>
                  <button className="button button-dark admin-full" type="submit">{editingProductId ? "Update component and offers" : "Publish component comparison"} <ArrowRight size={15} /></button>
                </>
              ) : ["Internships", "Training", "Hackathons"].includes(kind) ? (
                <>
                  <label>Title<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
                  <label>Provider / organization<input required value={organization} onChange={(event) => setOrganization(event.target.value)} /></label>
                  <label>Location<input required value={city} onChange={(event) => setCity(event.target.value)} /></label>
                  <label className="admin-full">Opportunity details<textarea required rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
                  <label className="admin-full">Source or official application URL<input type="url" required value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://" /></label>
                  <button className="button button-dark admin-full" type="submit">Publish opportunity <ArrowRight size={15} /></button>
                </>
              ) : (
                <>
                  <label>Title<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
                  <label>Provider / organization<input required value={organization} onChange={(event) => setOrganization(event.target.value)} /></label>
                  <label>Location<input required value={city} onChange={(event) => setCity(event.target.value)} /></label>
                  <label className="admin-full">Summary<textarea required rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
                  <label className="admin-full">Source or official URL<input type="url" required value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://" /></label>
                  <button className="button button-dark admin-full" type="submit">Save unpublished draft <ArrowRight size={15} /></button>
                </>
              )}
            </form>
            {message && <p className="admin-message" role="status">{message}</p>}
            <section className="admin-subsection" aria-labelledby="admin-opportunities-heading">
              <div className="admin-subsection-head">
                <div><span className="eyebrow"><span className="eyebrow-line" /> OPPORTUNITY CONTROL</span><h3 id="admin-opportunities-heading">Published and draft opportunities</h3></div>
                <button className="button button-outline button-small" type="button" onClick={() => setOpportunityRowsRefreshRevision((revision) => revision + 1)}>Refresh</button>
              </div>
              {opportunityRowsError && <p className="admin-message" role="alert">{opportunityRowsError}</p>}
              {opportunityRowsLoading ? <p className="admin-help">Loading opportunity listings…</p> : opportunityRows.length === 0 ? (
                <p className="admin-help">No opportunity listings have been added yet.</p>
              ) : (
                <div className="admin-record-list">
                  {opportunityRows.map((listing) => (
                    <article className="admin-record" key={listing.id}>
                      <div className="admin-record-copy">
                        <span className="opportunity-activity-kind">{listing.kind} · {listing.isPublished ? "Published" : "Draft"}</span>
                        <h4>{listing.title}</h4>
                        <p>{listing.organization} · {listing.city}</p>
                        <a href={listing.sourceUrl} target="_blank" rel="noreferrer">Open source <ArrowUpRight size={13} /></a>
                      </div>
                      <button className="button button-outline button-small" type="button" onClick={() => void toggleOpportunityPublication(listing)}>
                        {listing.isPublished ? "Unpublish" : "Publish"}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
                </div>
              </section>
            )}
            {adminSection === "activity" && (
              <section className="admin-activity-section" aria-labelledby="admin-activity-heading">
            <section className="admin-subsection" aria-labelledby="admin-activity-heading">
              <div className="admin-subsection-head">
                <div><span className="eyebrow"><span className="eyebrow-line" /> STUDENT FOLLOW-UP</span><h3 id="admin-activity-heading">Opportunity activity</h3></div>
                <button className="button button-outline button-small" type="button" onClick={() => setActivityRefreshRevision((revision) => revision + 1)}>Refresh activity</button>
              </div>
              <p className="admin-help">Student-reported visits and applications/registrations. Application status is self-reported and is not confirmed by the provider.</p>
              {activityError && <p className="admin-message" role="alert">{activityError}</p>}
              {activityLoading ? <p className="admin-help">Loading student activity…</p> : opportunityActivities.length === 0 ? (
                <p className="admin-help">No student opportunity activity has been recorded yet.</p>
              ) : (
                <div className="admin-record-list">
                  {opportunityActivities.map((activity) => (
                    <article className="admin-record admin-activity-record" key={`${activity.user_id}-${activity.opportunity_id}`}>
                      <div className="admin-record-copy">
                        <span className={`opportunity-activity-status ${activity.status}`}>{activity.status === "applied" ? "Student marked applied / registered" : "Student visited"}</span>
                        <h4>{activity.title}</h4>
                        <p>{activity.opportunity_kind} · {activity.organization} · {activity.city}</p>
                        <p><strong>{activity.student_name}</strong>{activity.institution ? ` · ${activity.institution}` : ""}{activity.course ? ` · ${activity.course}` : ""}{activity.academic_year ? ` · ${activity.academic_year}` : ""}</p>
                        <small>{activity.status === "applied" && activity.applied_at ? "Applied / registered" : "Last visited"} {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(activity.status === "applied" && activity.applied_at ? activity.applied_at : activity.visited_at))}</small>
                      </div>
                      <a className="button button-outline button-small" href={activity.opportunity_url} target="_blank" rel="noreferrer">Open listing <ArrowUpRight size={13} /></a>
                    </article>
                  ))}
                </div>
              )}
            </section>
              </section>
            )}
            {adminSection === "profile" && (
              <section className="admin-profile-page">
                <div className="admin-profile-card">
                  <span className="admin-profile-large-avatar"><UserRound size={28} /></span>
                  <span className="eyebrow"><span className="eyebrow-line" /> ADMIN ACCOUNT</span>
                  <h2>Administrator profile</h2>
                  <p>Signed in with your Supabase account.</p>
                  <dl className="admin-profile-details">
                    <div><dt>Email</dt><dd>{adminEmail || "Email unavailable"}</dd></div>
                    <div><dt>Access role</dt><dd><span className="admin-role-badge"><ShieldCheck size={14} /> Administrator</span></dd></div>
                    <div><dt>Authentication</dt><dd>Email and password managed by Supabase</dd></div>
                  </dl>
                  <p className="admin-security-note"><ShieldCheck size={16} /> Your admin permissions are checked against the database. Never share your password or add it to the website source.</p>
                  <button className="button button-outline" type="button" onClick={() => void signOut()}><LogOut size={15} /> Log out</button>
                </div>
              </section>
            )}
            {adminSection !== "publish" && message && <p className="admin-message" role="status">{message}</p>}
            <p className="admin-security-note"><ShieldCheck size={16} /> Admin access and student activity visibility are enforced by database row-level security.</p>
              </div>
            </section>
          </div>
        )}
    </div>
  );
}

function newComponentOfferDraft(): ComponentOfferDraft {
  return {
    seller: "",
    price: "",
    currency: "USD",
    quantity: "1",
    stock: "",
    moq: "",
    sellerUrl: "",
    checkedAt: new Date().toISOString().slice(0, 10),
  };
}

function componentOfferToDraft(offer?: ComponentOffer): ComponentOfferDraft {
  if (!offer) return newComponentOfferDraft();
  return {
    seller: offer.seller,
    price: String(offer.price),
    currency: offer.currency,
    quantity: String(offer.quantity),
    stock: offer.stock === null ? "" : String(offer.stock),
    moq: offer.moq === null ? "" : String(offer.moq),
    sellerUrl: offer.sellerUrl,
    checkedAt: offer.checkedAt,
  };
}

async function loadAdminComponentListings(client: SupabaseClient): Promise<Listing[]> {
  const { data, error } = await client
    .from("listings")
    .select("id, kind, title, organization, city, summary, source_url, details")
    .eq("kind", "Products")
    .order("title");
  if (error) throw new Error(`Could not load component listings: ${error.message}`);
  return uniqueComponentListings(
    (data ?? [])
      .map((row) => ({
        id: row.id,
        kind: "Products" as const,
        title: row.title,
        organization: row.organization,
        city: row.city,
        summary: row.summary,
        tags: [],
        sourceUrl: row.source_url ?? undefined,
        componentDetails: parseComponentDetails(row.details),
      }))
      .filter((row) => Boolean(row.componentDetails)),
  );
}

async function loadAdminOpportunityActivities(client: SupabaseClient): Promise<AdminOpportunityActivity[]> {
  const { data, error } = await client
    .from("opportunity_activity")
    .select("user_id, opportunity_id, opportunity_kind, title, organization, city, opportunity_url, status, visited_at, applied_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Could not load student opportunity activity: ${error.message}`);
  if (!data?.length) return [];

  const userIds = [...new Set(data.map((activity) => activity.user_id))];
  const { data: profiles, error: profileError } = await client
    .from("profiles")
    .select("id, display_name, institution, course, academic_year")
    .in("id", userIds);
  if (profileError) throw new Error(`Could not load student profile details: ${profileError.message}`);
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return data.map((activity) => {
    const profile = profilesById.get(activity.user_id);
    return {
      ...activity,
      opportunity_kind: activity.opportunity_kind as TrackableOpportunityKind,
      status: activity.status === "applied" ? "applied" : "visited",
      student_name: profile?.display_name?.trim() || `Student ${activity.user_id.slice(0, 8)}`,
      institution: profile?.institution ?? "",
      course: profile?.course ?? "",
      academic_year: profile?.academic_year ?? "",
    };
  });
}

async function loadAdminOpportunityListings(client: SupabaseClient): Promise<AdminOpportunityListing[]> {
  const { data, error } = await client
    .from("listings")
    .select("id, kind, title, organization, city, summary, source_url, is_published, is_expired, verification_status, updated_at")
    .in("kind", ["Internships", "Training", "Hackathons"])
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Could not load opportunity listings: ${error.message}`);
  return (data ?? []).map((listing) => ({
    id: listing.id,
    kind: listing.kind as TrackableOpportunityKind,
    title: listing.title,
    organization: listing.organization,
    city: listing.city,
    summary: listing.summary,
    sourceUrl: listing.source_url,
    isPublished: listing.is_published,
    isExpired: listing.is_expired,
    verificationStatus: listing.verification_status,
    updatedAt: listing.updated_at,
  }));
}

async function checkAdmin(
  supabase: SupabaseClient,
  id: string,
  setIsAdmin: (isAdmin: boolean) => void,
  setMessage: (message: string) => void,
): Promise<boolean> {
  const { data, error } = await supabase.from("profiles").select("role").eq("id", id).maybeSingle();
  if (error) {
    setIsAdmin(false);
    setMessage(`Could not check admin access: ${error.message}`);
    return false;
  }
  const admin = data?.role === "admin";
  setIsAdmin(admin);
  setMessage(admin ? "" : "This account does not have admin access.");
  return admin;
}

export default App;
