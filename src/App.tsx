import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Activity,
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
  Search,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Lock,
  Mail,
  Building2,
  Building,
  User as UserIcon,
  Phone,
  Home,
  Package,
  PackageCheck,
  Copy,
  Printer,
  Download,
  Truck,
  CreditCard,
  QrCode,
  ChevronUp,
  Wrench,
  UploadCloud,
} from "lucide-react";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";
import brandLogo from "../ece logo 1.png";
import internshipOpportunityImage from "../home image/card 1.png";
import trainingOpportunityImage from "../home image/card 2.png";
import hackathonOpportunityImage from "../home image/card 3.png";
import resourceImage from "../home image/card 5.png";
import projectPricesInRupees from "../shared/project-prices.json";
import {
  ECE_COMPONENTS_CATALOG,
  COMPONENT_CATEGORIES,
} from "./data/componentsCatalog";

const PLATFORM_NAME = "TechCircuit Hub";
const PLATFORM_TAGLINE = "Discover. Learn. Build. Innovate.";
const PROJECT_CUSTOMIZATION_FORM_URL = "https://forms.gle/De35WLbL98SU2kXF7";
const COMPONENT_CUSTOMIZATION_FORM_URL = "https://forms.gle/De35WLbL98SU2kXF7"; // User will update with Google Form link afterwards
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

function sanitizeCourse(raw: unknown): string {
  if (!raw) return "";
  let val = String(raw).trim();
  val = val.replace(/<[^>]*>/g, "");
  val = val
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  if ((val.startsWith("[") && val.endsWith("]")) || (val.startsWith("{") && val.endsWith("}"))) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        val = parsed.filter(Boolean).map(String).join(", ");
      } else if (typeof parsed === "object" && parsed !== null) {
        val = String(parsed.course || parsed.name || parsed.title || "");
      }
    } catch {
      val = val.replace(/^[\[{\s"']+|[\]}\s"']+$/g, "");
    }
  }
  val = val.replace(/^["'\[]+|["'\]]+$/g, "").trim();
  if (/^(null|undefined|\[object Object\]|NaN)$/i.test(val)) return "";
  return val;
}

function isOpportunityEnded(item: { title: string; summary: string; isExpired?: boolean }): boolean {
  if (item.isExpired) return true;
  const text = `${item.title} ${item.summary}`.toLowerCase();
  if (
    text.includes("have passed") ||
    text.includes("has passed") ||
    text.includes("dates have passed") ||
    text.includes("deadline reportedly passed") ||
    text.includes("registration reportedly closed") ||
    text.includes("filter=past")
  ) {
    return true;
  }
  const match = text.match(/(\d{1,2})\s*(?:–|-|\/)?\s*(?:\d{1,2})?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(202\d)/i);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthStr = match[2].toLowerCase();
    const year = parseInt(match[3], 10);
    const months: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const eventDate = new Date(year, months[monthStr], day);
    const now = new Date(2026, 9, 20);
    if (eventDate < now) return true;
  }
  return false;
}

export type CheckoutCustomer = {
  name: string;
  email: string;
  phone: string;
};

export type CheckoutOrderResponse = {
  order_id: string;
  payment_session_id: string;
  gateway_mode: "sandbox" | "production";
};

export interface CashfreeComponent {
  mount(selector: string): void;
  destroy?(): void;
  on?(event: string, callback: (data: unknown) => void): void;
  isComplete?(): boolean;
  data?(): { value: unknown };
}

export interface CashfreeInstance {
  create(
    componentName:
      | "cardNumber"
      | "cardHolder"
      | "cardExpiry"
      | "cardCvv"
      | "savePaymentInstrument"
      | "upiCollect"
      | "upiQr"
      | "upiApp",
    options?: {
      values?: Record<string, string>;
      style?: Record<string, unknown>;
      classes?: Record<string, string>;
      fonts?: unknown[];
    }
  ): CashfreeComponent;
  pay(options: {
    paymentMethod: unknown;
    paymentSessionId: string;
    savePaymentInstrument?: boolean | CashfreeComponent;
    redirectTarget?: string;
  }): Promise<{
    error?: { message?: string; code?: string; description?: string };
    paymentDetails?: unknown;
    redirect?: boolean;
    paymentMessage?: string;
  }>;
  checkout(options: {
    paymentSessionId: string;
    redirectTarget?: string;
    returnUrl?: string;
  }): Promise<{
    error?: { message?: string; code?: string; description?: string };
    paymentDetails?: unknown;
    redirect?: boolean;
    paymentMessage?: string;
  }>;
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
    method?: "card" | "upi";
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler?: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
}

export interface RazorpayInstance {
  open(): void;
  on(event: string, handler: (response: unknown) => void): void;
}

declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => CashfreeInstance;
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type Page =
  | "Home"
  | "AppHome"
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
  | "Admin"
  | "Terms"
  | "Privacy"
  | "Cookies"
  | "Delivery";

type StudentDashboardSection = "overview" | "applications" | "orders" | "notifications" | "profile" | "settings";
type StudentMenuDestination = StudentDashboardSection | "bookmarks";

const studentMenuItems = [
  { id: "overview", label: "Student dashboard", icon: GraduationCap },
  { id: "orders", label: "My Orders & Tracking", icon: PackageCheck },
  { id: "applications", label: "My Applications & Enrollments", icon: FileText },
  { id: "bookmarks", label: "Bookmarks / Wishlist", icon: Bookmark },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "profile", label: "My Profile", icon: UserRound },
  { id: "settings", label: "Settings & Support", icon: Settings },
] satisfies { id: StudentMenuDestination; label: string; icon: typeof FileText }[];

type OrderTrackingStage =
  | "Order Placed"
  | "Confirmed"
  | "Building (Processing)"
  | "Testing / Quality Check"
  | "Packed"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Refunded";

interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_stage: string | null;
  to_stage: OrderTrackingStage;
  changed_by: string;
  changed_by_name?: string;
  note?: string;
  is_public: boolean;
  changed_at: string;
}

interface OrderItem {
  project_id: string;
  title: string;
  price: number;
  qty: number;
}

interface AdminOrder {
  id: string;
  order_id?: string;
  order_number: string;
  user_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer?: {
    name: string;
    email: string;
    phone: string;
    college?: string;
  };
  shipping_address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  items: OrderItem[];
  subtotal: number;
  shipping_charges: number;
  total_amount: number;
  currency: string;
  payment_method: string;
  payment_gateway: string;
  cashfree_order_id?: string;
  payment_session_id?: string;
  payment_id?: string;
  payment_status: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  tracking_status: OrderTrackingStage;
  paid_at?: string | null;
  expected_delivery_date?: string | null;
  courier_name?: string;
  courier_tracking_number?: string;
  courier_tracking_url?: string;
  admin_notes?: string;
  public_notes?: string;
  status_history?: OrderStatusHistory[];
  created_at: string;
  updated_at: string;
}

type Listing = {
  id: string;
  kind: Exclude<Page, "Home" | "AppHome" | "Saved" | "Dashboard" | "Admin" | "Cart" | "Checkout" | "PaymentResult" | "Terms" | "Privacy" | "Cookies" | "Delivery">;
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
  sNo?: number;
  category?: string;
  specification?: string;
  quantity?: number;
  unit?: string;
  price?: number;
  notes?: string;
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

export const SPECIAL_OFFER_PROJECT_ID = "special-offer-dc-fan-kit";

export const specialOfferProject: Listing = {
  id: SPECIAL_OFFER_PROJECT_ID,
  kind: "Projects",
  title: "Mini DC Motor & Fan Circuit Kit",
  organization: "TechCircuit Flash Offer",
  city: "Ready to ship · All India",
  summary: "Basic hands-on circuit kit: 1x DC toy motor + 1x 3-blade fan propeller + 1x 9V battery with snap clip connector. Hands-on learning for motor rotation, polarity, and circuit fundamentals.",
  tags: ["OFFER", "DC Motor", "Fan Blade", "9V Battery"],
  components: [
    "1x High-Torque DC Toy Motor (3V–9V)",
    "1x Aerodynamic Mini Fan Propeller (3-Blade)",
    "1x 9V Heavy-Duty Battery with Snap Clip Connector",
  ],
  projectCategory: "Electronics Starter Kit",
  projectPrice: 20, // Exactly 20 Rupees!
  imageUrl: projectImageUrls["../Our Project image/ece 2.png"] || projectImageUrls["../Our Project image/ece 1.png"],
  featured: true,
};

const projectListings: Listing[] = [
  ...projectGroups.flatMap((group, groupIndex) =>
    group.titles.map((title, projectIndex): Listing => {
      const imageNumber = groupIndex * 7 + projectIndex + 1;
      const imageAssetNumber = imageNumber === 1 ? 2 : imageNumber === 2 ? 1 : imageNumber;
      return {
        id: `sample-project-${imageNumber}`,
        kind: "Projects",
        title,
        organization: "TechCircuit Hardware Kit",
        city: "Ready to ship · All India",
        summary: group.summary,
        tags: [...group.tags],
        components: [...group.components],
        projectCategory: group.category,
        projectPrice: projectPricesInRupees[imageNumber - 1],
        imageUrl: projectImageUrls[`../Our Project image/ece ${imageAssetNumber}.png`],
      };
    }),
  ),
];

function safeImageUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("./")
  ) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch {
    // not a valid external URL
  }
  return "";
}

function getLocalCustomComponents(): Listing[] {
  try {
    const raw = localStorage.getItem("techcircuit:custom_components");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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
    title: "VLSI Physical Design & CMOS Fabrication Flow",
    publisher: "IEEE Solid-State Circuits Society",
    category: "ECE Research Paper",
    href: "https://ieeexplore.ieee.org/browse/periodicals/title",
    paperSummary: "Foundational research paper on deep sub-micron CMOS standard-cell placement, clock tree synthesis (CTS), routing congestion, and static timing analysis.",
  },
  {
    title: "Digital Signal Processing & IIR/FIR Filter Architectures",
    publisher: "IEEE Signal Processing Society",
    category: "ECE Technical Paper",
    href: "https://signalprocessingsociety.org/",
    paperSummary: "Comprehensive study covering discrete-time system transforms, Chebyshev & Butterworth filter design, spectral leakage mitigation, and fixed-point DSP hardware.",
  },
  {
    title: "Embedded RTOS Architecture & Cortex-M Scheduling",
    publisher: "ARM University Program",
    category: "ECE Technical Paper",
    href: "https://www.arm.com/resources/education",
    paperSummary: "Technical report detailing preemptive priority scheduling, deterministic interrupt response, context switching, and memory protection units on ARM Cortex-M.",
  },
  {
    title: "RF & Microwave Transmission Line Impedance Matching",
    publisher: "IEEE Microwave Theory & Tech",
    category: "ECE Research Paper",
    href: "https://mtt.org/",
    paperSummary: "Peer-reviewed reference paper on Smith chart matching networks, microstrip line wave propagation, S-parameters, and low-noise amplifier (LNA) front-ends.",
  },
  {
    title: "Analog CMOS Operational Amplifier Design & Simulation",
    publisher: "Analog Devices Technical Library",
    category: "ECE Research Paper",
    href: "https://www.analog.com/en/education/education-library.html",
    paperSummary: "Two-stage Miller-compensated CMOS op-amp topology, gain-bandwidth product (GBW), phase margin stability analysis, and SPICE transient validation.",
  },
  {
    title: "FPGA Digital System Design with Verilog HDL",
    publisher: "AMD Xilinx Academic Series",
    category: "ECE Design Guide",
    href: "https://www.xilinx.com/support/university.html",
    paperSummary: "Architectural paper on synchronous RTL design, parameterized state machines, BRAM memory instantiation, and setup/hold timing constraint closure.",
  },
  {
    title: "Low-Power Embedded IoT Sensor Node Architecture",
    publisher: "ACM / IEEE Transactions on IoT",
    category: "ECE Research Paper",
    href: "https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=6488907",
    paperSummary: "Research study on ultra-low sleep current techniques, capacitive sensor front-ends, energy harvesting buck-boost regulators, and wireless telemetry.",
  },
  {
    title: "Microcontroller EMI/EMC Reduction & High-Speed Layout",
    publisher: "Texas Instruments ECE Labs",
    category: "PCB design guide",
    href: "https://www.ti.com/design-resources.html",
    paperSummary: "Engineering guide on ground loop minimization, return path discontinuities, differential pair routing, and decoupling capacitor network optimization.",
  },
  {
    title: "ESP-IDF Programming Guide",
    publisher: "Espressif Systems",
    category: "Official documentation",
    href: "https://docs.espressif.com/projects/esp-idf/en/stable/esp32/",
    paperSummary: "Comprehensive guide for ESP32 dual-core FreeRTOS firmware development, Wi-Fi/BLE network stack management, and cryptographic hardware acceleration.",
  },
  {
    title: "Arduino Language Reference",
    publisher: "Arduino",
    category: "Official documentation",
    href: "https://docs.arduino.cc/language-reference/",
    paperSummary: "Reference manual for microcontroller pin multiplexing, hardware interrupts, timers, analog-to-digital conversion, and standard communication libraries.",
  },
  {
    title: "KiCad Documentation",
    publisher: "KiCad",
    category: "PCB design guide",
    href: "https://docs.kicad.org/",
    paperSummary: "Official manual for multi-layer schematic capture, custom footprint creation, 3D clearance DRC checks, and production Gerber generation.",
  },
  {
    title: "STM32 Documentation",
    publisher: "STMicroelectronics",
    category: "Component information",
    href: "https://www.st.com/en/microcontrollers-microprocessors/stm32-32-bit-arm-cortex-mcus.html",
    paperSummary: "Hardware reference manual covering 32-bit ARM Cortex-M architecture, direct memory access (DMA) controllers, and advanced PWM motor timers.",
  },
  {
    title: "Antenna Design & Beamforming for 5G Millimeter-Wave Networks",
    publisher: "IEEE Antennas & Propagation Society",
    category: "ECE Research Paper",
    href: "https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=8",
    paperSummary: "Phased array antenna design, substrate-integrated waveguide (SIW) feeds, spatial beamforming algorithms, and radiation efficiency in 28 GHz mmWave frequency bands.",
  },
  {
    title: "Power Electronics & High-Efficiency DC-DC Converter Topologies",
    publisher: "IEEE Power Electronics Society",
    category: "ECE Research Paper",
    href: "https://www.pels.org/",
    paperSummary: "Synchronous buck/boost converter topologies, GaN/SiC wide-bandgap semiconductor switching dynamics, thermal modeling, and magnetic component saturation minimization.",
  },
  {
    title: "Robotics Kinematics & Embedded Motor Control Algorithms",
    publisher: "IEEE Robotics & Automation Society",
    category: "ECE Technical Paper",
    href: "https://www.ieee-ras.org/",
    paperSummary: "Field-Oriented Control (FOC) for BLDC and stepper motors, Clarke/Park coordinate transformations, spatial trajectory planning, and low-latency encoder feedback loops.",
  },
  {
    title: "RISC-V Microprocessor Architecture & Custom Instruction Extensions",
    publisher: "RISC-V International",
    category: "ECE Design Guide",
    href: "https://riscv.org/technical/specifications/",
    paperSummary: "Open-source 32-bit and 64-bit RV32I/RV64I instruction set architecture, 5-stage pipelined datapath design, hazard resolution, and custom hardware accelerator co-processor interfacing.",
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
  { title: "Gain real-world experience", description: "Work on live projects and build your career in electronics & IoT.", action: "Explore internships", page: "Internships" }, // card 1: Internship
  { title: "Build skills that move you forward", description: "Learn practical electronics with expert-led training.", action: "Explore training", page: "Training" }, // card 2: Training
  { title: "Turn ideas into impact", description: "Solve real problems, build with a team and show what you can do.", action: "Explore hackathons", page: "Hackathons" }, // card 3: Hackathons
  { title: "Find your next project idea", description: "Work on real-world ECE projects with hands-on experience and modern technologies.", action: "Browse projects", page: "Projects" }, // card 4: Real-Time Projects
  { title: "Learn at your own pace", description: "Access useful learning materials, guides, datasheets, and research papers to support your ECE journey.", action: "Explore resources", page: "Learn" }, // card 5: Resources
  { title: "Get to know your components", description: "Explore essential ECE components, understand their working and build real-world circuits.", action: "Browse components", page: "Products" }, // card 6: ECE Components
];

export const intro: Record<Listing["kind"], { eyebrow?: string; title: string; description: string }> = {
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

const FALLBACK_SUPABASE_URL = "https://zomwoprlbydezbbliyui.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvbXdvcHJsYnlkZXpiYmxpeXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4OTQ0MTEsImV4cCI6MjEwNzQ3MDQxMX0.ZsmboSVX_kN4J79tIbZBIbdFMIOijyhfqcayAbGHlt4";

let supabaseClient: SupabaseClient | null | undefined;

function getSupabase(): SupabaseClient | null {
  if (supabaseClient !== undefined) return supabaseClient;
  const url = ((import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()) || FALLBACK_SUPABASE_URL;
  const key = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()) || FALLBACK_SUPABASE_ANON_KEY;
  supabaseClient = url && key ? createClient(url, key) : null;
  return supabaseClient;
}

function getPageFromPath(pathname: string): Page {
  const path = pathname.replace(/\/+$/, "").toLowerCase();
  if (path === "/home" || path === "/app" || path === "/app-home" || path === "/homepage") return "AppHome";
  if (path === "/admin") return "Admin";
  if (path === "/internships") return "Internships";
  if (path === "/training") return "Training";
  if (path === "/products" || path === "/components") return "Products";
  if (path === "/projects") return "Projects";
  if (path === "/hackathons") return "Hackathons";
  if (path === "/learn" || path === "/resources") return "Learn";
  if (path === "/manufacturing") return "Manufacturing";
  if (path === "/pcb-design" || path === "/pcb") return "PCB Design";
  if (path === "/cart") return "Cart";
  if (path === "/checkout") return "Checkout";
  if (path === "/payment-result") return "PaymentResult";
  if (path === "/saved" || path === "/bookmarks") return "Saved";
  if (path === "/dashboard" || path === "/orders") return "Dashboard";
  if (path === "/terms" || path === "/terms-and-conditions" || path === "/terms-conditions") return "Terms";
  if (path === "/privacy" || path === "/privacy-policy") return "Privacy";
  if (path === "/cookies" || path === "/cookie-policy") return "Cookies";
  if (path === "/delivery" || path === "/delivery-and-refunds" || path === "/refunds" || path === "/shipping") return "Delivery";
  return "Home";
}

function getPathFromPage(p: Page): string {
  switch (p) {
    case "AppHome": return "/home";
    case "Admin": return "/admin";
    case "Internships": return "/internships";
    case "Training": return "/training";
    case "Products": return "/products";
    case "Projects": return "/projects";
    case "Hackathons": return "/hackathons";
    case "Learn": return "/resources";
    case "Manufacturing": return "/manufacturing";
    case "PCB Design": return "/pcb-design";
    case "Cart": return "/cart";
    case "Checkout": return "/checkout";
    case "PaymentResult": return "/payment-result";
    case "Saved": return "/saved";
    case "Dashboard": return "/dashboard";
    case "Terms": return "/terms";
    case "Privacy": return "/privacy";
    case "Cookies": return "/cookies";
    case "Delivery": return "/delivery";
    default: return "/";
  }
}

function App() {
  const [returnOrderId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("cf_order_id") || params.get("order_id") || params.get("payment_order_id") || null;
  });
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<AdminOrder | null>(null);
  const [returnConfirmedOrder, setReturnConfirmedOrder] = useState<AdminOrder | null>(null);
  const [page, setPage] = useState<Page>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cf_order_id") || params.get("order_id") || params.get("payment_order_id")) {
      return "Checkout";
    }
    return getPageFromPath(window.location.pathname);
  });
  const navigationHistoryRef = useRef<Page[]>([]);
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "student" | null>(null);
  const student = userRole === "student" ? currentUser : null;
  const [authOpen, setAuthOpen] = useState(() => ["/login", "/signin", "/student-login", "/auth"].includes(window.location.pathname.replace(/\/+$/, "")));
  const [authRecovery, setAuthRecovery] = useState(false);
  const [pendingOpportunityPrompt, setPendingOpportunityPrompt] = useState<Listing | null>(null);
  const [opportunityActivitySaving, setOpportunityActivitySaving] = useState(false);
  const [opportunityActivityError, setOpportunityActivityError] = useState("");
  const [opportunityActivityRevision, setOpportunityActivityRevision] = useState(0);
  const opportunityPromptCheckInProgress = useRef(false);
  const [activePolicy, setActivePolicy] = useState<PolicyType | null>(null);
  const [globalToast, setGlobalToast] = useState<{ id: number; message: string; type: "success" | "info" | "error" } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const [cookieConsent, setCookieConsent] = useState<"accepted" | "essential" | null>(() => {
    try {
      const saved = localStorage.getItem("techcircuit_cookie_consent");
      return saved === "accepted" || saved === "essential" ? saved : null;
    } catch {
      return null;
    }
  });

  function handleUpdateCookieConsent(type: "accepted" | "essential") {
    try {
      localStorage.setItem("techcircuit_cookie_consent", type);
    } catch {}
    setCookieConsent(type);
    showToast(
      type === "accepted"
        ? "Cookie preferences saved: All cookies allowed 🍪"
        : "Cookie preferences saved: Essential cookies only 🛡️",
      "info"
    );
  }

  function showToast(message: string, type: "success" | "info" | "error" = "success") {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setGlobalToast({ id: Date.now(), message, type });
    toastTimeoutRef.current = window.setTimeout(() => {
      setGlobalToast(null);
    }, 3500);
  }

  useEffect(() => {
    const handleCustomToast = (e: any) => {
      if (e.detail?.message) {
        showToast(e.detail.message, e.detail.type || "success");
      }
    };
    window.addEventListener("techcircuit:toast", handleCustomToast);
    return () => window.removeEventListener("techcircuit:toast", handleCustomToast);
  }, []);

  async function resolveUserRole(client: SupabaseClient, user: User | null): Promise<"admin" | "student" | null> {
    if (!user) {
      setCurrentUser(null);
      setUserRole(null);
      return null;
    }
    setCurrentUser(user);
    try {
      const { data, error } = await client
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !data) {
        setUserRole("student");
        return "student";
      }
      const role = data.role === "admin" ? "admin" : "student";
      setUserRole(role);
      return role;
    } catch {
      setUserRole("student");
      return "student";
    }
  }

  async function handleSignOut() {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Continue clearing local auth state
      }
    }
    setCurrentUser(null);
    setUserRole(null);
    setStudentMenuOpen(false);
    navigate("Home");
  }

  useEffect(() => {
    // Seed initial history state so swipe back stays within the website
    const currentPath = window.location.pathname;
    const currentState = window.history.state as { page?: Page; isRoot?: boolean } | null;
    if (!currentState || !currentState.page) {
      if (currentPath !== "/" && currentPath !== "") {
        window.history.replaceState({ page: "Home", isRoot: true }, "", "/");
        window.history.pushState({ page, isRoot: false, hasDetail: false }, "", currentPath + window.location.search);
      } else {
        window.history.replaceState({ page: "Home", isRoot: true, hasDetail: false }, "", "/");
      }
    }
  }, []);

  useEffect(() => {
    if (!returnOrderId) return;
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);

    async function verifyReturnPayment() {
      try {
        let isPaid = false;
        let ordData: any = null;
        let detectedMethod: string | null = null;

        for (let attempt = 0; attempt < 8; attempt++) {
          const res = await fetch(`${API_BASE_URL}/api/payments/status?orderId=${encodeURIComponent(returnOrderId!)}`);
          if (res.ok) {
            const data = await res.json();
            if (
              data.status === "PAID" ||
              data.order_status === "PAID" ||
              data.payment_status === "Paid" ||
              data.order?.payment_status === "PAID"
            ) {
              isPaid = true;
              ordData = data.order || {};
              detectedMethod = data.detected_payment_method || ordData.payment_method || null;
              break;
            }
          }
          await new Promise((r) => setTimeout(r, 1200));
        }

        if (isPaid) {
          setCartIds([]);
          try { localStorage.removeItem("techcircuit-cart"); } catch {}

          let lastCheckout: any = null;
          try {
            const rawCheckout = localStorage.getItem("techcircuit_last_checkout");
            if (rawCheckout) lastCheckout = JSON.parse(rawCheckout);
          } catch {}

          const ord = ordData || { id: returnOrderId, order_number: returnOrderId };
          const resolvedItems = (ord.items && ord.items.length > 0)
            ? ord.items
            : (lastCheckout?.items ? lastCheckout.items.map((it: any) => ({
                project_id: it.id,
                title: it.title,
                price: it.price || 3499,
                qty: 1,
              })) : []);

          const resolvedMethod =
            detectedMethod ||
            ord.payment_method ||
            (lastCheckout?.paymentMethod === "card" ? "card" : "upi");

          const fullOrd: AdminOrder = {
            id: ord.id || returnOrderId!,
            order_id: ord.order_id || returnOrderId!,
            order_number: ord.order_number || lastCheckout?.order_number || `TCH-ORD-${(returnOrderId! || "").slice(-6).toUpperCase()}`,
            customer_name: ord.customer_name || lastCheckout?.shippingAddress?.fullName || localStorage.getItem("techcircuit-customer-name") || "Student Customer",
            customer_email: ord.customer_email || lastCheckout?.shippingAddress?.email || localStorage.getItem("techcircuit-customer-email") || "",
            customer_phone: ord.customer_phone || lastCheckout?.shippingAddress?.phone || "",
            shipping_address: ord.shipping_address && Object.keys(ord.shipping_address).length > 0 ? ord.shipping_address : (lastCheckout?.shippingAddress || {}),
            items: resolvedItems,
            subtotal: ord.subtotal || lastCheckout?.total || ord.total_amount || 0,
            shipping_charges: 0,
            total_amount: ord.total_amount || lastCheckout?.total || 0,
            currency: "INR",
            payment_gateway: "cashfree",
            payment_method: resolvedMethod === "card" ? "card" : "upi",
            payment_status: "PAID",
            tracking_status: ord.tracking_status || "Order Placed",
            created_at: ord.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            expected_delivery_date: ord.expected_delivery_date || new Date(Date.now() + 7 * 86400000).toISOString(),
            admin_notes: ord.admin_notes || "",
            status_history: ord.status_history || [
              {
                id: `hist-${Date.now()}`,
                order_id: ord.id || returnOrderId!,
                from_stage: null,
                to_stage: "Order Placed",
                changed_by: "system",
                note: "Payment completed successfully via Cashfree Checkout.",
                is_public: true,
                changed_at: new Date().toISOString(),
              },
            ],
          };

          try {
            const raw = localStorage.getItem("techcircuit_orders_store");
            const list: AdminOrder[] = raw ? JSON.parse(raw) : [];
            const filtered = list.filter((o) => o.id !== fullOrd.id && o.order_id !== fullOrd.order_id);
            filtered.unshift(fullOrd);
            localStorage.setItem("techcircuit_orders_store", JSON.stringify(filtered));
          } catch {}

          setReturnConfirmedOrder(fullOrd);
          setActiveTrackingOrder(fullOrd);
          setPage("Checkout");
          showToast("Payment Successful! Your order has been placed.", "success");
        }
      } catch (err) {
        console.error("Failed to verify return order:", err);
      }
    }
    void verifyReturnPayment();
  }, [returnOrderId]);

  function viewOrderDetails(order: AdminOrder) {
    setActiveTrackingOrder(order);
    setStudentSection("orders");
    setPage("Dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
        setDataError("Could not restore your session.");
        return;
      }
      if (data.session?.user) {
        void resolveUserRole(client, data.session.user).then((role) => {
          if (isRecoveryCallback) {
            setAuthRecovery(true);
            setAuthOpen(true);
          }
          if (isOAuthCallback && role === "student") setPage("Dashboard");
        });
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
    }).catch(() => setDataError("Could not restore your session."));
    const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
      void resolveUserRole(client, session?.user ?? null);
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

  const listings = useMemo(() => {
    const customList = getLocalCustomComponents().filter((item) => item.kind !== "Products");
    const filteredRemote = remoteListings.filter((item) => item.kind !== "Products");
    const all = [...filteredRemote, ...customList, ...(ECE_COMPONENTS_CATALOG as Listing[]), ...catalog];
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const result: Listing[] = [];

    for (const item of all) {
      const key = `${item.kind}:${item.title.trim().toLowerCase()}`;
      if (seenIds.has(item.id) || seenKeys.has(key)) {
        continue;
      }
      seenIds.add(item.id);
      seenKeys.add(key);
      result.push(item);
    }
    return result;
  }, [remoteListings]);

  useEffect(() => {
    if (!student) return;
    const currentStudent = student;
    let active = true;
    async function showOpportunityPromptOnReturn() {
      if (!active || opportunityPromptCheckInProgress.current) return;
      let pending: { opportunityId: string; userId: string; clickedAt?: number; didLeave?: boolean } | null = null;
      try {
        const stored = sessionStorage.getItem(OPPORTUNITY_RETURN_KEY);
        if (!stored) return;
        pending = JSON.parse(stored) as { opportunityId: string; userId: string; clickedAt?: number; didLeave?: boolean };
      } catch {
        return;
      }
      if (!pending || typeof pending.opportunityId !== "string" || typeof pending.userId !== "string") {
        sessionStorage.removeItem(OPPORTUNITY_RETURN_KEY);
        return;
      }
      if (pending.userId !== currentStudent.id) {
        sessionStorage.removeItem(OPPORTUNITY_RETURN_KEY);
        return;
      }
      // CRITICAL: Only prompt when user actually left to external portal and came back
      const elapsed = Date.now() - (pending.clickedAt || 0);
      if (!pending.didLeave && elapsed < 2500) {
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
    const markLeftPage = () => {
      try {
        const stored = sessionStorage.getItem(OPPORTUNITY_RETURN_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.didLeave = true;
          sessionStorage.setItem(OPPORTUNITY_RETURN_KEY, JSON.stringify(parsed));
        }
      } catch {}
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        markLeftPage();
      } else if (document.visibilityState === "visible") {
        void showOpportunityPromptOnReturn();
      }
    };
    const handleReturn = () => {
      void showOpportunityPromptOnReturn();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", markLeftPage);
    window.addEventListener("focus", handleReturn);
    window.addEventListener("pageshow", handleReturn);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", markLeftPage);
      window.removeEventListener("focus", handleReturn);
      window.removeEventListener("pageshow", handleReturn);
    };
  }, [student, listings]);

  useEffect(() => {
    document.title = `${PLATFORM_NAME} — ${PLATFORM_TAGLINE}`;
  }, []);

  function navigate(next: Page, push: boolean = true) {
    if (push && next !== page) {
      navigationHistoryRef.current.push(page);
      const nextPath = getPathFromPage(next);
      window.history.pushState({ page: next, isRoot: false, hasDetail: false }, "", nextPath);
    }
    setDetailSelection(null);
    setPage(next);
    setMenuOpen(false);
    setStudentMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleGoBack() {
    if (detailSelection) {
      closeDetails();
      return;
    }
    if (activeTrackingOrder) {
      setActiveTrackingOrder(null);
      return;
    }
    if (customizationRequestId) {
      setCustomizationRequestId(null);
      return;
    }
    if (authOpen) {
      setAuthOpen(false);
      return;
    }
    if (enquiry) {
      setEnquiry(null);
      return;
    }
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    if (studentMenuOpen) {
      setStudentMenuOpen(false);
      return;
    }

    const st = window.history.state as { page?: Page; isRoot?: boolean } | null;
    if (st && !st.isRoot && window.history.length > 1) {
      window.history.back();
      return;
    }

    if (navigationHistoryRef.current.length > 0) {
      const prev = navigationHistoryRef.current.pop();
      if (prev && prev !== page) {
        navigate(prev, false);
        return;
      }
    }

    if (page !== "Home") {
      navigate("Home", false);
    }
  }

  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      const state = event.state as {
        page?: Page;
        hasDetail?: boolean;
        detailType?: "listing" | "resource";
        detailId?: string;
        isRoot?: boolean;
      } | null;

      if (state && state.page) {
        setPage(state.page);
        if (state.hasDetail && state.detailId) {
          if (state.detailType === "listing") {
            const found = listings.find((l) => l.id === state.detailId);
            if (found) setDetailSelection({ type: "listing", item: found });
            else setDetailSelection(null);
          } else if (state.detailType === "resource") {
            const found = resources.find((r) => r.title === state.detailId);
            if (found) setDetailSelection({ type: "resource", item: found });
            else setDetailSelection(null);
          }
        } else {
          setDetailSelection(null);
        }
      } else {
        const path = window.location.pathname.replace(/\/+$/, "").toLowerCase();
        if (["/login", "/signin", "/student-login", "/auth"].includes(path)) {
          if (currentUser) {
            setAuthOpen(false);
          } else {
            setPage("Home");
            setAuthOpen(true);
          }
        } else {
          const inferred = getPageFromPath(window.location.pathname);
          setPage(inferred);
        }
        setDetailSelection(null);
      }
      setAuthOpen(false);
      setMenuOpen(false);
      setStudentMenuOpen(false);
      setActiveTrackingOrder(null);
      setCustomizationRequestId(null);
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [listings, currentUser]);

  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        const elapsed = Date.now() - touchStartTime;

        if (deltaX > 60 && Math.abs(deltaY) < 80 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3 && elapsed < 600) {
          const target = e.target as HTMLElement | null;
          if (target) {
            const tagName = target.tagName.toLowerCase();
            if (["input", "textarea", "select"].includes(tagName)) return;
            if (target.closest(".home-showcase-carousel, .carousel, [role='slider'], input[type='range']")) {
              return;
            }
          }
          handleGoBack();
        }
      }
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [detailSelection, activeTrackingOrder, customizationRequestId, authOpen, enquiry, menuOpen, studentMenuOpen, page]);

  function openListingDetails(item: Listing) {
    detailReturnScroll.current = window.scrollY;
    setDetailSelection({ type: "listing", item });
    const currentPath = getPathFromPage(page);
    window.history.pushState(
      { page, hasDetail: true, detailType: "listing", detailId: item.id, isRoot: false },
      "",
      `${currentPath}?detail=${encodeURIComponent(item.id)}`
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openResourceDetails(item: Resource) {
    detailReturnScroll.current = window.scrollY;
    setDetailSelection({ type: "resource", item });
    const currentPath = getPathFromPage(page);
    window.history.pushState(
      { page, hasDetail: true, detailType: "resource", detailId: item.title, isRoot: false },
      "",
      `${currentPath}?resource=${encodeURIComponent(item.title)}`
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeDetails() {
    setDetailSelection(null);
    const st = window.history.state as { hasDetail?: boolean } | null;
    if (st?.hasDetail) {
      window.history.back();
    } else {
      const currentPath = getPathFromPage(page);
      window.history.replaceState({ page, hasDetail: false, isRoot: page === "Home" }, "", currentPath);
    }
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
        clickedAt: Date.now(),
        didLeave: false,
      }));
    } catch {
      // session storage might be blocked in private mode
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
    showToast("Added to cart! 🛒", "success");
    navigate("Cart");
  }

  function removeProjectFromCart(id: string) {
    setCartIds((current) => current.filter((cartId) => cartId !== id));
    showToast("Project removed from cart.", "info");
  }

  function toggleSaved(id: string) {
    const isNowSaved = !savedIds.includes(id);
    setSavedIds((current) => current.includes(id) ? current.filter((saved) => saved !== id) : [...current, id]);
    showToast(isNowSaved ? "Saved to your collection! ✨" : "Removed from collection.", "info");
  }

  function toggleCompare(id: string) {
    setCompareIds((current) => current.includes(id) ? current.filter((selected) => selected !== id) : current.length < 3 ? [...current, id] : current);
  }

  function startExplore() {
    document.getElementById("explore")?.scrollIntoView({ behavior: "smooth" });
  }

  if (page === "Admin") return <AdminPage onExit={handleGoBack} />;

  return (
    <>
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
            <ShoppingCart size={13} />
            {cartIds.length > 0 && <span className="header-cart-count">{cartIds.length}</span>}
          </button>
          {currentUser ? (
            <div className="student-menu-wrap">
              <button
                className="student-profile-button"
                type="button"
                onClick={() => setStudentMenuOpen((open) => !open)}
                aria-label={userRole === "admin" ? "Open administrator menu" : "Open student account menu"}
                title={userRole === "admin" ? "Administrator options" : "Student dashboard and account options"}
                aria-expanded={studentMenuOpen}
                aria-haspopup="menu"
              >
                <span className="student-avatar">{userRole === "admin" ? <ShieldCheck size={11} /> : <UserRound size={11} />}</span>
                <span className="student-profile-label">{userRole === "admin" ? "Admin" : ""}</span>
                <ChevronDown size={8} />
              </button>
              {studentMenuOpen && (
                <div className="student-menu" role="menu" aria-label={userRole === "admin" ? "Administrator menu" : "Student menu"}>
                  <div className="student-menu-account">
                    <strong>{userRole === "admin" ? "Administrator account" : "Student account"}</strong>
                    <span>{currentUser.email}</span>
                  </div>
                  {userRole === "admin" ? (
                    <>
                      <button type="button" role="menuitem" onClick={() => { setStudentMenuOpen(false); navigate("Admin"); }}>
                        <UserCog size={16} />
                        <span>Admin Console</span>
                      </button>
                      <button type="button" role="menuitem" onClick={() => { setStudentMenuOpen(false); void handleSignOut(); }}>
                        <LogOut size={16} />
                        <span>Sign out</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {studentMenuItems.map(({ id, label, icon: Icon }) => (
                        <button key={id} type="button" role="menuitem" onClick={() => openStudentDestination(id)}>
                          <Icon size={16} />
                          <span>{label}</span>
                        </button>
                      ))}
                      <button type="button" role="menuitem" onClick={() => { setStudentMenuOpen(false); void handleSignOut(); }}>
                        <LogOut size={16} />
                        <span>Sign out</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button className="sign-button" onClick={() => {
              setAuthOpen(true);
            }}>Sign in <ArrowRight size={10} /></button>
          )}
          <button className="menu-toggle" aria-label={menuOpen ? "Close site navigation" : "Open site navigation"} title="Site navigation" aria-controls="main-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={14} /> : <Menu size={14} />}
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
          onOrder={detailSelection.type === "listing" && (detailSelection.item.kind === "Projects" || detailSelection.item.kind === "Products") ? () => addProjectToCart(detailSelection.item.id) : undefined}
          onCustomize={detailSelection.type === "listing" && detailSelection.item.kind === "Projects" ? () => openProjectCustomization(detailSelection.item) : undefined}
        />
      ) : page === "AppHome" ? (
        <AppHomepageDedicatedPage
          navigate={navigate}
          onOpenAuth={() => setAuthOpen(true)}
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
        userRole === "admin" ? (
          <main className="directory-page">
            <section className="directory-content">
              <div className="empty-state">
                <div className="empty-icon"><ShieldCheck size={24} /></div>
                <span className="eyebrow"><span className="eyebrow-line" /> ADMINISTRATOR ACCOUNT</span>
                <h3>You are signed in as an administrator.</h3>
                <p>Student dashboards and profile features are for student accounts. You can manage the platform using the Admin Console.</p>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "16px", flexWrap: "wrap" }}>
                  <button className="button button-dark" onClick={() => navigate("Admin")}>Go to Admin Console <ArrowRight size={15} /></button>
                  <button className="button button-outline" onClick={() => void handleSignOut()}>Sign out</button>
                </div>
              </div>
            </section>
          </main>
        ) : (
          <StudentDashboard
            student={student}
            section={studentSection}
            setSection={setStudentSection}
            navigate={navigate}
            listings={listings}
            savedIds={savedIds}
            onViewListing={openListingDetails}
            opportunityActivityRevision={opportunityActivityRevision}
            onUpdateOpportunityActivity={(activity, status) => void saveOpportunityActivity({ id: activity.opportunity_id, kind: activity.opportunity_kind, title: activity.title, organization: activity.organization, city: activity.city, sourceUrl: activity.opportunity_url, summary: "", tags: [] }, status)}
            initialTrackingOrder={activeTrackingOrder}
            onClearInitialTrackingOrder={() => setActiveTrackingOrder(null)}
          />
        )
      ) : page === "Cart" ? (
        <ProjectCartPage listings={listings} cartIds={cartIds} removeProject={removeProjectFromCart} onCheckout={() => navigate("Checkout")} onContinueShopping={() => navigate("Projects")} onViewListing={openListingDetails} />
      ) : page === "Checkout" || page === "PaymentResult" ? (
        <ProjectCheckoutPage
          listings={listings}
          cartIds={cartIds}
          setCartIds={setCartIds}
          currentUser={currentUser}
          apiBaseUrl={API_BASE_URL}
          navigate={navigate}
          onBackToCart={() => navigate("Cart")}
          initialConfirmedOrder={returnConfirmedOrder}
          onViewOrderDetails={viewOrderDetails}
        />
      ) : page === "Saved" ? (
        <SavedPage listings={listings} savedIds={savedIds} toggleSaved={toggleSaved} setEnquiry={setEnquiry} addProjectToCart={addProjectToCart} onViewListing={openListingDetails} onViewResource={openResourceDetails} />
      ) : page === "Products" ? (
        <ComponentCatalogPage
          listings={listings}
          cartIds={cartIds}
          onAddToCart={(id) => {
            setCartIds((current) => current.includes(id) ? current : [...current, id]);
            showToast("Component added to cart! 🛒", "success");
          }}
          onBuyNow={(id) => {
            setCartIds((current) => current.includes(id) ? current : [...current, id]);
            showToast("Component added to cart! 🛒", "success");
            navigate("Cart");
          }}
          onGoToCart={() => navigate("Cart")}
          onGoToCheckout={() => navigate("Cart")}
          onViewListing={openListingDetails}
        />
      ) : page === "Terms" || page === "Privacy" || page === "Cookies" || page === "Delivery" ? (
        <PolicyDedicatedPage
          policy={page === "Terms" ? "terms" : page === "Privacy" ? "privacy" : page === "Cookies" ? "cookie" : "delivery"}
          navigate={navigate}
          currentConsent={cookieConsent}
          onUpdateConsent={handleUpdateCookieConsent}
        />
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
          onTrackOpportunity={prepareOpportunityFollowUp}
        />
      )}

      {dataError && <div className="toast-error" role="status"><CircleHelp size={16} /> {dataError}</div>}
      <Footer navigate={navigate} />
    </div>

    {cookieConsent === null && (
      <CookieConsentBanner
        onAcceptAll={() => handleUpdateCookieConsent("accepted")}
        onAcceptEssential={() => handleUpdateCookieConsent("essential")}
        onViewCookiePolicy={() => navigate("Cookies")}
      />
    )}

    {activePolicy && <PolicyModal type={activePolicy} onClose={() => setActivePolicy(null)} />}
    {globalToast && (
      <div className="global-toast-container">
        <div className={`global-toast toast-${globalToast.type}`}>
          {globalToast.message}
        </div>
      </div>
    )}

    {enquiry && <EnquiryModal listing={enquiry} onClose={() => setEnquiry(null)} />}
    {authOpen && <StudentAuthModal isPasswordRecovery={authRecovery} onClose={() => {
      setAuthOpen(false);
      if (["/login", "/signin", "/student-login", "/auth"].includes(window.location.pathname.replace(/\/+$/, ""))) {
        window.history.replaceState({}, "", "/");
      }
    }} onAuthenticated={(user) => {
      setAuthOpen(false);
      if (["/login", "/signin", "/student-login", "/auth"].includes(window.location.pathname.replace(/\/+$/, ""))) {
        window.history.replaceState({}, "", "/");
      }
      showToast(`Welcome back, ${user.user_metadata?.name || user.email || "Student"}!`, "success");
      const client = getSupabase();
      if (client) {
        void resolveUserRole(client, user).then((role) => {
          setStudentSection("overview");
          setAuthRecovery(false);
          if (page !== "Checkout" && page !== "Cart" && page !== "PaymentResult") {
            if (role === "student") navigate("Dashboard");
          }
        });
      } else {
        setCurrentUser(user);
        setUserRole("student");
        setStudentSection("overview");
        setAuthRecovery(false);
        if (page !== "Checkout" && page !== "Cart" && page !== "PaymentResult") {
          navigate("Dashboard");
        }
      }
    }} />}
    {pendingOpportunityPrompt && (
      <OpportunityReturnPrompt
        listing={pendingOpportunityPrompt}
        busy={opportunityActivitySaving}
        error={opportunityActivityError}
        onChoose={(status) => void saveOpportunityActivity(pendingOpportunityPrompt, status)}
        onDismiss={() => setPendingOpportunityPrompt(null)}
        student={student}
        onSignIn={() => {
          setPendingOpportunityPrompt(null);
          setAuthOpen(true);
        }}
      />
    )}
  </>
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
  const otherFeatured = ["Microcontroller-Based Project", "IoT Project", "PCB Design", "Robotics Project"]
    .map((category) => listings.find((item) => item.kind === "Projects" && item.projectCategory === category && item.imageUrl && item.id !== SPECIAL_OFFER_PROJECT_ID))
    .filter((item): item is Listing => Boolean(item));
  const featuredProjects = (otherFeatured.length > 0 ? otherFeatured : listings.filter((item) => item.kind === "Projects" && item.id !== SPECIAL_OFFER_PROJECT_ID)).slice(0, 4);
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
              <span>{activeSlide.page === "Products" ? "COMPONENTS" : activeSlide.page === "Learn" ? "RESOURCES" : activeSlide.page.toUpperCase()}</span>
              <h2>{activeSlide.title}</h2>
              <p>{activeSlide.description}</p>
              <button className="button button-primary" onClick={() => navigate(activeSlide.page)}>{activeSlide.action} <ArrowRight size={15} /></button>
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
          {featuredProjects.map((item) => {
            const isOffer = item.tags.includes("OFFER") || item.id === SPECIAL_OFFER_PROJECT_ID;
            return (
              <article className={`home-project-card${isOffer ? " is-offer-card" : ""}`} key={item.id}>
                <div className="home-project-image">
                  <button className="project-image-trigger" type="button" onClick={() => onViewListing(item)} aria-label={`View details for ${item.title}`}>
                    {item.imageUrl && <img src={item.imageUrl} alt={`${item.title} project`} loading="lazy" />}
                  </button>
                </div>
                <div className="home-project-content">
                  {isOffer && <span className="project-offer-tag">LIMITED FLASH OFFER</span>}
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <div className="home-project-tags">{item.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>
                  {item.projectPrice !== undefined && (
                    <div className="home-project-price-row">
                      <strong className="home-project-price">{formatPrice(item.projectPrice)}</strong>
                      {isOffer && <span className="home-project-strike">₹99</span>}
                    </div>
                  )}
                  <button className="home-project-link" type="button" onClick={() => onViewListing(item)}>View details <ArrowRight size={14} /></button>
                  <button className="home-project-order" onClick={() => addProjectToCart(item.id)}>Order now <ArrowRight size={15} /></button>
                </div>
              </article>
            );
          })}
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
              <button className="project-image-trigger" type="button" onClick={() => onViewListing(listing)} aria-label={`View details for ${listing.title}`}>
                <img src={page === "Internships" ? internshipOpportunityImage : hackathonOpportunityImage} alt={`${page} opportunities`} loading="lazy" decoding="async" />
              </button>
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
  compareIds: _compareIds,
  toggleCompare: _toggleCompare,
  setEnquiry,
  addProjectToCart,
  onViewListing,
  onViewResource,
  customizationRequestId,
  onCustomizationRequestHandled,
  onTrackOpportunity,
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
  onTrackOpportunity?: (listing: Listing) => void;
}) {
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
                {filtered.map((item, index) => <ListingCard key={item.id} listing={item} index={index} isSaved={savedIds.includes(item.id)} onSave={() => toggleSaved(item.id)} compareIds={[]} onCompare={() => undefined} onEnquire={() => setEnquiry(item)} isProjects={isProjects} canCompare={false} onOrderNow={() => addProjectToCart(item.id)} onViewDetails={() => onViewListing(item)} onTrackOpportunity={onTrackOpportunity} />)}
              </div>
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


function resourceId(title: string) {
  return `resource:${title}`;
}

export function downloadResourcePaper(item: Resource, onDone?: () => void) {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const dateStr = new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const docRef = `TCH-ECE-${item.title.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase()}-2026`;

    // Header banner
    doc.setFillColor(15, 31, 61);
    doc.rect(0, 0, 210, 26, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("TECHCIRCUIT HUB", 14, 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(254, 215, 170);
    doc.text("ECE & EMBEDDED SYSTEMS RESEARCH REPOSITORY · OFFICIAL WHITE PAPER", 14, 18);

    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225);
    doc.text(`REF: ${docRef}`, 155, 11);
    doc.text(`DATE: ${dateStr}`, 155, 18);

    // Title
    doc.setTextColor(15, 31, 61);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    const splitTitle = doc.splitTextToSize(item.title, 182);
    doc.text(splitTitle, 14, 36);

    let y = 36 + splitTitle.length * 6.5 + 4;

    // Metadata Strip Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, y, 182, 20, 2.5, 2.5, "FD");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(249, 115, 22);
    doc.text("CATEGORY:", 18, y + 6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 31, 61);
    doc.text(item.category || "General ECE Research", 40, y + 6.5);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(249, 115, 22);
    doc.text("PUBLISHER:", 18, y + 14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 31, 61);
    doc.text(item.publisher || "TechCircuit Academic Portal", 40, y + 14);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(249, 115, 22);
    doc.text("DISCIPLINE:", 110, y + 6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 31, 61);
    doc.text("Electronics & Communication (ECE)", 134, y + 6.5);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(249, 115, 22);
    doc.text("STATUS:", 110, y + 14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(22, 163, 74);
    doc.text("Peer-Verified Engineering Document", 134, y + 14);

    y += 28;

    // Section 1: Abstract & Executive Summary
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 31, 61);
    doc.text("1. ABSTRACT & EXECUTIVE SUMMARY", 14, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const abstractText = item.paperSummary || "A rigorous engineering document detailing architectural trade-offs, theoretical proofs, and practical hardware implementations for ECE systems.";
    const splitAbstract = doc.splitTextToSize(abstractText, 182);
    doc.text(splitAbstract, 14, y);
    y += splitAbstract.length * 4.8 + 6;

    // Section 2: Key Architectural & Hardware Specifications
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 31, 61);
    doc.text("2. KEY ARCHITECTURAL & HARDWARE SPECIFICATIONS", 14, y);
    y += 5;

    const specs = [
      ["Target Domain", "Electronics and Communication Engineering (ECE)"],
      ["Implementation Scope", "Embedded Systems, Signal Processing, VLSI & Circuit Design"],
      ["Standards Conformity", "IEEE, IPC-2221, ISO/IEC standards compliant"],
      ["Verified Publisher", item.publisher || "Academic / Open-Hardware Source"],
      ["Simulation Tools", "SPICE / LTspice, MATLAB/Simulink, KiCad 8.0, Keil MDK, Vivado, ModelSim, ESP-IDF"],
    ];

    specs.forEach(([label, val]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 31, 61);
      doc.text(`• ${label}:`, 18, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const splitVal = doc.splitTextToSize(val, 125);
      doc.text(splitVal, 62, y);
      y += Math.max(splitVal.length * 4.2, 5.2);
    });

    y += 3;

    // Section 3: Hardware & Circuit Design Notes
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 31, 61);
    doc.text("3. HARDWARE & CIRCUIT INTEGRITY NOTES", 14, y);
    y += 5;

    const notes = [
      "Differential and single-ended signaling integrity validated across operational temperature range (-40°C to +85°C).",
      "Decoupling capacitors and low-ESR ceramic bypass networks placed within 2mm of IC power pins.",
      "Clock jitter, propagation delay, and setup/hold timing margin closure verified across worst-case process corners.",
      "Ground plane impedance maintained with continuous return path to suppress EMI/EMC radiation.",
    ];

    notes.forEach((note) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const splitNote = doc.splitTextToSize(`- ${note}`, 178);
      doc.text(splitNote, 18, y);
      y += splitNote.length * 4.2 + 2;
    });

    y += 3;

    // Section 4: Official Citation & Portal Source
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 31, 61);
    doc.text("4. OFFICIAL CITATION & VERIFIED PORTAL ACCESS", 14, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("To inspect the uncompressed dataset, complete source schematics, and peer-reviewed publication, refer to the verified portal:", 14, y);
    y += 4.5;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(249, 115, 22);
    const splitUrl = doc.splitTextToSize(item.href, 182);
    doc.text(splitUrl, 14, y);

    // Footer
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 276, 196, 276);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 31, 61);
    doc.text("TechCircuit Hub · Discover. Learn. Build. Innovate.", 14, 283);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Empowering engineering students and builders with hands-on hardware and open research.", 14, 287);
    doc.text("https://techcircuithub.com", 160, 283);

    const safeTitle = item.title.replace(/[^a-zA-Z0-9_-]/g, "_");
    doc.save(`${safeTitle}_ECE_Paper.pdf`);
    onDone?.();
  } catch (err) {
    console.error("PDF generation error:", err);
  }
}

function ResourceCard({
  item,
  index: _index = 0,
  isSaved,
  onSave,
  onViewDetails,
  onDownloadPaper,
}: {
  item: Resource;
  index?: number;
  isSaved: boolean;
  onSave: () => void;
  onViewDetails: () => void;
  onDownloadPaper?: () => void;
}) {
  const resourceImg = resourceImage;
  return (
    <article className="resource-card">
      <div className="resource-card-visual">
        <button className="project-image-trigger" type="button" onClick={onViewDetails} aria-label={`View details for ${item.title}`}>
          <img src={resourceImg} alt={item.title} loading="lazy" />
        </button>
        <button className="resource-save" aria-label={isSaved ? "Remove saved resource" : "Save resource"} onClick={onSave}>
          {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        </button>
      </div>
      <div className="resource-card-body">
        <div className="resource-meta-top">
          <span className="resource-publisher">{item.publisher}</span>
        </div>
        <button className="resource-title-btn" type="button" onClick={onViewDetails}>
          <h3>{item.title}</h3>
        </button>
        <p>{item.paperSummary || `Published by ${item.publisher}. Peer-reviewed research and official engineering documentation.`}</p>
        <div className="resource-card-actions">
          <button type="button" className="text-link" onClick={onViewDetails}>
            View details <ArrowRight size={14} />
          </button>
          <button
            type="button"
            className="button button-outline button-small resource-download-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (onDownloadPaper) {
                onDownloadPaper();
              } else {
                downloadResourcePaper(item);
              }
            }}
            title={`Download ${item.title} (PDF)`}
          >
            <Download size={13} /> Download Paper (PDF)
          </button>
        </div>
      </div>
    </article>
  );
}

function ListingDetailPage({
  selection,
  isSaved,
  onBack: _onBack,
  onSave,
  onTrackOpportunity,
  onEnquire,
  onOrder,
  onCustomize,
  onDownloadResource,
}: {
  selection: DetailSelection;
  isSaved: boolean;
  onBack: () => void;
  onSave: () => void;
  onTrackOpportunity?: (listing: Listing) => void;
  onEnquire?: () => void;
  onOrder?: () => void;
  onCustomize?: () => void;
  onDownloadResource?: (resource: Resource) => void;
}) {
  if (selection.type === "resource") {
    const resource = selection.item;
    const resourceImg = resourceImage;
    return (
      <main className="detail-page">
        <div className="detail-content detail-content-mockup">
          <section className="detail-mockup-card">
            <div className="detail-mockup-visual">
              <img className="detail-mockup-img" src={resourceImg} alt={`${resource.title} visual`} />
            </div>
            <div className="detail-mockup-body">
              <div className="detail-mockup-eyebrow">
                <span className="eyebrow-dash" />
                <span className="eyebrow-text">{resource.category.toUpperCase()}</span>
              </div>
              <h1 className="detail-mockup-title">{resource.title}</h1>
              <div className="detail-mockup-byline">
                <span>Published by {resource.publisher}</span>
                <span className="byline-bullet">•</span>
                <span>Peer-Reviewed Research</span>
                <span className="byline-bullet">•</span>
                <span>Official Documentation</span>
              </div>
              <p className="detail-mockup-summary">{resource.paperSummary || `Published by ${resource.publisher}. Official engineering research documentation and technical guidance verified for students.`}</p>
              
              <div className="detail-mockup-actions-row">
                <button
                  className="detail-mockup-btn-primary"
                  type="button"
                  onClick={() => onDownloadResource ? onDownloadResource(resource) : downloadResourcePaper(resource)}
                >
                  <Download size={18} />
                  <span>Download Paper (PDF)</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  className={`detail-mockup-btn-save ${isSaved ? "is-saved" : ""}`}
                  type="button"
                  onClick={onSave}
                  aria-label={isSaved ? "Remove from saved collection" : "Save for Later"}
                >
                  {isSaved ? <BookmarkCheck size={18} className="saved-icon" /> : <Bookmark size={18} />}
                  <span>{isSaved ? "Saved" : "Save for Later"}</span>
                </button>
              </div>

              <div className="detail-mockup-extra">
                <a className="text-link detail-source-link" href={resource.href} target="_blank" rel="noreferrer">
                  Open official publisher source <ArrowUpRight size={14} />
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const listing = selection.item;
  const isProject = listing.kind === "Projects";
  const isComponent = listing.kind === "Products";
  const isOpportunity = ["Internships", "Training", "Hackathons"].includes(listing.kind);
  const detailImage =
    listing.imageUrl ||
    listing.componentDetails?.imageUrl ||
    (listing.kind === "Internships"
      ? internshipOpportunityImage
      : listing.kind === "Hackathons"
      ? hackathonOpportunityImage
      : listing.kind === "Training"
      ? trainingOpportunityImage
      : listing.kind === "PCB Design"
      ? (homeShowcaseImages[0] || internshipOpportunityImage)
      : listing.kind === "Manufacturing"
      ? (homeShowcaseImages[0] || internshipOpportunityImage)
      : undefined);

  const eyebrowCategory = isProject
    ? (listing.projectCategory ? `${listing.projectCategory.toUpperCase()}-BASED PROJECT` : "MICROCONTROLLER-BASED PROJECT")
    : isComponent
    ? (listing.category ? `${listing.category.toUpperCase()} • ECE LAB COMPONENT` : "ECE LAB COMPONENT")
    : `${listing.kind.toUpperCase()}-BASED OPPORTUNITY`;

  return (
    <main className="detail-page">
      <div className="detail-content detail-content-mockup">
        <section className="detail-mockup-card">
          <div className="detail-mockup-visual">
            {detailImage ? (
              <img className="detail-mockup-img" src={detailImage} alt={`${listing.title} preview`} />
            ) : (
              <div className="detail-visual-fallback"><CircuitBoard size={58} strokeWidth={1.1} /><span>{listing.kind.toUpperCase()} / TECHCIRCUIT HUB</span></div>
            )}
          </div>
          <div className="detail-mockup-body">
            <div className="detail-mockup-eyebrow">
              <span className="eyebrow-dash" />
              <span className="eyebrow-text">{eyebrowCategory}</span>
            </div>
            <h1 className="detail-mockup-title">{listing.title}</h1>
            <div className="detail-mockup-byline">
              <span>{isProject ? "Hardware Project Kit" : isComponent ? (listing.category || "Lab Component") : listing.organization}</span>
              <span className="byline-bullet">•</span>
              <span>{isComponent ? (listing.unit ? `Pack of ${listing.quantity || 1} ${listing.unit}` : "Lab Verified") : (listing.mode || "Ready to ship")}</span>
              <span className="byline-bullet">•</span>
              <span>{listing.city || (isComponent ? "Chennai / Pan-India Delivery" : "All India")}</span>
            </div>
            {(isProject || isComponent) && (listing.price !== undefined || listing.projectPrice !== undefined) && (
              <div className="detail-mockup-price">
                {formatPrice(listing.price ?? listing.projectPrice ?? 0)}
                {isComponent && listing.unit ? <span style={{ fontSize: "16px", fontWeight: "normal", color: "#64748b", marginLeft: "6px" }}>/{listing.unit}</span> : null}
              </div>
            )}
            <p className="detail-mockup-summary">{listing.summary}</p>
            
            {/* Main Action Buttons Row matching mockup */}
            <div className="detail-mockup-actions-row">
              {onOrder && (isProject || isComponent) ? (
                <button className="detail-mockup-btn-primary button-order-now" type="button" onClick={onOrder}>
                  <ShoppingCart size={18} />
                  <span>Order Now</span>
                  <ArrowRight size={16} />
                </button>
              ) : listing.sourceUrl && !isProject && !isComponent ? (
                <a
                  className="detail-mockup-btn-primary"
                  href={listing.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onTrackOpportunity?.(listing)}
                >
                  <span>{listing.kind === "Internships" ? "Apply Now" : listing.kind === "Training" ? "Enroll Now" : listing.kind === "Hackathons" ? "Register Now" : "Visit Portal"}</span>
                  <ArrowRight size={16} />
                </a>
              ) : onEnquire && !isProject && !isComponent ? (
                <button className="detail-mockup-btn-primary" type="button" onClick={onEnquire}>
                  <span>Enquire Now</span>
                  <ArrowRight size={16} />
                </button>
              ) : null}

              <button
                className={`detail-mockup-btn-save ${isSaved ? "is-saved" : ""}`}
                type="button"
                onClick={onSave}
                aria-label={isSaved ? "Remove from saved collection" : "Save for Later"}
              >
                {isSaved ? <BookmarkCheck size={18} className="saved-icon" /> : <Bookmark size={18} />}
                <span>{isSaved ? "Saved" : "Save for Later"}</span>
              </button>
            </div>

            {/* Extended Info & Specifications */}
            <div className="detail-mockup-extra">
              {isProject && (
                <div className="detail-kit-notice">
                  <Truck size={16} />
                  <span><strong>Built to order (~7 days delivery).</strong> Handcrafted hardware kit assembled by workshop engineers, firmware pre-flashed, with schematics &amp; documentation.</span>
                </div>
              )}

              {isComponent && (
                <div className="detail-kit-notice">
                  <ShieldCheck size={16} />
                  <span><strong>MSAJCE ECE Lab Verified Component.</strong> Genuine lab-grade hardware tested for institutional university laboratories, student project builds, and institutional wholesale procurement.</span>
                </div>
              )}

              {isComponent && listing.specification && (
                <div className="detail-components-box">
                  <h4>Technical Specifications</h4>
                  <p style={{ margin: "6px 0 0", color: "#334155", fontSize: "14.5px" }}>{listing.specification}</p>
                </div>
              )}

              {isComponent && listing.notes && (
                <div className="detail-components-box" style={{ marginTop: "12px" }}>
                  <h4>Procurement &amp; Usage Notes</h4>
                  <p style={{ margin: "6px 0 0", color: "#475569", fontSize: "14px" }}>{listing.notes}</p>
                </div>
              )}

              {onCustomize && isProject && (
                <button className="button button-outline detail-customize-btn" type="button" onClick={onCustomize}>
                  <Wrench size={15} /> Customize project specifications <ArrowRight size={14} />
                </button>
              )}

              {isOpportunity && isOpportunityEnded(listing) && (
                <p className="detail-notice ended-notice"><CircleHelp size={15} /> Event dates or registration deadlines for this opportunity have already passed.</p>
              )}

              {(listing.duration || listing.eligibility) && (
                <div className="detail-facts-compact">
                  {listing.duration && <span><Clock3 size={14} /> {listing.duration}</span>}
                  {listing.eligibility && <span><GraduationCap size={14} /> {listing.eligibility}</span>}
                </div>
              )}

              {listing.components && listing.components.length > 0 && (
                <div className="detail-components-box">
                  <h4>{isProject ? "Specification Overview & Included Items" : "What's Included"}</h4>
                  <ul className="detail-components-list">
                    {listing.components.map((component) => <li key={component}>{component}</li>)}
                  </ul>
                </div>
              )}

              {listing.tags.length > 0 && (
                <div className="detail-tags-pills">
                  {listing.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
                </div>
              )}

              {listing.sourceUrl && !isProject && (
                <div className="detail-source-box">
                  <a className="text-link" href={listing.sourceUrl} target="_blank" rel="noreferrer" onClick={() => onTrackOpportunity?.(listing)}>
                    {listing.kind === "Internships" ? "Apply on company portal" : listing.kind === "Training" ? "Enroll on official training site" : listing.kind === "Hackathons" ? "Register on official hackathon page" : "Visit official source"} <ArrowUpRight size={14} />
                  </a>
                </div>
              )}
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
    imageUrl: typeof details.imageUrl === "string" ? safeImageUrl(details.imageUrl) : "",
    offers,
  };
}

function uniqueComponentListings(listings: Listing[]): Listing[] {
  const productsById = new Map<string, Listing>();
  for (const product of listings) {
    if (!product || product.kind !== "Products") continue;
    if (!productsById.has(product.id)) {
      productsById.set(product.id, product);
    }
  }
  return [...productsById.values()];
}

function ComponentCatalogPage({
  listings: _listings,
  cartIds,
  onAddToCart,
  onBuyNow,
  onGoToCart,
  onGoToCheckout,
  onViewListing,
}: {
  listings: Listing[];
  cartIds: string[];
  onAddToCart: (id: string) => void;
  onBuyNow: (id: string) => void;
  onGoToCart: () => void;
  onGoToCheckout: () => void;
  onViewListing?: (listing: Listing) => void;
}) {
  const [activeTab, setActiveTab] = useState<"catalog" | "custom">("catalog");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchInput, setSearchInput] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc" | "name">("default");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 16;

  // Retrieve exactly the 92 Excel sheet components
  const products = useMemo(() => {
    return ECE_COMPONENTS_CATALOG as Listing[];
  }, []);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let result = products;

    if (selectedCategory !== "All") {
      result = result.filter(
        (item) => item.category === selectedCategory || item.tags?.includes(selectedCategory) || item.componentDetails?.category === selectedCategory
      );
    }

    const query = searchInput.trim().toLowerCase();
    if (query) {
      result = result.filter((item) => {
        const titleMatch = (item.title || "").toLowerCase().includes(query);
        const specMatch = (item.specification || item.componentDetails?.mpn || "").toLowerCase().includes(query);
        const catMatch = (item.category || item.componentDetails?.category || "").toLowerCase().includes(query);
        const notesMatch = (item.notes || "").toLowerCase().includes(query);
        const sNoMatch = item.sNo ? String(item.sNo) === query.replace("#", "") : false;
        const unitMatch = (item.unit || "").toLowerCase().includes(query);
        const summaryMatch = (item.summary || "").toLowerCase().includes(query);
        return titleMatch || specMatch || catMatch || notesMatch || sNoMatch || unitMatch || summaryMatch;
      });
    }

    result = [...result].sort((a, b) => {
      const priceA = a.price ?? a.projectPrice ?? 0;
      const priceB = b.price ?? b.projectPrice ?? 0;
      if (sortBy === "price-asc") {
        return priceA - priceB;
      }
      if (sortBy === "price-desc") {
        return priceB - priceA;
      }
      if (sortBy === "name") {
        return (a.title || "").localeCompare(b.title || "");
      }
      return (a.sNo ?? 0) - (b.sNo ?? 0);
    });

    return result;
  }, [products, selectedCategory, searchInput, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Cart total for components
  const cartComponents = useMemo(() => {
    return cartIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Listing => Boolean(p));
  }, [cartIds, products]);

  const cartTotal = cartComponents.reduce((sum, item) => sum + (item.price ?? item.projectPrice ?? 0), 0);

  function handleCategoryClick(cat: string) {
    setSelectedCategory(cat);
    setCurrentPage(1);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchInput(e.target.value);
    setCurrentPage(1);
  }

  function clearSearch() {
    setSearchInput("");
    setCurrentPage(1);
  }

  function getCategoryIcon(cat?: string) {
    switch (cat) {
      case "Sensors & IoT":
        return <Activity size={24} />;
      case "Semiconductors":
        return <Sparkles size={24} />;
      case "ICs & digital":
      case "Boards & embedded":
        return <Cpu size={24} />;
      case "Prototyping":
        return <Layers3 size={24} />;
      case "Switching & power":
        return <CircuitBoard size={24} />;
      case "Electrical lab":
        return <Wrench size={24} />;
      case "Consumables":
        return <Package size={24} />;
      default:
        return <CircuitBoard size={24} />;
    }
  }

  return (
    <main className="directory-page component-catalog-page">
      <section className="directory-content component-catalog-content">
        <div className="project-mode-tabs" aria-label="Component options">
          <button
            className={activeTab === "catalog" ? "project-mode-tab active" : "project-mode-tab"}
            onClick={() => setActiveTab("catalog")}
            type="button"
          >
            Browse Catalog
          </button>
          <button
            className={activeTab === "custom" ? "project-mode-tab active" : "project-mode-tab"}
            onClick={() => setActiveTab("custom")}
            type="button"
          >
            Custom Component Request
          </button>
        </div>
        {activeTab === "custom" ? (
          <div className="custom-component-portal">
            <div className="custom-component-hero">
              <div className="eyebrow"><span className="eyebrow-line" /> CUSTOM COMPONENT SOURCING</div>
              <h1>Need a custom component, rare IC, or bulk lab quotation?</h1>
              <p>
                Can't find a specific component in our standard catalog? Looking for custom value resistors/capacitors, rare or obsolete semiconductors, custom PCB manufacturing, or batch procurement for your college lab? Submit your requirements via Google Form and our ECE lab engineers will prepare a formal quote for you.
              </p>
              <div className="custom-hero-cta">
                <a
                  className="button button-dark button-large"
                  href={COMPONENT_CUSTOMIZATION_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Open Custom Component Request Form</span>
                  <ArrowUpRight size={17} />
                </a>
                <button
                  className="button button-outline button-large"
                  type="button"
                  onClick={() => setActiveTab("catalog")}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Component Catalog</span>
                </button>
              </div>
            </div>

            <div className="custom-component-grid">
              <div className="custom-feature-card">
                <div className="custom-feature-icon"><CircuitBoard size={24} /></div>
                <h3>Custom PCB Fabrication &amp; Assembly</h3>
                <p>Upload your Gerber files and BOM. We fabricate 1 to 6-layer FR4 boards, assemble SMD and through-hole parts, and perform electrical continuity testing.</p>
                <span className="custom-badge">Prototyping &amp; SMT</span>
              </div>

              <div className="custom-feature-card">
                <div className="custom-feature-icon"><Cpu size={24} /></div>
                <h3>Rare, Obsolete &amp; High-Grade ICs</h3>
                <p>Need discontinued microcontrollers, specialized RF modules, analog ASICs, or military-temperature grade chips? We source authentic parts through trusted channels.</p>
                <span className="custom-badge">Authentic Sourcing</span>
              </div>

              <div className="custom-feature-card">
                <div className="custom-feature-icon"><Building2 size={24} /></div>
                <h3>Institutional University &amp; College Lab Kits</h3>
                <p>Procuring for student semester practicals? We prepare customized individual student kits (ECE, IoT, Robotics, VLSI) with institutional GST tax invoicing.</p>
                <span className="custom-badge">College Lab Bundles</span>
              </div>

              <div className="custom-feature-card">
                <div className="custom-feature-icon"><Wrench size={24} /></div>
                <h3>Lab Test Instruments &amp; Calibration</h3>
                <p>Order high-bandwidth oscilloscopes, arbitrary function generators, regulated bench supplies, and safety isolation transformers with factory calibration certificates.</p>
                <span className="custom-badge">Certified Instruments</span>
              </div>
            </div>

            <div className="custom-process-card">
              <h3>How Custom Procurement Works</h3>
              <div className="custom-steps">
                <div className="custom-step">
                  <span className="step-num">1</span>
                  <h4>Submit Request</h4>
                  <p>Open the Google Form and provide required part numbers, quantities, target specifications, or upload your BOM.</p>
                </div>
                <div className="custom-step">
                  <span className="step-num">2</span>
                  <h4>Engineering Review</h4>
                  <p>Our lab engineers check supplier availability, technical compatibility, pricing, and bulk discounts.</p>
                </div>
                <div className="custom-step">
                  <span className="step-num">3</span>
                  <h4>Formal Quotation</h4>
                  <p>We send an official quotation / proforma invoice with GST, HSN codes, and lead times within 24 hours.</p>
                </div>
                <div className="custom-step">
                  <span className="step-num">4</span>
                  <h4>Dispatch &amp; Delivery</h4>
                  <p>Upon institutional purchase order or payment, goods are tested, securely packed, and shipped via insured express courier.</p>
                </div>
              </div>
              <div className="custom-form-note">
                <ShieldCheck size={18} />
                <span>
                  Official Google Form URL: <strong>{COMPONENT_CUSTOMIZATION_FORM_URL}</strong> (Update this form URL anytime in system settings).
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Search & Toolbar */}
            <div className="directory-toolbar component-toolbar">
              <div className="component-search-wrap">
                <Search size={16} className="component-search-icon" />
                <input
                  id="component-search"
                  type="search"
                  value={searchInput}
                  onChange={handleSearchChange}
                  placeholder="Search 92 components (e.g. ESP32, 10 kΩ, 7400)..."
                  aria-label="Search 92 components"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="component-search-clear"
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="component-toolbar-filters">
                <label className="select-wrap project-category-filter">
                  <select
                    aria-label="Filter components by category"
                    value={selectedCategory}
                    onChange={(e) => handleCategoryClick(e.target.value)}
                  >
                    {COMPONENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === "All" ? "All categories" : cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </label>

                <label className="select-wrap component-sort-filter">
                  <select
                    aria-label="Sort components"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="default">Default (S.No)</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name">Name: A–Z</option>
                  </select>
                  <ChevronDown size={14} />
                </label>

                <span className="count-label projects-count">
                  {filteredProducts.length} PARTS
                </span>
              </div>
            </div>

            {/* Empty State */}
            {filteredProducts.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon"><Cpu size={24} /></div>
                <h3>No components match your search.</h3>
                <p>Try searching with another keyword or select “All” categories to browse all 92 items.</p>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => { setSelectedCategory("All"); setSearchInput(""); }}
                >
                  Reset filters &amp; View All
                </button>
              </div>
            )}

            {/* Products Grid */}
            {paginatedProducts.length > 0 && (
              <div className="component-grid-new">
                {paginatedProducts.map((product, index) => {
                  const isInCart = cartIds.includes(product.id);
                  const displayPrice = product.price ?? product.projectPrice ?? 0;
                  const unitLabel = product.unit || "pc";
                  const sNo = product.sNo ?? (index + 1);

                  return (
                    <article
                      className="component-card-modern"
                      key={product.id}
                      onClick={() => onViewListing?.(product)}
                    >
                      <div className="component-card-top-bar">
                        <span className="component-card-sno">#{sNo}</span>
                        <span className="component-card-stock">
                          <span className="stock-dot" /> In Stock
                        </span>
                      </div>

                      <div
                        className="component-card-img-wrap"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewListing?.(product);
                        }}
                      >
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="component-card-fallback-icon">
                            {getCategoryIcon(product.category)}
                          </div>
                        )}
                      </div>

                      <div className="component-card-body">
                        <span className="component-card-cat-badge">{product.category}</span>
                        <h3 className="component-card-title" title={product.title}>
                          {onViewListing ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewListing(product);
                              }}
                              style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "inherit", cursor: "pointer", textAlign: "left" }}
                            >
                              {product.title}
                            </button>
                          ) : (
                            product.title
                          )}
                        </h3>
                        <p className="component-card-spec" title={product.specification || product.summary}>
                          {product.specification || product.summary}
                        </p>
                        {product.quantity ? (
                          <span className="component-card-pack-info">
                            Pack: {product.quantity} {unitLabel}
                          </span>
                        ) : null}
                        {product.notes ? (
                          <p className="component-card-notes" title={product.notes}>
                            {product.notes}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          className="text-link"
                          style={{ marginTop: 6, fontSize: "12.5px", alignSelf: "flex-start" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewListing?.(product);
                          }}
                        >
                          View details <ArrowRight size={13} />
                        </button>
                      </div>

                      <div className="component-card-footer" onClick={(e) => e.stopPropagation()}>
                        <div className="component-card-price-row">
                          <div>
                            <span className="component-card-price-val">₹{displayPrice.toLocaleString("en-IN")}</span>
                            <span className="component-card-unit-label">/{unitLabel}</span>
                          </div>
                          <span className="component-card-verified-tag">Lab Verified</span>
                        </div>

                        <div className="component-card-btn-row">
                          <button
                            type="button"
                            className={`button button-outline ${isInCart ? "in-cart-active" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToCart(product.id);
                            }}
                            title={isInCart ? "In your cart" : "Add to cart"}
                          >
                            {isInCart ? <Check size={14} /> : <ShoppingCart size={14} />}
                            <span>{isInCart ? "In Cart" : "Add"}</span>
                          </button>

                          <button
                            type="button"
                            className="button button-order-now"
                            onClick={(e) => {
                              e.stopPropagation();
                              onBuyNow(product.id);
                            }}
                            title="Order Now"
                          >
                            <ShoppingCart size={14} />
                            <span>Order Now</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <nav className="component-pagination" aria-label="Component catalog pages">
                <button
                  className="button button-outline button-small"
                  type="button"
                  onClick={() => {
                    setCurrentPage((page) => Math.max(1, page - 1));
                    window.scrollTo({ top: 350, behavior: "smooth" });
                  }}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>
                  Page {currentPage} of {totalPages} ({filteredProducts.length} components)
                </span>
                <button
                  className="button button-outline button-small"
                  type="button"
                  onClick={() => {
                    setCurrentPage((page) => Math.min(totalPages, page + 1));
                    window.scrollTo({ top: 350, behavior: "smooth" });
                  }}
                  disabled={currentPage === totalPages}
                >
                  Next <ChevronRight size={14} />
                </button>
              </nav>
            )}
          </>
        )}
      </section>

      {/* Sticky Floating Cart Bar */}
      {cartIds.length > 0 && (
        <aside className="component-floating-cart-bar" aria-label="Shopping Cart Summary">
          <div className="floating-cart-inner">
            <div className="floating-cart-info">
              <div className="floating-cart-badge">
                <ShoppingCart size={18} />
                <span>{cartIds.length}</span>
              </div>
              <div className="floating-cart-text">
                <strong>{cartIds.length} {cartIds.length === 1 ? "item" : "items"} in cart</strong>
                <span>{cartTotal > 0 ? `Subtotal: ₹${cartTotal.toLocaleString("en-IN")}` : "Ready for checkout"}</span>
              </div>
            </div>
            <div className="floating-cart-actions">
              <button className="button button-outline button-small" type="button" onClick={onGoToCart}>
                <span>View Cart</span>
              </button>
              <button className="button button-order-now button-small" type="button" onClick={onGoToCheckout}>
                <span>Order Now</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </aside>
      )}
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
  const mergedListings = useMemo(() => {
    const map = new Map<string, Listing>();
    for (const item of listings) {
      map.set(item.id, item);
    }
    for (const comp of ECE_COMPONENTS_CATALOG) {
      if (!map.has(comp.id)) {
        map.set(comp.id, comp as Listing);
      }
    }
    return [...map.values()];
  }, [listings]);

  const cartItems = cartIds
    .map((id) => mergedListings.find((item) => item.id === id && (item.kind === "Projects" || item.kind === "Products")))
    .filter((item): item is Listing => Boolean(item));
  const total = cartItems.reduce((sum, item) => sum + (item.price ?? projectPrice(item) ?? 0), 0);

  return (
    <main className="directory-page checkout-page">
      <section className="directory-content checkout-content" style={{ paddingTop: 32 }}>
        {cartItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><ShoppingCart size={23} /></div>
            <span className="eyebrow"><span className="eyebrow-line" /> YOUR CART IS EMPTY</span>
            <h3>Choose a component or project kit to get started.</h3>
            <p>Your items will stay in your cart while you browse.</p>
            <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
              <button className="button button-primary" type="button" onClick={onContinueShopping}>
                Browse projects <ArrowRight size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-items">
              {cartItems.map((item) => (
                <article className="cart-item" key={item.id}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" loading="lazy" onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }} />
                  ) : (
                    <div className="cart-item-placeholder"><CircuitBoard size={25} /></div>
                  )}
                  <div className="cart-item-info">
                    <span className="project-card-category">{item.projectCategory || item.category || (item.kind === "Products" ? "ECE Component" : "Hardware Project")}</span>
                    <button className="cart-item-title" type="button" onClick={() => onViewListing(item)}>{item.title}</button>
                    <p>{item.summary}</p>
                    {item.specification ? <p className="cart-item-spec"><strong>Spec:</strong> {item.specification}</p> : null}
                    {item.unit ? <p className="cart-item-spec"><strong>Unit:</strong> {item.quantity ? `${item.quantity} ` : ""}{item.unit}</p> : null}
                    {item.components?.length ? <p className="cart-item-spec"><strong>Components:</strong> {item.components.join(", ")}</p> : null}
                    <div style={{ display: "flex", gap: "14px", marginTop: "6px" }}>
                      <button className="text-link" type="button" onClick={() => onViewListing(item)}>View details <ArrowRight size={14} /></button>
                      <button className="text-link cart-remove" type="button" onClick={() => removeProject(item.id)}>Remove</button>
                    </div>
                  </div>
                  <strong className="cart-item-price">{formatPrice(item.price ?? projectPrice(item) ?? 0)}</strong>
                </article>
              ))}
              <button className="button button-outline" type="button" onClick={onContinueShopping}>Continue shopping</button>
            </div>
            <aside className="cart-summary">
              <span className="eyebrow"><span className="eyebrow-line" /> ORDER SUMMARY</span>
              <h2>Your total.</h2>
              <div className="cart-summary-row"><span>Items ({cartItems.length})</span><strong>{formatPrice(total)}</strong></div>
              <div className="cart-summary-row"><span>Delivery &amp; taxes</span><span>Free Pan-India Delivery</span></div>
              <div className="cart-summary-total"><span>Subtotal</span><strong>{formatPrice(total)}</strong></div>
              <p>Final payable amount and verified checkout will proceed through secure payment gateway.</p>
              <button className="button button-order-now cart-checkout-button" type="button" onClick={onCheckout}>Order now <ArrowRight size={16} /></button>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

const INDIAN_STATES_AND_UTS = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

function formatRupee(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function VisaLogo() {
  return (
    <svg width="38" height="13" viewBox="0 0 100 32" fill="none" aria-label="Visa" style={{ display: "block" }}>
      <path d="M38.8 31.4L44.1 0.6H52.5L47.2 31.4H38.8Z" fill="#1A1F71" />
      <path d="M73.5 1.1C71.8 0.4 69.1 0 65.8 0C57.5 0 51.7 4.4 51.6 10.7C51.5 15.4 55.7 18 58.9 19.5C62.1 21.1 63.3 22.1 63.3 23.5C63.3 25.7 60.7 26.7 58.2 26.7C54.1 26.7 51.8 26.1 48.2 24.5L46.8 23.8L45.3 30.6C47.2 31.5 50.7 32.2 54.4 32.2C63.2 32.2 68.9 27.8 69 21.3C69.1 16.3 66.1 12.6 59.7 9.5C56.3 7.8 55.4 6.7 55.4 5.3C55.4 3.7 57.2 2.7 60.4 2.7C63.1 2.7 65.1 3.3 66.8 4L67.7 4.4L73.5 1.1Z" fill="#1A1F71" />
      <path d="M81.5 24.6C82.1 22.9 85.1 14.8 85.1 14.8C85.1 14.8 85.7 13.1 86.1 12.1L86.6 14.6C87.2 17.5 89.2 26.5 89.5 27.9L81.5 24.6ZM94.2 0.6H87.7C85.7 0.6 84.1 1.2 83.2 3.3L71 31.4H79.5C79.5 31.4 80.9 27.5 81.3 26.5C82.1 26.5 89.5 26.5 90.6 26.5C90.9 27.7 91.6 31.4 91.6 31.4H99.1L94.2 0.6Z" fill="#1A1F71" />
      <path d="M25.7 0.6L17.7 22.3L16.8 17.9C15.3 12.8 10.7 7.2 5.8 4.6L13.1 31.4H21.6L34.2 0.6H25.7Z" fill="#1A1F71" />
      <path d="M12.7 0.6H0.2L0 1.2C9.7 3.7 16.1 7.9 18.8 11.4L16.1 1.9C15.6 0.7 14.3 0.6 12.7 0.6Z" fill="#F7B600" />
    </svg>
  );
}

function MastercardLogo() {
  return (
    <svg width="28" height="18" viewBox="0 0 38 24" fill="none" aria-label="Mastercard" style={{ display: "block" }}>
      <circle cx="12" cy="12" r="12" fill="#EB001B" />
      <circle cx="26" cy="12" r="12" fill="#F79E1B" fillOpacity="0.9" />
    </svg>
  );
}

function RuPayLogo() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontStyle: "italic", fontWeight: 900, fontSize: "13px", letterSpacing: "-0.02em" }}>
      <span style={{ color: "#0055A5" }}>Ru</span>
      <span style={{ color: "#E35205" }}>Pay</span>
      <span style={{ color: "#00A3E0", marginLeft: "1px", fontStyle: "normal", fontSize: "11px", fontWeight: 800 }}>»</span>
    </span>
  );
}

function UpiIconBadge() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", fontWeight: 900, fontSize: "11px", letterSpacing: "0.04em", color: "#0F1F3D", background: "#F1F5F9", padding: "2px 5px", borderRadius: "4px" }}>
      <span style={{ color: "#008850" }}>▲</span>
      <span>UPI</span>
    </span>
  );
}

function GooglePayLogo() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", fontWeight: 700, fontSize: "12px" }}>
      <span style={{ color: "#4285F4" }}>G</span>
      <span style={{ color: "#5F6368" }}>Pay</span>
    </span>
  );
}

function PhonePeLogo() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "19px", height: "19px", borderRadius: "50%", background: "#5F259F", color: "#FFFFFF", fontSize: "10.5px", fontWeight: 900 }}>
      पे
    </span>
  );
}

function PaytmLogo() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontWeight: 800, fontSize: "12px" }}>
      <span style={{ color: "#002970" }}>pay</span>
      <span style={{ color: "#00BAF2" }}>tm</span>
    </span>
  );
}

type CheckoutStep = "delivery" | "summary" | "payment" | "confirmation";

function ProjectCheckoutPage({
  listings,
  cartIds,
  setCartIds,
  currentUser,
  apiBaseUrl,
  navigate,
  onBackToCart,
  initialConfirmedOrder,
  onViewOrderDetails,
}: {
  listings: Listing[];
  cartIds: string[];
  setCartIds?: Dispatch<SetStateAction<string[]>>;
  currentUser?: User | null;
  apiBaseUrl?: string;
  navigate?: (page: Page) => void;
  onBackToCart: () => void;
  initialConfirmedOrder?: AdminOrder | null;
  onViewOrderDetails?: (order: AdminOrder) => void;
}) {
  const [step, setStep] = useState<CheckoutStep>(() => initialConfirmedOrder ? "confirmation" : "delivery");
  const [addressMode, setAddressMode] = useState<"saved" | "new">("saved");
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  // Address fields (no hardcoded test data)
  const [fullName, setFullName] = useState(currentUser?.user_metadata?.name || "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const emailAddress = currentUser?.email || "";
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Tamil Nadu");
  const [pincode, setPincode] = useState("");
  const [saveForFuture, setSaveForFuture] = useState(true);

  // Payment fields
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "card" | "upi">("qr");
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [confirmedOrderId, setConfirmedOrderId] = useState(() => initialConfirmedOrder?.order_number || initialConfirmedOrder?.id || "");
  const [confirmedOrder, setConfirmedOrder] = useState<AdminOrder | null>(() => initialConfirmedOrder || null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [policyModal, setPolicyModal] = useState<"terms" | "refund" | "delivery" | null>(null);
  const [upiAwaiting, setUpiAwaiting] = useState(false);
  const [upiTimer, setUpiTimer] = useState(300);

  // Zepto / Redbus style countdown & copy state
  const [detailCountdown, setDetailCountdown] = useState(5);
  const [countdownPaused, setCountdownPaused] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  // Cashfree Element references
  const cardElementsRef = useRef<{
    cardNumber?: CashfreeComponent;
    cardExpiry?: CashfreeComponent;
    cardCvv?: CashfreeComponent;
    cardHolder?: CashfreeComponent;
  }>({});
  const cardComponentRef = useRef<CashfreeComponent | null>(null);
  const upiComponentRef = useRef<CashfreeComponent | null>(null);

  // Saved user profile cache
  const savedAddressRef = useRef({
    fullName: currentUser?.user_metadata?.name || "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "Tamil Nadu",
    pincode: "",
  });

  // Pre-load saved address from Supabase profile if signed in
  useEffect(() => {
    if (!currentUser) return;
    const client = getSupabase();
    if (!client) return;

    void client
      .from("profiles")
      .select("display_name, name, phone, address_line1, address_line2, city, state, pincode")
      .eq("id", currentUser.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const profileName = (data.display_name || data.name as string | undefined)?.trim() || currentUser.user_metadata?.name || "";
          const profilePhone = (data.phone as string | undefined)?.trim() || "";
          const line1 = (data.address_line1 as string | undefined)?.trim() || "";
          const line2 = (data.address_line2 as string | undefined)?.trim() || "";
          const c = (data.city as string | undefined)?.trim() || "";
          const s = (data.state as string | undefined)?.trim() || "Tamil Nadu";
          const pin = (data.pincode as string | undefined)?.trim() || "";

          savedAddressRef.current = {
            fullName: profileName,
            phone: profilePhone,
            addressLine1: line1,
            addressLine2: line2,
            city: c,
            state: s,
            pincode: pin,
          };

          if (addressMode === "saved") {
            if (profileName) setFullName(profileName);
            if (profilePhone) setPhoneNumber(profilePhone);
            if (line1) setAddressLine1(line1);
            if (line2) setAddressLine2(line2);
            if (c) setCity(c);
            if (s) setState(s);
            if (pin) setPincode(pin);
          }
        }
      });
  }, [currentUser, addressMode]);

  // Cart items (projects and components)
  const activeCartItems = useMemo(() => {
    const map = new Map<string, Listing>();
    for (const item of listings) {
      map.set(item.id, item);
    }
    for (const comp of ECE_COMPONENTS_CATALOG) {
      if (!map.has(comp.id)) {
        map.set(comp.id, comp as Listing);
      }
    }
    return cartIds
      .map((id) => map.get(id))
      .filter((item): item is Listing => Boolean(item && (item.kind === "Projects" || item.kind === "Products")));
  }, [cartIds, listings]);

  const [purchasedItems, setPurchasedItems] = useState<Listing[]>(() => {
    if (initialConfirmedOrder?.items && listings.length) {
      return initialConfirmedOrder.items.map((it) => {
        const found = listings.find((l) => l.id === it.project_id);
        if (found) return found;
        return {
          id: it.project_id,
          title: it.title,
          price: it.price,
          imageUrl: internshipOpportunityImage,
          kind: "Projects" as const,
          organization: "TechCircuit Workshop",
          city: "Chennai",
          summary: "Custom handcrafted engineering project kit.",
          tags: ["Engineering", "Hardware"],
        };
      });
    }
    return activeCartItems;
  });

  useEffect(() => {
    if (activeCartItems.length > 0) {
      setPurchasedItems(activeCartItems);
    }
  }, [activeCartItems]);

  useEffect(() => {
    if (initialConfirmedOrder) {
      setConfirmedOrder(initialConfirmedOrder);
      setConfirmedOrderId(initialConfirmedOrder.order_number || initialConfirmedOrder.id);
      setStep("confirmation");
      if (initialConfirmedOrder.items && listings.length) {
        setPurchasedItems(
          initialConfirmedOrder.items.map((it) => {
            const found = listings.find((l) => l.id === it.project_id);
            if (found) return found;
            return {
              id: it.project_id,
              title: it.title,
              price: it.price,
              imageUrl: internshipOpportunityImage,
              kind: "Projects" as const,
              organization: "TechCircuit Workshop",
              city: "Chennai",
              summary: "Custom handcrafted engineering project kit.",
              tags: ["Engineering", "Hardware"],
            };
          })
        );
      }
    }
  }, [initialConfirmedOrder, listings]);

  useEffect(() => {
    if (step !== "confirmation" || countdownPaused) return;
    if (detailCountdown <= 0) {
      goToOrderDetails();
      return;
    }
    const timer = setTimeout(() => {
      setDetailCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [step, detailCountdown, countdownPaused]);

  function goToOrderDetails() {
    setCountdownPaused(true);
    if (confirmedOrder && onViewOrderDetails) {
      onViewOrderDetails(confirmedOrder);
    } else if (navigate) {
      navigate("Dashboard");
    }
  }

  function handleCopyOrderId(id: string) {
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(id);
      setCopiedOrderId(true);
      setTimeout(() => setCopiedOrderId(false), 2200);
    }
  }

  const displayItems = activeCartItems;
  const subtotal = displayItems.reduce((acc, item) => acc + (item.price ?? projectPrice(item) ?? 3499), 0);
  const shippingCharges = 0; // Free shipping
  const total = subtotal + shippingCharges;

  // Mount Cashfree Elements when payment step is reached
  useEffect(() => {
    if (step !== "payment" || paymentMethod === "qr") return;
    const mode = (import.meta.env.VITE_CASHFREE_ENV === "production" || import.meta.env.VITE_CASHFREE_ENV === "prod") ? "production" : "sandbox";

    const timer = setTimeout(() => {
      if (typeof window.Cashfree === "undefined") {
        return;
      }

      try {
        const cashfree = window.Cashfree({ mode });

        if (paymentMethod === "card") {
          const cardNumEl = document.getElementById("cf-card-number");
          const cardExpEl = document.getElementById("cf-card-expiry");
          const cardCvvEl = document.getElementById("cf-card-cvv");
          const cardHolderEl = document.getElementById("cf-card-holder");

          if (cardNumEl && cardExpEl && cardCvvEl && cardHolderEl) {
            cardNumEl.innerHTML = "";
            cardExpEl.innerHTML = "";
            cardCvvEl.innerHTML = "";
            cardHolderEl.innerHTML = "";

            const cardNumber = cashfree.create("cardNumber", {
              style: {
                base: {
                  fontSize: "14px",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  color: "#0F1F3D",
                  "::placeholder": { color: "#94A3B8" },
                },
              },
            });
            cardNumber.mount("#cf-card-number");

            const cardExpiry = cashfree.create("cardExpiry", {
              style: {
                base: {
                  fontSize: "14px",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  color: "#0F1F3D",
                  "::placeholder": { color: "#94A3B8" },
                },
              },
            });
            cardExpiry.mount("#cf-card-expiry");

            const cardCvv = cashfree.create("cardCvv", {
              style: {
                base: {
                  fontSize: "14px",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  color: "#0F1F3D",
                  "::placeholder": { color: "#94A3B8" },
                },
              },
            });
            cardCvv.mount("#cf-card-cvv");

            const cardHolder = cashfree.create("cardHolder", {
              values: { placeholder: "Name on Card" },
              style: {
                base: {
                  fontSize: "14px",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  color: "#0F1F3D",
                  "::placeholder": { color: "#94A3B8" },
                },
              },
            });
            cardHolder.mount("#cf-card-holder");

            cardElementsRef.current = { cardNumber, cardExpiry, cardCvv, cardHolder };
            cardComponentRef.current = cardNumber;
          }
        } else if (paymentMethod === "upi") {
          const upiEl = document.getElementById("cf-upi-collect");
          if (upiEl) {
            upiEl.innerHTML = "";
            const upiCollect = cashfree.create("upiCollect", {
              values: { placeholder: "username@okhdfcbank" },
              style: {
                base: {
                  fontSize: "14px",
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  color: "#0F1F3D",
                  "::placeholder": { color: "#94A3B8" },
                },
              },
            });
            upiCollect.mount("#cf-upi-collect");
            upiComponentRef.current = upiCollect;
          }
        }
      } catch (sdkErr) {
        console.error("Cashfree element initialization error:", sdkErr);
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [step, paymentMethod]);

  // UPI approval countdown
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (upiAwaiting && upiTimer > 0) {
      interval = setInterval(() => {
        setUpiTimer((t) => t - 1);
      }, 1000);
    } else if (upiTimer === 0 && upiAwaiting) {
      setUpiAwaiting(false);
      setSubmitting(false);
      setPaymentError("UPI approval timed out. Please try again or switch to Card payment.");
    }
    return () => clearInterval(interval);
  }, [upiAwaiting, upiTimer]);

  // Handle Radio address mode change
  function handleAddressModeChange(mode: "saved" | "new") {
    setAddressMode(mode);
    setFieldErrors({});
    if (mode === "saved") {
      setFullName(savedAddressRef.current.fullName);
      setPhoneNumber(savedAddressRef.current.phone);
      setAddressLine1(savedAddressRef.current.addressLine1);
      setAddressLine2(savedAddressRef.current.addressLine2);
      setCity(savedAddressRef.current.city);
      setState(savedAddressRef.current.state);
      setPincode(savedAddressRef.current.pincode);
    } else {
      setFullName("");
      setPhoneNumber("");
      setAddressLine1("");
      setAddressLine2("");
      setCity("");
      setState("Tamil Nadu");
      setPincode("");
    }
  }

  // Validate address fields
  function validateDelivery(): boolean {
    const errors: Record<string, string> = {};
    const nameTrim = fullName.trim();
    if (!nameTrim || nameTrim.length < 2) {
      errors.fullName = "Please enter your full name (minimum 2 characters).";
    }

    const cleanPhone = phoneNumber.replace(/[\s-]/g, "");
    const phoneRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
    if (!cleanPhone || cleanPhone === "+91" || !phoneRegex.test(cleanPhone)) {
      errors.phoneNumber = "Please enter a valid 10-digit Indian mobile number (+91).";
    }

    const line1Trim = addressLine1.trim();
    if (!line1Trim || line1Trim.length < 5) {
      errors.addressLine1 = "Please enter a valid street address (minimum 5 characters).";
    }

    const cityTrim = city.trim();
    if (!cityTrim) {
      errors.city = "Please enter your city.";
    }

    if (!state.trim()) {
      errors.state = "Please select your state or UT.";
    }

    const pinTrim = pincode.trim();
    if (!pinTrim || !/^[1-9][0-9]{5}$/.test(pinTrim)) {
      errors.pincode = "Please enter a valid 6-digit Indian postal pincode.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleContinueToSummary(e: FormEvent) {
    e.preventDefault();
    if (!validateDelivery()) {
      const firstErrorEl = document.querySelector(".checkout-input-field.has-error");
      firstErrorEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setStep("summary");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Handle Custom Web Checkout with Cashfree Elements (In-Page, NO redirect)
  async function handlePayNow() {
    if (activeCartItems.length === 0) {
      setPaymentError("Your cart is empty. Please select an item first.");
      return;
    }
    setSubmitting(true);
    setPaymentError("");

    const targetBaseUrl = apiBaseUrl || API_BASE_URL || window.location.origin;
    const cleanPhone = phoneNumber.replace(/\D/g, "").slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setPaymentError("Please provide a valid 10-digit mobile number in Delivery Address.");
      setSubmitting(false);
      return;
    }

    const shippingAddressPayload = {
      fullName: fullName.trim(),
      phone: phoneNumber.trim(),
      email: emailAddress.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
    };

    try {
      // 1. Create order on server (price calculated on server, amount never accepted from browser)
      const response = await fetch(`${targetBaseUrl}/api/payments/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectIds: activeCartItems.map((item) => item.id),
          items: activeCartItems.map((item) => ({
            id: item.id,
            title: item.title,
            price: item.price ?? projectPrice(item),
            qty: 1,
          })),
          customer: {
            name: fullName.trim(),
            email: emailAddress.trim(),
            phone: cleanPhone,
          },
          userId: currentUser?.id || "",
          shippingAddress: shippingAddressPayload,
          paymentMethod,
        }),
      });

      const orderData = (await response.json()) as {
        order_id: string;
        order_number?: string;
        cashfree_order_id?: string;
        payment_session_id?: string;
        environment?: "sandbox" | "production";
        amount?: number;
        error?: string;
      };

      if (!response.ok || !orderData.payment_session_id) {
        throw new Error(orderData.error || "The payment provider could not process the request. Check server credentials.");
      }

      // Pre-save checkout context and purchased items
      setPurchasedItems(activeCartItems);
      const normalizedMethod = paymentMethod === "card" ? "card" : "upi";
      try {
        localStorage.setItem("techcircuit_last_checkout", JSON.stringify({
          order_id: orderData.order_id,
          order_number: orderData.order_number,
          cashfree_order_id: orderData.cashfree_order_id,
          items: activeCartItems,
          shippingAddress: shippingAddressPayload,
          paymentMethod: normalizedMethod,
          total,
          timestamp: Date.now(),
        }));
        localStorage.setItem("techcircuit-customer-email", shippingAddressPayload.email);
        localStorage.setItem("techcircuit-customer-name", shippingAddressPayload.fullName);
      } catch {}

      // Always match the environment that created the payment session
      const resolvedMode: "sandbox" | "production" =
        orderData.environment === "production" || orderData.environment === "sandbox"
          ? orderData.environment
          : (import.meta.env.VITE_CASHFREE_ENV === "production" || import.meta.env.VITE_CASHFREE_ENV === "prod")
          ? "production"
          : "production";

      const checkoutPageUrl = resolvedMode === "production"
        ? `https://api.cashfree.com/pg/view/sessions/checkout?session_id=${encodeURIComponent(orderData.payment_session_id)}`
        : `https://sandbox.cashfree.com/pg/view/sessions/checkout?session_id=${encodeURIComponent(orderData.payment_session_id)}`;

      if (paymentMethod === "qr" || paymentMethod === "upi") {
        // Direct redirect to Cashfree hosted checkout website (no modal popup on site)
        window.dispatchEvent(
          new CustomEvent("techcircuit:toast", {
            detail: { message: "Redirecting to Cashfree secure checkout...", type: "info" },
          })
        );
        if (typeof window.Cashfree !== "undefined") {
          try {
            const cashfree = window.Cashfree({ mode: resolvedMode });
            await cashfree.checkout({
              paymentSessionId: orderData.payment_session_id,
              redirectTarget: "_self",
            });
            return;
          } catch (cfErr) {
            console.warn("Cashfree JS SDK checkout error, falling back to direct URL navigation:", cfErr);
          }
        }
        window.location.href = checkoutPageUrl;
        return;
      } else if (paymentMethod === "card") {
        if (typeof window.Cashfree === "undefined") {
          window.location.href = checkoutPageUrl;
          return;
        }
        const cashfree = window.Cashfree({ mode: resolvedMode });
        const { cardNumber, cardExpiry, cardCvv, cardHolder } = cardElementsRef.current;
        if (!cardNumber || !cardExpiry || !cardCvv) {
          throw new Error("Card inputs not ready. Please enter your card details.");
        }
        if (typeof cardNumber.isComplete === "function" && !cardNumber.isComplete()) {
          throw new Error("Please enter a complete 16-digit card number.");
        }
        if (typeof cardExpiry.isComplete === "function" && !cardExpiry.isComplete()) {
          throw new Error("Please enter a valid expiry date (MM/YY).");
        }
        if (typeof cardCvv.isComplete === "function" && !cardCvv.isComplete()) {
          throw new Error("Please enter a valid 3-digit CVV.");
        }
        const cardPayload = {
          cardNumber,
          cardExpiry,
          cardCvv,
          cardHolder: cardHolder || undefined,
        };

        try {
          const payResult = await cashfree.pay({
            paymentMethod: cardPayload,
            paymentSessionId: orderData.payment_session_id,
            savePaymentInstrument: false,
            redirectTarget: "_self",
          });
          if (payResult?.error) {
            throw new Error(payResult.error.message || payResult.error.description || "Card payment rejected.");
          }
          return;
        } catch (payErr: any) {
          console.warn("Direct card element pay error, redirecting to Cashfree checkout:", payErr);
          try {
            await cashfree.checkout({
              paymentSessionId: orderData.payment_session_id,
              redirectTarget: "_self",
            });
          } catch {
            window.location.href = checkoutPageUrl;
          }
          return;
        }
      } else {
        if (typeof window.Cashfree === "undefined") {
          window.location.href = checkoutPageUrl;
          return;
        }
        const cashfree = window.Cashfree({ mode: resolvedMode });
        const upiComp = upiComponentRef.current;
        if (!upiComp) {
          throw new Error("UPI input not ready. Please enter your UPI ID.");
        }
        if (typeof upiComp.isComplete === "function" && !upiComp.isComplete()) {
          throw new Error("Please enter a valid UPI ID (e.g. success@upi).");
        }
        setUpiAwaiting(true);
        setUpiTimer(300);

        try {
          const payResult = await cashfree.pay({
            paymentMethod: upiComp,
            paymentSessionId: orderData.payment_session_id,
            savePaymentInstrument: false,
            redirectTarget: "_self",
          });
          if (payResult?.error) {
            setUpiAwaiting(false);
            throw new Error(payResult.error.message || payResult.error.description || "UPI collect rejected.");
          }
          return;
        } catch (payErr: any) {
          setUpiAwaiting(false);
          console.warn("Direct UPI collect error, redirecting to Cashfree checkout:", payErr);
          try {
            await cashfree.checkout({
              paymentSessionId: orderData.payment_session_id,
              redirectTarget: "_self",
            });
          } catch {
            window.location.href = checkoutPageUrl;
          }
          return;
        }
      }

      // 3. Confirm authentic payment status on server (never trust browser alone)
      let verifiedOrder: AdminOrder | null = null;
      const lookupOrderId = orderData.cashfree_order_id || orderData.order_id || "";
      for (let attempt = 0; attempt < 8; attempt++) {
        const statusRes = await fetch(
          `${targetBaseUrl}/api/payments/status?orderId=${encodeURIComponent(lookupOrderId)}`
        );
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (
            statusData.status === "PAID" ||
            statusData.order_status === "PAID" ||
            statusData.payment_status === "Paid" ||
            statusData.order?.payment_status === "PAID" ||
            statusData.cf_order?.order_status === "PAID"
          ) {
            verifiedOrder = statusData.order || {
              id: orderData.order_id,
              order_id: orderData.order_id,
              order_number: orderData.order_number || `TCH-ORD-${orderData.order_id.slice(-6).toUpperCase()}`,
              subtotal: total,
              shipping_charges: 0,
              total_amount: total,
              currency: "INR",
              payment_gateway: "cashfree",
              customer_name: fullName.trim(),
              customer_email: emailAddress.trim(),
              customer_phone: cleanPhone,
              shipping_address: shippingAddressPayload,
              payment_method: normalizedMethod,
              payment_status: "PAID",
              tracking_status: "Order Placed",
              items: activeCartItems.map((item) => ({
                project_id: item.id,
                title: item.title,
                price: projectPrice(item) || (item.id === SPECIAL_OFFER_PROJECT_ID ? 20 : 3499),
                qty: 1,
              })),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            break;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }

      setUpiAwaiting(false);

      if (!verifiedOrder) {
        if (resolvedMode === "sandbox") {
          verifiedOrder = {
            id: orderData.order_id,
            order_id: orderData.order_id,
            order_number: orderData.order_number || `TCH-ORD-${orderData.order_id.slice(-6).toUpperCase()}`,
            subtotal: total,
            shipping_charges: 0,
            total_amount: total,
            currency: "INR",
            payment_gateway: "cashfree",
            customer_name: fullName.trim(),
            customer_email: emailAddress.trim(),
            customer_phone: cleanPhone,
            shipping_address: shippingAddressPayload,
            payment_method: normalizedMethod,
            payment_status: "PAID",
            tracking_status: "Order Placed",
            items: activeCartItems.map((item) => ({
              project_id: item.id,
              title: item.title,
              price: projectPrice(item) || (item.id === SPECIAL_OFFER_PROJECT_ID ? 20 : 3499),
              qty: 1,
            })),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          try {
            await fetch(`${targetBaseUrl}/api/payments/status?orderId=${encodeURIComponent(orderData.order_id)}&simulate=true&userId=${encodeURIComponent(currentUser?.id || "")}`);
          } catch {}
        }
      }

      if (!verifiedOrder) {
        throw new Error("Payment verification pending. If amount was debited, our team will confirm your order shortly.");
      }

      await finalizeSuccessfulOrder(verifiedOrder!, shippingAddressPayload);
    } catch (err: any) {
      setUpiAwaiting(false);
      console.error("[PAYMENT ERROR]", err);
      let message = "Payment encountered an error. Please try again.";
      if (typeof err === "string") {
        message = err;
      } else if (err?.error?.message) {
        message = err.error.message;
      } else if (err?.message) {
        message = err.message;
      } else if (err?.error_description) {
        message = err.error_description;
      } else if (typeof err?.error === "string") {
        message = err.error;
      }
      setPaymentError(message);
    } finally {
      setSubmitting(false);
      setUpiAwaiting(false);
    }
  }

  async function finalizeSuccessfulOrder(
    order: AdminOrder | { id: string; order_number?: string },
    shippingPayload: {
      fullName: string;
      phone: string;
      email: string;
      addressLine1: string;
      addressLine2: string;
      city: string;
      state: string;
      pincode: string;
    }
  ) {
    const targetBaseUrl = apiBaseUrl || API_BASE_URL || window.location.origin;
    const orderObj = order as AdminOrder;
    const fullOrderToSave: AdminOrder = {
      id: orderObj.id || (orderObj as any).order_id || `ord-${Date.now()}`,
      order_id: (orderObj as any).order_id || orderObj.id,
      order_number: orderObj.order_number || `TCH-ORD-${(orderObj.id || "").slice(-6).toUpperCase()}`,
      user_id: currentUser?.id || orderObj.user_id || "",
      customer_name: shippingPayload.fullName || orderObj.customer_name,
      customer_email: shippingPayload.email || orderObj.customer_email,
      customer_phone: shippingPayload.phone || orderObj.customer_phone,
      shipping_address: shippingPayload,
      items: orderObj.items || activeCartItems.map((item) => ({
        project_id: item.id,
        title: item.title,
        price: projectPrice(item) || (item.id === SPECIAL_OFFER_PROJECT_ID ? 20 : 3499),
        qty: 1,
      })),
      subtotal: orderObj.subtotal || total,
      shipping_charges: 0,
      total_amount: orderObj.total_amount || total,
      currency: "INR",
      payment_gateway: "cashfree",
      payment_method: orderObj.payment_method || paymentMethod,
      payment_status: "PAID",
      tracking_status: orderObj.tracking_status || "Order Placed",
      created_at: orderObj.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expected_delivery_date: orderObj.expected_delivery_date || new Date(Date.now() + 7 * 86400000).toISOString(),
      admin_notes: orderObj.admin_notes || "",
      status_history: (orderObj as any).status_history || [
        {
          id: `hist-${Date.now()}`,
          order_id: (orderObj as any).order_id || orderObj.id || "",
          from_stage: null,
          to_stage: "Order Placed",
          changed_by: "system",
          note: "Order confirmed and verified via payment gateway.",
          is_public: true,
          changed_at: new Date().toISOString(),
        },
      ],
    };

    // 1. Save into localStorage techcircuit_orders_store
    try {
      const existingRaw = localStorage.getItem("techcircuit_orders_store");
      const list: AdminOrder[] = existingRaw ? JSON.parse(existingRaw) : [];
      const filtered = list.filter((o) => o.id !== fullOrderToSave.id && o.order_id !== fullOrderToSave.order_id);
      filtered.unshift(fullOrderToSave);
      localStorage.setItem("techcircuit_orders_store", JSON.stringify(filtered));
      localStorage.setItem("techcircuit-customer-email", shippingPayload.email);
    } catch {}

    // 2. POST order to server /api/orders so server store & file persistence has it
    try {
      await fetch(`${targetBaseUrl}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullOrderToSave),
      });
    } catch (e) {
      console.warn("Could not POST order to server:", e);
    }

    // 3. Supabase upsert if connected
    const client = getSupabase();
    if (client) {
      try {
        await client.from("orders").upsert({
          id: fullOrderToSave.id,
          order_number: fullOrderToSave.order_number,
          user_id: currentUser?.id || null,
          customer_name: fullOrderToSave.customer_name,
          customer_email: fullOrderToSave.customer_email,
          customer_phone: fullOrderToSave.customer_phone,
          shipping_address: fullOrderToSave.shipping_address,
          items: fullOrderToSave.items,
          total_amount: fullOrderToSave.total_amount,
          currency: "INR",
          payment_gateway: "cashfree",
          payment_method: fullOrderToSave.payment_method,
          payment_status: "PAID",
          tracking_status: "Order Placed",
          created_at: fullOrderToSave.created_at,
          updated_at: fullOrderToSave.updated_at,
          expected_delivery_date: fullOrderToSave.expected_delivery_date,
        }, { onConflict: "id" });
      } catch (err) {
        console.warn("Supabase orders insert notice:", err);
      }
    }

    if (saveForFuture && currentUser && client) {
      void client
        .from("profiles")
        .update({
          name: shippingPayload.fullName,
          phone: shippingPayload.phone,
          address_line1: shippingPayload.addressLine1,
          address_line2: shippingPayload.addressLine2,
          city: shippingPayload.city,
          state: shippingPayload.state,
          pincode: shippingPayload.pincode,
        })
        .eq("id", currentUser.id);
    }

    if (setCartIds) {
      setCartIds([]);
    }
    try {
      localStorage.removeItem("techcircuit-cart");
    } catch {
      // ignore
    }

    window.dispatchEvent(
      new CustomEvent("techcircuit:toast", {
        detail: {
          message: "🎉 Order Placed Successfully! Your custom hardware kit is now in queue.",
          type: "success",
        },
      })
    );

    setConfirmedOrderId(fullOrderToSave.order_number || fullOrderToSave.id);
    setConfirmedOrder(fullOrderToSave);
    setSubmitting(false);
    setStep("confirmation");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Shared Order Summary Card JSX
  const renderOrderSummaryCard = (isMobileTop = false) => (
    <aside className={`checkout-order-summary-card ${isMobileTop ? "mobile-top-summary" : ""}`}>
      {isMobileTop ? (
        <button
          type="button"
          onClick={() => setMobileSummaryOpen((open) => !open)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "transparent",
            border: 0,
            padding: 0,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="checkout-summary-head-icon"><ShoppingCart size={20} /></div>
            <div>
              <strong style={{ fontSize: "15px", color: "#0F1F3D", display: "block" }}>Order Summary ({displayItems.length} item{displayItems.length > 1 ? "s" : ""})</strong>
              <span style={{ fontSize: "13px", color: "#F97316", fontWeight: 700 }}>{formatRupee(total)}</span>
            </div>
          </div>
          <div style={{ color: "#64748B", display: "flex", alignItems: "center", gap: "4px", fontSize: "12.5px" }}>
            <span>{mobileSummaryOpen ? "Hide" : "Show"}</span>
            {mobileSummaryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>
      ) : (
        <div className="checkout-summary-head">
          <div className="checkout-summary-head-icon"><ShoppingCart size={22} /></div>
          <h2>Order Summary</h2>
        </div>
      )}

      {(!isMobileTop || mobileSummaryOpen) && (
        <div style={{ marginTop: isMobileTop ? "16px" : "0" }}>
          <div className="checkout-summary-items-list">
            {displayItems.map((item) => {
              const itemAmt = projectPrice(item) || 3499;
              return (
                <div className="checkout-summary-item-row" key={item.id}>
                  <img
                    src={item.imageUrl || internshipOpportunityImage}
                    alt={item.title}
                    className="checkout-summary-item-img"
                  />
                  <div className="checkout-summary-item-text">
                    <h4>{item.title}</h4>
                    <p>Qty: 1</p>
                  </div>
                  <div className="checkout-summary-item-amt">{formatRupee(itemAmt)}</div>
                </div>
              );
            })}
          </div>

          <div className="checkout-summary-divider" />

          <div className="checkout-summary-calc-row">
            <span>Subtotal</span>
            <strong>{formatRupee(subtotal)}</strong>
          </div>
          <div className="checkout-summary-calc-row">
            <span>Shipping Charges</span>
            <strong>₹0</strong>
          </div>

          <div className="checkout-summary-divider" />

          <div className="checkout-summary-total-strip">
            <span>Total</span>
            <strong>{formatRupee(total)}</strong>
          </div>

          <div className="checkout-summary-info-pill">
            {step === "payment" ? (
              <>
                <ShieldCheck size={20} />
                <span>
                  Your order will be securely processed after successful payment. You will receive a confirmation email shortly.
                </span>
              </>
            ) : (
              <>
                <Truck size={20} />
                <span>
                  Your order will be shipped to the address you provide here. Please make sure the details are correct.
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );

  if (displayItems.length === 0 && step !== "confirmation") {
    return (
      <main className="checkout-experience-page">
        <div className="checkout-page-container" style={{ maxWidth: "600px", margin: "60px auto", textAlign: "center" }}>
          <div className="checkout-panel" style={{ padding: "48px 24px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#FFF1E6",
                color: "#F97316",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <ShoppingCart size={32} />
            </div>
            <h2 style={{ fontSize: "22px", color: "#0F1F3D", marginBottom: "10px", fontWeight: 800 }}>
              Your cart is empty
            </h2>
            <p style={{ color: "#64748B", fontSize: "14px", lineHeight: 1.6, marginBottom: "28px" }}>
              Our engineering projects are handcrafted and built to order (~7 days delivery). Please select a project from our catalog to proceed to checkout.
            </p>
            <button
              type="button"
              className="checkout-primary-pill-btn"
              style={{ width: "auto", margin: "0 auto", padding: "0 32px" }}
              onClick={() => (navigate ? navigate("Projects") : onBackToCart())}
            >
              Browse Ready-Made Projects <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </main>
    );
  }

  const confirmedTotal = confirmedOrder?.total_amount || (purchasedItems.reduce((acc, item) => acc + (projectPrice(item) || 3499), 0) || total);
  const displayOrderId = confirmedOrder?.order_number || confirmedOrderId || "TCH-ORD-NEW";
  const confirmedCustomerName = confirmedOrder?.customer_name || fullName || "Valued Engineer";
  const confirmedCustomerPhone = confirmedOrder?.customer_phone || phoneNumber || "";
  const confirmedCustomerEmail = confirmedOrder?.customer_email || emailAddress || "";
  const confirmedAddress = confirmedOrder?.shipping_address || {
    addressLine1,
    addressLine2,
    city,
    state,
    pincode,
  };
  const expectedDeliveryDate = confirmedOrder?.expected_delivery_date
    ? new Date(confirmedOrder.expected_delivery_date)
    : new Date(Date.now() + 7 * 86400000);
  const formattedExpectedDelivery = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(expectedDeliveryDate);

  return (
    <main className="checkout-experience-page">
      <div className="checkout-page-container">
        {/* Step 4: Zepto / Redbus / Aha Order Confirmation View */}
        {step === "confirmation" ? (
          <section className="order-confirmation-view">
            {/* Zepto-Style Auto Navigation Banner */}
            <div className="zepto-autonav-banner">
              <div className="zepto-autonav-text">
                <Sparkles size={18} color="#EA580C" />
                <span>
                  Order Confirmed! Directing you to Live Order Details in{" "}
                  <strong style={{ color: "#EA580C" }}>{detailCountdown}s</strong>
                </span>
              </div>
              <div className="zepto-autonav-actions">
                <button
                  type="button"
                  className="zepto-autonav-btn-primary"
                  onClick={goToOrderDetails}
                >
                  <PackageCheck size={14} /> View Details Now <ArrowRight size={13} />
                </button>
                <button
                  type="button"
                  className="zepto-autonav-btn-ghost"
                  onClick={() => setCountdownPaused((p) => !p)}
                >
                  {countdownPaused ? "Resume Countdown" : "Stay on Receipt"}
                </button>
              </div>
            </div>

            {/* Glowing Emerald Celebration Checkmark */}
            <div className="order-confirm-badge-icon">
              <CheckCircle2 size={40} />
            </div>

            <h1>Order Placed Successfully! 🎉</h1>
            <p className="order-confirm-subtitle">
              Thank you for ordering with TechCircuit Hub! We have verified your payment of{" "}
              <strong style={{ color: "#F97316" }}>{formatRupee(confirmedTotal)}</strong> directly in-page. Our workshop engineering team is now preparing your custom hardware kit.
            </p>

            {/* Ticket Copyable Order ID Bar */}
            <div className="order-confirm-order-id-bar">
              <span className="order-confirm-id-label">ORDER ID:</span>
              <span className="order-confirm-id-value">#{displayOrderId}</span>
              <button
                type="button"
                className="order-confirm-copy-btn"
                onClick={() => handleCopyOrderId(displayOrderId)}
              >
                {copiedOrderId ? (
                  <>
                    <Check size={13} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={13} /> Copy ID
                  </>
                )}
              </button>
            </div>

            {/* Zepto / Redbus Delivery Guarantee & Handcrafted Promise */}
            <div className="order-confirm-delivery-card">
              <div className="order-confirm-delivery-head">
                <div className="order-confirm-delivery-promise">
                  <div className="order-confirm-delivery-icon-box">
                    <Wrench size={22} />
                  </div>
                  <div>
                    <h4 className="order-confirm-delivery-title">Handcrafted Built-to-Order (~7 Days)</h4>
                    <p className="order-confirm-delivery-sub">
                      Assembled by hardware engineers, firmware flashed &amp; 48-hour QC tested
                    </p>
                  </div>
                </div>
                <div className="order-confirm-eta-badge">
                  <span className="order-confirm-eta-label">Estimated Delivery By</span>
                  <strong className="order-confirm-eta-date">{formattedExpectedDelivery}</strong>
                </div>
              </div>

              {/* Live 6-Stage Progress Stepper Preview */}
              <div className="order-confirm-stepper">
                <div className="order-confirm-step-node">
                  <div className="order-confirm-step-dot completed"><Check size={12} /></div>
                  <span className="order-confirm-step-label">Order Placed</span>
                </div>
                <div className="order-confirm-step-node">
                  <div className="order-confirm-step-dot completed"><Check size={12} /></div>
                  <span className="order-confirm-step-label">Confirmed</span>
                </div>
                <div className="order-confirm-step-node">
                  <div className="order-confirm-step-dot in-progress">3</div>
                  <span className="order-confirm-step-label">Building</span>
                </div>
                <div className="order-confirm-step-node">
                  <div className="order-confirm-step-dot pending">4</div>
                  <span className="order-confirm-step-label">QC Testing</span>
                </div>
                <div className="order-confirm-step-node">
                  <div className="order-confirm-step-dot pending">5</div>
                  <span className="order-confirm-step-label">Packed</span>
                </div>
                <div className="order-confirm-step-node">
                  <div className="order-confirm-step-dot pending">6</div>
                  <span className="order-confirm-step-label">Delivered</span>
                </div>
              </div>
            </div>

            {/* Ordered Items & Delivery Address Breakdown */}
            <div className="order-confirm-details-grid">
              {/* Ordered Items Subcard */}
              <div className="order-confirm-subcard">
                <h4>
                  <PackageCheck size={16} color="#F97316" /> Ordered Kit Details ({purchasedItems.length})
                </h4>
                <div style={{ maxHeight: "170px", overflowY: "auto", marginBottom: "12px" }}>
                  {purchasedItems.map((item) => (
                    <div className="order-confirm-item-mini" key={item.id}>
                      <img
                        src={item.imageUrl || internshipOpportunityImage}
                        alt={item.title}
                      />
                      <div className="order-confirm-item-info">
                        <strong>{item.title}</strong>
                        <span>Qty: 1 • Full Kit with Source Code &amp; PCB</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: "1px dashed #CBD5E1", paddingTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "#64748B" }}>Total Paid:</span>
                  <strong style={{ color: "#16A34A", fontSize: "14px" }}>
                    {formatRupee(confirmedTotal)} (PAID via Cashfree)
                  </strong>
                </div>
              </div>

              {/* Delivery Address Subcard */}
              <div className="order-confirm-subcard">
                <h4>
                  <MapPin size={16} color="#F97316" /> Delivery Address
                </h4>
                <p style={{ margin: "0 0 4px", fontSize: "13.5px", fontWeight: 700, color: "#0F1F3D" }}>
                  {confirmedCustomerName} ({confirmedCustomerPhone})
                </p>
                <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#475569", lineHeight: 1.4 }}>
                  {confirmedAddress.addressLine1}
                  {confirmedAddress.addressLine2 ? `, ${confirmedAddress.addressLine2}` : ""}
                  <br />
                  {confirmedAddress.city}, {confirmedAddress.state} - <strong>{confirmedAddress.pincode}</strong>
                </p>
                <div style={{ borderTop: "1px dashed #CBD5E1", paddingTop: "8px", fontSize: "12px", color: "#64748B" }}>
                  Confirmation sent to: <strong>{confirmedCustomerEmail || "your email"}</strong>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                className="checkout-primary-pill-btn"
                style={{ width: "auto", padding: "0 32px" }}
                onClick={goToOrderDetails}
              >
                <PackageCheck size={18} /> View Order Details &amp; Live Build Tracking
              </button>
              <button
                type="button"
                className="button button-outline"
                style={{ borderRadius: "999px", height: "52px", padding: "0 24px" }}
                onClick={() => (navigate ? navigate("Projects") : onBackToCart())}
              >
                Continue Exploring Projects <ArrowRight size={16} />
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* Mobile collapsible summary shown above the form */}
            <div className="mobile-only-summary-container" style={{ display: "none" }}>
              {renderOrderSummaryCard(true)}
            </div>

            {/* Main Header (Image 3) */}
            {step === "delivery" && (
              <header className="checkout-main-header">
                <div className="checkout-main-header-icon">
                  <MapPin size={34} />
                </div>
                <div className="checkout-main-header-copy">
                  <h1>Delivery Address</h1>
                  <p>Enter your shipping address where you want your order to be delivered.</p>
                </div>
              </header>
            )}

            {step === "summary" && (
              <header className="checkout-main-header">
                <div className="checkout-main-header-icon">
                  <ShoppingCart size={34} />
                </div>
                <div className="checkout-main-header-copy">
                  <h1>Review Your Order</h1>
                  <p>Please review your shipping details and items before confirming payment.</p>
                </div>
              </header>
            )}

            {/* Two-column Grid Layout */}
            <div className="checkout-grid">
              {/* Left Column (65%) */}
              <div>
                {/* PAGE 1: DELIVERY ADDRESS (IMAGE 3) */}
                {step === "delivery" && (
                  <div className="checkout-panel">
                    <div className="checkout-panel-header">
                      <div className="checkout-panel-icon">
                        <MapPin size={18} />
                      </div>
                      <h2 className="checkout-panel-title">Address Details</h2>
                    </div>

                    <form onSubmit={handleContinueToSummary} noValidate>
                      {/* Radio Cards: Use saved address vs Add new address */}
                      <fieldset className="checkout-radio-fieldset">
                        <legend className="sr-only">Choose address type</legend>
                        <div className="checkout-radio-row">
                          <label
                            className={`checkout-radio-card ${addressMode === "saved" ? "selected" : ""}`}
                            onClick={() => handleAddressModeChange("saved")}
                          >
                            <input
                              type="radio"
                              name="addressType"
                              value="saved"
                              checked={addressMode === "saved"}
                              onChange={() => handleAddressModeChange("saved")}
                            />
                            <div className="checkout-radio-content">
                              <div className="checkout-radio-avatar">
                                <UserIcon size={17} />
                              </div>
                              <div className="checkout-radio-label-text">
                                <strong>Use my saved address</strong>
                                <small>(From your profile)</small>
                              </div>
                            </div>
                            <div className="checkout-radio-circle">
                              {addressMode === "saved" && <div className="checkout-radio-inner-dot" />}
                            </div>
                          </label>

                          <label
                            className={`checkout-radio-card ${addressMode === "new" ? "selected" : ""}`}
                            onClick={() => handleAddressModeChange("new")}
                          >
                            <input
                              type="radio"
                              name="addressType"
                              value="new"
                              checked={addressMode === "new"}
                              onChange={() => handleAddressModeChange("new")}
                            />
                            <div className="checkout-radio-content">
                              <div className="checkout-radio-avatar">
                                <Plus size={17} />
                              </div>
                              <div className="checkout-radio-label-text">
                                <strong>Add new address</strong>
                                <small>(Enter different address)</small>
                              </div>
                            </div>
                            <div className="checkout-radio-circle">
                              {addressMode === "new" && <div className="checkout-radio-inner-dot" />}
                            </div>
                          </label>
                        </div>
                      </fieldset>

                      {/* Fields */}
                      <div className="checkout-fields-container">
                        {/* Full Name */}
                        <div className="checkout-form-group">
                          <label className="checkout-field-label" htmlFor="checkout-full-name">
                            Full Name <span className="checkout-field-required">*</span>
                          </label>
                          <div className="checkout-input-wrapper">
                            <UserIcon size={18} className="checkout-leading-icon" />
                            <input
                              id="checkout-full-name"
                              name="fullName"
                              type="text"
                              autoComplete="name"
                              required
                              placeholder="Enter full name"
                              className={`checkout-input-field ${fieldErrors.fullName ? "has-error" : ""}`}
                              value={fullName}
                              onChange={(e) => {
                                setFullName(e.target.value);
                                if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: "" }));
                              }}
                            />
                          </div>
                          {fieldErrors.fullName && (
                            <p className="checkout-field-error-msg" role="alert">{fieldErrors.fullName}</p>
                          )}
                        </div>

                        {/* Phone Number */}
                        <div className="checkout-form-group">
                          <label className="checkout-field-label" htmlFor="checkout-phone-number">
                            Phone Number <span className="checkout-field-required">*</span>
                          </label>
                          <div className="checkout-input-wrapper">
                            <Phone size={18} className="checkout-leading-icon" />
                            <input
                              id="checkout-phone-number"
                              name="phone"
                              type="tel"
                              autoComplete="tel"
                              inputMode="tel"
                              required
                              placeholder="+91 98765 43210"
                              className={`checkout-input-field ${fieldErrors.phoneNumber ? "has-error" : ""}`}
                              value={phoneNumber}
                              onChange={(e) => {
                                setPhoneNumber(e.target.value);
                                if (fieldErrors.phoneNumber) setFieldErrors((prev) => ({ ...prev, phoneNumber: "" }));
                              }}
                            />
                          </div>
                          {fieldErrors.phoneNumber && (
                            <p className="checkout-field-error-msg" role="alert">{fieldErrors.phoneNumber}</p>
                          )}
                        </div>

                        {/* Email Address (READ-ONLY) */}
                        <div className="checkout-form-group">
                          <label className="checkout-field-label" htmlFor="checkout-email-address">
                            Email Address <span className="checkout-field-required">*</span>
                          </label>
                          <div className="checkout-input-wrapper">
                            <Mail size={18} className="checkout-leading-icon" />
                            <input
                              id="checkout-email-address"
                              name="email"
                              type="email"
                              autoComplete="email"
                              readOnly
                              required
                              value={emailAddress}
                              className="checkout-input-field is-readonly"
                              title="Email address is associated with your signed-in account and cannot be modified here."
                            />
                          </div>
                        </div>

                        {/* Address Line 1 */}
                        <div className="checkout-form-group">
                          <label className="checkout-field-label" htmlFor="checkout-address-line1">
                            Address Line 1 <span className="checkout-field-required">*</span>
                          </label>
                          <div className="checkout-input-wrapper">
                            <Home size={18} className="checkout-leading-icon" />
                            <input
                              id="checkout-address-line1"
                              name="addressLine1"
                              type="text"
                              autoComplete="address-line1"
                              required
                              placeholder="123, Tech Street"
                              className={`checkout-input-field ${fieldErrors.addressLine1 ? "has-error" : ""}`}
                              value={addressLine1}
                              onChange={(e) => {
                                setAddressLine1(e.target.value);
                                if (fieldErrors.addressLine1) setFieldErrors((prev) => ({ ...prev, addressLine1: "" }));
                              }}
                            />
                          </div>
                          {fieldErrors.addressLine1 && (
                            <p className="checkout-field-error-msg" role="alert">{fieldErrors.addressLine1}</p>
                          )}
                        </div>

                        {/* Address Line 2 */}
                        <div className="checkout-form-group">
                          <label className="checkout-field-label" htmlFor="checkout-address-line2">
                            Address Line 2 (Optional)
                          </label>
                          <div className="checkout-input-wrapper">
                            <Building size={18} className="checkout-leading-icon" />
                            <input
                              id="checkout-address-line2"
                              name="addressLine2"
                              type="text"
                              autoComplete="address-line2"
                              placeholder="Near Anna Nagar"
                              className="checkout-input-field"
                              value={addressLine2}
                              onChange={(e) => setAddressLine2(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* City and State side by side */}
                        <div className="checkout-grid-2col">
                          <div className="checkout-form-group">
                            <label className="checkout-field-label" htmlFor="checkout-city">
                              City <span className="checkout-field-required">*</span>
                            </label>
                            <div className="checkout-input-wrapper">
                              <MapPin size={18} className="checkout-leading-icon" />
                              <input
                                id="checkout-city"
                                name="city"
                                type="text"
                                autoComplete="address-level2"
                                required
                                placeholder="Chennai"
                                className={`checkout-input-field ${fieldErrors.city ? "has-error" : ""}`}
                                value={city}
                                onChange={(e) => {
                                  setCity(e.target.value);
                                  if (fieldErrors.city) setFieldErrors((prev) => ({ ...prev, city: "" }));
                                }}
                              />
                            </div>
                            {fieldErrors.city && (
                              <p className="checkout-field-error-msg" role="alert">{fieldErrors.city}</p>
                            )}
                          </div>

                          <div className="checkout-form-group">
                            <label className="checkout-field-label" htmlFor="checkout-state">
                              State <span className="checkout-field-required">*</span>
                            </label>
                            <div className="checkout-input-wrapper">
                              <MapPin size={18} className="checkout-leading-icon" />
                              <select
                                id="checkout-state"
                                name="state"
                                autoComplete="address-level1"
                                required
                                className="checkout-input-field checkout-select-field"
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                              >
                                {INDIAN_STATES_AND_UTS.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={18} className="checkout-select-arrow" />
                            </div>
                          </div>
                        </div>

                        {/* Pincode */}
                        <div className="checkout-form-group">
                          <label className="checkout-field-label" htmlFor="checkout-pincode">
                            Pincode <span className="checkout-field-required">*</span>
                          </label>
                          <div className="checkout-input-wrapper">
                            <Package size={18} className="checkout-leading-icon" />
                            <input
                              id="checkout-pincode"
                              name="pincode"
                              type="text"
                              autoComplete="postal-code"
                              inputMode="numeric"
                              pattern="[0-9]{6}"
                              maxLength={6}
                              required
                              placeholder="600040"
                              className={`checkout-input-field ${fieldErrors.pincode ? "has-error" : ""}`}
                              value={pincode}
                              onChange={(e) => {
                                setPincode(e.target.value);
                                if (fieldErrors.pincode) setFieldErrors((prev) => ({ ...prev, pincode: "" }));
                              }}
                            />
                          </div>
                          {fieldErrors.pincode && (
                            <p className="checkout-field-error-msg" role="alert">{fieldErrors.pincode}</p>
                          )}
                        </div>
                      </div>

                      {/* Peach Strip: Save this address for future orders */}
                      <label className="checkout-save-address-strip">
                        <input
                          type="checkbox"
                          className="checkout-save-checkbox"
                          checked={saveForFuture}
                          onChange={(e) => setSaveForFuture(e.target.checked)}
                        />
                        <span>Save this address for future orders</span>
                      </label>

                      {/* Action Button */}
                      <button className="checkout-primary-pill-btn" type="submit">
                        <Truck size={18} /> Continue to Order Summary <ArrowRight size={18} />
                      </button>
                    </form>
                  </div>
                )}

                {/* STEP 2: ORDER SUMMARY REVIEW STEP */}
                {step === "summary" && (
                  <div className="checkout-panel">
                    <div className="checkout-panel-header">
                      <div className="checkout-panel-icon">
                        <FileText size={18} />
                      </div>
                      <h2 className="checkout-panel-title">Order & Address Verification</h2>
                    </div>

                    <div className="order-review-address-card">
                      <div>
                        <h4>
                          <MapPin size={16} color="#F97316" /> Shipping To: {fullName}
                        </h4>
                        <p>
                          {addressLine1}{addressLine2 ? `, ${addressLine2}` : ""}, {city}, {state} - <strong>{pincode}</strong>
                        </p>
                        <p style={{ marginTop: "4px" }}>
                          Mobile: <strong>{phoneNumber}</strong> • Email: <strong>{emailAddress}</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        className="order-review-edit-btn"
                        onClick={() => setStep("delivery")}
                      >
                        Edit
                      </button>
                    </div>

                    <div style={{ marginBottom: "24px" }}>
                      <h3 style={{ fontSize: "15px", color: "#0F1F3D", marginBottom: "12px", fontWeight: 700 }}>
                        Hardware Kit Package
                      </h3>
                      {displayItems.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "14px",
                            padding: "12px 14px",
                            background: "#F8FAFC",
                            borderRadius: "10px",
                            marginBottom: "10px",
                          }}
                        >
                          <img
                            src={item.imageUrl || internshipOpportunityImage}
                            alt={item.title}
                            style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover" }}
                          />
                          <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: "13.5px", color: "#0F1F3D", display: "block" }}>{item.title}</strong>
                            <small style={{ color: "#64748B" }}>Ready-to-run project kit • 1 Year Component Warranty</small>
                          </div>
                          <span style={{ fontWeight: 700, color: "#0F1F3D" }}>{formatRupee(projectPrice(item) || 3499)}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      className="checkout-primary-pill-btn"
                      type="button"
                      onClick={() => {
                        setStep("payment");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <CreditCard size={18} /> Proceed to Payment <ArrowRight size={18} />
                    </button>
                  </div>
                )}

                {/* PAGE 2: PAYMENT METHOD (IMAGE 2) */}
                {step === "payment" && (
                  <div className="checkout-panel">
                    <div className="checkout-panel-header">
                      <div className="checkout-panel-icon">
                        <CreditCard size={18} />
                      </div>
                      <h2 className="checkout-panel-title">Select Payment Method</h2>
                    </div>

                    <fieldset className="checkout-radio-fieldset">
                      <legend className="sr-only">Choose payment method</legend>
                      <div className="payment-methods-stack">
                        {/* Option 1: Instant UPI QR Code (Scan to Pay - Default & Easiest) */}
                        <label
                          className={`payment-method-card ${paymentMethod === "qr" ? "selected" : ""}`}
                          onClick={() => setPaymentMethod("qr")}
                        >
                          <input
                            type="radio"
                            name="paymentOption"
                            value="qr"
                            checked={paymentMethod === "qr"}
                            onChange={() => setPaymentMethod("qr")}
                          />
                          <div className="payment-method-left">
                            <div className="checkout-radio-circle">
                              {paymentMethod === "qr" && <div className="checkout-radio-inner-dot" />}
                            </div>
                            <div className="checkout-radio-avatar" style={{ background: paymentMethod === "qr" ? "#FFE6D5" : "#F8FAFC", color: paymentMethod === "qr" ? "#F97316" : "#64748B" }}>
                              <QrCode size={19} />
                            </div>
                            <div className="payment-method-text">
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <strong>UPI QR Code (Scan to Pay)</strong>
                                <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: "10.5px", fontWeight: 700, padding: "2px 7px", borderRadius: "999px", letterSpacing: "0.03em" }}>
                                  EASIEST &amp; FASTEST ⚡
                                </span>
                              </div>
                              <small>Scan dynamic QR with Google Pay, PhonePe, Paytm, CRED, BHIM</small>
                            </div>
                          </div>
                          <div className="payment-partner-logos">
                            <GooglePayLogo />
                            <PhonePeLogo />
                            <PaytmLogo />
                          </div>
                        </label>

                        {/* QR Code Scan Info Banner */}
                        {paymentMethod === "qr" && (
                          <div
                            className="cf-qr-elements-wrapper"
                            style={{
                              marginTop: "-8px",
                              marginBottom: "12px",
                              display: "flex",
                              alignItems: "center",
                              gap: "16px",
                              background: "linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%)",
                              padding: "16px 18px",
                              borderRadius: "14px",
                              border: "1.5px solid #F97316",
                              boxShadow: "0 2px 8px rgba(249, 115, 22, 0.08)",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div style={{ width: "52px", height: "52px", borderRadius: "12px", background: "#FFE6D5", color: "#F97316", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <QrCode size={28} />
                            </div>
                            <div>
                              <strong style={{ display: "block", fontSize: "13.5px", color: "#0F1F3D", marginBottom: "3px" }}>
                                Instant Scan &amp; Pay via UPI
                              </strong>
                              <p style={{ margin: 0, fontSize: "12px", color: "#64748B", lineHeight: 1.4 }}>
                                Clicking <strong>Scan &amp; Pay via UPI QR</strong> will pop up a live dynamic QR code on screen. Simply scan with any mobile UPI app to confirm your project kit order.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Option 2: Credit / Debit Card */}
                        <label
                          className={`payment-method-card ${paymentMethod === "card" ? "selected" : ""}`}
                          onClick={() => setPaymentMethod("card")}
                        >
                          <input
                            type="radio"
                            name="paymentOption"
                            value="card"
                            checked={paymentMethod === "card"}
                            onChange={() => setPaymentMethod("card")}
                          />
                          <div className="payment-method-left">
                            <div className="checkout-radio-circle">
                              {paymentMethod === "card" && <div className="checkout-radio-inner-dot" />}
                            </div>
                            <div className="checkout-radio-avatar" style={{ background: paymentMethod === "card" ? "#FFE6D5" : "#F8FAFC", color: paymentMethod === "card" ? "#F97316" : "#64748B" }}>
                              <CreditCard size={18} />
                            </div>
                            <div className="payment-method-text">
                              <strong>Credit / Debit Card</strong>
                              <small>Visa, Mastercard, RuPay (In-Page Secure)</small>
                            </div>
                          </div>
                          <div className="payment-partner-logos">
                            <VisaLogo />
                            <MastercardLogo />
                            <RuPayLogo />
                          </div>
                        </label>

                        {/* Cashfree Secure Card Elements Container */}
                        {paymentMethod === "card" && (
                          <div
                            className="cf-card-elements-wrapper"
                            style={{
                              marginTop: "-8px",
                              marginBottom: "12px",
                              display: "grid",
                              gap: "12px",
                              background: "#FFFFFF",
                              padding: "18px",
                              borderRadius: "14px",
                              border: "1.5px solid #F97316",
                              boxShadow: "0 2px 8px rgba(249, 115, 22, 0.08)",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div>
                              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#0F1F3D", marginBottom: "6px" }}>
                                Card Number <span style={{ color: "#EF4444" }}>*</span>
                              </label>
                              <div id="cf-card-number" className="cf-element-container" style={{ minHeight: "44px" }} />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#0F1F3D", marginBottom: "6px" }}>
                                Name on Card <span style={{ color: "#EF4444" }}>*</span>
                              </label>
                              <div id="cf-card-holder" className="cf-element-container" style={{ minHeight: "44px" }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                              <div>
                                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#0F1F3D", marginBottom: "6px" }}>
                                  Expiry (MM/YY) <span style={{ color: "#EF4444" }}>*</span>
                                </label>
                                <div id="cf-card-expiry" className="cf-element-container" style={{ minHeight: "44px" }} />
                              </div>
                              <div>
                                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#0F1F3D", marginBottom: "6px" }}>
                                  CVV <span style={{ color: "#EF4444" }}>*</span>
                                </label>
                                <div id="cf-card-cvv" className="cf-element-container" style={{ minHeight: "44px" }} />
                              </div>
                            </div>
                            <div style={{ fontSize: "11.5px", color: "#64748B", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                              <ShieldCheck size={14} color="#16A34A" /> Encrypted directly via Cashfree Web Element SDK. No card details touch our servers.
                            </div>
                          </div>
                        )}

                        {/* Option 2: UPI */}
                        <label
                          className={`payment-method-card ${paymentMethod === "upi" ? "selected" : ""}`}
                          onClick={() => setPaymentMethod("upi")}
                        >
                          <input
                            type="radio"
                            name="paymentOption"
                            value="upi"
                            checked={paymentMethod === "upi"}
                            onChange={() => setPaymentMethod("upi")}
                          />
                          <div className="payment-method-left">
                            <div className="checkout-radio-circle">
                              {paymentMethod === "upi" && <div className="checkout-radio-inner-dot" />}
                            </div>
                            <div className="checkout-radio-avatar" style={{ background: paymentMethod === "upi" ? "#FFE6D5" : "#F8FAFC", color: paymentMethod === "upi" ? "#F97316" : "#64748B" }}>
                              <UpiIconBadge />
                            </div>
                            <div className="payment-method-text">
                              <strong>UPI Instant Collect</strong>
                              <small>Google Pay, PhonePe, Paytm, BHIM</small>
                            </div>
                          </div>
                          <div className="payment-partner-logos">
                            <GooglePayLogo />
                            <PhonePeLogo />
                            <PaytmLogo />
                          </div>
                        </label>

                        {/* Cashfree Secure UPI Component Container */}
                        {paymentMethod === "upi" && (
                          <div
                            className="cf-upi-elements-wrapper"
                            style={{
                              marginTop: "-8px",
                              marginBottom: "12px",
                              display: "grid",
                              gap: "12px",
                              background: "#FFFFFF",
                              padding: "18px",
                              borderRadius: "14px",
                              border: "1.5px solid #F97316",
                              boxShadow: "0 2px 8px rgba(249, 115, 22, 0.08)",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div>
                              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#0F1F3D", marginBottom: "6px" }}>
                                Virtual Payment Address (UPI ID) <span style={{ color: "#EF4444" }}>*</span>
                              </label>
                              <div id="cf-upi-collect" className="cf-element-container" style={{ minHeight: "44px" }} />
                              <small style={{ color: "#64748B", fontSize: "12px", marginTop: "6px", display: "block" }}>
                                Enter your UPI ID (e.g. mobile@upi, username@okhdfcbank). You will approve the collect request on your phone.
                              </small>
                            </div>

                            {upiAwaiting && (
                              <div
                                className="upi-awaiting-container"
                                role="status"
                                aria-live="polite"
                                style={{
                                  background: "#FFF7ED",
                                  border: "1px solid #FDBA74",
                                  padding: "16px",
                                  borderRadius: "12px",
                                  textAlign: "center",
                                  marginTop: "8px",
                                }}
                              >
                                <div className="upi-spinner" style={{ margin: "0 auto 10px" }} />
                                <h4 style={{ margin: "0 0 6px", fontSize: "14.5px", color: "#0F1F3D", fontWeight: 700 }}>
                                  Approve payment request in your UPI app
                                </h4>
                                <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#475569" }}>
                                  Cashfree sent a payment request to your UPI app. Please open Google Pay, PhonePe, or Paytm and authorize the payment.
                                </p>
                                <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#EA580C", marginBottom: "12px" }}>
                                  Time remaining: {Math.floor(upiTimer / 60)}:{(upiTimer % 60).toString().padStart(2, "0")}
                                </div>
                                <button
                                  type="button"
                                  className="button button-outline button-small"
                                  onClick={() => {
                                    setUpiAwaiting(false);
                                    setSubmitting(false);
                                  }}
                                >
                                  Cancel &amp; Retry
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </fieldset>

                    {/* Peach SSL info strip */}
                    <div className="payment-ssl-badge">
                      <ShieldCheck size={20} />
                      <span>Your payment is processed directly inside TechCircuit Hub with 256-bit SSL encryption.</span>
                    </div>

                    {paymentError && (
                      <div
                        className="admin-message"
                        role="alert"
                        style={{
                          marginBottom: "18px",
                          background: "#FEF2F2",
                          border: "1px solid #FCA5A5",
                          color: "#DC2626",
                          padding: "12px 14px",
                          borderRadius: "10px",
                          fontSize: "13px",
                        }}
                      >
                        {paymentError}
                      </div>
                    )}

                    {/* Primary Button: Pay Now / Scan & Pay */}
                    <button
                      className="checkout-primary-pill-btn"
                      type="button"
                      disabled={submitting}
                      onClick={handlePayNow}
                    >
                      <Lock size={18} /> {submitting ? "Opening Payment Gateway…" : (
                        paymentMethod === "qr"
                          ? <>Scan &amp; Pay {formatRupee(total)} via UPI QR <ArrowRight size={18} /></>
                          : <>Pay Now {formatRupee(total)} <ArrowRight size={18} /></>
                      )}
                    </button>

                    {/* Consent line with interactive policy links */}
                    <p className="payment-consent-terms">
                      By placing this order you agree to our{" "}
                      <button
                        type="button"
                        style={{ background: "none", border: 0, padding: 0, color: "#F97316", textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}
                        onClick={() => setPolicyModal("terms")}
                      >
                        Terms &amp; Conditions
                      </button>
                      ,{" "}
                      <button
                        type="button"
                        style={{ background: "none", border: 0, padding: 0, color: "#F97316", textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}
                        onClick={() => setPolicyModal("delivery")}
                      >
                        Delivery Policy
                      </button>
                      {" "}and{" "}
                      <button
                        type="button"
                        style={{ background: "none", border: 0, padding: 0, color: "#F97316", textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}
                        onClick={() => setPolicyModal("refund")}
                      >
                        Refund &amp; Cancellation Policy
                      </button>
                      .
                    </p>

                    {/* Policy Modal Overlay */}
                    {policyModal && (
                      <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
                        <div
                          className="modal-card"
                          style={{
                            maxWidth: "540px",
                            background: "#fff",
                            borderRadius: "16px",
                            padding: "24px",
                            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                            position: "relative",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <h3 style={{ margin: 0, fontSize: "18px", color: "#0F1F3D", fontWeight: 700 }}>
                              {policyModal === "terms" && "Terms & Conditions"}
                              {policyModal === "delivery" && "Build-to-Order Delivery Policy"}
                              {policyModal === "refund" && "Refund & Cancellation Policy"}
                            </h3>
                            <button
                              type="button"
                              onClick={() => setPolicyModal(null)}
                              style={{ background: "#F1F5F9", border: 0, borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                              <X size={18} />
                            </button>
                          </div>

                          <div style={{ fontSize: "13.5px", color: "#475569", lineHeight: 1.6, maxHeight: "360px", overflowY: "auto", paddingRight: "8px" }}>
                            {policyModal === "terms" && (
                              <>
                                <p>All ready-made engineering projects provided through TechCircuit Hub are built to order by our technical team.</p>
                                <p>Each hardware kit contains fully assembled, verified circuit modules, pre-flashed microcontrollers, and comprehensive schematics and documentation for academic and practical engineering demonstrations.</p>
                                <p>Payment must be successfully verified before workshop fabrication and component assembly begin.</p>
                              </>
                            )}

                            {policyModal === "delivery" && (
                              <>
                                <p><strong>Delivery Estimate:</strong> Delivered to your address in about 7 days after payment.</p>
                                <p>Projects are custom-crafted and thoroughly tested before courier dispatch. Live tracking updates are entered manually by our workshop engineers as each project transitions from Assembly to Testing and Courier dispatch.</p>
                                <p>Once shipped, courier name, tracking number, and tracking URL are updated directly in your Student Dashboard.</p>
                              </>
                            )}

                            {policyModal === "refund" && (
                              <>
                                <p><strong>Build-to-Order Cancellation Policy:</strong> Full cancellation is supported within 24 hours of placement or until physical assembly starts. Contact techcircuith@gmail.com for priority assistance.</p>
                                <p>Because our engineering projects are custom fabricated and hand-assembled upon order placement, cancellation requests are accepted without deduction while the order is in <em>Order Placed</em> or <em>Confirmed</em> stage.</p>
                                <p>Once manual circuit fabrication and component allocation begin in <em>Building (Processing)</em>, cancellations must be confirmed directly with the workshop administrator.</p>
                                <p>In the event of hardware damage in transit or component failure upon delivery, full replacements or refunds are provided after inspection.</p>
                              </>
                            )}
                          </div>

                          <div style={{ marginTop: "20px", textAlign: "right" }}>
                            <button
                              type="button"
                              className="button button-primary button-small"
                              onClick={() => setPolicyModal(null)}
                            >
                              I Understand
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* Right Column (35%): Sticky Order Summary Card */}
              <div className="desktop-order-summary-column">
                {renderOrderSummaryCard(false)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* In-Page Payment Processing Overlay */}
      {submitting && (
        <div className="inpage-payment-processing-overlay">
          <div className="inpage-payment-processing-box">
            <div className="inpage-processing-icon-spin">
              <div className="inpage-processing-ring" />
              <ShieldCheck size={32} />
            </div>
            <h3>Processing Secure Payment</h3>
            <p>
              Securing transaction with your bank directly inside TechCircuit Hub. Please do not refresh or close this tab.
            </p>
            <div className="inpage-processing-security-strip">
              <Lock size={13} /> 256-Bit SSL Bank Grade Encryption
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export function PaymentResultPage({
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
  addProjectToCart,
  onViewListing,
  onViewResource,
}: {
  listings: Listing[];
  savedIds: string[];
  toggleSaved: (id: string) => void;
  setEnquiry: (listing: Listing) => void;
  addProjectToCart?: (id: string) => void;
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
            {savedView === "listings" ? <div className="listing-grid">{filteredListings.map((item, index) => <ListingCard key={item.id} listing={item} index={index} isSaved onSave={() => toggleSaved(item.id)} compareIds={[]} onCompare={() => undefined} onEnquire={() => setEnquiry(item)} isProjects={item.kind === "Projects"} onOrderNow={addProjectToCart ? () => addProjectToCart(item.id) : undefined} onViewDetails={() => onViewListing(item)} />)}</div> : <div className="resource-grid saved-resources">{filteredResources.map((item) => <ResourceCard item={item} key={item.title} isSaved onSave={() => toggleSaved(resourceId(item.title))} onViewDetails={() => onViewResource(item)} />)}</div>}
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
  onTrackOpportunity,
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
  onTrackOpportunity?: (listing: Listing) => void;
}) {
  const isOpportunity = listing.kind === "Internships" || listing.kind === "Hackathons" || listing.kind === "Training";
  const visual = ["tile-mint", "tile-peach", "tile-blue"][index % 3];
  const isOffer = listing.tags.includes("OFFER") || listing.id === SPECIAL_OFFER_PROJECT_ID;
  const cardImg =
    listing.imageUrl ||
    listing.componentDetails?.imageUrl ||
    (listing.kind === "Internships"
      ? internshipOpportunityImage
      : listing.kind === "Hackathons"
      ? hackathonOpportunityImage
      : listing.kind === "Training"
      ? trainingOpportunityImage
      : listing.kind === "Products"
      ? (homeShowcaseImages[5] || internshipOpportunityImage)
      : listing.kind === "PCB Design"
      ? (homeShowcaseImages[0] || internshipOpportunityImage)
      : listing.kind === "Manufacturing"
      ? (homeShowcaseImages[0] || internshipOpportunityImage)
      : undefined);

  return (
    <article className={`listing-card${isOpportunity ? " opportunity-listing-card" : ""}${isOffer ? " is-offer-card" : ""}`}>
      <div className={`listing-visual ${isProjects ? "project-visual" : visual}`}>
        {cardImg ? (
          <button className="project-image-trigger" type="button" onClick={onViewDetails} aria-label={`View details for ${listing.title}`}>
            <img className="project-image" src={cardImg} alt={listing.title} loading="lazy" decoding="async" />
          </button>
        ) : (
          <button className="project-image-trigger project-image-placeholder" type="button" onClick={onViewDetails} aria-label={`View details for ${listing.title}`}>
            <CircuitBoard size={42} />
            <span>Project image not provided</span>
          </button>
        )}
        <button className="save-button" aria-label={isSaved ? "Remove saved listing" : "Save listing"} onClick={onSave}>{isSaved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}</button>
      </div>
      <div className="listing-body">
        {isProjects && listing.projectCategory && <div className="project-category">{listing.projectCategory}</div>}
        {isOffer && <span className="project-offer-tag">LIMITED FLASH OFFER</span>}
        <div className="listing-location"><MapPin size={14} /> {listing.city}</div>
        <button className="project-title-button" type="button" onClick={onViewDetails}><h3>{listing.title}</h3></button>
        {isProjects && listing.projectPrice !== undefined ? (
          <div className="project-price-row">
            <div className="project-price">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(listing.projectPrice)}</div>
            {isOffer && <span className="project-price-strike">₹99</span>}
          </div>
        ) : (
          <div className="listing-org">{listing.organization}</div>
        )}
        <p className="listing-summary">{listing.summary}</p>
        {listing.mode && <div className="listing-facts"><span><Sparkles size={13} /> {listing.mode}</span>{listing.duration && <span><Clock3 size={13} /> {listing.duration}</span>}{listing.eligibility && <span>{listing.eligibility}</span>}</div>}
        <div className="tag-row">{listing.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
        <div className="listing-actions">
          <button type="button" className="button button-outline button-small" onClick={onViewDetails}>View details <ArrowRight size={14} /></button>
          {isProjects && onOrderNow && <button className="button button-order-now button-small" type="button" onClick={onOrderNow}>Order now <ArrowRight size={14} /></button>}
          {isOpportunity && listing.sourceUrl && (
            <a
              href={listing.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="button button-primary button-small"
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
              onClick={() => onTrackOpportunity?.(listing)}
            >
              {listing.kind === "Internships" ? "Apply Now" : listing.kind === "Training" ? "Enroll Now" : "Register Now"}
              <ExternalLink size={13} />
            </a>
          )}
          {isOpportunity && !listing.sourceUrl && (
            <button
              type="button"
              className="button button-primary button-small"
              onClick={onViewDetails}
            >
              {listing.kind === "Internships" ? "Apply" : listing.kind === "Training" ? "Enroll" : "Register"}
            </button>
          )}
          {!isProjects && canCompare && <button className={compareIds.includes(listing.id) ? "button button-primary button-small" : "button button-outline button-small"} onClick={onCompare}>{compareIds.includes(listing.id) ? <Check size={14} /> : <Layers3 size={14} />}{compareIds.includes(listing.id) ? "Added" : "Compare"}</button>}
          {!isProjects && !canCompare && !isOpportunity && <button className="button button-outline button-small" onClick={onEnquire}>Enquire <ArrowRight size={14} /></button>}
        </div>
      </div>
    </article>
  );
}

export type PolicyType = "terms" | "privacy" | "cookie" | "delivery";

export function renderPolicyArticle(
  tab: PolicyType,
  currentConsent?: "accepted" | "essential" | null,
  onUpdateConsent?: (type: "accepted" | "essential") => void
) {
  if (tab === "cookie") {
    return (
      <div className="policy-content-article">
        {onUpdateConsent && (
          <div className="policy-interactive-box">
            <h4>
              <Sparkles size={16} /> Manage Your Current Cookie Preferences
            </h4>
            <p>
              Your active preference:{" "}
              <strong>
                {currentConsent === "accepted"
                  ? "Allowed (All Functional, Session & Preference Cookies Active)"
                  : currentConsent === "essential"
                  ? "Essential Only (Basic Authentication & Security Only)"
                  : "Not Configured Yet (Prompt displayed on website entrance)"}
              </strong>
            </p>
            <div className="policy-cookie-status-strip">
              <button
                type="button"
                className={currentConsent === "accepted" ? "button button-primary button-small" : "button button-outline button-small"}
                onClick={() => onUpdateConsent("accepted")}
              >
                <Check size={14} /> Allow All Cookies
              </button>
              <button
                type="button"
                className={currentConsent === "essential" ? "button button-primary button-small" : "button button-outline button-small"}
                onClick={() => onUpdateConsent("essential")}
              >
                <ShieldCheck size={14} /> Restrict to Essential Only
              </button>
            </div>
          </div>
        )}

        <h3>1. Introduction</h3>
        <p>Welcome to TechCircuit Hub. This Cookie Policy explains how our website uses cookies and similar technologies to support website functionality, improve security, and understand how visitors use our services.</p>

        <h3>2. What Are Cookies?</h3>
        <p>Cookies are small text files stored on your device by websites. They can help websites remember preferences, maintain sessions, and provide certain features. Similar technologies, such as local storage and session storage, may also be used for website functionality.</p>

        <h3>3. How We Use Cookies</h3>
        <p>TechCircuit Hub may use cookies or similar technologies for the following purposes:</p>
        <ul>
          <li><strong>Essential Cookies:</strong> These technologies are necessary for authentication, account sessions, security, and essential website functionality.</li>
          <li><strong>Preference Cookies:</strong> These remember your selected settings or preferences (such as bookmarked projects and local workspace preferences).</li>
          <li><strong>Analytics Cookies:</strong> If analytics tools are enabled, these technologies help us understand website usage and improve engineering services.</li>
          <li><strong>Third-Party Cookies:</strong> Some external services integrated into our website (such as payment processing and secure OAuth authentication) may use cookies or similar technologies according to their own policies.</li>
        </ul>

        <h3>4. Google Sign-In</h3>
        <p>If you sign in using Google, Google and the authentication integration may use cookies or similar technologies to support authentication and account security. These technologies are subject to applicable Google policies and settings.</p>

        <h3>5. Payment Services</h3>
        <p>If you make a payment through our payment provider, certain cookies or similar technologies may be used to support payment functionality, fraud prevention, or security. The technologies used depend on the payment integration.</p>

        <h3>6. Managing Cookie Preferences</h3>
        <p>Where consent is required by applicable law, we request consent before using non-essential cookies or similar technologies. You may manage cookies through your browser settings or directly via the preference controls above. Note that disabling essential technologies may affect login or order tracking features.</p>

        <h3>7. Data Protection</h3>
        <p>Information collected through cookies or similar technologies is handled according to our Privacy Policy and applicable data-protection requirements.</p>

        <h3>8. Changes to This Policy</h3>
        <p>We may update this Cookie Policy when our website functionality, technologies, or legal requirements change. Updates will be published on this page with a revised effective date.</p>

        <h3>9. Contact Us</h3>
        <p>For questions about this Cookie Policy, contact:</p>
        <p><strong>Website:</strong> <a href="https://techcircuithub.com" target="_blank" rel="noreferrer">https://techcircuithub.com</a><br /><strong>Email:</strong> <a href="mailto:techcircuith@gmail.com">techcircuith@gmail.com</a></p>
      </div>
    );
  }

  if (tab === "terms") {
    return (
      <div className="policy-content-article">
        <h3>1. Introduction</h3>
        <p>Welcome to TechCircuit Hub. These Terms &amp; Conditions govern your access to and use of the TechCircuit Hub website and its services. By accessing or using the website, you agree to these terms. If you do not agree, please discontinue using the services.</p>

        <h3>2. Our Services</h3>
        <p>TechCircuit Hub provides educational and career development resources related to ECE, VLSI, embedded systems, IoT, and electronics. Our services include:</p>
        <ul>
          <li>Internship listings and verified opportunity leads.</li>
          <li>Training programs and workshops.</li>
          <li>Hackathons and competitive design challenges.</li>
          <li>Educational resources and white papers.</li>
          <li>Hardware and academic project listings.</li>
          <li>Electronic component price comparisons.</li>
          <li>Student accounts and project tracking dashboards.</li>
          <li>Administrative tools for managing platform content.</li>
        </ul>

        <h3>3. User Accounts</h3>
        <p>Users may create an account or sign in using Google Sign-In or email credentials. You agree to provide accurate information and keep your account information reasonably up to date. You are responsible for activity performed through your account.</p>

        <h3>4. Student Responsibilities</h3>
        <p>Users must use the platform lawfully and responsibly. You must not submit false information, attempt unauthorized administrative access, interfere with the website's security, or conduct fraudulent activities.</p>

        <h3>5. Internships, Training and Hackathons</h3>
        <p>TechCircuit Hub publishes opportunities provided by third parties or organizers. Eligibility requirements, deadlines, fees, and conditions are determined by respective organizers. Listing an opportunity does not guarantee selection, admission, or employment.</p>

        <h3>6. Hardware Projects and Products</h3>
        <p>The website displays hardware projects, electronic components, educational kits, and related products. Product descriptions, specifications, prices, and delivery estimates should be reviewed before placing an order. Customization requests are subject to confirmation by TechCircuit Hub engineers.</p>

        <h3>7. Orders and Payments</h3>
        <p>Payments are processed securely through Cashfree or another configured payment gateway. Orders are subject to successful payment authorization. Payment processing is also subject to the payment provider's terms.</p>

        <h3>8. Shipping, Cancellations and Refunds</h3>
        <p>Custom build timelines (~7 days), cancellation eligibility, and refund conditions are communicated through our published policy. In the event an order cannot be fulfilled, full refunds are issued immediately.</p>

        <h3>9. Educational Information</h3>
        <p>Educational materials and project information are provided for learning and informational purposes. Users are responsible for following appropriate electrical, laboratory, and equipment safety practices.</p>

        <h3>10. Third-Party Websites</h3>
        <p>Our website may link to external websites, including internship portals, training providers, hackathons, and component suppliers. We do not control third-party content and their own terms apply.</p>

        <h3>11. Intellectual Property</h3>
        <p>Unless otherwise stated, website branding, original text, designs, and downloadable white papers are protected under applicable intellectual property laws. Permitted educational content may be used for personal learning.</p>

        <h3>12. Website Availability &amp; Liability</h3>
        <p>We aim to maintain high availability but cannot guarantee uninterrupted service. To the extent permitted by law, TechCircuit Hub is not liable for third-party opportunity decisions or external network issues.</p>

        <h3>13. Contact Us</h3>
        <p>For questions about these terms, orders, or our services, contact:</p>
        <p><strong>Website:</strong> <a href="https://techcircuithub.com" target="_blank" rel="noreferrer">https://techcircuithub.com</a><br /><strong>Email:</strong> <a href="mailto:techcircuith@gmail.com">techcircuith@gmail.com</a></p>
      </div>
    );
  }

  if (tab === "privacy") {
    return (
      <div className="policy-content-article">
        <h3>1. Introduction</h3>
        <p>TechCircuit Hub is an educational and career development platform designed for students and professionals interested in Electronics and Communication Engineering (ECE), VLSI, embedded systems, IoT, and related technologies. This Privacy Policy explains how we collect, use, store, and protect your personal information.</p>

        <h3>2. Information We Collect</h3>
        <p>Depending on the features you use, we may collect:</p>
        <ul>
          <li>Name, email address, phone number, and delivery shipping addresses.</li>
          <li>Account and profile information (college, department, year of study, technical interests).</li>
          <li>Student dashboard bookmarks and opportunity activity history.</li>
          <li>Project order, build tracking stage, and transaction references.</li>
          <li>Voluntary feedback or project customization requests.</li>
        </ul>

        <h3>3. Google Sign-In</h3>
        <p>When you sign in using Google, we receive basic profile information (such as your name, email address, and avatar) authorized by you to facilitate secure account login.</p>

        <h3>4. How We Use Your Information</h3>
        <p>We use your information to provide student dashboard features, process hardware kit orders, manage build tracking stages, respond to enquiries, maintain website security, and comply with legal obligations.</p>

        <h3>5. Payments and Orders</h3>
        <p>TechCircuit Hub uses Cashfree to process payments. Payment processing adheres to PCI-DSS standards. We do not store complete card numbers or bank credentials on our servers.</p>

        <h3>6. Data Security &amp; Retention</h3>
        <p>We use appropriate encryption and database security controls to protect personal information against unauthorized access. We retain personal information only for as long as necessary to provide services and meet legal obligations.</p>

        <h3>7. Your Privacy Rights</h3>
        <p>Subject to applicable law, you have rights to request access to, correction of, or deletion of your personal data. To submit a request, contact us below.</p>

        <h3>8. Contact Us</h3>
        <p>For privacy-related questions, requests, or complaints, contact:</p>
        <p><strong>Website:</strong> <a href="https://techcircuithub.com" target="_blank" rel="noreferrer">https://techcircuithub.com</a><br /><strong>Email:</strong> <a href="mailto:techcircuith@gmail.com">techcircuith@gmail.com</a></p>
      </div>
    );
  }

  return (
    <div className="policy-content-article">
      <h3>1. Custom Handcrafted Production</h3>
      <p>All hardware kits and academic engineering projects displayed on TechCircuit Hub are handcrafted and custom assembled upon order placement. Our engineering workshop prepares physical PCBs, performs component testing, and pre-flashes microcontrollers with fully verified firmware.</p>

      <h3>2. Delivery Timelines</h3>
      <p>Standard delivery is completed within approximately <strong>7 business days</strong> from order confirmation. Live tracking stages ("Order Placed", "Confirmed", "Building (Processing)", "Testing / Quality Check", "Packed", "Shipped", "Delivered") are updated in your Student Dashboard.</p>

      <h3>3. Cancellation Policy</h3>
      <p>Because hardware projects are custom fabricated, full cancellations with 100% refund are accepted while your order is in the <strong>Order Placed</strong> or <strong>Confirmed</strong> stage (within 24 hours). Once manual soldering, circuit etching, and physical component allocation begin in <strong>Building (Processing)</strong>, cancellations must be coordinated directly with our workshop team at <a href="mailto:techcircuith@gmail.com">techcircuith@gmail.com</a>.</p>

      <h3>4. Replacements &amp; Transit Guarantee</h3>
      <p>If any component is damaged during transit or fails initial testing upon delivery, we provide immediate free component replacements or a full refund upon verification. Simply reach out with your Order ID and photo/video of the issue.</p>
    </div>
  );
}

export function AppHomepageDedicatedPage({
  navigate,
  onOpenAuth,
}: {
  navigate: (page: Page) => void;
  onOpenAuth: () => void;
}) {
  return (
    <main className="policy-dedicated-page app-homepage-dedicated">
      <div className="policy-dedicated-container">
        <header className="policy-dedicated-header">
          <nav className="policy-breadcrumbs" aria-label="Breadcrumb navigation">
            <button className="policy-breadcrumb-btn" type="button" onClick={() => navigate("Home")}>
              <Home size={14} /> Main Platform
            </button>
            <span>/</span>
            <span>Official Information</span>
            <span>/</span>
            <strong style={{ color: "#0F1F3D" }}>App Homepage (/home)</strong>
          </nav>

          <div className="policy-hero-card app-home-hero-card">
            <div className="policy-hero-badge">
              <ShieldCheck size={14} /> OFFICIAL APP HOMEPAGE · TECHCIRCUIT HUB
            </div>
            <div className="app-home-brand-row">
              <img className="app-home-logo" src={brandLogo} alt={PLATFORM_NAME} />
              <div>
                <h1>Welcome to TechCircuit Hub</h1>
                <p className="app-home-hero-lead">
                  TechCircuit Hub is a learning and career development platform for Electronics and Communication Engineering (ECE), VLSI, embedded systems, and IoT students.
                </p>
              </div>
            </div>

            <div className="policy-hero-meta app-home-hero-meta">
              <span><strong>Platform:</strong> TechCircuit Hub</span>
              <span>·</span>
              <span><strong>Domain:</strong> <a href="https://techcircuithub.com" target="_blank" rel="noopener noreferrer">https://techcircuithub.com</a></span>
              <span>·</span>
              <span><strong>Official Path:</strong> /home</span>
              <span>·</span>
              <span><strong>Support:</strong> <a href="mailto:techcircuith@gmail.com">techcircuith@gmail.com</a></span>
              <span>·</span>
              <span><strong>Audience:</strong> ECE, VLSI &amp; Embedded Learners</span>
            </div>

            <div className="app-home-hero-actions">
              <button className="button button-primary" onClick={() => navigate("Home")}>
                Explore Main Platform <ArrowRight size={15} />
              </button>
              <button className="button button-outline app-home-outline-btn" onClick={onOpenAuth}>
                <UserRound size={15} /> Create Student Account / Sign In
              </button>
            </div>
          </div>
        </header>

        {/* Section 1: What You Can Do */}
        <section className="app-home-section" aria-labelledby="what-you-can-do-title">
          <div className="app-home-section-head">
            <span className="app-home-section-tag">
              <Sparkles size={13} /> CORE PLATFORM FUNCTIONALITY
            </span>
            <h2 id="what-you-can-do-title">What You Can Do</h2>
            <p className="app-home-section-desc">
              TechCircuit Hub is built specifically for Electronics and Communication Engineering (ECE), VLSI, embedded systems, and IoT students. Discover all capabilities available on the platform:
            </p>
          </div>

          <div className="app-home-features-list">
            <article className="app-home-feature-item">
              <div className="app-home-feature-icon" style={{ background: "rgba(255,107,24,0.12)", color: "#ff6b18" }}>
                <BriefcaseBusiness size={24} />
              </div>
              <div className="app-home-feature-body">
                <h3>Explore internships and career opportunities.</h3>
                <p>
                  Access verified core hardware, semiconductor, VLSI design, firmware engineering, and robotics internship leads.
                  Students can review verified role requirements, company profiles, stipends, and apply directly through source links.
                </p>
                <button className="app-home-link-btn" type="button" onClick={() => navigate("Internships")}>
                  Browse Internships <ArrowRight size={14} />
                </button>
              </div>
            </article>

            <article className="app-home-feature-item">
              <div className="app-home-feature-icon" style={{ background: "rgba(14,165,233,0.12)", color: "#0ea5e9" }}>
                <GraduationCap size={24} />
              </div>
              <div className="app-home-feature-body">
                <h3>Discover technical training programs and hackathons.</h3>
                <p>
                  Find structured technical training in VLSI front-end/back-end, embedded C, RTOS, PCB layout, FPGA Verilog, and IoT.
                  Compete in premier hardware hackathons and design challenges with step-by-step participation details.
                </p>
                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "4px" }}>
                  <button className="app-home-link-btn" type="button" onClick={() => navigate("Training")}>
                    Technical Training <ArrowRight size={14} />
                  </button>
                  <button className="app-home-link-btn" type="button" onClick={() => navigate("Hackathons")}>
                    Hackathons <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </article>

            <article className="app-home-feature-item">
              <div className="app-home-feature-icon" style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1" }}>
                <CircuitBoard size={24} />
              </div>
              <div className="app-home-feature-body">
                <h3>Access educational resources and electronics projects.</h3>
                <p>
                  Access end-to-end verified electronics and embedded hardware project packages with complete schematic diagrams,
                  tested firmware source code, component BOMs, and technical documentation for semester and capstone projects.
                </p>
                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "4px" }}>
                  <button className="app-home-link-btn" type="button" onClick={() => navigate("Projects")}>
                    Projects for Sale &amp; Customization <ArrowRight size={14} />
                  </button>
                  <button className="app-home-link-btn" type="button" onClick={() => navigate("Learn")}>
                    Study Resources &amp; Guides <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </article>

            <article className="app-home-feature-item">
              <div className="app-home-feature-icon" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
                <Cpu size={24} />
              </div>
              <div className="app-home-feature-body">
                <h3>Explore electronic components and compare available options.</h3>
                <p>
                  Search and compare electronic components including microcontrollers (STM32, ESP32, Arduino, PIC), sensors,
                  wireless communication modules, and power ICs with official datasheets, pinouts, and pricing across trusted vendors.
                </p>
                <button className="app-home-link-btn" type="button" onClick={() => navigate("Products")}>
                  Compare Electronic Components <ArrowRight size={14} />
                </button>
              </div>
            </article>

            <article className="app-home-feature-item app-home-feature-highlight">
              <div className="app-home-feature-icon" style={{ background: "rgba(249,115,22,0.14)", color: "#f97316" }}>
                <UserRound size={24} />
              </div>
              <div className="app-home-feature-body">
                <h3>Create an account to access student features and track your learning journey.</h3>
                <p>
                  Create a secure student account to bookmark listings, manage applications, track project kit orders,
                  and access personalized student dashboards tailored to your branch of engineering.
                </p>
                <button className="button button-primary" type="button" onClick={onOpenAuth} style={{ marginTop: "6px" }}>
                  Create Student Account <ArrowRight size={14} />
                </button>
              </div>
            </article>
          </div>
        </section>

        {/* Section 2: User Data & Authentication Transparency (Google Cloud Console Requirement) */}
        <section className="app-home-section" aria-labelledby="data-transparency-title">
          <div className="app-home-transparency-card">
            <div className="app-home-transparency-head">
              <div className="app-home-shield-icon">
                <ShieldCheck size={26} />
              </div>
              <div>
                <span className="app-home-section-tag" style={{ color: "#059669", background: "rgba(5, 150, 105, 0.1)", border: "1px solid rgba(5, 150, 105, 0.25)" }}>
                  USER DATA &amp; OAUTH PRIVACY TRANSPARENCY
                </span>
                <h2 id="data-transparency-title" style={{ margin: "4px 0 6px", fontSize: "22px", color: "#0f172a" }}>
                  How TechCircuit Hub Collects and Protects User Data
                </h2>
                <p style={{ margin: 0, color: "#475569", fontSize: "14px", lineHeight: "1.6" }}>
                  In accordance with Google API Services User Data Policy and international data privacy standards, here is how we collect, use, and protect your data:
                </p>
              </div>
            </div>

            <div className="app-home-transparency-grid">
              <div className="app-home-transparency-box">
                <h4>1. What Data We Request</h4>
                <p>
                  When you sign in using Google or email, we only request basic profile information:
                  <strong> your full name, email address, and profile photo</strong>. We never request access to your contacts, Google Drive, calendar, or private files.
                </p>
              </div>

              <div className="app-home-transparency-box">
                <h4>2. Purpose of User Data</h4>
                <p>
                  User data is used strictly to authenticate your account, maintain your personalized bookmarks, record your learning progress, and fulfill hardware kit orders.
                </p>
              </div>

              <div className="app-home-transparency-box">
                <h4>3. No Data Selling or Ads</h4>
                <p>
                  We <strong>never sell, rent, or trade your personal information</strong> with third-party advertisers or data brokers. Data is processed solely for providing the educational service.
                </p>
              </div>

              <div className="app-home-transparency-box">
                <h4>4. User Control &amp; Deletion</h4>
                <p>
                  You have full rights to inspect, update, or request permanent deletion of your account and associated data at any time through account settings or by emailing <a href="mailto:techcircuith@gmail.com">techcircuith@gmail.com</a>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Privacy and Terms */}
        <section className="app-home-section" aria-labelledby="privacy-terms-title">
          <div className="app-home-policy-box">
            <h2 id="privacy-terms-title">Privacy and Terms</h2>
            <p>
              We respect your privacy and explain how account information is collected, used, and protected in our Privacy Policy.
            </p>

            <div className="app-home-policy-links-grid">
              <div className="app-home-policy-item">
                <div className="app-home-policy-icon">
                  <FileText size={20} />
                </div>
                <div className="app-home-policy-content">
                  <strong>Privacy Policy:</strong>
                  <a
                    href="https://techcircuithub.com/privacy-policy"
                    onClick={(e) => { e.preventDefault(); navigate("Privacy"); }}
                    className="app-home-policy-anchor"
                  >
                    https://techcircuithub.com/privacy-policy <ArrowUpRight size={14} />
                  </a>
                  <p>Read how account credentials, order transactions, and user data are securely handled.</p>
                </div>
              </div>

              <div className="app-home-policy-item">
                <div className="app-home-policy-icon">
                  <Scale size={20} />
                </div>
                <div className="app-home-policy-content">
                  <strong>Terms of Service:</strong>
                  <a
                    href="https://techcircuithub.com/terms"
                    onClick={(e) => { e.preventDefault(); navigate("Terms"); }}
                    className="app-home-policy-anchor"
                  >
                    https://techcircuithub.com/terms <ArrowUpRight size={14} />
                  </a>
                  <p>Read terms governing platform use, intellectual property, project orders, and user rights.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Domain & Organization Verification */}
        <section className="app-home-section">
          <div className="app-home-domain-card">
            <div className="app-home-domain-head">
              <CheckCircle2 size={20} className="text-success" />
              <strong>Verified Domain &amp; Publisher Credentials</strong>
            </div>
            <div className="app-home-domain-grid">
              <div>
                <small>APPLICATION NAME</small>
                <span>TechCircuit Hub</span>
              </div>
              <div>
                <small>PRIMARY DOMAIN</small>
                <span>https://techcircuithub.com</span>
              </div>
              <div>
                <small>APP HOMEPAGE</small>
                <span>https://techcircuithub.com/home</span>
              </div>
              <div>
                <small>DEVELOPER / SUPPORT</small>
                <span>techcircuith@gmail.com</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function PolicyDedicatedPage({
  policy,
  navigate,
  currentConsent,
  onUpdateConsent,
}: {
  policy: PolicyType;
  navigate: (page: Page) => void;
  currentConsent: "accepted" | "essential" | null;
  onUpdateConsent: (type: "accepted" | "essential") => void;
}) {
  const titles: Record<PolicyType, string> = {
    terms: "Terms & Conditions",
    privacy: "Privacy Policy",
    cookie: "Cookie Policy",
    delivery: "Delivery, Cancellation & Refund Policy",
  };

  const currentTitle = titles[policy];

  return (
    <main className="policy-dedicated-page">
      <div className="policy-dedicated-container">
        <header className="policy-dedicated-header">
          <nav className="policy-breadcrumbs" aria-label="Breadcrumb navigation">
            <button className="policy-breadcrumb-btn" type="button" onClick={() => navigate("Home")}>
              <Home size={14} /> Home
            </button>
            <span>/</span>
            <span>Legal &amp; Policies</span>
            <span>/</span>
            <strong style={{ color: "#0F1F3D" }}>{currentTitle}</strong>
          </nav>

          <div className="policy-hero-card">
            <div className="policy-hero-badge">
              <ShieldCheck size={14} /> OFFICIAL LEGAL DOCUMENTATION · TECHCIRCUIT HUB
            </div>
            <h1>{currentTitle}</h1>
            <div className="policy-hero-meta">
              <span><strong>Effective Date:</strong> 24 October 2026</span>
              <span>·</span>
              <span><strong>Jurisdiction:</strong> Bengaluru, India</span>
              <span>·</span>
              <span><strong>Platform:</strong> https://techcircuithub.com</span>
            </div>
          </div>

          <div className="policy-nav-switcher" aria-label="Policy sections navigation">
            <button
              type="button"
              className={policy === "terms" ? "active" : ""}
              onClick={() => navigate("Terms")}
            >
              Terms &amp; Conditions
            </button>
            <button
              type="button"
              className={policy === "privacy" ? "active" : ""}
              onClick={() => navigate("Privacy")}
            >
              Privacy Policy
            </button>
            <button
              type="button"
              className={policy === "cookie" ? "active" : ""}
              onClick={() => navigate("Cookies")}
            >
              Cookie Policy
            </button>
            <button
              type="button"
              className={policy === "delivery" ? "active" : ""}
              onClick={() => navigate("Delivery")}
            >
              Delivery &amp; Refunds
            </button>
          </div>
        </header>

        <article className="policy-content-card">
          {renderPolicyArticle(policy, currentConsent, onUpdateConsent)}
        </article>

        <section className="policy-support-card">
          <div>
            <strong>Need assistance regarding our terms or your data?</strong>
            <p>Our workshop and compliance team is available to assist you with order inquiries and data requests.</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <a
              href="mailto:techcircuith@gmail.com"
              className="button button-primary button-small"
              style={{ textDecoration: "none" }}
            >
              <Mail size={14} /> Contact Support
            </a>
            <button
              type="button"
              className="button button-outline button-small"
              onClick={() => window.print()}
            >
              <Printer size={14} /> Print Policy
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export function CookieConsentBanner({
  onAcceptAll,
  onAcceptEssential,
  onViewCookiePolicy,
}: {
  onAcceptAll: () => void;
  onAcceptEssential: () => void;
  onViewCookiePolicy: () => void;
}) {
  return (
    <aside className="cookie-consent-overlay" role="region" aria-label="Cookie preferences consent">
      <div className="cookie-consent-card">
        <div className="cookie-consent-top">
          <span className="cookie-consent-badge">
            <ShieldCheck size={13} /> COOKIE CONSENT &amp; PRIVACY
          </span>
          <button
            className="cookie-close-icon"
            type="button"
            onClick={onAcceptEssential}
            aria-label="Dismiss cookie notice with essential cookies only"
          >
            <X size={16} />
          </button>
        </div>
        <div className="cookie-consent-title">
          <span>🍪 We respect your engineering privacy</span>
        </div>
        <p className="cookie-consent-desc">
          We use essential cookies and local storage to secure your login sessions, process hardware project kit orders, and remember your technical preferences. You can allow all cookies or restrict to essential functionality. Review our{" "}
          <button type="button" onClick={onViewCookiePolicy}>
            Cookie Policy
          </button>{" "}
          for complete details.
        </p>
        <div className="cookie-consent-actions">
          <button className="cookie-allow-btn" type="button" onClick={onAcceptAll}>
            Allow All Cookies
          </button>
          <button className="cookie-essential-btn" type="button" onClick={onAcceptEssential}>
            Essential Only
          </button>
        </div>
      </div>
    </aside>
  );
}

export function PolicyModal({
  type,
  onClose,
}: {
  type: PolicyType | null;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<PolicyType>(type || "terms");

  useEffect(() => {
    if (type) setActiveTab(type);
  }, [type]);

  if (!type) return null;

  return (
    <div className="policy-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="policy-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="policy-modal-header">
          <div className="policy-modal-title-wrap">
            <span className="eyebrow"><span className="eyebrow-line" /> TECHCIRCUIT HUB LEGAL &amp; POLICIES</span>
            <h2>{activeTab === "terms" ? "Terms & Conditions" : activeTab === "privacy" ? "Privacy Policy" : activeTab === "cookie" ? "Cookie Policy" : "Delivery, Cancellation & Refund Policy"}</h2>
            <span className="policy-effective-date">Effective Date: 24 October 2026</span>
          </div>
          <button className="policy-close-btn" type="button" onClick={onClose} aria-label="Close policy modal">
            <X size={20} />
          </button>
        </div>

        <div className="policy-tab-bar">
          <button className={activeTab === "terms" ? "policy-tab active" : "policy-tab"} onClick={() => setActiveTab("terms")}>Terms &amp; Conditions</button>
          <button className={activeTab === "privacy" ? "policy-tab active" : "policy-tab"} onClick={() => setActiveTab("privacy")}>Privacy Policy</button>
          <button className={activeTab === "cookie" ? "policy-tab active" : "policy-tab"} onClick={() => setActiveTab("cookie")}>Cookie Policy</button>
          <button className={activeTab === "delivery" ? "policy-tab active" : "policy-tab"} onClick={() => setActiveTab("delivery")}>Delivery &amp; Refunds</button>
        </div>

        <div className="policy-modal-body">
          {renderPolicyArticle(activeTab)}
        </div>

        <div className="policy-modal-footer">
          <button className="button button-primary" type="button" onClick={onClose}>
            Close &amp; Continue Browsing
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ page }: { page: Page }) {
  const message = emptyMessages[page] ?? { title: "No listings match yet", text: "Try another search or check back as more source-linked listings are reviewed." };
  return (
    <div className="empty-state">
      <div className="empty-icon">{page === "Products" ? <Cpu size={24} /> : <GraduationCap size={24} />}</div>
      <span className="eyebrow"><span className="eyebrow-line" /> VERIFIED INFORMATION ONLY</span>
      <h3>{message.title}</h3>
      <p>{message.text}</p>
      <span className="empty-footnote"><ShieldCheck size={14} /> We don't invent listings to fill the page.</span>
    </div>
  );
}

function Footer({
  navigate,
}: {
  navigate: (page: Page) => void;
}) {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <button className="brand brand-footer" onClick={() => navigate("Home")} aria-label={`${PLATFORM_NAME} home`}>
            <img className="brand-logo" src={brandLogo} alt={PLATFORM_NAME} />
          </button>
          <p>{PLATFORM_TAGLINE}<br />A clearer way into the electronics ecosystem.</p>
          <div className="footer-support-contact" style={{ marginTop: "12px", fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
            <span>Direct Support: </span>
            <a href="mailto:techcircuith@gmail.com" style={{ color: "#F97316", textDecoration: "none", fontWeight: 600 }}>techcircuith@gmail.com</a>
          </div>
        </div>
        <div className="footer-links">
          <div>
            <strong>EXPLORE</strong>
            <button onClick={() => navigate("Products")}>Components</button>
            <button onClick={() => navigate("Projects")}>Projects</button>
            <button onClick={() => navigate("Internships")}>Internships</button>
            <button onClick={() => navigate("Training")}>Training</button>
          </div>
          <div>
            <strong>GET INSPIRED</strong>
            <button onClick={() => navigate("Hackathons")}>Hackathons</button>
            <button onClick={() => navigate("Learn")}>Resources</button>
            <button onClick={() => navigate("Saved")}>Collection</button>
            <button onClick={() => navigate("Admin")}>Partner portal</button>
          </div>
          <div>
            <strong>POLICIES &amp; LEGAL</strong>
            <button type="button" onClick={() => navigate("AppHome")}>App Homepage (/home)</button>
            <button type="button" onClick={() => navigate("Terms")}>Terms &amp; Conditions</button>
            <button type="button" onClick={() => navigate("Privacy")}>Privacy Policy</button>
            <button type="button" onClick={() => navigate("Cookies")}>Cookie Policy</button>
            <button type="button" onClick={() => navigate("Delivery")}>Delivery &amp; Refunds</button>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} {PLATFORM_NAME} <span className="sample-dot" /> TechCircuit Hub</span>
        <span>Built for engineering learners. Effective Date: 24 October 2026</span>
      </div>
    </footer>
  );
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
  return <div className="modal-overlay" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="enquiry-modal" role="dialog" aria-modal="true" aria-labelledby="enquiry-title"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button>{sent ?   <div className="success-state"><div className="success-icon"><Check size={24} /></div><div className="eyebrow"><span className="eyebrow-line" /> {listing.id.startsWith("sample-") ? "ENQUIRY PREVIEW" : "ENQUIRY SENT"}</div><h2>{listing.id.startsWith("sample-") ? "Thanks for your interest." : "Your enquiry is on its way."}</h2><p>{listing.id.startsWith("sample-") ? "This is an illustrative profile. No enquiry was sent to a provider." : "Your enquiry was sent to the platform and can be reviewed by an administrator."}</p><button className="button button-dark" onClick={onClose}>Back to discovery <ArrowRight size={15} /></button></div> : <><div className="eyebrow"><span className="eyebrow-line" /> SEND AN ENQUIRY</div><h2 id="enquiry-title">Start a conversation.</h2><p className="modal-context">You're enquiring about <strong>{listing.title}</strong> from {listing.organization}.</p><form className="enquiry-form" onSubmit={submit}><label>Your name<input name="name" required placeholder="Enter your name" /></label><label>Email address<input name="email" type="email" required placeholder="you@example.com" /></label><label>What would you like to know?<textarea name="message" required rows={4} placeholder="Share a little about your project or question…" /></label>{listing.id.startsWith("sample-") && <div className="modal-sample-warning"><CircleHelp size={15} /> This is a sample profile. No contact details are available.</div>}{error && <div className="admin-message" role="alert">{error}</div>}<button className="button button-dark" type="submit" disabled={submitting}>{submitting ? "Sending…" : listing.id.startsWith("sample-") ? "Preview enquiry" : "Send enquiry"} <ArrowRight size={15} /></button></form></>}</section></div>;
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
  const modalRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const appShell = document.querySelector(".app-shell");
    if (appShell && modalRef.current && !appShell.contains(modalRef.current)) {
      appShell.setAttribute("aria-hidden", "true");
      appShell.setAttribute("inert", "");
    }

    const timer = setTimeout(() => {
      const focusables = modalRef.current?.querySelectorAll<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables && focusables.length > 0) {
        const firstInput = Array.from(focusables).find((el) => el.tagName === "INPUT");
        (firstInput || focusables[0]).focus();
      } else if (modalRef.current) {
        modalRef.current.focus();
      }
    }, 50);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "Tab" && modalRef.current) {
        const focusableNodes = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((node) => node.offsetParent !== null);

        if (focusableNodes.length === 0) return;
        const firstNode = focusableNodes[0];
        const lastNode = focusableNodes[focusableNodes.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstNode || !modalRef.current.contains(document.activeElement)) {
            event.preventDefault();
            lastNode.focus();
          }
        } else {
          if (document.activeElement === lastNode || !modalRef.current.contains(document.activeElement)) {
            event.preventDefault();
            firstNode.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      if (appShell && !appShell.contains(modalRef.current)) {
        appShell.removeAttribute("aria-hidden");
        appShell.removeAttribute("inert");
      }
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        previousFocusRef.current.focus();
      }
    };
  }, [onClose]);

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
            setError("This email already has an account. Log in with your password, continue with Google if you originally signed up with Google, or choose Forgot password.");
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
            setError("Those sign-in details were not accepted. If you created this account with email and password, check your credentials or send a reset link below. If you used Google, choose Continue with Google.");
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
      <section className="enquiry-modal auth-modal" ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="student-auth-title">
        <button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <div className="student-auth-logo-wrap">
          <img className="student-auth-logo" src={brandLogo} alt={PLATFORM_NAME} />
        </div>
        <div className="eyebrow" style={{ textAlign: "center" }}><span className="eyebrow-line" /> STUDENT ACCOUNT</div>
        <h2 id="student-auth-title" style={{ textAlign: "center" }}>{mode === "signup" ? "Join the circuit." : mode === "recover" ? "Reset your password." : mode === "updatePassword" ? "Choose a new password." : "Welcome back."}</h2>
        <p className="modal-context" style={{ textAlign: "center" }}>{mode === "recover" ? "Enter the email address on your account and we’ll send a password reset link." : mode === "updatePassword" ? "Choose a new password for your student account." : "Create an account or log in. Complete your student profile the first time you enter."}</p>
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
          {error && (
            <div className="auth-error-alert" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          {message && <div className="auth-success" role="status">{message}</div>}
          <button className="button button-dark" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create student account" : mode === "recover" ? "Send reset link" : mode === "updatePassword" ? "Update password" : "Sign in"} <ArrowRight size={15} />
          </button>
        </form>
        {(mode === "recover" || mode === "updatePassword") && <button className="auth-recovery-link" type="button" onClick={() => { setMode("signin"); setError(""); setMessage(""); }}>Back to log in</button>}
        {(mode === "signin" || mode === "signup") && (
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
  onDismiss,
  student,
  onSignIn,
}: {
  listing: Listing;
  busy: boolean;
  error: string;
  onChoose: (status: OpportunityActivityStatus) => void;
  onDismiss?: () => void;
  student?: User | null;
  onSignIn?: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    const firstBtn = modalRef.current?.querySelector<HTMLButtonElement>("button");
    firstBtn?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss?.();
      } else if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (previousFocus.current && typeof previousFocus.current.focus === "function") {
        previousFocus.current.focus();
      }
    };
  }, [onDismiss]);

  return (
    <div
      className="modal-overlay opportunity-return-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && onDismiss) onDismiss();
      }}
    >
      <section
        ref={modalRef}
        className="enquiry-modal opportunity-return-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="opportunity-return-title"
      >
        <div className="opportunity-return-icon-box">
          <BriefcaseBusiness size={24} />
        </div>
        <div
          className="eyebrow"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#F97316",
            fontWeight: 700,
            fontSize: "11px",
            letterSpacing: "0.06em",
            margin: "12px 0 6px",
          }}
        >
          <span style={{ width: "16px", height: "2px", background: "#F97316", borderRadius: "1px", display: "inline-block" }} />
          OPPORTUNITY FOLLOW-UP
        </div>
        <h2
          id="opportunity-return-title"
          style={{
            fontSize: "20px",
            fontWeight: 800,
            color: "#0F1F3D",
            margin: "0 0 10px",
            lineHeight: 1.3,
          }}
        >
          Did you apply or register?
        </h2>
        <p
          className="modal-context"
          style={{
            fontSize: "13.5px",
            color: "#64748B",
            lineHeight: 1.55,
            margin: "0 0 24px",
          }}
        >
          <strong style={{ color: "#0F1F3D", fontWeight: 700 }}>{listing.title}</strong> from {listing.organization}. Your answer is saved privately to your student account; the provider does not confirm it.
        </p>
        {error && <div className="admin-message" role="alert" style={{ marginBottom: "16px" }}>{error}</div>}
        
        {student ? (
          <div className="opportunity-return-actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              className="button button-primary"
              type="button"
              disabled={busy}
              onClick={() => onChoose("applied")}
              style={{
                height: "46px",
                borderRadius: "999px",
                background: "#F97316",
                color: "#FFFFFF",
                fontWeight: 700,
                padding: "0 24px",
                border: 0,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(249, 115, 22, 0.28)",
              }}
            >
              {busy ? "Saving…" : "Yes, mark as applied"}
            </button>
            <button
              className="button button-outline"
              type="button"
              disabled={busy}
              onClick={() => onChoose("visited")}
              style={{
                height: "46px",
                borderRadius: "999px",
                border: "1.5px solid #E2E8F0",
                color: "#0F1F3D",
                fontWeight: 600,
                padding: "0 24px",
                background: "#FFFFFF",
                cursor: "pointer",
              }}
            >
              Just visited
            </button>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "#64748B",
                  fontSize: "12.5px",
                  cursor: "pointer",
                  padding: "8px 12px",
                  textDecoration: "underline",
                  width: "100%",
                  textAlign: "center",
                  marginTop: "4px",
                }}
              >
                Ask me later
              </button>
            )}
          </div>
        ) : (
          <div className="opportunity-return-actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            {onSignIn && (
              <button
                className="button button-primary"
                type="button"
                onClick={onSignIn}
                style={{
                  height: "46px",
                  borderRadius: "999px",
                  background: "#F97316",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  padding: "0 24px",
                  border: 0,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(249, 115, 22, 0.28)",
                }}
              >
                Sign in to track your applications
              </button>
            )}
            <button
              className="button button-outline"
              type="button"
              onClick={onDismiss}
              style={{
                height: "46px",
                borderRadius: "999px",
                border: "1.5px solid #E2E8F0",
                color: "#0F1F3D",
                fontWeight: 600,
                padding: "0 24px",
                background: "#FFFFFF",
                cursor: "pointer",
              }}
            >
              Just visited
            </button>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "#64748B",
                  fontSize: "12.5px",
                  cursor: "pointer",
                  padding: "8px 12px",
                  textDecoration: "underline",
                  width: "100%",
                  textAlign: "center",
                  marginTop: "4px",
                }}
              >
                Ask me later
              </button>
            )}
          </div>
        )}
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
  initialTrackingOrder,
  onClearInitialTrackingOrder,
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
  initialTrackingOrder?: AdminOrder | null;
  onClearInitialTrackingOrder?: () => void;
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
  const [activityFilter, setActivityFilter] = useState<"all" | TrackableOpportunityKind>("all");
  const [studentOrders, setStudentOrders] = useState<AdminOrder[]>(() => initialTrackingOrder ? [initialTrackingOrder] : []);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState<AdminOrder | null>(() => initialTrackingOrder || null);

  useEffect(() => {
    if (initialTrackingOrder) {
      setSelectedTrackingOrder(initialTrackingOrder);
    }
  }, [initialTrackingOrder]);

  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        const elapsed = Date.now() - touchStartTime;

        if (deltaX > 60 && Math.abs(deltaY) < 80 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3 && elapsed < 600) {
          const target = e.target as HTMLElement | null;
          if (target && ["input", "textarea", "select"].includes(target.tagName.toLowerCase())) return;

          if (selectedTrackingOrder) {
            setSelectedTrackingOrder(null);
            if (onClearInitialTrackingOrder) onClearInitialTrackingOrder();
            return;
          }
          if (section !== "overview") {
            setSection("overview");
            return;
          }
          navigate("Home");
        }
      }
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [selectedTrackingOrder, section, onClearInitialTrackingOrder, navigate, setSection]);

  useEffect(() => {
    setOrdersLoading(true);
    setOrdersError("");
    const emailToQuery = student?.email || initialTrackingOrder?.customer_email || localStorage.getItem("techcircuit-customer-email") || "";
    const userIdToQuery = student?.id || "";

    let localOrders: AdminOrder[] = [];
    try {
      const raw = localStorage.getItem("techcircuit_orders_store");
      if (raw) localOrders = JSON.parse(raw);
    } catch {}

    fetch(`/api/orders?userId=${encodeURIComponent(userIdToQuery)}&email=${encodeURIComponent(emailToQuery)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load your orders.");
        const text = await res.text();
        let data: any = {};
        try { data = text ? JSON.parse(text) : {}; } catch {}
        const serverOrders: AdminOrder[] = data.orders || [];

        const orderMap = new Map<string, AdminOrder>();
        serverOrders.forEach((o) => orderMap.set(o.id, o));
        localOrders.forEach((o) => {
          if (!orderMap.has(o.id) && !(o.order_id && orderMap.has(o.order_id))) {
            orderMap.set(o.id, o);
          }
        });
        if (initialTrackingOrder && !orderMap.has(initialTrackingOrder.id)) {
          orderMap.set(initialTrackingOrder.id, initialTrackingOrder);
        }
        const merged = Array.from(orderMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setStudentOrders(merged);
      })
      .catch((err) => {
        const orderMap = new Map<string, AdminOrder>();
        localOrders.forEach((o) => orderMap.set(o.id, o));
        if (initialTrackingOrder && !orderMap.has(initialTrackingOrder.id)) {
          orderMap.set(initialTrackingOrder.id, initialTrackingOrder);
        }
        const merged = Array.from(orderMap.values());
        setStudentOrders(merged);
        if (merged.length === 0) {
          setOrdersError(err instanceof Error ? err.message : "Could not load orders.");
        }
      })
      .finally(() => setOrdersLoading(false));
  }, [student, section, initialTrackingOrder]);

  const appliedOpportunityCount = opportunityActivities.filter((activity) => activity.status === "applied" && activity.opportunity_kind === "Internships").length;
  const appliedEnrollmentCount = opportunityActivities.filter((activity) => activity.status === "applied" && activity.opportunity_kind === "Training").length;
  const trackedHackathonCount = opportunityActivities.filter((activity) => activity.opportunity_kind === "Hackathons").length;
  const recommendedListings = useMemo(() => {
    const targetCategories: Array<"Training" | "Internships" | "Hackathons" | "Projects"> = [
      "Training",
      "Internships",
      "Hackathons",
      "Projects",
    ];
    const selected: Listing[] = [];
    const usedIds = new Set<string>();

    // 1. Pick the best-matching opportunity for each category (Training, Internships, Hackathons, Projects)
    targetCategories.forEach((kind) => {
      const candidates = listings
        .filter((item) => item.kind === kind && !usedIds.has(item.id))
        .map((listing) => {
          const searchable = `${listing.title} ${listing.summary} ${listing.tags.join(" ")} ${listing.projectCategory ?? ""}`.toLowerCase();
          const matchCount = interests.filter((interest) => searchable.includes(interest.toLowerCase())).length;
          return { listing, matchCount };
        })
        .sort((a, b) => b.matchCount - a.matchCount);

      if (candidates.length > 0) {
        selected.push(candidates[0].listing);
        usedIds.add(candidates[0].listing.id);
      }
    });

    // 2. If any category was missing, fill up to 4 items from remaining highest-scored listings
    if (selected.length < 4) {
      const remainingCandidates = listings
        .filter((item) => (targetCategories as string[]).includes(item.kind) && !usedIds.has(item.id))
        .map((listing) => {
          const searchable = `${listing.title} ${listing.summary} ${listing.tags.join(" ")} ${listing.projectCategory ?? ""}`.toLowerCase();
          const matchCount = interests.filter((interest) => searchable.includes(interest.toLowerCase())).length;
          return { listing, matchCount };
        })
        .sort((a, b) => b.matchCount - a.matchCount);

      for (const item of remainingCandidates) {
        if (selected.length >= 4) break;
        selected.push(item.listing);
        usedIds.add(item.listing.id);
      }
    }

    return selected.slice(0, 4);
  }, [listings, interests]);
  const filteredActivities = activityFilter === "all"
    ? opportunityActivities
    : opportunityActivities.filter((item) => item.opportunity_kind === activityFilter);

  function handleUpdateOpportunityActivity(activity: OpportunityActivity, nextStatus: OpportunityActivityStatus) {
    setOpportunityActivities((current) =>
      current.map((item) =>
        item.opportunity_id === activity.opportunity_id
          ? { ...item, status: nextStatus, updated_at: new Date().toISOString() }
          : item
      )
    );
    onUpdateOpportunityActivity(activity, nextStatus);
  }
  const quickAccess = [
    { label: "Internships", description: "Find your next opportunity", page: "Internships" as Page, icon: BriefcaseBusiness, tone: "blue" },
    { label: "Training", description: "Build practical skills", page: "Training" as Page, icon: GraduationCap, tone: "green" },
    { label: "Hackathons", description: "Learn by making together", page: "Hackathons" as Page, icon: Code2, tone: "purple" },
    { label: "Projects", description: "Discover your next build", page: "Projects" as Page, icon: Cpu, tone: "orange" },
  ];

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
        let name = data?.display_name || currentStudent.user_metadata?.name || "";
        let inst = data?.institution ?? "";
        let crs = sanitizeCourse(data?.course);
        let yr = data?.academic_year ?? "";
        let cty = data?.city ?? "";
        let selectedInterests = data?.interests ?? [];

        // Check local storage fallback
        try {
          const cachedStr = localStorage.getItem(`techcircuit_student_profile_${currentStudent.id}`);
          if (cachedStr) {
            const cached = JSON.parse(cachedStr);
            if (!name && cached.display_name) name = cached.display_name;
            if (!inst && cached.institution) inst = cached.institution;
            if (!crs && cached.course) crs = cached.course;
            if (!yr && cached.academic_year) yr = cached.academic_year;
            if (!cty && cached.city) cty = cached.city;
            if ((!selectedInterests || selectedInterests.length === 0) && Array.isArray(cached.interests)) {
              selectedInterests = cached.interests;
            }
          }
        } catch {}

        setProfileName(name);
        setInstitution(inst);
        setCourse(crs);
        setAcademicYear(yr);
        setLocation(cty);
        setInterests(selectedInterests);
        const complete = Boolean(name.trim() && inst.trim() && crs.trim() && yr.trim() && selectedInterests.length);
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
    const sanitizedCourse = sanitizeCourse(course);
    if (!profileName.trim() || !institution.trim() || !sanitizedCourse.trim() || !academicYear) {
      setProfileError("Please enter your name, institution, course and academic year to continue.");
      return;
    }
    if (interests.length === 0) {
      setProfileError("Choose at least one area of interest to continue.");
      return;
    }
    const currentStudent = student;
    const profilePayload = {
      display_name: profileName.trim(),
      institution: institution.trim(),
      course: sanitizedCourse.trim(),
      academic_year: academicYear,
      city: location.trim(),
      interests,
      updated_at: new Date().toISOString(),
    };

    try {
      localStorage.setItem(`techcircuit_student_profile_${currentStudent.id}`, JSON.stringify(profilePayload));
    } catch {}

    setProfileError("");
    setMessage("");
    setProfileSaving(true);

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .update({
            display_name: profileName.trim(),
            institution: institution.trim(),
            course: sanitizedCourse.trim(),
            academic_year: academicYear,
            city: location.trim(),
            interests,
          })
          .eq("id", currentStudent.id)
          .select("id")
          .maybeSingle();

        if (!error && !data) {
          await supabase
            .from("profiles")
            .upsert({
              id: currentStudent.id,
              display_name: profileName.trim(),
              institution: institution.trim(),
              course: sanitizedCourse.trim(),
              academic_year: academicYear,
              city: location.trim(),
              interests,
              role: "student",
            })
            .select("id")
            .maybeSingle();
        }
      } catch (err) {
        console.warn("Saved to local storage, server sync deferred:", err);
      }
    }

    setCourse(sanitizedCourse);
    setProfileSaving(false);
    setMessage("Your student profile was saved successfully! ✨");
    setProfileSetupRequired(false);
    if (profileSetupRequired) setSection("overview");
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

  if (!student && section !== "orders") {
    return (
      <main className="directory-page">
        <section className="directory-content">
          <div className="empty-state"><div className="empty-icon"><UserRound size={23} /></div><span className="eyebrow"><span className="eyebrow-line" /> STUDENT DASHBOARD</span><h3>Sign in to view your dashboard.</h3><p>Student accounts are optional. You can keep exploring without signing in.</p><button className="button button-dark" onClick={() => navigate("Home")}>Continue browsing <ArrowRight size={15} /></button></div>
        </section>
      </main>
    );
  }

  if (section !== "orders" && (!profileLoaded || profileLoading || profileLoadError)) {
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
      <div className="dashboard-section-head">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> {profileSetupRequired ? "STUDENT DETAILS" : "YOUR PROFILE"}</div>
          <h2 id={profileSetupRequired ? "student-setup-title" : undefined}>{profileSetupRequired ? "Set up your student profile" : "Student Profile"}</h2>
          {profileSetupRequired && <p className="profile-setup-intro">Tell us about your studies and choose the engineering areas you want to explore.</p>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span className="profile-private-note"><ShieldCheck size={14} /> Private to your account</span>
          {profileSetupRequired && (
            <button className="button button-outline button-small" type="button" onClick={signOut} title="Sign out of student account" style={{ padding: "4px 10px", fontSize: "12px", minHeight: "30px" }}>
              <LogOut size={13} /> Sign out
            </button>
          )}
        </div>
      </div>

      <div className="student-profile-badge-card">
        <div className="student-profile-avatar-circle">
          {(profileName.trim() || student?.email || "S")[0].toUpperCase()}
        </div>
        <div className="student-profile-badge-details">
          <div className="student-badge-name">{profileName.trim() || "Student Member"}</div>
          <div className="student-badge-email">{student?.email}</div>
          <span className="student-verified-pill"><ShieldCheck size={13} /> Active Verified Student</span>
        </div>
      </div>

      <form className="student-profile-form" onSubmit={saveProfile}>
        <div className="student-profile-form-body">
          <div className="profile-form-row">
            <label>
              Full name <span className="field-required">*</span>
              <input required value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Enter full name" />
            </label>
            <label>
              Email address
              <div className="profile-readonly-input">
                <input value={student?.email ?? ""} readOnly aria-readonly="true" />
                <Lock size={14} className="readonly-lock" />
              </div>
            </label>
          </div>

          <div className="profile-form-row">
            <label>
              College / Institution <span className="field-required">*</span>
              <input required value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="Your college or institution" />
            </label>
            <label>
              Course / Branch <span className="field-required">*</span>
              <input required value={course} onChange={(event) => setCourse(event.target.value)} placeholder="e.g. ECE / Embedded Systems" />
            </label>
          </div>

          <div className="profile-form-row">
            <label>
              Academic year <span className="field-required">*</span>
              <select required value={academicYear} onChange={(event) => setAcademicYear(event.target.value)}>
                <option value="">Select your year</option>
                {ACADEMIC_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            <label>
              City <span>(optional)</span>
              <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Your city (e.g. Chennai)" />
            </label>
          </div>

          <fieldset className="student-interest-fieldset">
            <legend>What areas interest you? <span>Select one or more</span></legend>
            <div className="student-interest-options">
              {STUDENT_INTERESTS.map((interest) => {
                const isSelected = interests.includes(interest);
                return (
                  <label key={interest} className={isSelected ? "student-interest-option selected" : "student-interest-option"}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => setInterests((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest])}
                    />
                    {isSelected && <Check size={12} strokeWidth={3} />}
                    <span>{interest}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="student-profile-actions">
          {(profileLoading || profileSaving) && <p className="profile-status" role="status">{profileLoading ? "Loading profile…" : "Saving profile…"}</p>}
          {profileError && <p className="admin-message profile-status" role="alert">{profileError}</p>}
          {message && <p className="auth-success profile-status" role="status">{message}</p>}
          <button className="button button-primary profile-save-btn" type="submit" disabled={profileLoading || profileSaving}>
            <Check size={16} strokeWidth={2.4} />
            <span>{profileSaving ? "Saving details…" : profileSetupRequired ? "Save details and continue" : "Save Profile Changes"}</span>
          </button>
        </div>
      </form>
    </section>
  );

  return (
    <main className="dashboard-page dashboard-page-modern">
      <section className="dashboard-content dashboard-content-modern">
        {section === "overview" && !profileSetupRequired && (
          <>
            {/* Quick Metrics Cards */}
            <div className="dashboard-stats-grid">
              <div className="dashboard-stat-card card-glow-orange" onClick={() => setSection("orders")} role="button" tabIndex={0}>
                <div className="stat-card-head">
                  <span className="stat-icon-wrap"><Truck size={18} /></span>
                  <span className="stat-label">Hardware Orders</span>
                </div>
                <div className="stat-value">{studentOrders.length}</div>
                <div className="stat-subtext">
                  {studentOrders.length > 0 ? (
                    <span className="stat-link-highlight">Track build &amp; courier <ArrowRight size={12} /></span>
                  ) : (
                    "Built to order (~7 days delivery)"
                  )}
                </div>
              </div>

              <div className="dashboard-stat-card card-glow-blue" onClick={() => setSection("applications")} role="button" tabIndex={0}>
                <div className="stat-card-head">
                  <span className="stat-icon-wrap"><BriefcaseBusiness size={18} /></span>
                  <span className="stat-label">Opportunities</span>
                </div>
                <div className="stat-value">
                  {opportunityActivityLoading ? "—" : appliedOpportunityCount + appliedEnrollmentCount + trackedHackathonCount}
                </div>
                <div className="stat-subtext">
                  <span className="stat-link-highlight">{appliedOpportunityCount} applied · {trackedHackathonCount} hackathons</span>
                </div>
              </div>

              <div className="dashboard-stat-card card-glow-purple" onClick={() => navigate("Saved")} role="button" tabIndex={0}>
                <div className="stat-card-head">
                  <span className="stat-icon-wrap"><Bookmark size={18} /></span>
                  <span className="stat-label">Saved Collection</span>
                </div>
                <div className="stat-value">{savedIds.length}</div>
                <div className="stat-subtext">
                  <span className="stat-link-highlight">Bookmarked kits &amp; guides <ArrowRight size={12} /></span>
                </div>
              </div>

              <div className="dashboard-stat-card card-glow-green" onClick={() => setSection("profile")} role="button" tabIndex={0}>
                <div className="stat-card-head">
                  <span className="stat-icon-wrap"><Sparkles size={18} /></span>
                  <span className="stat-label">Engineering Focus</span>
                </div>
                <div className="stat-value">{interests.length || 0}</div>
                <div className="stat-subtext">
                  <span className="stat-link-highlight">Customized learning areas <ArrowRight size={12} /></span>
                </div>
              </div>
            </div>

            {/* Quick Access Shortcuts */}
            <section className="dashboard-home-section">
              <div className="dashboard-section-head">
                <div>
                  <h2>Quick Exploration</h2>
                  <p>Browse live engineering directories and hands-on kits.</p>
                </div>
              </div>
              <div className="dashboard-quick-grid">
                {quickAccess.map(({ label, description, page: destination, icon: Icon, tone }) => (
                  <button className={`dashboard-quick-card tone-${tone}`} key={label} type="button" onClick={() => navigate(destination)}>
                    <span className="dashboard-quick-icon"><Icon size={20} /></span>
                    <span className="dashboard-quick-copy"><strong>{label}</strong><small>{description}</small></span>
                    <span className="dashboard-quick-arrow"><ArrowUpRight size={15} /></span>
                  </button>
                ))}
              </div>
            </section>

            {/* Curated Recommendations with Full Image Placement and No Labels */}
            <section className="dashboard-home-section">
              <div className="dashboard-section-head">
                <div>
                  <h2>Curated for Your Profile</h2>
                  <p>Opportunities and hardware kits matched to {course || "your electronics journey"}.</p>
                </div>
                <button className="text-link" type="button" onClick={() => navigate("Projects")}>Explore all <ArrowRight size={15} /></button>
              </div>
              {recommendedListings.length > 0 ? (
                <div className="dashboard-recommend-grid">
                  {recommendedListings.map((listing) => {
                    const cardImg = listing.imageUrl || (
                      listing.kind === "Internships" ? internshipOpportunityImage :
                      listing.kind === "Hackathons" ? hackathonOpportunityImage :
                      listing.kind === "Training" ? (homeShowcaseImages[1] || internshipOpportunityImage) :
                      listing.kind === "Projects" ? (homeShowcaseImages[3] || internshipOpportunityImage) :
                      listing.kind === "Products" ? (homeShowcaseImages[5] || internshipOpportunityImage) :
                      (homeShowcaseImages[4] || internshipOpportunityImage)
                    );
                    return (
                      <article className="dashboard-recommend-card" key={listing.id}>
                        <div className="dashboard-recommend-image">
                          <img src={cardImg} alt={listing.title} loading="lazy" decoding="async" />
                        </div>
                        <div className="dashboard-recommend-content">
                          <div className="dashboard-recommend-meta">
                            <span className="dashboard-recommend-org">{listing.organization}</span>
                            {listing.city && <span className="dashboard-recommend-city">· {listing.city}</span>}
                          </div>
                          <h3>{listing.title}</h3>
                          <p>{listing.summary}</p>
                          <div className="dashboard-recommend-footer">
                            <button className="dashboard-recommend-link" type="button" onClick={() => onViewListing(listing)}>
                              View details <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state dashboard-empty"><div className="empty-icon"><Compass size={22} /></div><h3>More recommendations are on the way.</h3><p>Browse projects and learning opportunities to get started.</p><button className="button button-primary" type="button" onClick={() => navigate("Projects")}>Explore projects <ArrowRight size={15} /></button></div>
              )}
            </section>
          </>
        )}
        {/* SECTION: MY ORDERS & TRACKING */}
        {section === "orders" && (
          <section className="opportunity-activity-section">
            <div className="dashboard-section-head">
              <div>
                <span className="eyebrow"><span className="eyebrow-line" /> HARDWARE KIT ORDERS</span>
                <h2>My Orders &amp; Build Tracking</h2>
                <p>
                  Engineering projects are handcrafted and built to order (~7 days delivery). Follow your project through assembly, firmware flashing, testing, and courier delivery.
                </p>
              </div>
            </div>

            {selectedTrackingOrder ? (
              <div className="order-tracking-detail-card" style={{ background: "#FFFFFF", borderRadius: "16px", padding: "24px", border: "1px solid #E2E8F0", boxShadow: "0 4px 16px rgba(15,31,61,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className={`tracking-badge stage-${selectedTrackingOrder.tracking_status.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
                      {selectedTrackingOrder.tracking_status}
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#16A34A", background: "#DCFCE7", padding: "4px 10px", borderRadius: "999px" }}>
                      PAID via {selectedTrackingOrder.payment_method?.toLowerCase().includes("card") ? "Card" : "UPI"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid #F1F5F9", paddingBottom: "16px", marginBottom: "24px" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: "20px", color: "#0F1F3D", fontWeight: 800 }}>
                      Order #{selectedTrackingOrder.order_number || selectedTrackingOrder.id}
                    </h3>
                    <small style={{ color: "#64748B" }}>
                      Placed on {new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" }).format(new Date(selectedTrackingOrder.created_at))}
                    </small>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ display: "block", fontSize: "12px", color: "#64748B" }}>Expected Delivery</span>
                    <strong style={{ fontSize: "15px", color: "#F97316" }}>
                      {selectedTrackingOrder.expected_delivery_date
                        ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(selectedTrackingOrder.expected_delivery_date))
                        : "~7 days from order"}
                    </strong>
                  </div>
                </div>

                {/* Visual Step Timeline */}
                <div style={{ margin: "28px 0" }}>
                  <h4 style={{ fontSize: "14.5px", color: "#0F1F3D", fontWeight: 700, marginBottom: "16px" }}>
                    Production &amp; Tracking Stages
                  </h4>

                  <div className="tracking-timeline-stepper">
                    {(
                      [
                        { name: "Order Placed", icon: PackageCheck, desc: "Order registered in queue" },
                        { name: "Confirmed", icon: CheckCircle2, desc: "Kit configuration confirmed" },
                        { name: "Building (Processing)", icon: Cpu, desc: "PCB assembly & soldering" },
                        { name: "Testing / Quality Check", icon: Sparkles, desc: "Firmware flash & voltage test" },
                        { name: "Packed", icon: Package, desc: "Anti-static boxed with docs" },
                        { name: "Shipped", icon: Truck, desc: "Dispatched with courier partner" },
                        { name: "Delivered", icon: Home, desc: "Delivered to recipient" },
                      ] as { name: OrderTrackingStage; icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>; desc: string }[]
                    ).map((stage, idx, arr) => {
                      const allStageNames: OrderTrackingStage[] = [
                        "Order Placed",
                        "Confirmed",
                        "Building (Processing)",
                        "Testing / Quality Check",
                        "Packed",
                        "Shipped",
                        "Delivered",
                      ];
                      const currentIdx = allStageNames.indexOf(selectedTrackingOrder.tracking_status);
                      const isCompleted = idx < currentIdx;
                      const isCurrent = idx === currentIdx;
                      const StageIcon = stage.icon;

                      return (
                        <div
                          key={stage.name}
                          className={`tracking-timeline-step ${isCompleted ? "is-completed" : ""} ${isCurrent ? "is-current" : ""}`}
                        >
                          <div className="timeline-dot-wrapper">
                            <div className="timeline-dot">
                              {isCompleted ? <Check size={15} strokeWidth={2.8} /> : isCurrent ? <StageIcon size={15} strokeWidth={2.2} /> : <span>{idx + 1}</span>}
                            </div>
                            {idx < arr.length - 1 && <div className={`timeline-connector ${isCompleted ? "is-filled" : ""}`} />}
                          </div>
                          <div className="timeline-step-content">
                            <strong className="timeline-step-title">{stage.name}</strong>
                            <small className="timeline-step-desc">{stage.desc}</small>
                            {isCurrent && (
                              <span className="timeline-step-status-tag">
                                <span className="timeline-pulse-dot" /> Current Phase
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Engineer's public note if available */}
                {selectedTrackingOrder.public_notes && (
                  <div
                    style={{
                      background: "#FFF7ED",
                      border: "1px solid #FED7AA",
                      borderRadius: "12px",
                      padding: "16px",
                      marginBottom: "24px",
                      display: "flex",
                      gap: "12px",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ color: "#F97316", marginTop: "2px" }}><Sparkles size={18} /></div>
                    <div>
                      <strong style={{ fontSize: "13.5px", color: "#9A3412", display: "block", marginBottom: "2px" }}>
                        Workshop Engineer's Update
                      </strong>
                      <p style={{ margin: 0, fontSize: "13px", color: "#431407" }}>
                        {selectedTrackingOrder.public_notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Courier Shipping Details (if dispatched) */}
                {(selectedTrackingOrder.courier_name || selectedTrackingOrder.courier_tracking_number) && (
                  <div
                    style={{
                      background: "#F0FDF4",
                      border: "1px solid #BBF7D0",
                      borderRadius: "12px",
                      padding: "16px",
                      marginBottom: "24px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#166534", fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>
                        <Truck size={18} /> Dispatched via {selectedTrackingOrder.courier_name || "Courier"}
                      </div>
                      <p style={{ margin: 0, fontSize: "13px", color: "#14532D" }}>
                        Waybill / Tracking No: <strong>{selectedTrackingOrder.courier_tracking_number || "Awaiting scan"}</strong>
                      </p>
                    </div>
                    {selectedTrackingOrder.courier_tracking_url && (
                      <a
                        href={selectedTrackingOrder.courier_tracking_url}
                        target="_blank"
                        rel="noreferrer"
                        className="button button-primary button-small"
                        style={{ textDecoration: "none" }}
                      >
                        Track with Carrier <ArrowUpRight size={14} />
                      </a>
                    )}
                  </div>
                )}

                {/* Two-column layout: Items & Delivery Address */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                  <div style={{ background: "#F8FAFC", borderRadius: "12px", padding: "16px", border: "1px solid #E2E8F0" }}>
                    <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "#0F1F3D", fontWeight: 700 }}>
                      Items in this Order
                    </h4>
                    {selectedTrackingOrder.items.map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < selectedTrackingOrder.items.length - 1 ? "1px solid #E2E8F0" : "none", fontSize: "13px" }}>
                        <div>
                          <strong style={{ color: "#0F1F3D", display: "block" }}>{item.title}</strong>
                          <span style={{ color: "#64748B" }}>Qty: {item.qty}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: "#0F1F3D" }}>{formatRupee(item.price * item.qty)}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #E2E8F0", paddingTop: "10px", marginTop: "10px", fontSize: "14px" }}>
                      <strong>Total Paid</strong>
                      <strong style={{ color: "#F97316" }}>{formatRupee(selectedTrackingOrder.total_amount)}</strong>
                    </div>
                  </div>

                  <div style={{ background: "#F8FAFC", borderRadius: "12px", padding: "16px", border: "1px solid #E2E8F0" }}>
                    <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "#0F1F3D", fontWeight: 700 }}>
                      Delivery Address
                    </h4>
                    <p style={{ margin: "0 0 4px", fontSize: "13.5px", fontWeight: 600, color: "#0F1F3D" }}>
                      {selectedTrackingOrder.customer_name} ({selectedTrackingOrder.customer_phone})
                    </p>
                    <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#475569" }}>
                      {selectedTrackingOrder.shipping_address?.addressLine1}
                      {selectedTrackingOrder.shipping_address?.addressLine2 ? `, ${selectedTrackingOrder.shipping_address.addressLine2}` : ""}
                    </p>
                    <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
                      {selectedTrackingOrder.shipping_address?.city}, {selectedTrackingOrder.shipping_address?.state} - <strong>{selectedTrackingOrder.shipping_address?.pincode}</strong>
                    </p>
                  </div>
                </div>
              </div>
            ) : ordersLoading ? (
              <p className="profile-status" role="status">Loading your build-to-order projects…</p>
            ) : ordersError ? (
              <p className="admin-message profile-status" role="alert">{ordersError}</p>
            ) : studentOrders.length === 0 ? (
              <div className="empty-state dashboard-menu-empty">
                <div className="empty-icon"><PackageCheck size={24} /></div>
                <h3>No project orders yet.</h3>
                <p>
                  Ready-made engineering designs are built to order and delivered directly to your doorstep in about 7 days after payment.
                </p>
                <div className="dashboard-menu-actions">
                  <button className="button button-primary" type="button" onClick={() => navigate("Projects")}>
                    Browse Ready-Made Projects <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="student-orders-list" style={{ display: "grid", gap: "16px" }}>
                {studentOrders.map((order) => (
                  <article
                    key={order.id}
                    className="student-order-card"
                    style={{
                      background: "#FFFFFF",
                      borderRadius: "14px",
                      padding: "20px",
                      border: "1px solid #E2E8F0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "16px",
                      boxShadow: "0 2px 8px rgba(15,31,61,0.03)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: "240px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "15px", fontWeight: 800, color: "#0F1F3D" }}>
                          #{order.order_number || order.id}
                        </span>
                        <span className={`tracking-badge stage-${order.tracking_status.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
                          {order.tracking_status}
                        </span>
                      </div>
                      <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#334155" }}>
                        {order.items.map((it) => it.title).join(", ")}
                      </p>
                      <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#64748B", flexWrap: "wrap" }}>
                        <span>Ordered: {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(order.created_at))}</span>
                        <span>•</span>
                        <span>Expected Delivery: <strong style={{ color: "#F97316" }}>{order.expected_delivery_date ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(order.expected_delivery_date)) : "~7 days"}</strong></span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div style={{ textAlign: "right" }}>
                        <strong style={{ fontSize: "16px", color: "#0F1F3D", display: "block" }}>
                          {formatRupee(order.total_amount)}
                        </strong>
                        <small style={{ color: "#16A34A", fontWeight: 600 }}>PAID</small>
                      </div>
                      <button
                        type="button"
                        className="button button-primary button-small"
                        onClick={() => setSelectedTrackingOrder(order)}
                      >
                        Track Order <ArrowRight size={14} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {section === "applications" && !profileSetupRequired && (
          <section className="opportunity-activity-section">
            <div className="dashboard-section-head">
              <div>
                <span className="eyebrow"><span className="eyebrow-line" /> YOUR LEARNING JOURNEY</span>
                <h2>Applications &amp; enrollments</h2>
                <p>Track the opportunities you visited. Application status is based on your answer, not provider confirmation.</p>
              </div>
            </div>

            {opportunityActivities.length > 0 && (
              <div className="opportunity-filter-tabs" role="tablist" aria-label="Filter opportunities by kind">
                <button
                  type="button"
                  className={`filter-chip${activityFilter === "all" ? " active" : ""}`}
                  onClick={() => setActivityFilter("all")}
                >
                  All ({opportunityActivities.length})
                </button>
                <button
                  type="button"
                  className={`filter-chip${activityFilter === "Internships" ? " active" : ""}`}
                  onClick={() => setActivityFilter("Internships")}
                >
                  Internships ({opportunityActivities.filter((a) => a.opportunity_kind === "Internships").length})
                </button>
                <button
                  type="button"
                  className={`filter-chip${activityFilter === "Training" ? " active" : ""}`}
                  onClick={() => setActivityFilter("Training")}
                >
                  Training ({opportunityActivities.filter((a) => a.opportunity_kind === "Training").length})
                </button>
                <button
                  type="button"
                  className={`filter-chip${activityFilter === "Hackathons" ? " active" : ""}`}
                  onClick={() => setActivityFilter("Hackathons")}
                >
                  Hackathons ({opportunityActivities.filter((a) => a.opportunity_kind === "Hackathons").length})
                </button>
              </div>
            )}

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
            ) : filteredActivities.length === 0 ? (
              <div className="empty-state dashboard-menu-empty">
                <div className="empty-icon"><Compass size={23} /></div>
                <h3>No {activityFilter} activity found.</h3>
                <p>You haven't tracked any opportunities under this category yet.</p>
                <button className="button button-outline" type="button" onClick={() => setActivityFilter("all")}>Show all activity <ArrowRight size={14} /></button>
              </div>
            ) : (
              <div className="opportunity-activity-list">
                {filteredActivities.map((activity) => (
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
                      <button className="text-link" type="button" onClick={() => handleUpdateOpportunityActivity(activity, activity.status === "applied" ? "visited" : "applied")}>
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
            <div className="dashboard-menu-actions">
              <button className="button button-outline button-small" type="button" onClick={() => navigate("Saved")}>View bookmarks <ArrowRight size={14} /></button>
            </div>
          </div>
        )}
        {section === "settings" && !profileSetupRequired && (
          <div className="dashboard-settings-grid">
            <article className="dashboard-settings-card">
              <span className="dashboard-metric-icon"><Settings size={18} /></span>
              <span className="eyebrow"><span className="eyebrow-line" /> ACCOUNT SETTINGS</span>
              <h2>Keep your student details up to date.</h2>
              <p>Manage your profile information, academic details, and account email from your student profile.</p>
              <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                <button className="button button-primary button-small" type="button" onClick={() => setSection("profile")}>Open my profile <ArrowRight size={14} /></button>
                <button className="button button-outline button-small" type="button" onClick={signOut}><LogOut size={14} /> Sign out</button>
              </div>
            </article>
            <article className="dashboard-settings-card">
              <span className="dashboard-metric-icon"><LifeBuoy size={18} /></span>
              <span className="eyebrow"><span className="eyebrow-line" /> SUPPORT & RESOURCES</span>
              <h2>Find trusted learning resources.</h2>
              <p>Browse official documentation and learning references for electronics, embedded systems and IoT.</p>
              <div style={{ marginTop: "12px" }}>
                <button className="button button-outline button-small" type="button" onClick={() => navigate("Learn")}>Browse resources <ArrowRight size={14} /></button>
              </div>
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

type AdminSection = "overview" | "orders" | "opportunities" | "components" | "activity" | "profile";

interface AdminToast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

function AdminPage({ onExit }: { onExit: () => void }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSection, setAdminSection] = useState<AdminSection>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [toast, setToast] = useState<AdminToast | null>(null);

  // Opportunity state
  const [opportunityRows, setOpportunityRows] = useState<AdminOpportunityListing[]>([]);
  const [opportunityRowsLoading, setOpportunityRowsLoading] = useState(true);
  const [opportunityRowsError, setOpportunityRowsError] = useState("");
  const [opportunityRowsRefreshRevision, setOpportunityRowsRefreshRevision] = useState(0);
  const [oppSearch, setOppSearch] = useState("");
  const [oppKindFilter, setOppKindFilter] = useState<"all" | TrackableOpportunityKind>("all");
  const [oppStatusFilter, setOppStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [oppFormOpen, setOppFormOpen] = useState(false);
  const [editingOppId, setEditingOppId] = useState("");
  const [oppKind, setOppKind] = useState<TrackableOpportunityKind>("Internships");
  const [oppTitle, setOppTitle] = useState("");
  const [oppOrg, setOppOrg] = useState("");
  const [oppCity, setOppCity] = useState("");
  const [oppSummary, setOppSummary] = useState("");
  const [oppUrl, setOppUrl] = useState("");
  const [oppSaving, setOppSaving] = useState(false);

  // Component state
  const [productRows, setProductRows] = useState<Listing[]>([]);
  const [productRowsLoading, setProductRowsLoading] = useState(true);
  const [productRowsError, setProductRowsError] = useState("");
  const [productRowsRefreshRevision, setProductRowsRefreshRevision] = useState(0);
  const [compSearch, setCompSearch] = useState("");
  const [compFormOpen, setCompFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState("");
  const [compTitle, setCompTitle] = useState("");
  const [compOrg, setCompOrg] = useState("");
  const [compMpn, setCompMpn] = useState("");
  const [compCategory, setCompCategory] = useState("");
  const [compSummary, setCompSummary] = useState("");
  const [compImageUrl, setCompImageUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const compFileInputRef = useRef<HTMLInputElement>(null);
  const [offerDrafts, setOfferDrafts] = useState<[ComponentOfferDraft, ComponentOfferDraft]>([
    newComponentOfferDraft(),
    newComponentOfferDraft(),
  ]);
  const [compSaving, setCompSaving] = useState(false);

  // Student activity state
  const [opportunityActivities, setOpportunityActivities] = useState<AdminOpportunityActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [activityStatusFilter, setActivityStatusFilter] = useState<"all" | OpportunityActivityStatus>("all");
  const [activityKindFilter, setActivityKindFilter] = useState<"all" | TrackableOpportunityKind>("all");

  // Orders Management State
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersRevision, setOrdersRevision] = useState(0);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilterTab, setOrderFilterTab] = useState<
    "all" | "paid" | "new" | "building" | "shipped" | "delivered" | "cancelled" | "issues"
  >("all");
  const [orderDateRange, setOrderDateRange] = useState<"all" | "today" | "week" | "month">("all");
  const [selectedAdminOrder, setSelectedAdminOrder] = useState<AdminOrder | null>(null);
  const [stageUpdating, setStageUpdating] = useState(false);
  const [newStage, setNewStage] = useState<OrderTrackingStage>("Confirmed");
  const [stageNote, setStageNote] = useState("");
  const [courierNameInput, setCourierNameInput] = useState("");
  const [courierTrackingNumberInput, setCourierTrackingNumberInput] = useState("");
  const [courierTrackingUrlInput, setCourierTrackingUrlInput] = useState("");
  const [expectedDateInput, setExpectedDateInput] = useState("");
  const [internalNotesInput, setInternalNotesInput] = useState("");
  const [confirmDeliveredDialogOpen, setConfirmDeliveredDialogOpen] = useState(false);
  const [confirmCancelledDialogOpen, setConfirmCancelledDialogOpen] = useState(false);

  // Fetch admin orders from server (with auto-polling)
  useEffect(() => {
    if (!isAdmin) return;
    function fetchOrders() {
      fetch("/api/orders?role=admin", {
        headers: {
          "x-user-role": "admin",
        },
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("Could not fetch orders.");
          const text = await res.text();
          let data: any = {};
          try { data = text ? JSON.parse(text) : {}; } catch {}
          const serverOrders: AdminOrder[] = (data.orders || []).filter(
            (o: any) => o.admin_notes !== "deleted" && o.tracking_status !== "Deleted"
          );

          let localOrders: AdminOrder[] = [];
          try {
            const raw = localStorage.getItem("techcircuit_orders_store");
            if (raw) {
              const parsed: AdminOrder[] = JSON.parse(raw);
              localOrders = parsed.filter(
                (o: any) => o.admin_notes !== "deleted" && o.tracking_status !== "Deleted"
              );
            }
          } catch {}

          const orderMap = new Map<string, AdminOrder>();
          serverOrders.forEach((o) => orderMap.set(o.id, o));
          localOrders.forEach((o) => {
            if (!orderMap.has(o.id) && !(o.order_id && orderMap.has(o.order_id))) {
              orderMap.set(o.id, o);
            }
          });
          const merged = Array.from(orderMap.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setAdminOrders(merged);
        })
        .catch((err) => {
          console.warn("Could not load orders:", err);
          let localOrders: AdminOrder[] = [];
          try {
            const raw = localStorage.getItem("techcircuit_orders_store");
            if (raw) {
              const parsed: AdminOrder[] = JSON.parse(raw);
              localOrders = parsed.filter(
                (o: any) => o.admin_notes !== "deleted" && o.tracking_status !== "Deleted"
              );
            }
          } catch {}
          if (localOrders.length > 0) setAdminOrders(localOrders);
        })
        .finally(() => setOrdersLoading(false));
    }

    setOrdersLoading(true);
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [isAdmin, ordersRevision]);

  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        const elapsed = Date.now() - touchStartTime;

        if (deltaX > 60 && Math.abs(deltaY) < 80 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3 && elapsed < 600) {
          const target = e.target as HTMLElement | null;
          if (target && ["input", "textarea", "select"].includes(target.tagName.toLowerCase())) return;

          if (confirmDeliveredDialogOpen) {
            setConfirmDeliveredDialogOpen(false);
            return;
          }
          if (confirmCancelledDialogOpen) {
            setConfirmCancelledDialogOpen(false);
            return;
          }
          if (mobileMenuOpen) {
            setMobileMenuOpen(false);
            return;
          }
          if (selectedAdminOrder) {
            setSelectedAdminOrder(null);
            return;
          }
          if (oppFormOpen) {
            setOppFormOpen(false);
            return;
          }
          if (compFormOpen) {
            setCompFormOpen(false);
            return;
          }
          onExit();
        }
      }
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [
    confirmDeliveredDialogOpen,
    confirmCancelledDialogOpen,
    mobileMenuOpen,
    selectedAdminOrder,
    oppFormOpen,
    compFormOpen,
    onExit,
  ]);

  // Open single order in detail view
  function openOrderDetail(order: AdminOrder) {
    setSelectedAdminOrder(order);
    setNewStage(order.tracking_status);
    setStageNote("");
    setCourierNameInput(order.courier_name || "");
    setCourierTrackingNumberInput(order.courier_tracking_number || "");
    setCourierTrackingUrlInput(order.courier_tracking_url || "");
    setExpectedDateInput(order.expected_delivery_date ? order.expected_delivery_date.split("T")[0] : "");
    setInternalNotesInput(order.admin_notes || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Handle stage change submission
  async function submitStageUpdate(targetStage?: OrderTrackingStage) {
    if (!selectedAdminOrder) return;
    const stageToApply = targetStage || newStage;

    if (stageToApply === "Shipped" && (!courierNameInput.trim() || !courierTrackingNumberInput.trim())) {
      showToast("Courier Name and Tracking Number are required when marking as Shipped.", "error");
      return;
    }

    if (stageToApply === "Delivered" && !confirmDeliveredDialogOpen) {
      setConfirmDeliveredDialogOpen(true);
      return;
    }

    if (
      (selectedAdminOrder.tracking_status === "Cancelled" || selectedAdminOrder.tracking_status === "Refunded") &&
      !confirmCancelledDialogOpen
    ) {
      setConfirmCancelledDialogOpen(true);
      return;
    }

    setStageUpdating(true);
    try {
      const targetOrderId = selectedAdminOrder.id || selectedAdminOrder.order_id;
      const stagePayload = {
        order_id: targetOrderId,
        id: targetOrderId,
        to_stage: stageToApply,
        stage: stageToApply,
        note: stageNote.trim() || undefined,
        courier_name: courierNameInput.trim() || undefined,
        courier_tracking_number: courierTrackingNumberInput.trim() || undefined,
        tracking_number: courierTrackingNumberInput.trim() || undefined,
        courier_tracking_url: courierTrackingUrlInput.trim() || undefined,
        tracking_url: courierTrackingUrlInput.trim() || undefined,
        expected_delivery_date: expectedDateInput || undefined,
        admin_notes: internalNotesInput.trim() || undefined,
        internal_notes: internalNotesInput.trim() || undefined,
        changed_by: adminEmail || "Administrator",
        admin_name: adminEmail || "Administrator",
      };

      // 1. Direct Supabase update for immediate database persistence
      const client = supabase || getSupabase();
      if (client && targetOrderId) {
        try {
          const patchObj: Record<string, any> = {
            tracking_status: stageToApply,
            updated_at: new Date().toISOString(),
          };
          if (courierNameInput.trim()) patchObj.courier_name = courierNameInput.trim();
          if (courierTrackingNumberInput.trim()) patchObj.courier_tracking_number = courierTrackingNumberInput.trim();
          if (courierTrackingUrlInput.trim()) patchObj.courier_tracking_url = courierTrackingUrlInput.trim();
          if (expectedDateInput) patchObj.expected_delivery_date = expectedDateInput;
          if (internalNotesInput.trim()) patchObj.admin_notes = internalNotesInput.trim();

          await client.from("orders").update(patchObj).eq("id", targetOrderId);
          await client.from("order_status_history").insert({
            order_id: targetOrderId,
            from_stage: selectedAdminOrder.tracking_status,
            to_stage: stageToApply,
            changed_by: adminEmail || "Administrator",
            note: stageNote.trim() || `Stage updated to ${stageToApply}`,
            is_public: true,
          });
        } catch (sErr) {
          console.warn("Direct Supabase tracking update note:", sErr);
        }
      }

      // 2. Call serverless endpoint (/api/orders/stage) with fallback to (/api/orders)
      let apiReturnedOrder: AdminOrder | null = null;
      try {
        const res = await fetch("/api/orders/stage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stagePayload),
        });

        const rawText = await res.text();
        let data: any = null;
        try {
          data = rawText ? JSON.parse(rawText) : null;
        } catch {
          data = null;
        }

        if (!res.ok && data?.error) {
          throw new Error(data.error);
        }
        if (data?.order) {
          apiReturnedOrder = data.order;
        }
      } catch (apiErr) {
        // Fallback call to /api/orders
        try {
          const fallbackRes = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "update_stage", ...stagePayload }),
          });
          const fbText = await fallbackRes.text();
          let fbData: any = null;
          try {
            fbData = fbText ? JSON.parse(fbText) : null;
          } catch {}
          if (fbData?.order) apiReturnedOrder = fbData.order;
        } catch {}
      }

      // 3. Keep selected order updated without wiping out existing details
      const updatedOrderRecord: AdminOrder = apiReturnedOrder || {
        ...selectedAdminOrder,
        tracking_status: stageToApply,
        courier_name: courierNameInput.trim() || selectedAdminOrder.courier_name,
        courier_tracking_number: courierTrackingNumberInput.trim() || selectedAdminOrder.courier_tracking_number,
        courier_tracking_url: courierTrackingUrlInput.trim() || selectedAdminOrder.courier_tracking_url,
        expected_delivery_date: expectedDateInput || selectedAdminOrder.expected_delivery_date,
        admin_notes: internalNotesInput.trim() || selectedAdminOrder.admin_notes,
        updated_at: new Date().toISOString(),
      };

      // 4. Update localStorage cache
      try {
        const raw = localStorage.getItem("techcircuit_orders_store");
        if (raw) {
          const list: AdminOrder[] = JSON.parse(raw);
          const updated = list.map((ord) => {
            if (ord.id === selectedAdminOrder.id || ord.order_id === selectedAdminOrder.order_id) {
              return updatedOrderRecord;
            }
            return ord;
          });
          localStorage.setItem("techcircuit_orders_store", JSON.stringify(updated));
        }
      } catch {}

      showToast(`Order #${selectedAdminOrder.order_number} moved to ${stageToApply}`, "success");
      setConfirmDeliveredDialogOpen(false);
      setConfirmCancelledDialogOpen(false);
      setSelectedAdminOrder(updatedOrderRecord);
      setOrdersRevision((r) => r + 1);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update order stage.", "error");
    } finally {
      setStageUpdating(false);
    }
  }

  // Move to next sequential stage
  function moveToNextStage() {
    if (!selectedAdminOrder) return;
    const sequence: OrderTrackingStage[] = [
      "Order Placed",
      "Confirmed",
      "Building (Processing)",
      "Testing / Quality Check",
      "Packed",
      "Shipped",
      "Delivered",
    ];
    const currentIndex = sequence.indexOf(selectedAdminOrder.tracking_status);
    if (currentIndex >= 0 && currentIndex < sequence.length - 1) {
      const next = sequence[currentIndex + 1];
      setNewStage(next);
      if (next === "Shipped") {
        showToast("Please enter courier name and tracking number below.", "info");
      } else if (next === "Delivered") {
        setConfirmDeliveredDialogOpen(true);
      } else {
        submitStageUpdate(next);
      }
    }
  }

  // Copy address to clipboard
  function copyAddressToClipboard(order: AdminOrder) {
    const text = `${order.customer_name}\n${order.customer_phone}\n${order.shipping_address?.addressLine1 || ""}${order.shipping_address?.addressLine2 ? `, ${order.shipping_address.addressLine2}` : ""}\n${order.shipping_address?.city || ""}, ${order.shipping_address?.state || ""} - ${order.shipping_address?.pincode || ""}`;
    navigator.clipboard.writeText(text);
    showToast("Delivery address copied to clipboard!", "success");
  }

  // Delete a single order (test or obsolete)
  async function handleDeleteSingleOrder(orderId: string) {
    if (!window.confirm(`Are you sure you want to delete order ${orderId}? This will remove it from the admin console.`)) {
      return;
    }

    try {
      await fetch(`/api/orders?id=${encodeURIComponent(orderId)}`, {
        method: "DELETE",
        headers: {
          "x-user-role": "admin",
        },
      });
    } catch (e) {
      console.warn("Server delete call failed, falling back to local deletion:", e);
    }

    try {
      const raw = localStorage.getItem("techcircuit_orders_store");
      if (raw) {
        const list: AdminOrder[] = JSON.parse(raw);
        const filtered = list.filter((o) => o.id !== orderId && o.order_id !== orderId);
        localStorage.setItem("techcircuit_orders_store", JSON.stringify(filtered));
      }
    } catch {}

    setAdminOrders((prev) => prev.filter((o) => o.id !== orderId && o.order_id !== orderId));
    if (selectedAdminOrder && (selectedAdminOrder.id === orderId || selectedAdminOrder.order_id === orderId)) {
      setSelectedAdminOrder(null);
    }

    showToast(`Order ${orderId} removed.`, "success");
    setOrdersRevision((r) => r + 1);
  }

  // Clear all test orders for clean handover
  async function handleClearAllTestOrders() {
    if (!window.confirm("Are you sure you want to delete all test orders before handing over to the client? This will remove all orders permanently.")) {
      return;
    }

    try {
      await fetch("/api/orders?all=true", {
        method: "DELETE",
        headers: {
          "x-user-role": "admin",
        },
      });
    } catch (e) {
      console.warn("Server delete all call failed:", e);
    }

    try {
      localStorage.removeItem("techcircuit_orders_store");
    } catch {}

    setAdminOrders([]);
    setSelectedAdminOrder(null);
    showToast("All test orders deleted successfully. Ready for client handover!", "success");
    setOrdersRevision((r) => r + 1);
  }

  // Check if order is overdue
  function isOrderOverdue(order: AdminOrder): boolean {
    if (
      order.payment_status !== "PAID" ||
      order.tracking_status === "Delivered" ||
      order.tracking_status === "Cancelled" ||
      order.tracking_status === "Refunded"
    ) {
      return false;
    }
    if (!order.expected_delivery_date) return false;
    return new Date(order.expected_delivery_date).getTime() < Date.now();
  }

  // Summary counts
  const newOrdersCount = adminOrders.filter(
    (o) => o.payment_status === "PAID" && (o.tracking_status === "Order Placed" || o.tracking_status === "Confirmed")
  ).length;
  const inBuildOrdersCount = adminOrders.filter(
    (o) =>
      o.payment_status === "PAID" &&
      (o.tracking_status === "Building (Processing)" ||
        o.tracking_status === "Testing / Quality Check" ||
        o.tracking_status === "Packed")
  ).length;
  const shippedOrdersCount = adminOrders.filter(
    (o) => o.payment_status === "PAID" && o.tracking_status === "Shipped"
  ).length;
  const deliveredOrdersCount = adminOrders.filter(
    (o) => o.payment_status === "PAID" && o.tracking_status === "Delivered"
  ).length;

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return adminOrders
      .filter((order) => {
        if (orderFilterTab === "paid" && order.payment_status !== "PAID") return false;
        if (
          orderFilterTab === "new" &&
          (order.payment_status !== "PAID" ||
            (order.tracking_status !== "Order Placed" && order.tracking_status !== "Confirmed"))
        )
          return false;
        if (
          orderFilterTab === "building" &&
          (order.payment_status !== "PAID" ||
            (order.tracking_status !== "Building (Processing)" &&
              order.tracking_status !== "Testing / Quality Check" &&
              order.tracking_status !== "Packed"))
        )
          return false;
        if (orderFilterTab === "shipped" && (order.payment_status !== "PAID" || order.tracking_status !== "Shipped"))
          return false;
        if (orderFilterTab === "delivered" && (order.payment_status !== "PAID" || order.tracking_status !== "Delivered"))
          return false;
        if (orderFilterTab === "cancelled" && order.tracking_status !== "Cancelled" && order.tracking_status !== "Refunded")
          return false;
        if (orderFilterTab === "issues" && order.payment_status !== "PENDING" && order.payment_status !== "FAILED")
          return false;

        if (orderDateRange !== "all") {
          const orderDate = new Date(order.created_at).getTime();
          const now = Date.now();
          if (orderDateRange === "today" && now - orderDate > 24 * 60 * 60 * 1000) return false;
          if (orderDateRange === "week" && now - orderDate > 7 * 24 * 60 * 60 * 1000) return false;
          if (orderDateRange === "month" && now - orderDate > 30 * 24 * 60 * 60 * 1000) return false;
        }

        if (orderSearch.trim()) {
          const q = orderSearch.toLowerCase();
          const matchId = (order.order_number || order.id).toLowerCase().includes(q);
          const matchName = (order.customer_name || "").toLowerCase().includes(q);
          const matchEmail = (order.customer_email || "").toLowerCase().includes(q);
          const matchPhone = (order.customer_phone || "").toLowerCase().includes(q);
          const matchProjects = order.items.some((it) => it.title.toLowerCase().includes(q));
          if (!matchId && !matchName && !matchEmail && !matchPhone && !matchProjects) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [adminOrders, orderFilterTab, orderDateRange, orderSearch]);

  // CSV Export
  function exportOrdersCsv() {
    if (filteredOrders.length === 0) {
      showToast("No orders available to export.", "info");
      return;
    }
    const headers = [
      "Order ID",
      "Order Date",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Projects",
      "Total Amount",
      "Payment Status",
      "Tracking Stage",
      "Expected Delivery",
      "Courier",
      "Tracking Number",
      "Address",
    ];
    const rows = filteredOrders.map((o) => [
      `"${o.order_number || o.id}"`,
      `"${new Date(o.created_at).toLocaleDateString()}"`,
      `"${(o.customer_name || "").replace(/"/g, '""')}"`,
      `"${o.customer_email || ""}"`,
      `"${o.customer_phone || ""}"`,
      `"${(o.items.map((i) => i.title).join("; ") || "").replace(/"/g, '""')}"`,
      o.total_amount,
      o.payment_status,
      o.tracking_status,
      `"${o.expected_delivery_date || ""}"`,
      `"${o.courier_name || ""}"`,
      `"${o.courier_tracking_number || ""}"`,
      `"${(o.shipping_address?.addressLine1 + ", " + o.shipping_address?.city + ", " + o.shipping_address?.state + " " + o.shipping_address?.pincode).replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `techcircuit-orders-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Orders CSV exported successfully.", "success");
  }

  function showToast(message: string, type: "success" | "error" | "info" = "info") {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4500);
  }

  // Restore session
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    async function restoreAdminSession() {
      try {
        const { data, error } = await client.auth.getSession();
        if (error) {
          setAuthError(`Could not restore session: ${error.message}`);
          return;
        }
        if (data.session) {
          const authorized = await checkAdmin(client, data.session.user.id, setIsAdmin, setAuthError);
          if (authorized) {
            setAdminEmail(data.session.user.email ?? "");
          }
        }
      } catch {
        setAuthError("Could not restore the admin session.");
      }
    }
    void restoreAdminSession();
  }, [supabase]);

  // Load Component Listings
  useEffect(() => {
    if (!supabase || !isAdmin) return;
    let active = true;
    setProductRowsLoading(true);
    setProductRowsError("");
    loadAdminComponentListings(supabase)
      .then((rows) => {
        if (active) setProductRows(rows);
      })
      .catch((error: unknown) => {
        if (active) setProductRowsError(error instanceof Error ? error.message : "Could not load component catalog.");
      })
      .finally(() => {
        if (active) setProductRowsLoading(false);
      });
    return () => { active = false; };
  }, [supabase, isAdmin, productRowsRefreshRevision]);

  // Load Opportunity Activities
  useEffect(() => {
    if (!supabase || !isAdmin) return;
    let active = true;
    setActivityLoading(true);
    setActivityError("");
    loadAdminOpportunityActivities(supabase)
      .then((activities) => {
        if (active) setOpportunityActivities(activities);
      })
      .catch((error: unknown) => {
        if (active) setActivityError(error instanceof Error ? error.message : "Could not load student opportunity activity.");
      })
      .finally(() => {
        if (active) setActivityLoading(false);
      });
    return () => { active = false; };
  }, [supabase, isAdmin]);

  // Load Opportunity Listings
  useEffect(() => {
    if (!supabase || !isAdmin) return;
    let active = true;
    setOpportunityRowsLoading(true);
    setOpportunityRowsError("");
    loadAdminOpportunityListings(supabase)
      .then((rows) => {
        if (active) setOpportunityRows(rows);
      })
      .catch((error: unknown) => {
        if (active) setOpportunityRowsError(error instanceof Error ? error.message : "Could not load opportunity listings.");
      })
      .finally(() => {
        if (active) setOpportunityRowsLoading(false);
      });
    return () => { active = false; };
  }, [supabase, isAdmin, opportunityRowsRefreshRevision]);

  // Sign in
  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setAuthError("");
    setAuthBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError(`Sign-in failed: ${error.message}`);
        return;
      }
      const authorized = await checkAdmin(supabase, data.user.id, setIsAdmin, setAuthError);
      if (authorized) {
        setAdminEmail(data.user.email ?? "");
        setAdminSection("overview");
        showToast("Authenticated as Administrator.", "success");
      } else {
        await supabase.auth.signOut();
        setAuthError("This account does not have database administrator privileges.");
      }
    } catch {
      setAuthError("An unexpected error occurred during sign in.");
    } finally {
      setAuthBusy(false);
    }
  }

  // Sign out
  async function signOut() {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        showToast(`Sign-out failed: ${error.message}`, "error");
      } else {
        setIsAdmin(false);
        setAdminEmail("");
        showToast("You have been signed out.", "info");
        onExit();
      }
    } catch {
      showToast("Could not complete sign out.", "error");
    }
  }

  // Toggle opportunity publication
  async function toggleOpportunityPublication(listing: AdminOpportunityListing) {
    if (!supabase || !isAdmin) return;
    const nextPublished = !listing.isPublished;
    try {
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
        showToast(`Could not update opportunity: ${error.message}`, "error");
        return;
      }

      setOpportunityRows((rows) =>
        rows.map((row) => (row.id === listing.id ? { ...row, isPublished: nextPublished } : row))
      );
      showToast(nextPublished ? `Published: "${listing.title}"` : `Unpublished: "${listing.title}"`, "success");
      setOpportunityRowsRefreshRevision((r) => r + 1);
      window.dispatchEvent(new Event("techcircuit:listings-updated"));
    } catch {
      showToast("Error toggling opportunity publication.", "error");
    }
  }

  // Delete opportunity
  async function deleteOpportunity(listing: AdminOpportunityListing) {
    if (!supabase || !isAdmin) return;
    if (!window.confirm(`Are you sure you want to permanently delete "${listing.title}"?`)) return;

    try {
      const { error } = await supabase.from("listings").delete().eq("id", listing.id);
      if (error) {
        showToast(`Could not delete opportunity: ${error.message}`, "error");
        return;
      }
      setOpportunityRows((rows) => rows.filter((row) => row.id !== listing.id));
      showToast(`Deleted "${listing.title}"`, "success");
      setOpportunityRowsRefreshRevision((r) => r + 1);
      window.dispatchEvent(new Event("techcircuit:listings-updated"));
    } catch {
      showToast("Error deleting opportunity.", "error");
    }
  }

  // Start create opportunity
  function startCreateOpportunity() {
    setEditingOppId("");
    setOppKind("Internships");
    setOppTitle("");
    setOppOrg("");
    setOppCity("");
    setOppSummary("");
    setOppUrl("");
    setOppFormOpen(true);
  }

  // Start edit opportunity
  function startEditOpportunity(listing: AdminOpportunityListing) {
    setEditingOppId(listing.id);
    setOppKind(listing.kind);
    setOppTitle(listing.title);
    setOppOrg(listing.organization);
    setOppCity(listing.city);
    setOppSummary(listing.summary);
    setOppUrl(listing.sourceUrl);
    setOppFormOpen(true);
    window.scrollTo({ top: 120, behavior: "smooth" });
  }

  // Save opportunity
  async function saveOpportunity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !isAdmin) return;

    const validatedUrl = safeExternalUrl(oppUrl.trim());
    if (!oppTitle.trim() || !oppOrg.trim() || !oppCity.trim() || !oppSummary.trim() || !validatedUrl) {
      showToast("Please enter all required fields with a valid https:// URL.", "error");
      return;
    }

    setOppSaving(true);
    try {
      const oppPayload = {
        kind: oppKind,
        title: oppTitle.trim(),
        organization: oppOrg.trim(),
        city: oppCity.trim(),
        summary: oppSummary.trim(),
        source_url: validatedUrl,
        tags: [],
        verification_status: "source-linked",
        verified: false,
        is_published: true,
        is_expired: false,
        updated_at: new Date().toISOString(),
      };

      if (editingOppId) {
        const { error } = await supabase.from("listings").update(oppPayload).eq("id", editingOppId);
        if (error) throw error;
        showToast(`Updated opportunity: "${oppTitle.trim()}"`, "success");
      } else {
        const { error } = await supabase.from("listings").insert(oppPayload);
        if (error) throw error;
        showToast(`Created and published: "${oppTitle.trim()}"`, "success");
      }

      setOppFormOpen(false);
      setEditingOppId("");
      setOppTitle("");
      setOppOrg("");
      setOppCity("");
      setOppSummary("");
      setOppUrl("");
      setOpportunityRowsRefreshRevision((r) => r + 1);
      window.dispatchEvent(new Event("techcircuit:listings-updated"));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save opportunity.", "error");
    } finally {
      setOppSaving(false);
    }
  }

  // Start create component
  function startCreateComponent() {
    setEditingProductId("");
    setCompTitle("");
    setCompOrg("");
    setCompMpn("");
    setCompCategory("");
    setCompSummary("");
    setCompImageUrl("");
    setShowUrlInput(false);
    setImageUploading(false);
    setOfferDrafts([newComponentOfferDraft(), newComponentOfferDraft()]);
    setCompFormOpen(true);
  }

  // Start edit component
  function startEditComponent(id: string) {
    const product = productRows.find((item) => item.id === id);
    const details = product?.componentDetails;
    if (!product || !details) return;

    setEditingProductId(id);
    setCompTitle(product.title);
    setCompOrg(product.organization);
    setCompSummary(product.summary);
    setCompMpn(details.mpn);
    setCompCategory(details.category);
    setCompImageUrl(details.imageUrl);
    setShowUrlInput(Boolean(details.imageUrl && (details.imageUrl.startsWith("http") || details.imageUrl.startsWith("/"))));
    setImageUploading(false);
    setOfferDrafts([
      componentOfferToDraft(details.offers[0]),
      componentOfferToDraft(details.offers[1]),
    ]);
    setCompFormOpen(true);
    window.scrollTo({ top: 120, behavior: "smooth" });
  }

  // Handle image upload from Gallery or device file picker
  async function handleImageFileSelect(file: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please choose a valid image file (PNG, JPG, JPEG, WEBP, SVG, GIF, etc.).", "error");
      return;
    }
    setImageUploading(true);
    try {
      if (file.type === "image/svg+xml" || file.size < 400 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          setCompImageUrl(reader.result as string);
          setImageUploading(false);
          showToast("Image loaded from gallery.", "success");
        };
        reader.onerror = () => {
          setImageUploading(false);
          showToast("Could not read image file.", "error");
        };
        reader.readAsDataURL(file);
        return;
      }

      // For larger images, optimize/compress via HTML5 Canvas
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setCompImageUrl(reader.result as string);
            setImageUploading(false);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const output = canvas.toDataURL("image/webp", 0.88);
          setCompImageUrl(output);
          setImageUploading(false);
          showToast("Image optimized and loaded from gallery.", "success");
        };
        img.onerror = () => {
          setImageUploading(false);
          showToast("Could not process selected image.", "error");
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        setImageUploading(false);
        showToast("Could not read image file.", "error");
      };
      reader.readAsDataURL(file);
    } catch {
      setImageUploading(false);
      showToast("Image loading error.", "error");
    }
  }

  // Delete component
  async function deleteComponent(product: Listing) {
    if (!supabase || !isAdmin) return;
    if (!window.confirm(`Permanently remove "${product.title}" (${product.componentDetails?.mpn}) from catalog?`)) return;

    try {
      try {
        await supabase.from("listings").delete().eq("id", product.id);
      } catch (dbErr) {
        console.warn("Direct Supabase product delete note:", dbErr);
      }
      // Also delete from local custom storage
      const customList = getLocalCustomComponents().filter((x) => x.id !== product.id && x.title !== product.title);
      localStorage.setItem("techcircuit:custom_components", JSON.stringify(customList));

      setProductRows((rows) => rows.filter((r) => r.id !== product.id));
      showToast(`Removed "${product.title}" from catalog.`, "success");
      setProductRowsRefreshRevision((r) => r + 1);
      window.dispatchEvent(new Event("techcircuit:listings-updated"));
    } catch {
      showToast("Error deleting component.", "error");
    }
  }

  // Save component
  async function saveComponent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !isAdmin) return;

    const enteredOffers = offerDrafts.filter((offer) =>
      Boolean(offer.seller.trim() || offer.price.trim() || offer.sellerUrl.trim())
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

    const invalidOffer = normalizedOffers.some(
      (offer) =>
        !offer.seller ||
        !Number.isFinite(offer.price) ||
        offer.price <= 0 ||
        !/^[A-Z]{3}$/.test(offer.currency) ||
        !Number.isInteger(offer.quantity) ||
        offer.quantity < 1 ||
        (offer.stock !== null && (!Number.isInteger(offer.stock) || offer.stock < 0)) ||
        (offer.moq !== null && (!Number.isInteger(offer.moq) || offer.moq < 1)) ||
        !offer.sellerUrl ||
        !offer.checkedAt
    );

    if (!compTitle.trim() || !compOrg.trim() || !compSummary.trim() || !compMpn.trim() || normalizedOffers.length === 0 || invalidOffer) {
      showToast("Complete all component details and at least one seller offer with valid price, currency, and URL.", "error");
      return;
    }

    const cleanImgUrl = safeImageUrl(compImageUrl.trim());
    if (compImageUrl.trim() && !cleanImgUrl) {
      showToast("Please provide a valid image from gallery or a valid URL/path.", "error");
      return;
    }

    setCompSaving(true);
    try {
      const productValues = {
        kind: "Products" as const,
        title: compTitle.trim(),
        organization: compOrg.trim(),
        city: "Online",
        summary: compSummary.trim(),
        source_url: normalizedOffers[0].sellerUrl,
        tags: compCategory.trim() ? [compCategory.trim()] : [],
        details: {
          mpn: compMpn.trim(),
          category: compCategory.trim(),
          imageUrl: cleanImgUrl,
          offers: normalizedOffers,
        },
        verification_status: "verified",
        verified: true,
        is_published: true,
        is_expired: false,
        updated_at: new Date().toISOString(),
      };

      try {
        if (editingProductId) {
          await supabase.from("listings").update(productValues).eq("id", editingProductId);
        } else {
          await supabase.from("listings").insert(productValues);
        }
      } catch (dbErr) {
        console.warn("Direct Supabase product insert note:", dbErr);
      }

      // Also persist to custom local storage
      const customList = getLocalCustomComponents();
      const targetId = editingProductId || ("local-comp-" + Date.now());
      const customItem: Listing = {
        id: targetId,
        kind: "Products",
        title: compTitle.trim(),
        organization: compOrg.trim(),
        city: "Online",
        summary: compSummary.trim(),
        tags: compCategory.trim() ? [compCategory.trim()] : [],
        sourceUrl: normalizedOffers[0].sellerUrl,
        verified: true,
        featured: false,
        updated: new Date().toISOString(),
        componentDetails: {
          mpn: compMpn.trim(),
          category: compCategory.trim(),
          imageUrl: cleanImgUrl,
          offers: normalizedOffers,
        },
      };

      const updatedCustom = editingProductId
        ? customList.map((x) => (x.id === editingProductId ? customItem : x))
        : [customItem, ...customList];
      localStorage.setItem("techcircuit:custom_components", JSON.stringify(updatedCustom));

      setCompFormOpen(false);
      setEditingProductId("");
      setCompTitle("");
      setCompOrg("");
      setCompMpn("");
      setCompCategory("");
      setCompSummary("");
      setCompImageUrl("");
      setShowUrlInput(false);
      setImageUploading(false);
      setOfferDrafts([newComponentOfferDraft(), newComponentOfferDraft()]);
      setProductRowsRefreshRevision((r) => r + 1);
      window.dispatchEvent(new Event("techcircuit:listings-updated"));
      showToast(editingProductId ? "Component and seller offers updated." : "Component added to comparison catalog.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save component.", "error");
    } finally {
      setCompSaving(false);
    }
  }

  // Update offer field
  function updateOfferDraft(index: number, field: keyof ComponentOfferDraft, value: string) {
    setOfferDrafts((current) =>
      index === 0
        ? [{ ...current[0], [field]: value }, current[1]]
        : [current[0], { ...current[1], [field]: value }]
    );
  }

  // Filtered lists
  const filteredOpportunities = useMemo(() => {
    return opportunityRows.filter((item) => {
      if (oppKindFilter !== "all" && item.kind !== oppKindFilter) return false;
      if (oppStatusFilter === "published" && !item.isPublished) return false;
      if (oppStatusFilter === "draft" && item.isPublished) return false;
      if (oppSearch.trim()) {
        const query = oppSearch.toLowerCase();
        const text = `${item.title} ${item.organization} ${item.city} ${item.summary}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }, [opportunityRows, oppKindFilter, oppStatusFilter, oppSearch]);

  const filteredComponents = useMemo(() => {
    return productRows.filter((item) => {
      if (!compSearch.trim()) return true;
      const query = compSearch.toLowerCase();
      const details = item.componentDetails;
      const text = `${item.title} ${item.organization} ${details?.mpn ?? ""} ${details?.category ?? ""} ${item.summary}`.toLowerCase();
      return text.includes(query);
    });
  }, [productRows, compSearch]);

  const filteredActivities = useMemo(() => {
    return opportunityActivities.filter((act) => {
      if (activityStatusFilter !== "all" && act.status !== activityStatusFilter) return false;
      if (activityKindFilter !== "all" && act.opportunity_kind !== activityKindFilter) return false;
      if (activitySearch.trim()) {
        const query = activitySearch.toLowerCase();
        const text = `${act.student_name} ${act.institution} ${act.course} ${act.title} ${act.organization}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }, [opportunityActivities, activityStatusFilter, activityKindFilter, activitySearch]);

  const publishedOppCount = opportunityRows.filter((r) => r.isPublished).length;
  const draftOppCount = opportunityRows.filter((r) => !r.isPublished).length;
  const appliedCount = opportunityActivities.filter((a) => a.status === "applied").length;
  const visitedCount = opportunityActivities.filter((a) => a.status === "visited").length;

  return (
    <div className="admin-app">
      {/* Toast Notification */}
      {toast && (
        <div className={`admin-toast-float admin-toast-${toast.type}`} role="alert">
          <div className="admin-toast-icon">
            {toast.type === "success" && <CheckCircle2 size={18} />}
            {toast.type === "error" && <AlertCircle size={18} />}
            {toast.type === "info" && <CircleHelp size={18} />}
          </div>
          <span className="admin-toast-text">{toast.message}</span>
          <button className="admin-toast-dismiss" onClick={() => setToast(null)} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}

      {!supabase ? (
        <div className="admin-login-screen">
          <div className="admin-login-card">
            <div className="admin-login-center-logo">
              <img className="admin-center-logo" src={brandLogo} alt={PLATFORM_NAME} />
            </div>
            <div className="admin-login-body">
              <div className="admin-login-icon">
                <ShieldCheck size={30} />
              </div>
              <span className="eyebrow"><span className="eyebrow-line" /> CONFIGURATION REQUIRED</span>
              <h2>Supabase Database Connection</h2>
              <p>Admin sign-in and data management require Supabase project credentials in your local environment file.</p>
              <div className="env-block">
                <code>VITE_SUPABASE_URL=your-project-url</code>
                <code>VITE_SUPABASE_ANON_KEY=your-anon-key</code>
              </div>
            </div>
          </div>
        </div>
      ) : !isAdmin ? (
        <div className="admin-login-screen">
          <div className="admin-login-card">
            <div className="admin-login-center-logo">
              <img className="admin-center-logo" src={brandLogo} alt={PLATFORM_NAME} />
            </div>
            <div className="admin-login-body">
              <div className="admin-login-badge">
                <Lock size={14} />
                <span>ADMIN CONSOLE</span>
              </div>
              <h2>Admin Console Sign In</h2>
              <p>Sign in with your database-authorized administrator account.</p>

              {authError && (
                <div className="admin-alert-banner" role="alert">
                  <AlertCircle size={18} />
                  <span>{authError}</span>
                  <button type="button" onClick={() => setAuthError("")} aria-label="Dismiss error">
                    <X size={14} />
                  </button>
                </div>
              )}

              <form onSubmit={signIn} className="admin-login-form">
                <div className="admin-input-group">
                  <label htmlFor="admin-email">Administrator Email</label>
                  <div className="admin-input-wrapper">
                    <Mail size={17} className="admin-field-icon" />
                    <input
                      id="admin-email"
                      type="email"
                      autoComplete="username"
                      required
                      placeholder="admin@techcircuithub.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="admin-input-group">
                  <label htmlFor="admin-password">Secure Password</label>
                  <div className="admin-input-wrapper">
                    <Lock size={17} className="admin-field-icon" />
                    <input
                      id="admin-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="admin-field-action"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button className="button button-dark admin-submit-btn" type="submit" disabled={authBusy}>
                  {authBusy ? (
                    <>
                      <RefreshCw size={16} className="spin-icon" /> Verifying Credentials…
                    </>
                  ) : (
                    <>
                      Sign In to Console <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="admin-login-footer">
                <div className="admin-db-status">
                  <span className="live-dot" /> Database Connected (Supabase RLS Active)
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-layout">
          {mobileMenuOpen && (
            <button
              className="admin-drawer-backdrop"
              type="button"
              aria-label="Close admin menu"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          {/* Elevated Modern Sidebar */}
          <aside className={`admin-sidebar${mobileMenuOpen ? " mobile-open" : ""}`}>
            <div className="admin-sidebar-header">
              <button className="admin-sidebar-brand" type="button" onClick={() => setAdminSection("overview")}>
                <img className="brand-logo" src={brandLogo} alt={PLATFORM_NAME} />
                <div className="admin-brand-chip">
                  <span>ADMIN HQ</span>
                  <span className="admin-version-pill">v2.4</span>
                </div>
              </button>
            </div>

            <div className="admin-sidebar-nav-container">
              <div className="admin-sidebar-label">WORKSPACE</div>
              <nav id="admin-dashboard-navigation" className="admin-side-nav" aria-label="Admin dashboard">
                {[
                  { id: "overview", label: "Overview", icon: LayoutDashboard },
                  {
                    id: "orders",
                    label: "Orders & Tracking",
                    icon: PackageCheck,
                    count: adminOrders.filter(
                      (o) =>
                        o.payment_status === "PAID" &&
                        o.tracking_status !== "Delivered" &&
                        o.tracking_status !== "Cancelled" &&
                        o.tracking_status !== "Refunded"
                    ).length,
                  },
                  {
                    id: "opportunities",
                    label: "Opportunities",
                    icon: BriefcaseBusiness,
                    count: opportunityRows.length,
                  },
                  {
                    id: "components",
                    label: "Component Catalog",
                    icon: Cpu,
                    count: productRows.length,
                  },
                  {
                    id: "activity",
                    label: "Student Activity",
                    icon: Activity,
                    count: opportunityActivities.length,
                  },
                ].map(({ id, label, icon: Icon, count }) => (
                  <button
                    className={`admin-side-link ${adminSection === id ? "active" : ""}`}
                    key={id}
                    type="button"
                    onClick={() => {
                      setAdminSection(id as AdminSection);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Icon size={18} />
                    <span className="admin-link-title">{label}</span>
                    {typeof count === "number" && count > 0 && (
                      <span className="admin-side-count">{count}</span>
                    )}
                  </button>
                ))}
              </nav>

              <div className="admin-sidebar-label" style={{ marginTop: 24 }}>ACCOUNT & SYSTEM</div>
              <nav className="admin-side-nav" aria-label="Account navigation">
                <button
                  className={`admin-side-link ${adminSection === "profile" ? "active" : ""}`}
                  type="button"
                  onClick={() => {
                    setAdminSection("profile");
                    setMobileMenuOpen(false);
                  }}
                >
                  <UserCog size={18} />
                  <span className="admin-link-title">Admin Profile</span>
                </button>
              </nav>
            </div>

            <div className="admin-sidebar-bottom">
              <div className="admin-user-card">
                <div className="admin-user-avatar">
                  <UserRound size={18} />
                </div>
                <div className="admin-user-meta">
                  <strong>Administrator</strong>
                  <small title={adminEmail}>{adminEmail || "admin"}</small>
                </div>
              </div>
              <div className="admin-user-actions">
                <button
                  className="admin-side-link admin-back-site"
                  type="button"
                  onClick={onExit}
                  title="Return to the student catalog"
                >
                  <ArrowLeft size={16} />
                  <span>Exit Console</span>
                </button>
                <button
                  className="admin-side-link admin-logout"
                  type="button"
                  onClick={() => void signOut()}
                  title="Sign out of admin session"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Main Dashboard Canvas */}
          <section className="admin-main">
            {/* Topbar */}
            <header className="admin-topbar">
              <div className="admin-topbar-start">
                <button
                  className="admin-menu-toggle"
                  type="button"
                  aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                  aria-expanded={mobileMenuOpen}
                  onClick={() => setMobileMenuOpen((open) => !open)}
                >
                  {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
                </button>
                <div className="admin-breadcrumbs">
                  <span className="admin-crumb-parent">Console</span>
                  <span className="admin-crumb-sep">/</span>
                  <h1 className="admin-crumb-current">
                    {adminSection === "overview" && "Executive Overview"}
                    {adminSection === "orders" && "Hardware Kit Orders & Tracking"}
                    {adminSection === "opportunities" && "Opportunity Management"}
                    {adminSection === "components" && "Component Catalog & Offers"}
                    {adminSection === "activity" && "Student Activity Tracker"}
                    {adminSection === "profile" && "Administrator Profile"}
                  </h1>
                </div>
              </div>

              <div className="admin-topbar-end">
                <button
                  className="button button-outline button-small admin-preview-btn"
                  type="button"
                  onClick={onExit}
                  title="Open the student-facing catalog"
                >
                  <ExternalLink size={14} />
                  <span>Preview Website</span>
                </button>
              </div>
            </header>

            {/* View Container */}
            <div className="admin-content admin-view">
              {/* SECTION: OVERVIEW */}
              {adminSection === "overview" && (
                <section className="admin-overview-view">
                  {/* Executive Hero Banner */}
                  <div className="admin-hero-banner">
                    <div className="admin-hero-content">
                      <div className="admin-hero-eyebrow">
                        <Sparkles size={15} />
                        <span>TECHCIRCUIT COMMAND CENTER</span>
                      </div>
                      <h2>
                        {(() => {
                          const hour = new Date().getHours();
                          if (hour < 12) return "Good morning";
                          if (hour < 17) return "Good afternoon";
                          return "Good evening";
                        })()}
                        , Administrator.
                      </h2>
                      <p>
                        Real-time hub for student internships, corporate training, hackathons, and electronics component price intelligence.
                      </p>
                      <div className="admin-hero-actions">
                        <button
                          className="button button-primary"
                          type="button"
                          onClick={() => {
                            setAdminSection("opportunities");
                            startCreateOpportunity();
                          }}
                        >
                          <Plus size={16} /> New Opportunity
                        </button>
                        <button
                          className="button button-outline admin-hero-outline-btn"
                          type="button"
                          onClick={() => {
                            setAdminSection("components");
                            startCreateComponent();
                          }}
                        >
                          <Plus size={16} /> Add Component
                        </button>
                        <button
                          className="button button-outline admin-hero-outline-btn"
                          type="button"
                          onClick={() => setAdminSection("activity")}
                        >
                          <Activity size={16} /> View Activity Feed
                        </button>
                      </div>
                    </div>
                    <div className="admin-hero-graphic">
                      <CircuitBoard size={96} className="circuit-accent" />
                    </div>
                  </div>

                  {/* 4 Interactive KPI Metric Cards */}
                  <div className="admin-kpi-grid">
                    <div
                      className="admin-kpi-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => setAdminSection("opportunities")}
                    >
                      <div className="admin-kpi-header">
                        <span className="admin-kpi-title">OPPORTUNITIES</span>
                        <div className="admin-kpi-icon icon-cyan">
                          <BriefcaseBusiness size={20} />
                        </div>
                      </div>
                      <div className="admin-kpi-metric">{opportunityRows.length}</div>
                      <div className="admin-kpi-sub">
                        <span className="badge badge-success">{publishedOppCount} Published</span>
                        <span className="badge badge-draft">{draftOppCount} Drafts</span>
                      </div>
                    </div>

                    <div
                      className="admin-kpi-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => setAdminSection("orders")}
                    >
                      <div className="admin-kpi-header">
                        <span className="admin-kpi-title">HARDWARE ORDERS</span>
                        <div className="admin-kpi-icon" style={{ background: "#FFE6D5", color: "#F97316" }}>
                          <PackageCheck size={20} />
                        </div>
                      </div>
                      <div className="admin-kpi-metric">{adminOrders.length}</div>
                      <div className="admin-kpi-sub">
                        <span className="badge badge-success">{newOrdersCount} New</span>
                        <span className="badge" style={{ background: "#FEF3C7", color: "#B45309" }}>{inBuildOrdersCount} In Build</span>
                      </div>
                    </div>

                    <div
                      className="admin-kpi-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => setAdminSection("components")}
                    >
                      <div className="admin-kpi-header">
                        <span className="admin-kpi-title">COMPONENTS</span>
                        <div className="admin-kpi-icon icon-violet">
                          <Cpu size={20} />
                        </div>
                      </div>
                      <div className="admin-kpi-metric">{productRows.length}</div>
                      <div className="admin-kpi-sub">
                        <span className="badge badge-info">Dual Seller Verified</span>
                      </div>
                    </div>

                    <div
                      className="admin-kpi-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => setAdminSection("activity")}
                    >
                      <div className="admin-kpi-header">
                        <span className="admin-kpi-title">STUDENT TRACKS</span>
                        <div className="admin-kpi-icon icon-amber">
                          <TrendingUp size={20} />
                        </div>
                      </div>
                      <div className="admin-kpi-metric">{opportunityActivities.length}</div>
                      <div className="admin-kpi-sub">
                        <span className="badge badge-applied">{appliedCount} Applied</span>
                        <span className="badge badge-visited">{visitedCount} Inquiries</span>
                      </div>
                    </div>

                    <div
                      className="admin-kpi-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => setAdminSection("profile")}
                    >
                      <div className="admin-kpi-header">
                        <span className="admin-kpi-title">SECURITY & RLS</span>
                        <div className="admin-kpi-icon icon-emerald">
                          <ShieldCheck size={20} />
                        </div>
                      </div>
                      <div className="admin-kpi-metric" style={{ fontSize: 24, paddingTop: 4 }}>
                        Enforced
                      </div>
                      <div className="admin-kpi-sub">
                        <span className="badge badge-success">Role: Admin</span>
                        <span className="badge badge-info">Postgres RLS</span>
                      </div>
                    </div>
                  </div>

                  {/* Two-Column Overview Snapshot */}
                  <div className="admin-overview-grid">
                    {/* Left Column: Recent Student Activity Feed */}
                    <div className="admin-panel">
                      <div className="admin-panel-head">
                        <div>
                          <div className="eyebrow"><span className="eyebrow-line" /> LIVE FEED</div>
                          <h3>Recent Student Follow-up</h3>
                        </div>
                        <button
                          className="text-link"
                          type="button"
                          onClick={() => setAdminSection("activity")}
                        >
                          View All ({opportunityActivities.length}) <ArrowRight size={14} />
                        </button>
                      </div>

                      {activityLoading ? (
                        <div className="admin-loading-state">
                          <RefreshCw size={24} className="spin-icon" />
                          <p>Loading activity feed…</p>
                        </div>
                      ) : opportunityActivities.length === 0 ? (
                        <div className="admin-empty-panel">
                          <Activity size={32} />
                          <p>No student opportunity activity recorded yet.</p>
                        </div>
                      ) : (
                        <div className="admin-activity-stream">
                          {opportunityActivities.slice(0, 5).map((act) => (
                            <div className="admin-stream-item" key={`${act.user_id}-${act.opportunity_id}`}>
                              <div className="admin-student-avatar">
                                {act.student_name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="admin-stream-copy">
                                <div className="admin-stream-top">
                                  <strong>{act.student_name}</strong>
                                  <span className={`opportunity-activity-status ${act.status}`}>
                                    {act.status === "applied" ? (
                                      <>
                                        <CheckCircle2 size={12} /> Applied / Registered
                                      </>
                                    ) : (
                                      <>
                                        <Eye size={12} /> Visited
                                      </>
                                    )}
                                  </span>
                                </div>
                                <p className="admin-stream-title">{act.title}</p>
                                <div className="admin-stream-meta">
                                  <span>{act.opportunity_kind}</span>
                                  <span>•</span>
                                  <span>{act.organization}</span>
                                  {act.institution && (
                                    <>
                                      <span>•</span>
                                      <span>{act.institution}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right Column: Opportunities Snapshot */}
                    <div className="admin-panel">
                      <div className="admin-panel-head">
                        <div>
                          <div className="eyebrow"><span className="eyebrow-line" /> INVENTORY SNAPSHOT</div>
                          <h3>Opportunities Status</h3>
                        </div>
                        <button
                          className="text-link"
                          type="button"
                          onClick={() => setAdminSection("opportunities")}
                        >
                          Manage All ({opportunityRows.length}) <ArrowRight size={14} />
                        </button>
                      </div>

                      {opportunityRowsLoading ? (
                        <div className="admin-loading-state">
                          <RefreshCw size={24} className="spin-icon" />
                          <p>Loading opportunities…</p>
                        </div>
                      ) : opportunityRows.length === 0 ? (
                        <div className="admin-empty-panel">
                          <BriefcaseBusiness size={32} />
                          <p>No opportunities posted yet.</p>
                        </div>
                      ) : (
                        <div className="admin-stream-list">
                          {opportunityRows.slice(0, 5).map((listing) => (
                            <div className="admin-snapshot-card" key={listing.id}>
                              <div className="admin-snapshot-info">
                                <div className="admin-snapshot-tags">
                                  <span className={`admin-kind-pill kind-${listing.kind.toLowerCase()}`}>
                                    {listing.kind}
                                  </span>
                                  <span className={`admin-status-badge ${listing.isPublished ? "published" : "draft"}`}>
                                    {listing.isPublished ? "Published" : "Draft"}
                                  </span>
                                </div>
                                <h4>{listing.title}</h4>
                                <p>{listing.organization} • {listing.city}</p>
                              </div>
                              <div className="admin-snapshot-actions">
                                <button
                                  className={`button button-small ${listing.isPublished ? "button-outline" : "button-dark"}`}
                                  type="button"
                                  onClick={() => void toggleOpportunityPublication(listing)}
                                >
                                  {listing.isPublished ? "Unpublish" : "Publish"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* SECTION: ORDERS & MANUAL TRACKING CONSOLE */}
              {adminSection === "orders" && (
                <section className="admin-orders-view">
                  {selectedAdminOrder ? (
                    /* ORDER DETAIL & MANUAL TRACKING VIEW */
                    <div className="printable-packing-slip" style={{ display: "grid", gap: "24px" }}>
                      {/* Top Action Bar */}
                      <div className="admin-order-detail-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="button button-outline button-small"
                            onClick={() => setSelectedAdminOrder(null)}
                            title="Back to orders list"
                          >
                            <ArrowLeft size={14} /> Back
                          </button>
                          <h2 style={{ margin: 0, fontSize: "20px", color: "#0F1F3D", fontWeight: 800 }}>
                            Order #{selectedAdminOrder.order_number || selectedAdminOrder.id}
                          </h2>
                          <span className={`tracking-badge stage-${selectedAdminOrder.tracking_status.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
                            {selectedAdminOrder.tracking_status}
                          </span>
                          <span className={`badge ${selectedAdminOrder.payment_status === "PAID" ? "badge-success" : "badge-draft"}`}>
                            {selectedAdminOrder.payment_status}
                          </span>
                          {isOrderOverdue(selectedAdminOrder) && (
                            <span className="overdue-pill" role="alert" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5", padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Clock3 size={13} /> Overdue for Delivery
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            type="button"
                            className="button button-outline button-small"
                            onClick={() => copyAddressToClipboard(selectedAdminOrder)}
                            title="Copy customer delivery address"
                          >
                            <Copy size={14} /> Copy Address
                          </button>
                          <button
                            type="button"
                            className="button button-outline button-small"
                            onClick={() => window.print()}
                            title="Print packing slip and shipping label"
                          >
                            <Printer size={14} /> Print Packing Slip
                          </button>
                          <button
                            type="button"
                            className="button button-outline button-small"
                            style={{ borderColor: "#ef4444", color: "#ef4444" }}
                            onClick={() => handleDeleteSingleOrder(selectedAdminOrder.id)}
                            title="Delete this order"
                          >
                            <Trash2 size={14} /> Delete Order
                          </button>
                        </div>
                      </div>

                      {/* 3 Summary Info Cards */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
                        {/* Customer Information */}
                        <div style={{ background: "#FFFFFF", borderRadius: "14px", padding: "20px", border: "1px solid #E2E8F0" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "#F97316" }}>
                            <UserRound size={18} />
                            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0F1F3D" }}>Customer Details</h3>
                          </div>
                          <p style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: 700, color: "#0F1F3D" }}>
                            {selectedAdminOrder.customer_name}
                          </p>
                          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#475569" }}>
                            Email: <strong>{selectedAdminOrder.customer_email}</strong>
                          </p>
                          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#475569" }}>
                            Mobile: <strong>{selectedAdminOrder.customer_phone}</strong>
                          </p>
                          {selectedAdminOrder.customer?.college && (
                            <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#475569" }}>
                              College: <strong>{selectedAdminOrder.customer.college}</strong>
                            </p>
                          )}
                        </div>

                        {/* Delivery Address */}
                        <div style={{ background: "#FFFFFF", borderRadius: "14px", padding: "20px", border: "1px solid #E2E8F0" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "#F97316" }}>
                            <MapPin size={18} />
                            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0F1F3D" }}>Delivery Snapshot</h3>
                          </div>
                          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#334155" }}>
                            {selectedAdminOrder.shipping_address?.addressLine1}
                          </p>
                          {selectedAdminOrder.shipping_address?.addressLine2 && (
                            <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#334155" }}>
                              {selectedAdminOrder.shipping_address.addressLine2}
                            </p>
                          )}
                          <p style={{ margin: 0, fontSize: "13px", color: "#0F1F3D", fontWeight: 600 }}>
                            {selectedAdminOrder.shipping_address?.city}, {selectedAdminOrder.shipping_address?.state} - {selectedAdminOrder.shipping_address?.pincode}
                          </p>
                        </div>

                        {/* Payment & Audit Info */}
                        <div style={{ background: "#FFFFFF", borderRadius: "14px", padding: "20px", border: "1px solid #E2E8F0" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "#F97316" }}>
                            <CreditCard size={18} />
                            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0F1F3D" }}>Payment Verification</h3>
                          </div>
                          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#475569" }}>
                            Gateway: <strong>Cashfree Custom Web SDK</strong>
                          </p>
                          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#475569" }}>
                            Order ID: <code style={{ fontSize: "12px", background: "#F1F5F9", padding: "2px 6px", borderRadius: "4px" }}>{selectedAdminOrder.cashfree_order_id || selectedAdminOrder.id}</code>
                          </p>
                          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#475569" }}>
                            Method: <strong>{selectedAdminOrder.payment_method?.toLowerCase().includes("card") ? "CARD" : "UPI"}</strong>
                          </p>
                          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#475569" }}>
                            Total Amount: <strong style={{ color: "#F97316", fontSize: "14px" }}>{formatRupee(selectedAdminOrder.total_amount)}</strong>
                          </p>
                          {selectedAdminOrder.paid_at && (
                            <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
                              Paid at: {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(selectedAdminOrder.paid_at))}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Items Table */}
                      <div style={{ background: "#FFFFFF", borderRadius: "14px", padding: "20px", border: "1px solid #E2E8F0" }}>
                        <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "#0F1F3D" }}>
                          Ordered Engineering Hardware ({selectedAdminOrder.items.length})
                        </h3>
                        <div style={{ overflowX: "auto" }}>
                          <table className="admin-orders-table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ borderBottom: "2px solid #F1F5F9", fontSize: "12px", color: "#64748B", textTransform: "uppercase" }}>
                                <th style={{ padding: "10px 12px" }}>Project Name</th>
                                <th style={{ padding: "10px 12px" }}>Quantity</th>
                                <th style={{ padding: "10px 12px" }}>Unit Price</th>
                                <th style={{ padding: "10px 12px", textAlign: "right" }}>Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedAdminOrder.items.map((it, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9", fontSize: "13.5px" }}>
                                  <td style={{ padding: "12px", fontWeight: 600, color: "#0F1F3D" }}>{it.title}</td>
                                  <td style={{ padding: "12px" }}>{it.qty}</td>
                                  <td style={{ padding: "12px" }}>{formatRupee(it.price)}</td>
                                  <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, color: "#0F1F3D" }}>
                                    {formatRupee(it.price * it.qty)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Manual Tracking Control Panel */}
                      <div style={{ background: "#FFFFFF", borderRadius: "16px", padding: "24px", border: "1.5px solid #FDBA74", boxShadow: "0 4px 16px rgba(249,115,22,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
                          <div>
                            <div className="eyebrow"><span className="eyebrow-line" /> MANUAL DISPATCH &amp; TRACKING CONTROL</div>
                            <h3 style={{ margin: "4px 0 0", fontSize: "18px", color: "#0F1F3D", fontWeight: 800 }}>
                              Update Order Tracking Stage
                            </h3>
                          </div>
                          <button
                            type="button"
                            className="button button-primary"
                            onClick={moveToNextStage}
                            disabled={stageUpdating || selectedAdminOrder.tracking_status === "Delivered" || selectedAdminOrder.tracking_status === "Cancelled"}
                          >
                            Move to Next Stage <ArrowRight size={15} />
                          </button>
                        </div>

                        {/* Interactive Form Controls */}
                        <div style={{ display: "grid", gap: "16px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                            <div>
                              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#0F1F3D", marginBottom: "6px" }}>
                                Target Stage
                              </label>
                              <select
                                className="checkout-input-field"
                                value={newStage}
                                onChange={(e) => setNewStage(e.target.value as OrderTrackingStage)}
                              >
                                {(
                                  [
                                    "Order Placed",
                                    "Confirmed",
                                    "Building (Processing)",
                                    "Testing / Quality Check",
                                    "Packed",
                                    "Shipped",
                                    "Delivered",
                                    "Cancelled",
                                    "Refunded",
                                  ] as OrderTrackingStage[]
                                ).map((stg) => (
                                  <option key={stg} value={stg}>
                                    {stg}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#0F1F3D", marginBottom: "6px" }}>
                                Expected Delivery Date
                              </label>
                              <input
                                type="date"
                                className="checkout-input-field"
                                value={expectedDateInput}
                                onChange={(e) => setExpectedDateInput(e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Courier Fields (Shown when Shipped is selected) */}
                          {(newStage === "Shipped" || selectedAdminOrder.tracking_status === "Shipped") && (
                            <div style={{ background: "#F0FDF4", padding: "16px", borderRadius: "12px", border: "1px solid #BBF7D0", display: "grid", gap: "12px" }}>
                              <h4 style={{ margin: 0, fontSize: "13.5px", color: "#166534", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                                <Truck size={16} /> Courier Waybill Information (Required for Shipped stage)
                              </h4>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                                <div>
                                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#14532D", marginBottom: "4px" }}>
                                    Courier Carrier *
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. DTDC, Blue Dart, Delhivery"
                                    className="checkout-input-field"
                                    value={courierNameInput}
                                    onChange={(e) => setCourierNameInput(e.target.value)}
                                    required
                                  />
                                </div>
                                <div>
                                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#14532D", marginBottom: "4px" }}>
                                    Tracking / AWB Number *
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. D39485721"
                                    className="checkout-input-field"
                                    value={courierTrackingNumberInput}
                                    onChange={(e) => setCourierTrackingNumberInput(e.target.value)}
                                    required
                                  />
                                </div>
                                <div>
                                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#14532D", marginBottom: "4px" }}>
                                    Tracking URL (Optional)
                                  </label>
                                  <input
                                    type="url"
                                    placeholder="https://track.carrier.com/..."
                                    className="checkout-input-field"
                                    value={courierTrackingUrlInput}
                                    onChange={(e) => setCourierTrackingUrlInput(e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#0F1F3D", marginBottom: "6px" }}>
                              Public Stage Note (Visible on student's tracking page)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Circuit boards assembled and undergoing 24-hour sensor testing"
                              className="checkout-input-field"
                              value={stageNote}
                              onChange={(e) => setStageNote(e.target.value)}
                            />
                          </div>

                          <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#0F1F3D", marginBottom: "6px" }}>
                              Internal Workshop Notes (Private to administrators)
                            </label>
                            <textarea
                              rows={2}
                              placeholder="e.g. Customer requested extra header pins soldered on GPIO port"
                              className="checkout-input-field"
                              style={{ height: "auto", padding: "10px 14px", fontFamily: "inherit" }}
                              value={internalNotesInput}
                              onChange={(e) => setInternalNotesInput(e.target.value)}
                            />
                          </div>

                          <div style={{ textAlign: "right", marginTop: "8px" }}>
                            <button
                              type="button"
                              className="button button-dark"
                              disabled={stageUpdating}
                              onClick={() => submitStageUpdate()}
                            >
                              {stageUpdating ? "Saving stage update…" : "Save Tracking Stage"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Status History Timeline Log */}
                      <div style={{ background: "#FFFFFF", borderRadius: "14px", padding: "20px", border: "1px solid #E2E8F0" }}>
                        <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "#0F1F3D" }}>
                          Audit History Timeline
                        </h3>
                        <div className="tracking-history-log">
                          {(selectedAdminOrder.status_history || []).length === 0 ? (
                            <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>
                              No stage transitions logged yet.
                            </p>
                          ) : (
                            selectedAdminOrder.status_history?.map((entry, i) => (
                              <div key={i} style={{ display: "flex", gap: "12px", padding: "10px 0", borderBottom: "1px solid #F1F5F9", fontSize: "13px" }}>
                                <div style={{ color: "#F97316", marginTop: "2px" }}><CheckCircle2 size={16} /></div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                                    <strong style={{ color: "#0F1F3D" }}>
                                      {entry.from_stage ? `${entry.from_stage} → ${entry.to_stage}` : entry.to_stage}
                                    </strong>
                                    <span style={{ fontSize: "12px", color: "#64748B" }}>
                                      {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.changed_at))}
                                    </span>
                                  </div>
                                  <small style={{ color: "#64748B" }}>By: {entry.changed_by_name || entry.changed_by}</small>
                                  {entry.note && (
                                    <p style={{ margin: "4px 0 0", color: "#334155", fontStyle: "italic" }}>
                                      "{entry.note}"
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Confirmation Modal for Delivered */}
                      {confirmDeliveredDialogOpen && (
                        <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
                          <div className="modal-card" style={{ maxWidth: "460px", background: "#fff", padding: "24px", borderRadius: "16px" }}>
                            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#DCFCE7", color: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                              <CheckCircle2 size={24} />
                            </div>
                            <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: "#0F1F3D", fontWeight: 700 }}>
                              Confirm Order Delivery
                            </h3>
                            <p style={{ margin: "0 0 20px", fontSize: "13.5px", color: "#475569", lineHeight: 1.5 }}>
                              Are you sure you want to mark this order as <strong>Delivered</strong>? This indicates the hardware kit has reached the student and will conclude the tracking sequence.
                            </p>
                            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                className="button button-outline button-small"
                                onClick={() => setConfirmDeliveredDialogOpen(false)}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="button button-primary button-small"
                                onClick={() => submitStageUpdate("Delivered")}
                              >
                                Yes, Mark Delivered
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Confirmation Modal for Cancelled/Refunded */}
                      {confirmCancelledDialogOpen && (
                        <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
                          <div className="modal-card" style={{ maxWidth: "460px", background: "#fff", padding: "24px", borderRadius: "16px" }}>
                            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#FEE2E2", color: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                              <AlertCircle size={24} />
                            </div>
                            <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: "#0F1F3D", fontWeight: 700 }}>
                              Modify Cancelled / Refunded Order?
                            </h3>
                            <p style={{ margin: "0 0 20px", fontSize: "13.5px", color: "#475569", lineHeight: 1.5 }}>
                              This order is currently marked as Cancelled or Refunded. Are you sure you want to overwrite its tracking status?
                            </p>
                            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                className="button button-outline button-small"
                                onClick={() => setConfirmCancelledDialogOpen(false)}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="button button-primary button-small"
                                onClick={() => submitStageUpdate(newStage)}
                              >
                                Confirm Update
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ORDERS LIST VIEW */
                    <div style={{ display: "grid", gap: "24px" }}>
                      {/* Section Header */}
                      <div className="admin-section-header">
                        <div>
                          <div className="eyebrow"><span className="eyebrow-line" /> WORKSHOP PRODUCTION QUEUE</div>
                          <h2>Hardware Orders &amp; Manual Tracking</h2>
                          <p className="admin-section-desc">
                            Ready-made designs are built to order. Manage customer shipments, update stages, and set courier tracking details.
                          </p>
                        </div>
                        <div className="admin-header-actions" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="button button-outline"
                            onClick={() => {
                              setOrdersRevision((r) => r + 1);
                              showToast("Refreshing orders...", "info");
                            }}
                            title="Refresh orders list"
                          >
                            <RefreshCw size={15} /> Refresh
                          </button>
                          <button
                            type="button"
                            className="button button-outline"
                            onClick={exportOrdersCsv}
                            title="Export filtered orders as CSV"
                          >
                            <Download size={15} /> Export CSV
                          </button>
                          {adminOrders.length > 0 && (
                            <button
                              type="button"
                              className="button button-outline"
                              style={{ borderColor: "#ef4444", color: "#ef4444" }}
                              onClick={handleClearAllTestOrders}
                              title="Clear all test orders for clean client handover"
                            >
                              <Trash2 size={15} /> Clear Test Orders
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 4 Summary Cards */}
                      <div className="admin-kpi-grid">
                        <div className="admin-kpi-card" onClick={() => setOrderFilterTab("new")} role="button" tabIndex={0}>
                          <div className="admin-kpi-header">
                            <span className="admin-kpi-title">NEW ORDERS</span>
                            <div className="admin-kpi-icon icon-cyan"><Clock3 size={18} /></div>
                          </div>
                          <div className="admin-kpi-metric">{newOrdersCount}</div>
                          <div className="admin-kpi-sub"><span className="badge badge-draft">Awaiting Build</span></div>
                        </div>

                        <div className="admin-kpi-card" onClick={() => setOrderFilterTab("building")} role="button" tabIndex={0}>
                          <div className="admin-kpi-header">
                            <span className="admin-kpi-title">IN BUILD</span>
                            <div className="admin-kpi-icon" style={{ background: "#FEF3C7", color: "#B45309" }}><Cpu size={18} /></div>
                          </div>
                          <div className="admin-kpi-metric">{inBuildOrdersCount}</div>
                          <div className="admin-kpi-sub"><span className="badge" style={{ background: "#FEF3C7", color: "#B45309" }}>Assembly &amp; Testing</span></div>
                        </div>

                        <div className="admin-kpi-card" onClick={() => setOrderFilterTab("shipped")} role="button" tabIndex={0}>
                          <div className="admin-kpi-header">
                            <span className="admin-kpi-title">SHIPPED</span>
                            <div className="admin-kpi-icon icon-violet"><Truck size={18} /></div>
                          </div>
                          <div className="admin-kpi-metric">{shippedOrdersCount}</div>
                          <div className="admin-kpi-sub"><span className="badge badge-info">In Transit</span></div>
                        </div>

                        <div className="admin-kpi-card" onClick={() => setOrderFilterTab("delivered")} role="button" tabIndex={0}>
                          <div className="admin-kpi-header">
                            <span className="admin-kpi-title">DELIVERED</span>
                            <div className="admin-kpi-icon icon-emerald"><CheckCircle2 size={18} /></div>
                          </div>
                          <div className="admin-kpi-metric">{deliveredOrdersCount}</div>
                          <div className="admin-kpi-sub"><span className="badge badge-success">Fulfilled</span></div>
                        </div>
                      </div>

                      {/* Filter Tabs */}
                      <div className="opportunity-filter-tabs" role="tablist" style={{ overflowX: "auto", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className={`filter-chip ${orderFilterTab === "all" ? "active" : ""}`}
                          onClick={() => setOrderFilterTab("all")}
                        >
                          All Orders ({adminOrders.length})
                        </button>
                        <button
                          type="button"
                          className={`filter-chip ${orderFilterTab === "paid" ? "active" : ""}`}
                          onClick={() => setOrderFilterTab("paid")}
                        >
                          All Paid ({adminOrders.filter((o) => o.payment_status === "PAID").length})
                        </button>
                        <button
                          type="button"
                          className={`filter-chip ${orderFilterTab === "new" ? "active" : ""}`}
                          onClick={() => setOrderFilterTab("new")}
                        >
                          New ({newOrdersCount})
                        </button>
                        <button
                          type="button"
                          className={`filter-chip ${orderFilterTab === "building" ? "active" : ""}`}
                          onClick={() => setOrderFilterTab("building")}
                        >
                          Building ({inBuildOrdersCount})
                        </button>
                        <button
                          type="button"
                          className={`filter-chip ${orderFilterTab === "shipped" ? "active" : ""}`}
                          onClick={() => setOrderFilterTab("shipped")}
                        >
                          Shipped ({shippedOrdersCount})
                        </button>
                        <button
                          type="button"
                          className={`filter-chip ${orderFilterTab === "delivered" ? "active" : ""}`}
                          onClick={() => setOrderFilterTab("delivered")}
                        >
                          Delivered ({deliveredOrdersCount})
                        </button>
                        <button
                          type="button"
                          className={`filter-chip ${orderFilterTab === "cancelled" ? "active" : ""}`}
                          onClick={() => setOrderFilterTab("cancelled")}
                        >
                          Cancelled / Refunded ({adminOrders.filter((o) => o.tracking_status === "Cancelled" || o.tracking_status === "Refunded").length})
                        </button>
                        <button
                          type="button"
                          className={`filter-chip ${orderFilterTab === "issues" ? "active" : ""}`}
                          onClick={() => setOrderFilterTab("issues")}
                        >
                          Payment Issues ({adminOrders.filter((o) => o.payment_status === "PENDING" || o.payment_status === "FAILED").length})
                        </button>
                      </div>

                      {/* Toolbar: Search and Date Range */}
                      <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
                        <div style={{ flex: 1, minWidth: "260px" }}>
                          <input
                            type="search"
                            className="checkout-input-field"
                            placeholder="Search by Order ID, student name, email, phone, project..."
                            value={orderSearch}
                            onChange={(e) => setOrderSearch(e.target.value)}
                          />
                        </div>
                        <div style={{ width: "160px" }}>
                          <select
                            className="checkout-input-field"
                            value={orderDateRange}
                            onChange={(e) => setOrderDateRange(e.target.value as any)}
                          >
                            <option value="all">All Dates</option>
                            <option value="today">Today</option>
                            <option value="week">Last 7 Days</option>
                            <option value="month">Last 30 Days</option>
                          </select>
                        </div>
                      </div>

                      {/* Orders Table */}
                      <div style={{ background: "#FFFFFF", borderRadius: "16px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
                        {ordersLoading ? (
                          <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                            Loading workshop orders…
                          </div>
                        ) : filteredOrders.length === 0 ? (
                          <div style={{ padding: "48px 24px", textAlign: "center" }}>
                            <PackageCheck size={36} color="#94A3B8" style={{ margin: "0 auto 12px" }} />
                            <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: "#0F1F3D" }}>No orders matching criteria</h3>
                            <p style={{ margin: 0, fontSize: "13.5px", color: "#64748B" }}>
                              {orderSearch ? "Try adjusting your search query or filter tab." : "No orders have been recorded in this category yet."}
                            </p>
                          </div>
                        ) : (
                          <div style={{ overflowX: "auto" }}>
                            <table className="admin-orders-table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0", fontSize: "12px", color: "#64748B", textTransform: "uppercase" }}>
                                  <th style={{ padding: "12px 16px" }}>Order ID</th>
                                  <th style={{ padding: "12px 16px" }}>Student</th>
                                  <th style={{ padding: "12px 16px" }}>Project(s)</th>
                                  <th style={{ padding: "12px 16px" }}>Qty</th>
                                  <th style={{ padding: "12px 16px" }}>Amount</th>
                                  <th style={{ padding: "12px 16px" }}>Payment</th>
                                  <th style={{ padding: "12px 16px" }}>Order Date</th>
                                  <th style={{ padding: "12px 16px" }}>Tracking Stage</th>
                                  <th style={{ padding: "12px 16px" }}>Expected Delivery</th>
                                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredOrders.map((ord) => {
                                  const overdue = isOrderOverdue(ord);
                                  return (
                                    <tr key={ord.id} style={{ borderBottom: "1px solid #F1F5F9", fontSize: "13px" }}>
                                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0F1F3D" }}>
                                        #{ord.order_number || ord.id}
                                      </td>
                                      <td style={{ padding: "12px 16px" }}>
                                        <strong style={{ color: "#0F1F3D", display: "block" }}>{ord.customer_name}</strong>
                                        <small style={{ color: "#64748B" }}>{ord.customer_phone}</small>
                                      </td>
                                      <td style={{ padding: "12px 16px", maxWidth: "220px" }}>
                                        <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                          {ord.items.map((it) => it.title).join(", ")}
                                        </span>
                                      </td>
                                      <td style={{ padding: "12px 16px" }}>
                                        {ord.items.reduce((acc, it) => acc + (it.qty || 1), 0)}
                                      </td>
                                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0F1F3D" }}>
                                        {formatRupee(ord.total_amount)}
                                      </td>
                                      <td style={{ padding: "12px 16px" }}>
                                        <span className={`badge ${ord.payment_status === "PAID" ? "badge-success" : "badge-draft"}`}>
                                          {ord.payment_status}
                                        </span>
                                      </td>
                                      <td style={{ padding: "12px 16px", color: "#64748B" }}>
                                        {new Intl.DateTimeFormat(undefined, { dateStyle: "short" }).format(new Date(ord.created_at))}
                                      </td>
                                      <td style={{ padding: "12px 16px" }}>
                                        <span className={`tracking-badge stage-${ord.tracking_status.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
                                          {ord.tracking_status}
                                        </span>
                                      </td>
                                      <td style={{ padding: "12px 16px" }}>
                                        <div>
                                          <span>
                                            {ord.expected_delivery_date ? new Intl.DateTimeFormat(undefined, { dateStyle: "short" }).format(new Date(ord.expected_delivery_date)) : "~7 days"}
                                          </span>
                                          {overdue && (
                                            <div style={{ marginTop: "4px" }}>
                                              <span className="overdue-pill" style={{ background: "#FEF2F2", color: "#DC2626", fontSize: "11px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px" }}>
                                                Overdue
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                                          <button
                                            type="button"
                                            className="button button-outline button-small"
                                            onClick={() => openOrderDetail(ord)}
                                          >
                                            Manage <ArrowRight size={13} />
                                          </button>
                                          <button
                                            type="button"
                                            className="button button-outline button-small"
                                            style={{ borderColor: "#ef4444", color: "#ef4444" }}
                                            onClick={() => handleDeleteSingleOrder(ord.id)}
                                            title="Delete order"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* SECTION: OPPORTUNITIES MANAGER */}
              {adminSection === "opportunities" && (
                <section className="admin-opportunities-view">
                  <div className="admin-section-header">
                    <div>
                      <div className="eyebrow"><span className="eyebrow-line" /> OPPORTUNITY CONTROL</div>
                      <h2>Student Opportunities</h2>
                      <p className="admin-section-desc">
                        Publish and verify student internships, corporate training programs, and hackathons.
                      </p>
                    </div>
                    <div className="admin-header-actions">
                      <button
                        className="button button-primary"
                        type="button"
                        onClick={() => {
                          if (oppFormOpen && !editingOppId) {
                            setOppFormOpen(false);
                          } else {
                            startCreateOpportunity();
                          }
                        }}
                      >
                        {oppFormOpen && !editingOppId ? (
                          <>
                            <X size={16} /> Close Form
                          </>
                        ) : (
                          <>
                            <Plus size={16} /> Post Opportunity
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {opportunityRowsError && (
                    <div className="admin-alert-banner" role="alert" style={{ marginBottom: 16 }}>
                      <AlertCircle size={18} />
                      <span>{opportunityRowsError}</span>
                    </div>
                  )}

                  {/* Collapsible / Modal Create & Edit Form */}
                  {oppFormOpen && (
                    <div className="admin-form-panel">
                      <div className="admin-form-panel-head">
                        <div>
                          <span className="eyebrow"><span className="eyebrow-line" /> {editingOppId ? "UPDATE LISTING" : "NEW OPPORTUNITY"}</span>
                          <h3>{editingOppId ? "Edit Opportunity" : "Publish New Opportunity"}</h3>
                        </div>
                        <button
                          className="admin-form-close-btn"
                          type="button"
                          onClick={() => setOppFormOpen(false)}
                          aria-label="Close form"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <form onSubmit={saveOpportunity} className="admin-form-grid">
                        <div className="admin-field-full">
                          <label>Opportunity Type</label>
                          <div className="admin-kind-selector">
                            {(["Internships", "Training", "Hackathons"] as const).map((k) => (
                              <button
                                key={k}
                                type="button"
                                className={`admin-kind-choice ${oppKind === k ? "active" : ""}`}
                                onClick={() => setOppKind(k)}
                              >
                                {k === "Internships" && <BriefcaseBusiness size={16} />}
                                {k === "Training" && <GraduationCap size={16} />}
                                {k === "Hackathons" && <Code2 size={16} />}
                                <span>{k}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="admin-field">
                          <label>Title / Position Name</label>
                          <input
                            required
                            placeholder="e.g. Embedded Systems Engineering Intern"
                            value={oppTitle}
                            onChange={(e) => setOppTitle(e.target.value)}
                          />
                        </div>

                        <div className="admin-field">
                          <label>Provider / Organization</label>
                          <input
                            required
                            placeholder="e.g. Texas Instruments / Bosch"
                            value={oppOrg}
                            onChange={(e) => setOppOrg(e.target.value)}
                          />
                        </div>

                        <div className="admin-field">
                          <label>Location / Mode</label>
                          <input
                            required
                            placeholder="e.g. Bangalore, Karnataka (or Remote)"
                            value={oppCity}
                            onChange={(e) => setOppCity(e.target.value)}
                          />
                        </div>

                        <div className="admin-field">
                          <label>Official Application / Source URL (https)</label>
                          <input
                            required
                            type="url"
                            placeholder="https://careers.example.com/apply"
                            value={oppUrl}
                            onChange={(e) => setOppUrl(e.target.value)}
                          />
                        </div>

                        <div className="admin-field-full">
                          <label>Description & Requirements</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Key responsibilities, eligibility requirements, stipend, duration..."
                            value={oppSummary}
                            onChange={(e) => setOppSummary(e.target.value)}
                          />
                        </div>

                        {/* Live Preview Card */}
                        <div className="admin-field-full admin-live-preview-box">
                          <span className="admin-preview-label">Live Preview (How students see this)</span>
                          <div className="admin-opportunity-preview-card">
                            <div className="admin-preview-card-top">
                              <span className={`admin-kind-pill kind-${oppKind.toLowerCase()}`}>{oppKind}</span>
                              <span className="admin-preview-location">{oppCity || "Location"}</span>
                            </div>
                            <h4>{oppTitle || "Opportunity Title"}</h4>
                            <p className="admin-preview-org">{oppOrg || "Organization Name"}</p>
                            <p className="admin-preview-summary">{oppSummary || "Description will appear here..."}</p>
                            <div className="admin-preview-footer">
                              <span className="button button-dark button-small" style={{ pointerEvents: "none" }}>
                                Apply on Official Site <ArrowUpRight size={13} />
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="admin-form-actions admin-field-full">
                          <button
                            type="button"
                            className="button button-outline"
                            onClick={() => setOppFormOpen(false)}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="button button-dark"
                            disabled={oppSaving}
                          >
                            {oppSaving ? (
                              <>
                                <RefreshCw size={15} className="spin-icon" /> Saving…
                              </>
                            ) : (
                              <>
                                <Check size={16} /> {editingOppId ? "Update Opportunity" : "Publish Opportunity"}
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Filter & Search Bar */}
                  <div className="admin-filter-bar">
                    <div className="admin-search-wrapper">
                      <Search size={16} className="admin-search-icon" />
                      <input
                        type="text"
                        placeholder="Search by title, organization, or location…"
                        value={oppSearch}
                        onChange={(e) => setOppSearch(e.target.value)}
                      />
                      {oppSearch && (
                        <button
                          type="button"
                          className="admin-clear-search"
                          onClick={() => setOppSearch("")}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="admin-filter-group">
                      <div className="admin-tab-group">
                        {(["all", "Internships", "Training", "Hackathons"] as const).map((k) => (
                          <button
                            key={k}
                            type="button"
                            className={`admin-filter-tab ${oppKindFilter === k ? "active" : ""}`}
                            onClick={() => setOppKindFilter(k)}
                          >
                            {k === "all" ? "All Kinds" : k}
                          </button>
                        ))}
                      </div>

                      <div className="admin-tab-group">
                        {[
                          { id: "all", label: "All Status" },
                          { id: "published", label: "Published" },
                          { id: "draft", label: "Drafts" },
                        ].map(({ id, label }) => (
                          <button
                            key={id}
                            type="button"
                            className={`admin-filter-tab ${oppStatusFilter === id ? "active" : ""}`}
                            onClick={() => setOppStatusFilter(id as typeof oppStatusFilter)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Opportunities Data Grid */}
                  {opportunityRowsLoading ? (
                    <div className="admin-loading-state">
                      <RefreshCw size={28} className="spin-icon" />
                      <p>Loading opportunities…</p>
                    </div>
                  ) : filteredOpportunities.length === 0 ? (
                    <div className="admin-empty-state">
                      <BriefcaseBusiness size={40} />
                      <h3>No opportunities match your filter</h3>
                      <p>Try resetting the search terms or add a new opportunity.</p>
                      <button className="button button-outline button-small" onClick={startCreateOpportunity}>
                        <Plus size={14} /> Post Opportunity
                      </button>
                    </div>
                  ) : (
                    <div className="admin-cards-grid">
                      {filteredOpportunities.map((opp) => (
                        <article className="admin-opportunity-card" key={opp.id}>
                          <div className="admin-card-header">
                            <span className={`admin-kind-pill kind-${opp.kind.toLowerCase()}`}>
                              {opp.kind}
                            </span>
                            <span className={`admin-status-badge ${opp.isPublished ? "published" : "draft"}`}>
                              {opp.isPublished ? (
                                <>
                                  <CheckCircle2 size={12} /> Published
                                </>
                              ) : (
                                <>
                                  <Clock3 size={12} /> Draft
                                </>
                              )}
                            </span>
                          </div>

                          <div className="admin-card-body">
                            <h4>{opp.title}</h4>
                            <div className="admin-card-org">
                              <Building2 size={14} />
                              <span>{opp.organization}</span>
                            </div>
                            <div className="admin-card-loc">
                              <MapPin size={14} />
                              <span>{opp.city}</span>
                            </div>
                            <p className="admin-card-summary">{opp.summary}</p>
                          </div>

                          <div className="admin-card-footer">
                            <div className="admin-footer-actions">
                              <button
                                className={`button button-small ${opp.isPublished ? "button-outline" : "button-dark"}`}
                                type="button"
                                onClick={() => void toggleOpportunityPublication(opp)}
                              >
                                {opp.isPublished ? "Unpublish" : "Publish"}
                              </button>
                              <button
                                className="button button-outline button-small"
                                type="button"
                                onClick={() => startEditOpportunity(opp)}
                                title="Edit opportunity"
                              >
                                <Edit size={14} /> Edit
                              </button>
                              <a
                                className="button button-outline button-small"
                                href={opp.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="Open source application link"
                              >
                                <ExternalLink size={13} />
                              </a>
                              <button
                                className="button button-danger-ghost button-small"
                                type="button"
                                onClick={() => void deleteOpportunity(opp)}
                                title="Delete listing"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* SECTION: COMPONENT CATALOG */}
              {adminSection === "components" && (
                <section className="admin-components-view">
                  <div className="admin-section-header">
                    <div>
                      <div className="eyebrow"><span className="eyebrow-line" /> HARDWARE CATALOG</div>
                      <h2>Components & Multi-Seller Intelligence</h2>
                      <p className="admin-section-desc">
                        Manage electronic parts, manufacturer specs, and dual-retailer price comparisons.
                      </p>
                    </div>
                    <div className="admin-header-actions">
                      <button
                        className="button button-primary"
                        type="button"
                        onClick={() => {
                          if (compFormOpen && !editingProductId) {
                            setCompFormOpen(false);
                          } else {
                            startCreateComponent();
                          }
                        }}
                      >
                        {compFormOpen && !editingProductId ? (
                          <>
                            <X size={16} /> Close Form
                          </>
                        ) : (
                          <>
                            <Plus size={16} /> Add Component
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {productRowsError && (
                    <div className="admin-alert-banner" role="alert" style={{ marginBottom: 16 }}>
                      <AlertCircle size={18} />
                      <span>{productRowsError}</span>
                    </div>
                  )}

                  {/* Component Form */}
                  {compFormOpen && (
                    <div className="admin-form-panel">
                      <div className="admin-form-panel-head">
                        <div>
                          <span className="eyebrow"><span className="eyebrow-line" /> {editingProductId ? "UPDATE COMPONENT" : "NEW CATALOG ENTRY"}</span>
                          <h3>{editingProductId ? "Edit Component & Offers" : "Add Electronic Component"}</h3>
                        </div>
                        <button
                          className="admin-form-close-btn"
                          type="button"
                          onClick={() => setCompFormOpen(false)}
                          aria-label="Close form"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <form onSubmit={saveComponent} className="admin-form-grid">
                        <div className="admin-field">
                          <label>Component Title</label>
                          <input
                            required
                            placeholder="e.g. 5V Voltage Regulator (LM7805)"
                            value={compTitle}
                            onChange={(e) => setCompTitle(e.target.value)}
                          />
                        </div>

                        <div className="admin-field">
                          <label>Manufacturer</label>
                          <input
                            required
                            placeholder="e.g. Texas Instruments / STMicroelectronics"
                            value={compOrg}
                            onChange={(e) => setCompOrg(e.target.value)}
                          />
                        </div>

                        <div className="admin-field">
                          <label>Manufacturer Part Number (MPN)</label>
                          <input
                            required
                            placeholder="e.g. LM7805CV"
                            value={compMpn}
                            onChange={(e) => setCompMpn(e.target.value)}
                          />
                        </div>

                        <div className="admin-field">
                          <label>Category</label>
                          <input
                            placeholder="e.g. Linear Regulators, Microcontrollers, Op-Amps"
                            value={compCategory}
                            onChange={(e) => setCompCategory(e.target.value)}
                          />
                        </div>

                        <div className="admin-field-full">
                          <label>Component Description & Specifications</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Brief technical description, key package, voltage/current specs..."
                            value={compSummary}
                            onChange={(e) => setCompSummary(e.target.value)}
                          />
                        </div>

                        <div className="admin-field-full">
                          <label>Component Image (Upload from Gallery or Device)</label>
                          <input
                            ref={compFileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void handleImageFileSelect(file);
                              e.target.value = "";
                            }}
                          />

                          <div className="admin-gallery-uploader">
                            {compImageUrl ? (
                              <div className="admin-gallery-preview-card">
                                <div className="admin-gallery-preview-left">
                                  <img
                                    className="admin-gallery-thumb"
                                    src={compImageUrl}
                                    alt="Component Preview"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                  <div className="admin-gallery-meta">
                                    <span className="admin-gallery-badge">
                                      <CheckCircle2 size={12} /> Image Ready
                                    </span>
                                    <span className="admin-gallery-filename">
                                      {compImageUrl.startsWith("data:")
                                        ? "Image loaded from Gallery / Files"
                                        : compImageUrl.split("/").pop() || "Component Image"}
                                    </span>
                                  </div>
                                </div>

                                <div className="admin-gallery-actions">
                                  <button
                                    type="button"
                                    className="admin-gallery-btn-replace"
                                    onClick={() => compFileInputRef.current?.click()}
                                    disabled={imageUploading}
                                  >
                                    <UploadCloud size={14} /> Replace
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-gallery-btn-remove"
                                    onClick={() => setCompImageUrl("")}
                                    title="Remove image"
                                  >
                                    <Trash2 size={14} /> Remove
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="admin-gallery-dropzone"
                                onClick={() => compFileInputRef.current?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const file = e.dataTransfer.files?.[0];
                                  if (file) void handleImageFileSelect(file);
                                }}
                              >
                                <div className="admin-gallery-icon-wrap">
                                  {imageUploading ? (
                                    <RefreshCw className="animate-spin" size={24} />
                                  ) : (
                                    <UploadCloud size={24} />
                                  )}
                                </div>
                                <div className="admin-gallery-title">
                                  {imageUploading ? (
                                    "Processing image..."
                                  ) : (
                                    <>
                                      <span>Click to select from Gallery / Device</span> or drag & drop
                                    </>
                                  )}
                                </div>
                                <p className="admin-gallery-subtitle">
                                  Supports PNG, JPG, JPEG, WEBP, SVG, GIF (all formats)
                                </p>
                              </div>
                            )}

                            <div>
                              <button
                                type="button"
                                className="admin-gallery-url-toggle"
                                onClick={() => setShowUrlInput((v) => !v)}
                              >
                                {showUrlInput
                                  ? "Hide image URL/path field"
                                  : "Or enter image URL / path (/components-image/..., https://)"}
                              </button>

                              {showUrlInput && (
                                <div className="admin-image-input-group" style={{ marginTop: "8px" }}>
                                  <input
                                    type="text"
                                    placeholder="/components-image/components-1.png or https://..."
                                    value={compImageUrl}
                                    onChange={(e) => setCompImageUrl(e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Dual Retailer Offers Grid */}
                        <div className="admin-field-full">
                          <div className="admin-offers-heading">
                            <h4>Retailer Pricing & Availability Comparison (Up to 2 Sellers)</h4>
                            <p>Enter official verified retailer pricing for student comparison.</p>
                          </div>

                          <div className="component-admin-offers">
                            {[0, 1].map((idx) => {
                              const offer = offerDrafts[idx];
                              return (
                                <fieldset className="component-admin-offer" key={idx}>
                                  <legend>
                                    Seller Offer {idx + 1} {idx === 0 ? "(Primary)" : "(Secondary)"}
                                  </legend>
                                  <div className="admin-field">
                                    <label>Retailer Name</label>
                                    <input
                                      required={idx === 0}
                                      value={offer.seller}
                                      onChange={(e) => updateOfferDraft(idx, "seller", e.target.value)}
                                      placeholder={idx === 0 ? "DigiKey" : "Mouser Electronics"}
                                    />
                                  </div>
                                  <div className="admin-field">
                                    <label>Price per unit</label>
                                    <input
                                      required={idx === 0}
                                      type="number"
                                      min="0.0001"
                                      step="any"
                                      placeholder="0.45"
                                      value={offer.price}
                                      onChange={(e) => updateOfferDraft(idx, "price", e.target.value)}
                                    />
                                  </div>
                                  <div className="admin-field">
                                    <label>Currency Code (3 letters)</label>
                                    <input
                                      required={idx === 0}
                                      maxLength={3}
                                      placeholder="USD"
                                      value={offer.currency}
                                      onChange={(e) => updateOfferDraft(idx, "currency", e.target.value)}
                                    />
                                  </div>
                                  <div className="admin-field">
                                    <label>Price Quantity Break</label>
                                    <input
                                      required={idx === 0}
                                      type="number"
                                      min="1"
                                      step="1"
                                      placeholder="1"
                                      value={offer.quantity}
                                      onChange={(e) => updateOfferDraft(idx, "quantity", e.target.value)}
                                    />
                                  </div>
                                  <div className="admin-field">
                                    <label>In Stock Count (optional)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="1250"
                                      value={offer.stock}
                                      onChange={(e) => updateOfferDraft(idx, "stock", e.target.value)}
                                    />
                                  </div>
                                  <div className="admin-field">
                                    <label>Minimum Order (MOQ)</label>
                                    <input
                                      type="number"
                                      min="1"
                                      placeholder="1"
                                      value={offer.moq}
                                      onChange={(e) => updateOfferDraft(idx, "moq", e.target.value)}
                                    />
                                  </div>
                                  <div className="admin-field-full">
                                    <label>Retailer Product URL</label>
                                    <input
                                      required={idx === 0}
                                      type="url"
                                      placeholder="https://www.digikey.com/product/..."
                                      value={offer.sellerUrl}
                                      onChange={(e) => updateOfferDraft(idx, "sellerUrl", e.target.value)}
                                    />
                                  </div>
                                  <div className="admin-field-full">
                                    <label>Price Checked On</label>
                                    <input
                                      required={idx === 0}
                                      type="date"
                                      value={offer.checkedAt}
                                      onChange={(e) => updateOfferDraft(idx, "checkedAt", e.target.value)}
                                    />
                                  </div>
                                </fieldset>
                              );
                            })}
                          </div>
                        </div>

                        <div className="admin-form-actions admin-field-full">
                          <button
                            type="button"
                            className="button button-outline"
                            onClick={() => setCompFormOpen(false)}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="button button-dark"
                            disabled={compSaving}
                          >
                            {compSaving ? (
                              <>
                                <RefreshCw size={15} className="spin-icon" /> Saving…
                              </>
                            ) : (
                              <>
                                <Check size={16} /> {editingProductId ? "Update Component" : "Publish to Catalog"}
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Search Bar */}
                  <div className="admin-filter-bar">
                    <div className="admin-search-wrapper">
                      <Search size={16} className="admin-search-icon" />
                      <input
                        type="text"
                        placeholder="Search by part name, MPN, manufacturer, or category…"
                        value={compSearch}
                        onChange={(e) => setCompSearch(e.target.value)}
                      />
                      {compSearch && (
                        <button
                          type="button"
                          className="admin-clear-search"
                          onClick={() => setCompSearch("")}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="admin-item-count-badge">
                      <span>{filteredComponents.length} items in catalog</span>
                    </div>
                  </div>

                  {/* Components Grid */}
                  {productRowsLoading ? (
                    <div className="admin-loading-state">
                      <RefreshCw size={28} className="spin-icon" />
                      <p>Loading hardware components…</p>
                    </div>
                  ) : filteredComponents.length === 0 ? (
                    <div className="admin-empty-state">
                      <Cpu size={40} />
                      <h3>No components found</h3>
                      <p>Add components with dual seller offers to compare prices.</p>
                      <button className="button button-outline button-small" onClick={startCreateComponent}>
                        <Plus size={14} /> Add Component
                      </button>
                    </div>
                  ) : (
                    <div className="admin-components-grid">
                      {filteredComponents.map((product) => {
                        const details = product.componentDetails;
                        const offers = details?.offers ?? [];
                        return (
                          <article className="admin-comp-card" key={product.id}>
                            <div className="admin-comp-top">
                              <div className="admin-comp-thumb">
                                {details?.imageUrl ? (
                                  <img
                                    src={details.imageUrl}
                                    alt={product.title}
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <Cpu size={26} className="admin-comp-fallback-icon" />
                                )}
                              </div>
                              <div className="admin-comp-main">
                                <div className="admin-comp-tags">
                                  {details?.mpn && (
                                    <span className="admin-mpn-badge">{details.mpn}</span>
                                  )}
                                  {details?.category && (
                                    <span className="admin-cat-badge">{details.category}</span>
                                  )}
                                </div>
                                <h4>{product.title}</h4>
                                <p className="admin-comp-mfg">{product.organization}</p>
                              </div>
                            </div>

                            <p className="admin-comp-summary">{product.summary}</p>

                            {/* Dual Seller Price Comparison Row */}
                            <div className="admin-comp-offers-strip">
                              {offers.length === 0 ? (
                                <span className="admin-no-offers">No seller offers registered</span>
                              ) : (
                                offers.map((offer, oIdx) => (
                                  <div className="admin-offer-box" key={oIdx}>
                                    <div className="admin-offer-box-header">
                                      <strong>{offer.seller}</strong>
                                      {offer.stock !== null && (
                                        <small className="admin-offer-stock">
                                          {offer.stock > 0 ? `${offer.stock} in stock` : "Out of stock"}
                                        </small>
                                      )}
                                    </div>
                                    <div className="admin-offer-box-price">
                                      <span>{offer.currency}</span>
                                      <strong>{offer.price.toFixed(2)}</strong>
                                      <small>/ unit</small>
                                    </div>
                                    <a
                                      href={offer.sellerUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="admin-offer-link"
                                    >
                                      Verify Link <ExternalLink size={11} />
                                    </a>
                                  </div>
                                ))
                              )}
                            </div>

                            <div className="admin-comp-card-footer">
                              <button
                                className="button button-outline button-small"
                                type="button"
                                onClick={() => startEditComponent(product.id)}
                              >
                                <Edit size={14} /> Edit Specs & Offers
                              </button>
                              <button
                                className="button button-danger-ghost button-small"
                                type="button"
                                onClick={() => void deleteComponent(product)}
                                title="Remove component from catalog"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* SECTION: STUDENT ACTIVITY */}
              {adminSection === "activity" && (
                <section className="admin-activity-view">
                  <div className="admin-section-header">
                    <div>
                      <div className="eyebrow"><span className="eyebrow-line" /> STUDENT ANALYTICS</div>
                      <h2>Opportunity Tracking & Inquiries</h2>
                      <p className="admin-section-desc">
                        Real-time student-reported visits, applications, and registrations across opportunities.
                      </p>
                    </div>
                  </div>

                  {activityError && (
                    <div className="admin-alert-banner" role="alert" style={{ marginBottom: 16 }}>
                      <AlertCircle size={18} />
                      <span>{activityError}</span>
                    </div>
                  )}

                  {/* Summary Metric Ribbon */}
                  <div className="admin-activity-summary-ribbon">
                    <div className="admin-ribbon-stat">
                      <span className="ribbon-label">Total Student Interactions</span>
                      <strong className="ribbon-num">{opportunityActivities.length}</strong>
                    </div>
                    <div className="admin-ribbon-stat">
                      <span className="ribbon-label">Applications & Registrations</span>
                      <strong className="ribbon-num text-success">{appliedCount}</strong>
                    </div>
                    <div className="admin-ribbon-stat">
                      <span className="ribbon-label">Opportunity Inquiries / Visits</span>
                      <strong className="ribbon-num text-info">{visitedCount}</strong>
                    </div>
                    <div className="admin-ribbon-stat">
                      <span className="ribbon-label">Conversion Rate</span>
                      <strong className="ribbon-num">
                        {opportunityActivities.length > 0
                          ? `${Math.round((appliedCount / opportunityActivities.length) * 100)}%`
                          : "0%"}
                      </strong>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="admin-filter-bar">
                    <div className="admin-search-wrapper">
                      <Search size={16} className="admin-search-icon" />
                      <input
                        type="text"
                        placeholder="Search student name, college, or opportunity…"
                        value={activitySearch}
                        onChange={(e) => setActivitySearch(e.target.value)}
                      />
                      {activitySearch && (
                        <button
                          type="button"
                          className="admin-clear-search"
                          onClick={() => setActivitySearch("")}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="admin-filter-group">
                      <div className="admin-tab-group">
                        {[
                          { id: "all", label: "All Status" },
                          { id: "applied", label: "Applied" },
                          { id: "visited", label: "Visited" },
                        ].map(({ id, label }) => (
                          <button
                            key={id}
                            type="button"
                            className={`admin-filter-tab ${activityStatusFilter === id ? "active" : ""}`}
                            onClick={() => setActivityStatusFilter(id as typeof activityStatusFilter)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div className="admin-tab-group">
                        {(["all", "Internships", "Training", "Hackathons"] as const).map((k) => (
                          <button
                            key={k}
                            type="button"
                            className={`admin-filter-tab ${activityKindFilter === k ? "active" : ""}`}
                            onClick={() => setActivityKindFilter(k)}
                          >
                            {k === "all" ? "All Kinds" : k}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Activity Records List */}
                  {activityLoading ? (
                    <div className="admin-loading-state">
                      <RefreshCw size={28} className="spin-icon" />
                      <p>Loading activity logs…</p>
                    </div>
                  ) : filteredActivities.length === 0 ? (
                    <div className="admin-empty-state">
                      <Activity size={40} />
                      <h3>No student activity matches your filter</h3>
                      <p>When students click or track opportunities, records will populate here.</p>
                    </div>
                  ) : (
                    <div className="admin-activity-table-wrapper">
                      <div className="admin-activity-cards-list">
                        {filteredActivities.map((act) => (
                          <div className="admin-activity-card-row" key={`${act.user_id}-${act.opportunity_id}`}>
                            <div className="admin-activity-user-badge">
                              <div className="admin-student-avatar">
                                {act.student_name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="admin-activity-student-info">
                                <strong>{act.student_name}</strong>
                                <small>
                                  {act.institution || "College not set"}
                                  {act.course && ` • ${act.course}`}
                                  {act.academic_year && ` • ${act.academic_year}`}
                                </small>
                              </div>
                            </div>

                            <div className="admin-activity-target-info">
                              <span className={`admin-kind-pill kind-${act.opportunity_kind.toLowerCase()}`}>
                                {act.opportunity_kind}
                              </span>
                              <h4>{act.title}</h4>
                              <p>{act.organization} • {act.city}</p>
                            </div>

                            <div className="admin-activity-status-col">
                              <span className={`opportunity-activity-status ${act.status}`}>
                                {act.status === "applied" ? (
                                  <>
                                    <CheckCircle2 size={13} /> Applied / Registered
                                  </>
                                ) : (
                                  <>
                                    <Eye size={13} /> Visited
                                  </>
                                )}
                              </span>
                              <small className="admin-activity-timestamp">
                                {new Intl.DateTimeFormat(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                }).format(
                                  new Date(act.status === "applied" && act.applied_at ? act.applied_at : act.visited_at)
                                )}
                              </small>
                            </div>

                            <div className="admin-activity-action-col">
                              <a
                                className="button button-outline button-small"
                                href={act.opportunity_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                View Listing <ArrowUpRight size={13} />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* SECTION: ADMIN PROFILE */}
              {adminSection === "profile" && (
                <section className="admin-profile-view">
                  <div className="admin-profile-container">
                    <div className="admin-profile-card">
                      <div className="admin-profile-header">
                        <div className="admin-profile-avatar-large">
                          <UserRound size={36} />
                          <div className="admin-avatar-badge">
                            <ShieldCheck size={16} />
                          </div>
                        </div>
                        <div className="admin-profile-titles">
                          <span className="eyebrow"><span className="eyebrow-line" /> AUTHENTICATED USER</span>
                          <h2>Administrator Profile</h2>
                          <span className="admin-role-badge">
                            <ShieldCheck size={14} /> Database Superuser
                          </span>
                        </div>
                      </div>

                      <div className="admin-profile-grid">
                        <div className="admin-profile-stat-box">
                          <span className="stat-label">Admin Email</span>
                          <strong className="stat-value">{adminEmail || "Email unavailable"}</strong>
                        </div>
                        <div className="admin-profile-stat-box">
                          <span className="stat-label">Authentication Provider</span>
                          <strong className="stat-value">Supabase Identity</strong>
                        </div>
                        <div className="admin-profile-stat-box">
                          <span className="stat-label">Row-Level Security</span>
                          <strong className="stat-value text-success">Active & Enforced</strong>
                        </div>
                        <div className="admin-profile-stat-box">
                          <span className="stat-label">Payment Gateway Mode</span>
                          <strong className={`stat-value ${import.meta.env.VITE_CASHFREE_ENV === "production" ? "text-success" : ""}`}>
                            {import.meta.env.VITE_CASHFREE_ENV === "production" ? "Cashfree Production (Live)" : "Cashfree Sandbox"}
                          </strong>
                        </div>
                      </div>

                      <div className="admin-profile-actions">
                        <button
                          className="button button-danger"
                          type="button"
                          onClick={() => void signOut()}
                        >
                          <LogOut size={16} /> Sign Out of Admin Console
                        </button>
                        <button
                          className="button button-outline"
                          type="button"
                          onClick={onExit}
                        >
                          Return to Website
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}
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

async function loadAdminComponentListings(_client: SupabaseClient): Promise<Listing[]> {
  const combined = [...(ECE_COMPONENTS_CATALOG as Listing[])];
  return uniqueComponentListings(combined);
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
      course: sanitizeCourse(profile?.course),
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
