import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  ConciergeBell,
  Search,
  Users,
  ShoppingBag,
  Calendar,
  ClipboardList,
  Plus,
  RefreshCw,
  Check,
  X,
  Clock,
  Wallet,
  Package,
  History,
  UserPlus,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  UserCheck,
  Activity,
  User as UserIcon,
  Phone,
  MessageSquare,
  BadgeAlert,
  CreditCard,
  Notebook,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useBusinessContext } from "@/lib/business-context";
import { useBusinessTerminology } from "@/lib/business-terminology";
import { useRoleGuard } from "@/lib/auth/useRoleGuard";
import type { Lang } from "@/lib/i18n";
import { t, localePath } from "@/lib/i18n";
import { getLocalizedName } from "@/lib/i18n/getLocalizedName";

import { AdminCheckoutDrawer } from "@/components/casa/AdminCheckoutDrawer";
import { Section } from "@/components/casa/Section";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  createDurationBooking,
  checkInBooking,
  completeBookingCheckout,
  validateDiscountCode,
  lookupVoucherBalance,
  fetchCustomerPackageBenefits,
  type CheckoutBreakdown,
} from "@/lib/bookings";
import type { Database } from "@/integrations/supabase/types";

// Standard local dict for reception cockpit bilingual strings
const LOCAL_DICT = {
  en: {
    title: "Reception Workspace",
    eyebrow: "Operations Cockpit",
    closedTitle: "Business Closed Today",
    closedBanner: "Today is marked as a closed day for this business. Operations are restricted.",
    kpi: {
      revenue: "Today Revenue",
      activeTickets: "Active Queue",
      avgWait: "Average Wait",
      health: "Queue Status",
    },
    health: {
      healthy: "Healthy",
      busy: "Busy",
      overloaded: "Overloaded",
      critical: "Critical",
    },
    actions: {
      newBooking: "New Booking",
      addWalkIn: "Add Walk-In",
      lookupCustomer: "Customer Lookup",
      quickCustomer: "Quick Customer",
    },
    arrivalBoard: {
      title: "Arrival Board",
      intro: "Today's scheduled appointments",
      empty: "No appointments today",
      checkIn: "Check In",
      checkout: "Checkout",
      cancel: "Cancel",
      conflict: "Schedule conflict detected",
      successCheckIn: "Checked in successfully",
    },
    liveBoard: {
      title: "Live Service Board",
      intro: "Realtime queue ticketing tracker",
      columns: {
        waiting: "Waiting",
        called: "Called",
        in_service: "In Service",
        completed: "Completed",
      },
      actions: {
        call: "Call",
        start: "Start",
        complete: "Complete",
        noShow: "No Show",
        cancel: "Cancel",
        reassign: "Reassign",
      },
    },
    customerLookup: {
      title: "Customer Lookup",
      searchPlaceholder: "Search by phone number...",
      notFound: "No customer found with this phone",
      visited: "Total Visits",
      spent: "Total Spent",
      packages: "Active Packages",
      wallet: "Wallet Balance",
      history: "Recent History",
      createFirst: "Create Customer First",
    },
    quickCustomer: {
      title: "Quick Customer Creation",
      name: "Customer Name",
      phone: "Phone Number",
      whatsapp: "WhatsApp (Optional)",
      language: "Preferred Language",
      create: "Create",
      success: "Customer created successfully",
    },
    checkout: {
      title: "Complete Checkout",
      subtotal: "Subtotal",
      discount: "Discount Code",
      voucher: "Voucher Code",
      validate: "Validate",
      lookup: "Lookup",
      net: "Net Total",
      paymentType: "Payment Type",
      complete: "Complete Checkout",
      skip: "Skip Checkout",
      success: "Checkout completed successfully",
      invalidDiscount: "Invalid discount code",
      invalidVoucher: "Voucher not active or depleted",
    },
    newBooking: {
      title: "New Booking",
      date: "Date",
      time: "Time",
      service: "Service",
      barber: "Barber",
      resource: "Room / Chair",
      notes: "Notes",
      create: "Book Reservation",
      success: "Reservation created successfully",
    },
    addWalkIn: {
      title: "Walk-in Queue",
      create: "Add to Queue",
      success: "Customer added to queue",
    },
    common: {
      loading: "Loading operations...",
      error: "An error occurred",
      noBarber: "No Barber (Any)",
      noResource: "No Room/Chair",
      cash: "Cash",
      card: "Card",
      voucher: "Voucher",
      mixed: "Mixed Payment",
      package: "Package Session",
      save: "Save",
      cancel: "Cancel",
    },
  },
  ar: {
    title: "مساحة عمل الاستقبال",
    eyebrow: "مقصورة العمليات",
    closedTitle: "العمل مغلق اليوم",
    closedBanner: "اليوم محدد كإجازة لهذا النشاط التجاري. العمليات مقيدة.",
    kpi: {
      revenue: "إيرادات اليوم",
      activeTickets: "الانتظار النشط",
      avgWait: "متوسط الانتظار",
      health: "حالة الطابور",
    },
    health: {
      healthy: "مستقر",
      busy: "مزدحم",
      overloaded: "مزدحم جداً",
      critical: "حرج",
    },
    actions: {
      newBooking: "حجز جديد",
      addWalkIn: "تسجيل عميل",
      lookupCustomer: "البحث عن عميل",
      quickCustomer: "عميل سريع",
    },
    arrivalBoard: {
      title: "لوحة الوصول",
      intro: "مواعيد اليوم المجدولة",
      empty: "لا توجد مواعيد اليوم",
      checkIn: "تسجيل حضور",
      checkout: "دفع وحساب",
      cancel: "إلغاء حجز",
      conflict: "تم اكتشاف تعارض في الجدول",
      successCheckIn: "تم تسجيل الحضور بنجاح",
    },
    liveBoard: {
      title: "لوحة الخدمة المباشرة",
      intro: "تتبع حالة التذاكر في الوقت الفعلي",
      columns: {
        waiting: "انتظار",
        called: "مناداة",
        in_service: "قيد الخدمة",
        completed: "مكتمل",
      },
      actions: {
        call: "نداء",
        start: "بدء الخدمة",
        complete: "إنهاء الخدمة",
        noShow: "لم يحضر",
        cancel: "إلغاء التذكرة",
        reassign: "إعادة تعيين",
      },
    },
    customerLookup: {
      title: "البحث عن عميل",
      searchPlaceholder: "ابحث برقم الهاتف...",
      notFound: "لم يتم العثور على عميل بهذا الهاتف",
      visited: "إجمالي الزيارات",
      spent: "إجمالي الإنفاق",
      packages: "الباقات النشطة",
      wallet: "رصيد المحفظة",
      history: "السجل الأخير",
      createFirst: "إنشاء عميل أولاً",
    },
    quickCustomer: {
      title: "إنشاء عميل سريع",
      name: "اسم العميل",
      phone: "رقم الهاتف",
      whatsapp: "رقم الواتساب (اختياري)",
      language: "اللغة المفضلة",
      create: "إنشاء عميل",
      success: "تم إنشاء العميل بنجاح",
    },
    checkout: {
      title: "إتمام الحساب",
      subtotal: "المجموع الفرعي",
      discount: "كود الخصم",
      voucher: "كود القسيمة",
      validate: "تطبيق خصم",
      lookup: "تحقق من القسيمة",
      net: "الصافي المطلوب",
      paymentType: "طريقة الدفع",
      complete: "إتمام الدفع",
      skip: "تجاوز الدفع",
      success: "تم إتمام الدفع بنجاح",
      invalidDiscount: "كود الخصم غير صالح",
      invalidVoucher: "القسيمة غير نشطة أو فارغة",
    },
    newBooking: {
      title: "حجز جديد",
      date: "التاريخ",
      time: "الوقت",
      service: "الخدمة",
      barber: "الحلاق",
      resource: "الغرفة / الكرسي",
      notes: "ملاحظات",
      create: "تأكيد الحجز",
      success: "تم إنشاء الحجز بنجاح",
    },
    addWalkIn: {
      title: "تسجيل عميل انتظار",
      create: "إضافة إلى الانتظار",
      success: "تمت إضافة العميل إلى الانتظار",
    },
    common: {
      loading: "جاري تحميل العمليات...",
      error: "حدث خطأ ما",
      noBarber: "أي موظف",
      noResource: "لا يوجد غرفة/كرسي",
      cash: "نقداً",
      card: "بطاقة دفع",
      voucher: "قسيمة شراء",
      mixed: "دفع مختلط",
      package: "جلسة من باقة",
      save: "حفظ",
      cancel: "إلغاء",
    },
  },
} as const;

type BookingItem = Database["public"]["Tables"]["booking_items"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"] & {
  booking_items?: BookingItem[];
};
type QueueTicket = Database["public"]["Tables"]["queue_tickets"]["Row"];
type Service = Database["public"]["Tables"]["services"]["Row"];
type Barber = Database["public"]["Tables"]["barbers"]["Row"];
type Resource = Database["public"]["Tables"]["resources"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];

interface PackageBenefitView {
  id: string;
  remaining_quantity: number;
  total_quantity: number;
  services: {
    title_en: string | null;
    title_ar: string | null;
    name_en?: string | null;
    name_ar?: string | null;
  } | null;
  customer_packages: {
    packages: {
      name_en?: string | null;
      name_ar?: string | null;
      title_en?: string | null;
      title_ar?: string | null;
    } | null;
  } | null;
}

const todayIso = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

export function AdminReceptionWorkspacePage({ lang }: { lang: Lang }) {
  const router = useRouter();
  const auth = useAuth();
  const { role: staffRole, loading: roleLoading } = useRoleGuard();
  const { business, loading: businessLoading, isClosedToday } = useBusinessContext();
  const terminology = useBusinessTerminology(lang);

  const tt = useMemo(
    () => ({
      ...LOCAL_DICT[lang],
      newBooking: {
        ...LOCAL_DICT[lang].newBooking,
        barber: terminology.staffSingular,
      },
      common: {
        ...LOCAL_DICT[lang].common,
        noBarber: terminology.anyAvailableStaff,
      },
    }),
    [lang, terminology],
  );
  const dictCommon = t(lang);

  // States
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);

  // Financial summaries
  const [todayRevenue, setTodayRevenue] = useState(0);

  // Modals state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);

  // Checkout Modal State
  const [checkoutItem, setCheckoutItem] = useState<{
    bookingId?: string;
    ticketId?: string;
    customerPhone?: string;
    serviceId?: string;
  } | null>(null);
  const [checkoutSubtotal, setCheckoutSubtotal] = useState(0);
  const [checkoutDiscountCode, setCheckoutDiscountCode] = useState("");
  const [checkoutVoucherCode, setCheckoutVoucherCode] = useState("");
  const [checkoutDiscountAmount, setCheckoutDiscountAmount] = useState(0);
  const [checkoutVoucherDrawdown, setCheckoutVoucherDrawdown] = useState(0);
  const [checkoutPaymentType, setCheckoutPaymentType] = useState<
    "cash" | "card" | "voucher" | "mixed" | "package"
  >("cash");
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  // Package redemptions inside checkout
  const [packageBenefits, setPackageBenefits] = useState<PackageBenefitView[]>([]);
  const [selectedBenefitId, setSelectedBenefitId] = useState<string | null>(null);

  // Customer Lookup Drawer State
  const [showCustomerDrawer, setShowCustomerDrawer] = useState(false);
  const [searchPhone, setSearchPhone] = useState("");
  const [searchedCustomer, setSearchedCustomer] = useState<Customer | null>(null);
  const [customerStats, setCustomerStats] = useState<{ visits: number; spent: number } | null>(
    null,
  );
  const [customerPackages, setCustomerPackages] = useState<PackageBenefitView[]>([]);
  const [customerHistory, setCustomerHistory] = useState<Booking[]>([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  // Quick Customer Create State
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustWhatsApp, setNewCustWhatsApp] = useState("");
  const [newCustLang, setNewCustLang] = useState<Lang>("en");
  const [creatingCust, setCreatingCust] = useState(false);

  // Walk-In state
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInServiceId, setWalkInServiceId] = useState("");
  const [walkInBarberId, setWalkInBarberId] = useState("__none__");
  const [walkInNotes, setWalkInNotes] = useState("");
  const [submittingWalkIn, setSubmittingWalkIn] = useState(false);

  // New Booking state
  const [bookingCustName, setBookingCustName] = useState("");
  const [bookingCustPhone, setBookingCustPhone] = useState("");
  const [bookingServiceId, setBookingServiceId] = useState("");
  const [bookingBarberId, setBookingBarberId] = useState("__none__");
  const [bookingResourceId, setBookingResourceId] = useState("__none__");
  const [bookingTime, setBookingTime] = useState("12:00");
  const [bookingNotes, setBookingNotes] = useState("");
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Fetch Cockpit Data
  const loadWorkspaceData = useCallback(async () => {
    if (!business) return;
    try {
      const today = todayIso();
      const todayStart = `${today}T00:00:00Z`;
      const todayEnd = `${today}T23:59:59Z`;

      // Parallel data fetching
      const [bookingsRes, ticketsRes, servicesRes, barbersRes, resourcesRes, salesRes] =
        await Promise.all([
          supabase
            .from("bookings")
            .select("*, booking_items(*)")
            .eq("business_id", business.id)
            .eq("booking_date", today)
            .order("booking_time", { ascending: true }),
          supabase
            .from("queue_tickets")
            .select("*")
            .eq("business_id", business.id)
            .eq("queue_date", today)
            .order("queue_number", { ascending: true }),
          supabase
            .from("services")
            .select("*")
            .eq("business_id", business.id)
            .eq("is_active", true),
          supabase.from("barbers").select("*").eq("business_id", business.id).eq("is_active", true),
          supabase
            .from("resources")
            .select("*")
            .eq("business_id", business.id)
            .eq("status", "active"),
          supabase
            .from("product_sales")
            .select("total")
            .eq("business_id", business.id)
            .eq("status", "completed")
            .gte("created_at", todayStart)
            .lte("created_at", todayEnd),
        ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (ticketsRes.error) throw ticketsRes.error;
      if (servicesRes.error) throw servicesRes.error;
      if (barbersRes.error) throw barbersRes.error;
      if (resourcesRes.error) throw resourcesRes.error;
      if (salesRes.error) throw salesRes.error;

      const loadedBookings = bookingsRes.data as Booking[];
      setBookings(loadedBookings);
      setTickets(ticketsRes.data as QueueTicket[]);
      setServices(servicesRes.data as Service[]);
      setBarbers(barbersRes.data as Barber[]);
      setResources(resourcesRes.data as Resource[]);

      // Calculate Revenue: sum completed bookings (services price) + completed product sales
      let bookingsRev = 0;
      loadedBookings.forEach((b) => {
        if (b.status === "completed") {
          const service = servicesRes.data?.find((s) => s.id === b.service_id);
          if (service) {
            bookingsRev += Number(service.price);
          }
        }
      });

      const productSalesRev = (salesRes.data || []).reduce(
        (sum, item) => sum + Number(item.total || 0),
        0,
      );
      setTodayRevenue(bookingsRev + productSalesRev);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tt.common.error);
    } finally {
      setLoading(false);
    }
  }, [business, tt.common.error]);

  // Subscriptions to PostgreSQL changes for real-time reactivity
  useEffect(() => {
    if (!business) return undefined;

    void loadWorkspaceData();

    const channel = supabase
      .channel("reception-cockpit-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_tickets" }, () => {
        void loadWorkspaceData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        void loadWorkspaceData();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [business, loadWorkspaceData]);

  // Operational Queue Health Score calculation
  const queueHealth = useMemo(() => {
    // TODO: replace active barber calculation with attendance clock state
    const activeBarbersCount = barbers.length;
    const waitingTickets = tickets.filter(
      (t) => t.status === "waiting" || t.status === "called",
    ).length;

    if (activeBarbersCount === 0) {
      return waitingTickets > 0 ? "critical" : "healthy";
    }

    if (waitingTickets < activeBarbersCount) return "healthy";
    if (waitingTickets >= activeBarbersCount && waitingTickets < activeBarbersCount * 2)
      return "busy";
    if (waitingTickets >= activeBarbersCount * 2 && waitingTickets < activeBarbersCount * 3)
      return "overloaded";
    return "critical";
  }, [barbers, tickets]);

  const queueHealthBadge = (health: string) => {
    switch (health) {
      case "healthy":
        return (
          <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200">
            {tt.health.healthy}
          </Badge>
        );
      case "busy":
        return (
          <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-200">
            {tt.health.busy}
          </Badge>
        );
      case "overloaded":
        return (
          <Badge className="border-orange-500/40 bg-orange-500/10 text-orange-200">
            {tt.health.overloaded}
          </Badge>
        );
      case "critical":
        return (
          <Badge className="border-red-500/40 bg-red-500/10 text-red-200 animate-pulse">
            {tt.health.critical}
          </Badge>
        );
      default:
        return null;
    }
  };

  // Average wait time
  const averageWaitTime = useMemo(() => {
    const waiting = tickets.filter((t) => t.status === "waiting" && t.estimated_wait_max != null);
    if (waiting.length === 0) return 0;
    const sum = waiting.reduce((acc, t) => acc + (t.estimated_wait_max || 0), 0);
    return Math.round(sum / waiting.length);
  }, [tickets]);

  // Booking details retrieval helper
  const getServiceInfo = useCallback(
    (serviceId: string | null) => {
      const svc = services.find((s) => s.id === serviceId);
      return svc ? getLocalizedName(svc, lang) : "—";
    },
    [services, lang],
  );

  const getBarberInfo = useCallback(
    (barberId: string | null) => {
      const brb = barbers.find((b) => b.id === barberId);
      return brb ? getLocalizedName(brb, lang) : tt.common.noBarber;
    },
    [barbers, lang, tt.common.noBarber],
  );

  const getResourceInfo = useCallback(
    (resourceId: string | null) => {
      const res = resources.find((r) => r.id === resourceId);
      return res ? getLocalizedName(res, lang) : tt.common.noResource;
    },
    [resources, lang, tt.common.noResource],
  );

  // Shared booking check-in action
  const handleCheckIn = async (bookingId: string) => {
    if (isClosedToday) {
      toast.error(tt.closedTitle);
      return;
    }
    try {
      const res = await checkInBooking(bookingId);
      if (!res.success) throw new Error(res.error);
      toast.success(`${tt.arrivalBoard.successCheckIn} (#${res.queueNumber})`);
      void loadWorkspaceData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tt.common.error);
    }
  };

  // Cancel Booking
  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);

      if (error) throw error;
      toast.success(lang === "ar" ? "تم بنجاح" : "Success");
      void loadWorkspaceData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tt.common.error);
    }
  };

  // Run Queue Lifecycle Action (call, start, complete, cancel, no_show, reassign)
  const handleQueueAction = async (
    ticket: QueueTicket,
    action: "call" | "start" | "complete" | "cancel" | "no_show" | "reassign",
    barberId?: string,
  ) => {
    if (isClosedToday) {
      toast.error(tt.closedTitle);
      return;
    }

    // For complete action, if it's linked to a booking, open checkout modal
    if (action === "complete" && ticket.booking_id) {
      const service = services.find((s) => s.id === ticket.service_id);
      setCheckoutItem({
        bookingId: ticket.booking_id,
        ticketId: ticket.id,
        customerPhone: ticket.customer_phone,
        serviceId: ticket.service_id || undefined,
      });
      setCheckoutSubtotal(service ? Number(service.price) : 0);
      setCheckoutDiscountCode("");
      setCheckoutVoucherCode("");
      setCheckoutDiscountAmount(0);
      setCheckoutVoucherDrawdown(0);
      setCheckoutPaymentType("cash");

      // Load packages benefits if any
      const benefits = await fetchCustomerPackageBenefits(business!.id, ticket.customer_phone);
      setPackageBenefits(benefits);
      setSelectedBenefitId(null);
      return;
    }

    try {
      const { error } = await supabase.rpc("admin_queue_action", {
        p_ticket_id: ticket.id,
        p_action: action,
        p_barber_id: barberId || undefined,
      });
      if (error) throw error;
      toast.success(lang === "ar" ? "تم بنجاح" : "Success");
      void loadWorkspaceData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tt.common.error);
    }
  };

  // Open Checkout for booking directly from arrival board
  const openBookingCheckout = async (booking: Booking) => {
    const service = services.find((s) => s.id === booking.service_id);
    setCheckoutItem({
      bookingId: booking.id,
      customerPhone: booking.customer_phone,
      serviceId: booking.service_id || undefined,
    });
    setCheckoutSubtotal(service ? Number(service.price) : 0);
    setCheckoutDiscountCode("");
    setCheckoutVoucherCode("");
    setCheckoutDiscountAmount(0);
    setCheckoutVoucherDrawdown(0);
    setCheckoutPaymentType("cash");

    const benefits = await fetchCustomerPackageBenefits(business!.id, booking.customer_phone);
    setPackageBenefits(benefits);
    setSelectedBenefitId(null);
  };

  // Validate Discount
  const handleValidateDiscount = async () => {
    if (!checkoutDiscountCode.trim()) return;
    try {
      const res = await validateDiscountCode(checkoutDiscountCode, business!.id);
      if (res.valid && res.discount) {
        let amt = 0;
        if (res.discount.type === "percentage") {
          amt = (checkoutSubtotal * res.discount.amount) / 100;
        } else {
          amt = res.discount.amount;
        }
        setCheckoutDiscountAmount(Math.min(amt, checkoutSubtotal));
        toast.success(lang === "ar" ? "تم بنجاح" : "Success");
      } else {
        toast.error(tt.checkout.invalidDiscount);
      }
    } catch (err) {
      toast.error(tt.checkout.invalidDiscount);
    }
  };

  // Lookup Voucher
  const handleLookupVoucher = async () => {
    if (!checkoutVoucherCode.trim()) return;
    try {
      const res = await lookupVoucherBalance(checkoutVoucherCode, business!.id);
      if (res.found && res.balance != null) {
        const remaining = checkoutSubtotal - checkoutDiscountAmount;
        setCheckoutVoucherDrawdown(Math.min(res.balance, remaining));
        toast.success(lang === "ar" ? "تم بنجاح" : "Success");
      } else {
        toast.error(tt.checkout.invalidVoucher);
      }
    } catch (err) {
      toast.error(tt.checkout.invalidVoucher);
    }
  };

  // Complete Checkout
  const handleCompleteCheckout = async () => {
    if (!checkoutItem?.bookingId) return;
    setCheckoutBusy(true);
    try {
      // 1. Run checkout RPC transaction
      const res = await completeBookingCheckout({
        bookingId: checkoutItem.bookingId,
        businessId: business!.id,
        paymentType: checkoutPaymentType,
        discountCode: checkoutDiscountCode || null,
        voucherCode: checkoutVoucherCode || null,
        customerPackageBenefitId: selectedBenefitId || null,
        lang,
      });

      if (!res.success) throw new Error(res.error);

      // 2. If it was also linked to a queue ticket, complete the ticket as well
      if (checkoutItem.ticketId) {
        await supabase.rpc("admin_queue_action", {
          p_ticket_id: checkoutItem.ticketId,
          p_action: "complete",
        });
      }

      toast.success(tt.checkout.success);
      setCheckoutItem(null);
      void loadWorkspaceData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tt.common.error);
    } finally {
      setCheckoutBusy(false);
    }
  };

  // Skip Checkout (just mark complete without discount/voucher calculations)
  const handleSkipCheckout = async () => {
    if (!checkoutItem?.bookingId) return;
    toast.error(
      lang === "ar"
        ? "يجب إتمام الدفع عبر الخروج المالي."
        : "Checkout is required before financial completion.",
    );
  };

  // Customer Lookup
  const handleSearchCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone.trim()) return;
    setSearchingCustomer(true);
    setSearchedCustomer(null);
    setCustomerStats(null);
    setCustomerPackages([]);
    setCustomerHistory([]);

    try {
      // 1. Fetch customer profile
      const { data: cust, error: custErr } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", business!.id)
        .eq("phone", searchPhone.trim())
        .maybeSingle();

      if (custErr) throw custErr;

      if (!cust) {
        toast.error(tt.customerLookup.notFound);
        setSearchingCustomer(false);
        return;
      }

      setSearchedCustomer(cust as Customer);

      // 2. Fetch spent / visits statistics
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*, services(price)")
        .eq("customer_phone", searchPhone.trim())
        .eq("status", "completed");

      const spent = (bookingsData || []).reduce(
        (sum, item) => sum + Number(item.services?.price || 0),
        0,
      );
      setCustomerStats({
        visits: bookingsData?.length || 0,
        spent,
      });

      // 3. Fetch active packages / benefits
      const benefits = await fetchCustomerPackageBenefits(business!.id, searchPhone.trim());
      setCustomerPackages(benefits);

      // 4. Fetch last 5 bookings / queue tickets history
      const { data: historyData } = await supabase
        .from("bookings")
        .select("*")
        .eq("customer_phone", searchPhone.trim())
        .order("booking_date", { ascending: false })
        .limit(5);

      setCustomerHistory(historyData || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tt.common.error);
    } finally {
      setSearchingCustomer(false);
    }
  };

  // Quick Customer Creation
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      toast.error(dictCommon.common.error);
      return;
    }
    setCreatingCust(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          business_id: business!.id,
          full_name: newCustName.trim(),
          phone: newCustPhone.trim(),
          whatsapp_phone: newCustWhatsApp.trim() || null,
          preferred_language: newCustLang,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success(tt.quickCustomer.success);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustWhatsApp("");
      setShowQuickCustomerModal(false);

      // Auto open lookup for them
      setSearchPhone(data.phone);
      setShowCustomerDrawer(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tt.common.error);
    } finally {
      setCreatingCust(false);
    }
  };

  // Add Walk-In Queue ticket
  const handleAddWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim() || !walkInPhone.trim() || !walkInServiceId) {
      toast.error(dictCommon.common.error);
      return;
    }
    setSubmittingWalkIn(true);
    try {
      const { data, error } = await supabase
        .rpc("join_queue", {
          p_service_id: walkInServiceId,
          p_customer_name: walkInName.trim(),
          p_customer_phone: walkInPhone.trim(),
          p_mode: walkInBarberId === "__none__" ? "any_barber" : "specific_barber",
          p_barber_id: walkInBarberId === "__none__" ? undefined : walkInBarberId,
          p_language: lang,
          p_notes: walkInNotes.trim() || undefined,
        })
        .single();

      if (error) throw error;
      toast.success(tt.addWalkIn.success);
      setWalkInName("");
      setWalkInPhone("");
      setWalkInServiceId("");
      setWalkInBarberId("__none__");
      setWalkInNotes("");
      setShowWalkInModal(false);
      void loadWorkspaceData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tt.common.error);
    } finally {
      setSubmittingWalkIn(false);
    }
  };

  // Add Appointment reservation
  const handleAddBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingCustName.trim() || !bookingCustPhone.trim() || !bookingServiceId) {
      toast.error(dictCommon.common.error);
      return;
    }
    setSubmittingBooking(true);
    try {
      const service = services.find((s) => s.id === bookingServiceId);
      if (!service) throw new Error("Service not found");

      const today = todayIso();
      const startsAt = `${today}T${bookingTime}:00`;

      // Calculate endsAt based on service duration
      const duration = service.duration_minutes || 30;
      const startDt = new Date(startsAt);
      const endDt = new Date(startDt.getTime() + duration * 60_000);

      const pad = (n: number) => String(n).padStart(2, "0");
      const endsAtStr = `${today}T${pad(endDt.getHours())}:${pad(endDt.getMinutes())}:00`;

      const res = await createDurationBooking({
        businessId: business!.id,
        serviceId: bookingServiceId,
        customerName: bookingCustName.trim(),
        customerPhone: bookingCustPhone.trim(),
        startsAt,
        endsAt: endsAtStr,
        staffId: bookingBarberId === "__none__" ? undefined : bookingBarberId,
        resourceId: bookingResourceId === "__none__" ? undefined : bookingResourceId,
        language: lang,
        notes: bookingNotes.trim() || undefined,
      });

      if (res.error) throw res.error;
      toast.success(tt.newBooking.success);
      setBookingCustName("");
      setBookingCustPhone("");
      setBookingServiceId("");
      setBookingBarberId("__none__");
      setBookingResourceId("__none__");
      setBookingNotes("");
      setShowBookingModal(false);
      void loadWorkspaceData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tt.common.error);
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Live Service board columns
  const liveBoardColumns = useMemo(() => {
    const waiting = tickets.filter((t) => t.status === "waiting");
    const called = tickets.filter((t) => t.status === "called");
    const inService = tickets.filter((t) => t.status === "in_service");
    const completed = tickets.filter((t) => t.status === "completed");
    return { waiting, called, inService, completed };
  }, [tickets]);

  // Loading indicator for full page loading
  if (auth.loading || roleLoading || businessLoading || loading) {
    return (
      <Section lang={lang} eyebrow={tt.eyebrow} title={tt.title}>
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">{tt.common.loading}</span>
        </div>
      </Section>
    );
  }

  // RBAC Access Guard (allow platform admin, business owners/managers, reception, cashier).
  const allowedRoles = [
    "admin",
    "business_owner",
    "business_admin",
    "business_manager",
    "reception",
    "cashier",
  ];
  const hasAccess = auth.isAdmin || (staffRole && allowedRoles.includes(staffRole));

  if (!hasAccess) {
    return (
      <Section lang={lang} eyebrow={tt.eyebrow} title={tt.title}>
        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
          <ShieldAlert className="h-5 w-5 text-red-400" />
          <AlertTitle>{dictCommon.admin.roles.accessDenied}</AlertTitle>
          <AlertDescription>{dictCommon.admin.roles.noPermission}</AlertDescription>
        </Alert>
      </Section>
    );
  }

  return (
    <Section lang={lang} eyebrow={tt.eyebrow} title={tt.title}>
      {/* 0. Closed-Day Enforcement Banner */}
      {isClosedToday && (
        <Alert className="mb-6 border-amber-500/40 bg-amber-500/10 text-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <AlertTitle className="font-serif text-lg">{tt.closedTitle}</AlertTitle>
            <AlertDescription className="text-sm opacity-90">{tt.closedBanner}</AlertDescription>
          </div>
        </Alert>
      )}

      {/* 1. Today Operations Summary (KPI Dashboard) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="border-primary/10 bg-card/40 backdrop-blur-md hover:border-primary/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {tt.kpi.revenue}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif text-primary">
              {todayRevenue.toFixed(2)}{" "}
              <span className="text-xs font-sans text-muted-foreground">
                {business?.currency || "AED"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Includes bookings & sales</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-card/40 backdrop-blur-md hover:border-primary/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {tt.kpi.activeTickets}
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif">
              {tickets.filter((t) => t.status !== "completed" && t.status !== "cancelled").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {tickets.filter((t) => t.status === "completed").length} completed today
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-card/40 backdrop-blur-md hover:border-primary/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {tt.kpi.avgWait}
            </CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif">
              {averageWaitTime} <span className="text-xs font-sans text-muted-foreground">min</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">For currently waiting queue</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-card/40 backdrop-blur-md hover:border-primary/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {tt.kpi.health}
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="flex items-center justify-between pt-2">
            <div className="text-lg font-medium">{queueHealthBadge(queueHealth)}</div>
            <span className="text-xs text-muted-foreground">
              {lang === "ar"
                ? `${barbers.length} ${terminology.staffPlural} نشط`
                : `${barbers.length} active ${terminology.staffPlural.toLowerCase()}`}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 2. Primary Reception Actions Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Button
          onClick={() => setShowBookingModal(true)}
          disabled={isClosedToday}
          className="h-16 flex flex-col items-center justify-center gap-1 bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-all font-medium rounded-xl"
        >
          <Calendar className="h-5 w-5" />
          <span>{tt.actions.newBooking}</span>
        </Button>

        <Button
          onClick={() => setShowWalkInModal(true)}
          disabled={isClosedToday}
          className="h-16 flex flex-col items-center justify-center gap-1 bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-all font-medium rounded-xl"
        >
          <ClipboardList className="h-5 w-5" />
          <span>{tt.actions.addWalkIn}</span>
        </Button>

        <Button
          onClick={() => {
            setSearchPhone("");
            setSearchedCustomer(null);
            setShowCustomerDrawer(true);
          }}
          className="h-16 flex flex-col items-center justify-center gap-1 bg-secondary border border-border text-foreground hover:bg-secondary/80 transition-all font-medium rounded-xl"
        >
          <Search className="h-5 w-5" />
          <span>{tt.actions.lookupCustomer}</span>
        </Button>

        <Button
          onClick={() => setShowQuickCustomerModal(true)}
          className="h-16 flex flex-col items-center justify-center gap-1 bg-secondary border border-border text-foreground hover:bg-secondary/80 transition-all font-medium rounded-xl"
        >
          <UserPlus className="h-5 w-5" />
          <span>{tt.actions.quickCustomer}</span>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Side: Arrival Board (Section 3) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl text-primary">{tt.arrivalBoard.title}</h2>
              <p className="text-xs text-muted-foreground">{tt.arrivalBoard.intro}</p>
            </div>
            <Badge variant="outline">{bookings.length}</Badge>
          </div>

          <ScrollArea className="h-[550px] pr-2">
            {bookings.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground bg-card/20 rounded-lg border border-border border-dashed">
                {tt.arrivalBoard.empty}
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => {
                  const serviceName = getServiceInfo(booking.service_id);
                  const barberName = getBarberInfo(booking.barber_id);
                  const bookingItem = booking.booking_items?.[0];
                  const resourceName = getResourceInfo(bookingItem?.resource_id || null);

                  return (
                    <Card
                      key={booking.id}
                      className="border-border/60 bg-card/20 backdrop-blur-sm hover:border-primary/30 transition-all"
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-serif text-lg text-primary">
                            {booking.booking_time}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              booking.status === "completed"
                                ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
                                : booking.status === "confirmed"
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                                  : booking.status === "cancelled"
                                    ? "border-red-500/40 bg-red-500/10 text-red-200"
                                    : "border-amber-500/40 bg-amber-500/10 text-amber-200"
                            }
                          >
                            {booking.status}
                          </Badge>
                        </div>

                        <div>
                          <div className="font-medium text-sm">{booking.customer_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {booking.customer_phone}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/40 pt-2 text-muted-foreground">
                          <div>
                            <span className="font-semibold text-foreground/80">
                              {tt.newBooking.service}:
                            </span>{" "}
                            {serviceName}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground/80">
                              {tt.newBooking.barber}:
                            </span>{" "}
                            {barberName}
                          </div>
                          <div className="col-span-2">
                            <span className="font-semibold text-foreground/80">
                              {tt.newBooking.resource}:
                            </span>{" "}
                            {resourceName}
                          </div>
                        </div>

                        {/* Operational Actions */}
                        <div className="flex gap-2 pt-2 justify-end">
                          {booking.status === "pending" && (
                            <Button
                              onClick={() => handleCheckIn(booking.id)}
                              disabled={isClosedToday}
                              size="sm"
                              className="h-8 text-xs bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
                            >
                              <UserCheck className="h-3 w.5 mr-1" />
                              {tt.arrivalBoard.checkIn}
                            </Button>
                          )}

                          {booking.status === "confirmed" && (
                            <Button
                              onClick={() => openBookingCheckout(booking)}
                              disabled={isClosedToday}
                              size="sm"
                              className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              <CreditCard className="h-3 w.5 mr-1" />
                              {tt.arrivalBoard.checkout}
                            </Button>
                          )}

                          {booking.status !== "completed" && booking.status !== "cancelled" && (
                            <Button
                              onClick={() => handleCancelBooking(booking.id)}
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <X className="h-3 w.5 mr-1" />
                              {tt.arrivalBoard.cancel}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Side: Live Service Board (Section 5) */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="font-serif text-2xl text-primary">{tt.liveBoard.title}</h2>
            <p className="text-xs text-muted-foreground">{tt.liveBoard.intro}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Waiting Column */}
            <div className="space-y-3 bg-card/10 p-3 rounded-xl border border-border/40">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-sm font-semibold">{tt.liveBoard.columns.waiting}</span>
                <Badge variant="outline">{liveBoardColumns.waiting.length}</Badge>
              </div>
              <ScrollArea className="h-[480px]">
                <div className="space-y-2">
                  {liveBoardColumns.waiting.map((ticket) => (
                    <Card
                      key={ticket.id}
                      className="border-border bg-card/30 hover:border-primary/20 transition-all p-3 space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-serif text-lg text-primary">
                          #{ticket.queue_number}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {ticket.estimated_wait_max} min
                        </span>
                      </div>
                      <div className="text-xs font-semibold">{ticket.customer_name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {getServiceInfo(ticket.service_id)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {getBarberInfo(ticket.barber_id)}
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1.5 border-t border-border/40">
                        <Button
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => handleQueueAction(ticket, "call")}
                        >
                          {tt.liveBoard.actions.call}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] text-red-400"
                          onClick={() => handleQueueAction(ticket, "cancel")}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Called Column */}
            <div className="space-y-3 bg-card/10 p-3 rounded-xl border border-border/40">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-sm font-semibold">{tt.liveBoard.columns.called}</span>
                <Badge variant="outline">{liveBoardColumns.called.length}</Badge>
              </div>
              <ScrollArea className="h-[480px]">
                <div className="space-y-2">
                  {liveBoardColumns.called.map((ticket) => (
                    <Card
                      key={ticket.id}
                      className="border-border bg-card/30 hover:border-primary/20 transition-all p-3 space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-serif text-lg text-primary">
                          #{ticket.queue_number}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] border-amber-500/50 bg-amber-500/5 text-amber-200"
                        >
                          Called
                        </Badge>
                      </div>
                      <div className="text-xs font-semibold">{ticket.customer_name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {getServiceInfo(ticket.service_id)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {getBarberInfo(ticket.barber_id)}
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1.5 border-t border-border/40">
                        <Button
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => handleQueueAction(ticket, "start")}
                        >
                          {tt.liveBoard.actions.start}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] text-amber-400"
                          onClick={() => handleQueueAction(ticket, "no_show")}
                        >
                          {tt.liveBoard.actions.noShow}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* In Service Column */}
            <div className="space-y-3 bg-card/10 p-3 rounded-xl border border-border/40">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-sm font-semibold">{tt.liveBoard.columns.in_service}</span>
                <Badge variant="outline">{liveBoardColumns.inService.length}</Badge>
              </div>
              <ScrollArea className="h-[480px]">
                <div className="space-y-2">
                  {liveBoardColumns.inService.map((ticket) => (
                    <Card
                      key={ticket.id}
                      className="border-border bg-card/30 hover:border-primary/20 transition-all p-3 space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-serif text-lg text-primary">
                          #{ticket.queue_number}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] border-emerald-500/50 bg-emerald-500/5 text-emerald-200"
                        >
                          Active
                        </Badge>
                      </div>
                      <div className="text-xs font-semibold">{ticket.customer_name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {getServiceInfo(ticket.service_id)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {getBarberInfo(ticket.barber_id)}
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1.5 border-t border-border/40">
                        <Button
                          size="sm"
                          className="h-6 px-2 text-[10px] bg-primary text-primary-foreground"
                          onClick={() => handleQueueAction(ticket, "complete")}
                        >
                          {tt.liveBoard.actions.complete}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Completed Column */}
            <div className="space-y-3 bg-card/10 p-3 rounded-xl border border-border/40">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-sm font-semibold">{tt.liveBoard.columns.completed}</span>
                <Badge variant="outline">{liveBoardColumns.completed.length}</Badge>
              </div>
              <ScrollArea className="h-[480px]">
                <div className="space-y-2">
                  {liveBoardColumns.completed.map((ticket) => (
                    <Card
                      key={ticket.id}
                      className="border-border bg-card/30 opacity-70 p-3 space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-serif text-lg text-muted-foreground">
                          #{ticket.queue_number}
                        </span>
                        <Check className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="text-xs font-semibold">{ticket.customer_name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {getServiceInfo(ticket.service_id)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {getBarberInfo(ticket.barber_id)}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>

      {/* --- ALL MODALS & DRAWERS --- */}

      {/* 1. New Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="sm:max-w-[425px] border-primary/20 bg-card/95 backdrop-blur-md text-foreground">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary">
              {tt.newBooking.title}
            </DialogTitle>
            <DialogDescription>Create a manual salon appointment reservation</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddBooking} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="bookingCustName">{tt.quickCustomer.name}</Label>
              <Input
                id="bookingCustName"
                value={bookingCustName}
                onChange={(e) => setBookingCustName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bookingCustPhone">{tt.quickCustomer.phone}</Label>
              <Input
                id="bookingCustPhone"
                value={bookingCustPhone}
                onChange={(e) => setBookingCustPhone(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="bookingTime">{tt.newBooking.time}</Label>
                <Input
                  id="bookingTime"
                  type="time"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bookingService">{tt.newBooking.service}</Label>
                <Select value={bookingServiceId} onValueChange={setBookingServiceId} required>
                  <SelectTrigger id="bookingService">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {getLocalizedName(s, lang)} ({s.price} AED)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="bookingBarber">{tt.newBooking.barber}</Label>
                <Select value={bookingBarberId} onValueChange={setBookingBarberId}>
                  <SelectTrigger id="bookingBarber">
                    <SelectValue placeholder={tt.common.noBarber} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{tt.common.noBarber}</SelectItem>
                    {barbers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {getLocalizedName(b, lang)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bookingResource">{tt.newBooking.resource}</Label>
                <Select value={bookingResourceId} onValueChange={setBookingResourceId}>
                  <SelectTrigger id="bookingResource">
                    <SelectValue placeholder={tt.common.noResource} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{tt.common.noResource}</SelectItem>
                    {resources.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {getLocalizedName(r, lang)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bookingNotes">{tt.newBooking.notes}</Label>
              <Input
                id="bookingNotes"
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowBookingModal(false)}>
                {tt.common.cancel}
              </Button>
              <Button type="submit" disabled={submittingBooking}>
                {submittingBooking ? tt.common.loading : tt.newBooking.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Walk-In Queue Modal */}
      <Dialog open={showWalkInModal} onOpenChange={setShowWalkInModal}>
        <DialogContent className="sm:max-w-[425px] border-primary/20 bg-card/95 backdrop-blur-md text-foreground">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary">
              {tt.addWalkIn.title}
            </DialogTitle>
            <DialogDescription>
              Check in a walk-in client straight to today's queue
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddWalkIn} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="walkInName">{tt.quickCustomer.name}</Label>
              <Input
                id="walkInName"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="walkInPhone">{tt.quickCustomer.phone}</Label>
              <Input
                id="walkInPhone"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="walkInService">{tt.newBooking.service}</Label>
              <Select value={walkInServiceId} onValueChange={setWalkInServiceId} required>
                <SelectTrigger id="walkInService">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {getLocalizedName(s, lang)} ({s.price} AED)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="walkInBarber">{tt.newBooking.barber}</Label>
              <Select value={walkInBarberId} onValueChange={setWalkInBarberId}>
                <SelectTrigger id="walkInBarber">
                  <SelectValue placeholder={tt.common.noBarber} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{tt.common.noBarber}</SelectItem>
                  {barbers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {getLocalizedName(b, lang)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="walkInNotes">{tt.newBooking.notes}</Label>
              <Input
                id="walkInNotes"
                value={walkInNotes}
                onChange={(e) => setWalkInNotes(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowWalkInModal(false)}>
                {tt.common.cancel}
              </Button>
              <Button type="submit" disabled={submittingWalkIn}>
                {submittingWalkIn ? tt.common.loading : tt.addWalkIn.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Quick Customer Create Modal */}
      <Dialog open={showQuickCustomerModal} onOpenChange={setShowQuickCustomerModal}>
        <DialogContent className="sm:max-w-[425px] border-primary/20 bg-card/95 backdrop-blur-md text-foreground">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary">
              {tt.quickCustomer.title}
            </DialogTitle>
            <DialogDescription>
              Quickly register a new client profile (no auth needed)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="newCustName">{tt.quickCustomer.name}</Label>
              <Input
                id="newCustName"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newCustPhone">{tt.quickCustomer.phone}</Label>
              <Input
                id="newCustPhone"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newCustWhatsApp">{tt.quickCustomer.whatsapp}</Label>
              <Input
                id="newCustWhatsApp"
                value={newCustWhatsApp}
                onChange={(e) => setNewCustWhatsApp(e.target.value)}
                placeholder="+971501234567"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newCustLang">{tt.quickCustomer.language}</Label>
              <Select value={newCustLang} onValueChange={(val) => setNewCustLang(val as Lang)}>
                <SelectTrigger id="newCustLang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowQuickCustomerModal(false)}
              >
                {tt.common.cancel}
              </Button>
              <Button type="submit" disabled={creatingCust}>
                {creatingCust ? tt.common.loading : tt.quickCustomer.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Unified Checkout Drawer */}
      <AdminCheckoutDrawer
        open={checkoutItem !== null}
        onOpenChange={(open) => !open && setCheckoutItem(null)}
        bookingId={checkoutItem?.bookingId}
        queueTicketId={checkoutItem?.ticketId}
        lang={lang}
        onSuccess={() => {
          setCheckoutItem(null);
          loadWorkspaceData();
        }}
      />

      {/* 5. Customer Lookup Drawer */}
      <Sheet open={showCustomerDrawer} onOpenChange={setShowCustomerDrawer}>
        <SheetContent
          side="right"
          className="w-[400px] sm:w-[540px] border-l border-border bg-card/95 backdrop-blur-md text-foreground"
        >
          <SheetHeader className="border-b border-border/40 pb-4">
            <SheetTitle className="font-serif text-2xl text-primary">
              {tt.customerLookup.title}
            </SheetTitle>
            <SheetDescription>
              Lookup client profiles, Spent stats, Active Packages, and recent visits history.
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-6">
            <form onSubmit={handleSearchCustomer} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={tt.customerLookup.searchPlaceholder}
                  className="pl-9"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={searchingCustomer}>
                {searchingCustomer ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  tt.actions.lookupCustomer
                )}
              </Button>
            </form>

            {searchedCustomer && (
              <div className="space-y-6">
                {/* Profile detail */}
                <div className="bg-muted/40 p-4 rounded-xl border border-border/40 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-serif text-lg">
                      {searchedCustomer.full_name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-base">{searchedCustomer.full_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {searchedCustomer.phone}
                      </div>
                    </div>
                  </div>
                  {searchedCustomer.email && (
                    <div className="text-xs text-muted-foreground pt-1">
                      Email: {searchedCustomer.email}
                    </div>
                  )}
                  {searchedCustomer.preferred_language && (
                    <div className="text-xs text-muted-foreground">
                      Language:{" "}
                      {searchedCustomer.preferred_language === "ar" ? "العربية" : "English"}
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                {customerStats && (
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-card/40 border-border/40">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <div className="text-xs text-muted-foreground">
                          {tt.customerLookup.visited}
                        </div>
                        <div className="text-2xl font-serif text-primary mt-1">
                          {customerStats.visits}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/40 border-border/40">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <div className="text-xs text-muted-foreground">
                          {tt.customerLookup.spent}
                        </div>
                        <div className="text-2xl font-serif text-primary mt-1">
                          {customerStats.spent.toFixed(2)}{" "}
                          <span className="text-xs font-sans text-muted-foreground">AED</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Packages */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-primary" /> {tt.customerLookup.packages}
                  </h3>
                  {customerPackages.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic">
                      No active package sessions
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customerPackages.map((b) => (
                        <div
                          key={b.id}
                          className="text-xs flex justify-between bg-card/30 border border-border/40 p-2.5 rounded-lg"
                        >
                          <span>{getLocalizedName(b.services, lang)}</span>
                          <span className="font-semibold text-primary">
                            {b.remaining_quantity}/{b.total_quantity} left
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Wallet balance */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <Wallet className="h-4 w-4 text-primary" /> {tt.customerLookup.wallet}
                  </h3>
                  {/* Since wallets are lookup-based, we display a handy wallet lookup field */}
                  <div className="text-xs text-muted-foreground flex justify-between items-center bg-card/30 border border-border/40 p-2.5 rounded-lg">
                    <span>Attributed Vouchers:</span>
                    <span className="font-semibold text-primary">Lookup at Checkout</span>
                  </div>
                </div>

                {/* History */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <History className="h-4 w-4 text-primary" /> {tt.customerLookup.history}
                  </h3>
                  {customerHistory.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic">
                      No past appointments found
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customerHistory.map((h) => (
                        <div
                          key={h.id}
                          className="text-xs flex justify-between items-center bg-card/20 p-2.5 rounded-lg border border-border/40"
                        >
                          <div>
                            <div className="font-medium">{getServiceInfo(h.service_id)}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {h.booking_date} {h.booking_time}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[9px] uppercase">
                            {h.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Section>
  );
}
