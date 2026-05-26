import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  DollarSign,
  CreditCard,
  Plus,
  Minus,
  Trash2,
  Percent,
  Search,
  Award,
  Wallet,
  CheckCircle,
  Scissors,
  Printer,
  Share2,
  AlertCircle,
  Sparkles,
  User,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  getActiveCashierSession,
  openCashierSession,
  executeCheckoutTransaction,
  validateDiscountCode,
  lookupVoucherBalance,
  fetchCustomerPackageBenefits,
  type CashierSessionSummary,
  type CheckoutServiceItem,
  type CheckoutProductItem,
  type CheckoutPackageUsage,
  type SplitPayment,
} from "@/lib/bookings";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LOCAL_DICT = {
  en: {
    checkoutTitle: "Unified Checkout Operations",
    cashierSession: "Cashier Session",
    sessionOpen: "Drawer open",
    sessionClosed: "No active drawer",
    openSession: "Open Drawer",
    openingCash: "Opening Cash",
    openSessionFirst: "Open a cashier session before authorizing checkout.",
    expectedCash: "Expected Cash",
    receiptTitle: "Operational Receipt",
    customer: "Customer Profile",
    wallet: "Wallet & Vouchers",
    packages: "Active Packages",
    services: "Services",
    products: "Product Catalog",
    payments: "Split Payments",
    subtotal: "Subtotal",
    discount: "Discounts & Promos",
    tips: "Staff Tip Allocation",
    tax: "Tax (5% VAT)",
    total: "NET TOTAL",
    complete: "Authorize Checkout",
    success: "Transaction Completed Successfully",
    receiptNo: "Receipt Identity",
    paymentMethods: "Payments Applied",
    searchProducts: "Search product inventory...",
    addPayment: "Add Payment Method",
    remaining: "Remaining Balance",
    fullyPaid: "Fully Settled",
    notes: "Internal cashier notes...",
    cash: "Cash",
    card: "Card / Terminal",
    transfer: "Bank Transfer",
    walletVoucher: "Wallet Voucher",
    packageRedeem: "Package Session",
    vipCustomer: "VIP Guest",
    activePackages: "Active Package Benefits",
    voucherBalance: "Voucher Balance",
    validateCode: "Validate Code",
    lookupVoucher: "Check Voucher",
    noProducts: "No products found in catalog",
    inStock: "in stock",
    searchPlaceholder: "Type to search...",
    itemPrice: "Price",
    qty: "Qty",
    amountPaid: "Amount Paid",
    changeDue: "Change Due",
    discountApplied: "Discount Applied",
    walletDrawdown: "Wallet Drawdown",
    packageBenefitUsed: "Package Session Applied",
    duplicatePrevented: "This reservation is already checked out.",
    rollbackError: "Operational failure, rolling back inventory and wallet states.",
    invalidDiscount: "Invalid discount code",
    invalidVoucher: "Voucher not active or depleted",
    close: "Dismiss",
  },
  ar: {
    checkoutTitle: "عمليات الحساب الموحد",
    cashierSession: "جلسة أمين الصندوق",
    sessionOpen: "الصندوق مفتوح",
    sessionClosed: "لا توجد جلسة صندوق نشطة",
    openSession: "فتح الصندوق",
    openingCash: "النقد الافتتاحي",
    openSessionFirst: "افتح جلسة أمين الصندوق قبل اعتماد الدفع.",
    expectedCash: "النقد المتوقع",
    receiptTitle: "فاتورة التشغيل",
    customer: "ملف العميل",
    wallet: "المحفظة والقسائم",
    packages: "الباقات النشطة",
    services: "الخدمات",
    products: "كتالوج المنتجات",
    payments: "تقسيم الدفع",
    subtotal: "المجموع الفرعي",
    discount: "الخصومات والعروض",
    tips: "توزيع إكراميات الموظفين",
    tax: "الضريبة (5% VAT)",
    total: "المجموع الصافي",
    complete: "اعتماد الحساب والدفع",
    success: "تمت المعاملة بنجاح",
    receiptNo: "هوية الفاتورة",
    paymentMethods: "المدفوعات المطبقة",
    searchProducts: "ابحث في مخزون المنتجات...",
    addPayment: "إضافة طريقة دفع",
    remaining: "المبلغ المتبقي",
    fullyPaid: "مسدد بالكامل",
    notes: "ملاحظات أمين الصندوق الداخلية...",
    cash: "نقداً",
    card: "بطاقة / شبكة",
    transfer: "تحويل بنكي",
    walletVoucher: "قسيمة محفظة",
    packageRedeem: "جلسة باقة",
    vipCustomer: "عميل VIP",
    activePackages: "منافع الباقات النشطة",
    voucherBalance: "رصيد القسيمة",
    validateCode: "تطبيق الكود",
    lookupVoucher: "التحقق من القسيمة",
    noProducts: "لم يتم العثور على منتجات",
    inStock: "في المخزن",
    searchPlaceholder: "اكتب للبحث...",
    itemPrice: "السعر",
    qty: "الكمية",
    amountPaid: "المبلغ المدفوع",
    changeDue: "الباقي للعميل",
    discountApplied: "تم تطبيق الخصم",
    walletDrawdown: "سحب من المحفظة",
    packageBenefitUsed: "تم تطبيق جلسة باقة",
    duplicatePrevented: "تمت عملية الدفع لهذا الحجز مسبقاً.",
    rollbackError: "فشل تشغيلي، تم إلغاء المعاملة واستعادة المخزون والمحفظة تلقائياً.",
    invalidDiscount: "كود الخصم غير صالح",
    invalidVoucher: "القسيمة غير نشطة أو فارغة",
    close: "إغلاق",
  },
} as const;

type CatalogProduct = {
  id: string;
  name_en: string;
  name_ar: string;
  price: number;
  stock_quantity: number;
};

type ActivePackageBenefit = {
  id: string;
  service_id: string;
  remaining_quantity: number;
  total_quantity: number;
  services: {
    title_en: string;
    title_ar: string;
  };
  customer_packages: {
    packages: {
      name_en: string;
      name_ar: string;
    };
  };
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

interface AdminCheckoutDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId?: string | null;
  queueTicketId?: string | null;
  lang: Lang;
  onSuccess?: () => void;
}

export function AdminCheckoutDrawer({
  open,
  onOpenChange,
  bookingId,
  queueTicketId,
  lang,
  onSuccess,
}: AdminCheckoutDrawerProps) {
  const t = LOCAL_DICT[lang];

  // Core checkout states
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cashierBusy, setCashierBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [customer, setCustomer] = useState<{
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  } | null>(null);
  const [cashierSession, setCashierSession] = useState<CashierSessionSummary>({ active: false });
  const [openingCash, setOpeningCash] = useState("0");
  const [services, setServices] = useState<CheckoutServiceItem[]>([]);
  const [products, setProducts] = useState<CheckoutProductItem[]>([]);
  const [tips, setTips] = useState<number>(0);
  const [walletAmount, setWalletAmount] = useState<number>(0);
  const [packageUsage, setPackageUsage] = useState<CheckoutPackageUsage[]>([]);
  const [membershipDiscount, setMembershipDiscount] = useState<number>(0);
  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherDrawdown, setVoucherDrawdown] = useState<number>(0);
  const [notes, setNotes] = useState("");

  // Split payment list
  const [payments, setPayments] = useState<SplitPayment[]>([{ method: "card", amount: 0 }]);

  // Product catalog search
  const [searchQuery, setSearchQuery] = useState("");
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [activePackages, setActivePackages] = useState<ActivePackageBenefit[]>([]);

  // Calculated results from the database preview
  const [previewTotals, setPreviewTotals] = useState({
    subtotal: 0,
    discountAmount: 0,
    walletAmount: 0,
    packageAmount: 0,
    taxAmount: 0,
    tipsAmount: 0,
    totalAmount: 0,
    receiptNumber: "PREVIEW-ONLY",
    transactionId: "",
  });

  // Load core details on mount/open
  useEffect(() => {
    if (open) {
      loadCheckoutDetails();
      loadCashierSession();
      setSuccess(false);
    }
  }, [open, bookingId, queueTicketId]);

  // Auto-run checkout calculation preview when services, products, discounts, tips, or vouchers change
  useEffect(() => {
    if (open && customer) {
      calculatePreview();
    }
  }, [services, products, tips, discountAmount, voucherDrawdown, packageUsage]);

  const loadCashierSession = async () => {
    const res = await getActiveCashierSession();
    if (res.success) {
      setCashierSession(res.session);
    }
  };

  const handleOpenCashierSession = async () => {
    try {
      setCashierBusy(true);
      const res = await openCashierSession({
        openingCash: Number(openingCash || 0),
      });

      if (res.success) {
        setCashierSession(res.session);
        toast.success(lang === "ar" ? "تم فتح جلسة أمين الصندوق" : "Cashier session opened");
      } else {
        toast.error(res.error || t.openSessionFirst);
      }
    } finally {
      setCashierBusy(false);
    }
  };

  const loadCheckoutDetails = async () => {
    try {
      setLoading(true);
      let customerPhone = "";
      let customerName = "";
      let customerId = "";
      let initialServices: CheckoutServiceItem[] = [];

      // 1. Fetch booking or queue ticket details
      if (bookingId) {
        const { data: booking, error: bookingErr } = await supabase
          .from("bookings")
          .select("*, customers(*), services(*)")
          .eq("id", bookingId)
          .single();

        if (bookingErr) throw bookingErr;

        customerPhone = booking.customer_phone;
        customerName = booking.customer_name;
        customerId = booking.customer_id || "";

        if (booking.services) {
          initialServices = [
            {
              service_id: booking.services.id,
              name: lang === "ar" ? booking.services.title_ar : booking.services.title_en,
              price: Number(booking.services.price),
              qty: 1,
              staff_id: booking.barber_id,
              discount: 0,
              resource_id: null,
              snapshot: {
                name: lang === "ar" ? booking.services.title_ar : booking.services.title_en,
                price: Number(booking.services.price),
                duration: booking.services.duration_minutes,
              },
            },
          ];
        }
      } else if (queueTicketId) {
        const { data: ticket, error: ticketErr } = await supabase
          .from("queue_tickets")
          .select("*, customers(*), services(*)")
          .eq("id", queueTicketId)
          .single();

        if (ticketErr) throw ticketErr;

        customerPhone = ticket.customer_phone;
        customerName = ticket.customer_name;
        customerId = ticket.customer_id || "";

        if (ticket.services) {
          initialServices = [
            {
              service_id: ticket.services.id,
              name: lang === "ar" ? ticket.services.title_ar : ticket.services.title_en,
              price: Number(ticket.services.price),
              qty: 1,
              staff_id: ticket.barber_id,
              discount: 0,
              resource_id: null,
              snapshot: {
                name: lang === "ar" ? ticket.services.title_ar : ticket.services.title_en,
                price: Number(ticket.services.price),
                duration: ticket.services.duration_minutes,
              },
            },
          ];
        }
      }

      // If no customer record is associated but phone exists, resolve customer profile
      if (!customerId && customerPhone) {
        const { data: cust } = await supabase
          .from("customers")
          .select("*")
          .eq("phone", customerPhone.trim())
          .maybeSingle();
        if (cust) {
          customerId = cust.id;
        }
      }

      setCustomer({
        id: customerId,
        name: customerName,
        phone: customerPhone,
      });

      setServices(initialServices);

      // Load products catalog initially
      const { data: prods } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name_en");
      setCatalogProducts(prods || []);

      // Load package benefits
      if (customerId && customerPhone) {
        const pkgs = await fetchCustomerPackageBenefits(publicDefaultBusinessId(), customerPhone);
        setActivePackages(pkgs || []);
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Failed to load checkout session."));
    } finally {
      setLoading(false);
    }
  };

  const publicDefaultBusinessId = () => {
    return "00000000-0000-0000-0000-000000000000"; // fallback
  };

  // Live total preview via RPC preview mode
  const calculatePreview = async () => {
    if (!customer) return;
    try {
      const res = await executeCheckoutTransaction({
        action: "preview",
        bookingId,
        queueTicketId,
        customerId: customer.id,
        services,
        products,
        tips,
        walletAmount: voucherDrawdown,
        packageUsage,
        membershipDiscount,
        discount: discountAmount,
        discountCode: discountCode.trim() || undefined,
        tax: previewTotals.taxAmount, // Server recalculated
        payments:
          voucherDrawdown > 0 && voucherCode.trim()
            ? [{ method: "wallet_reference", amount: 0, wallet_code: voucherCode.trim() }]
            : [],
      });

      if (res.success && res.result) {
        setPreviewTotals({
          subtotal: res.result.subtotal,
          discountAmount: res.result.discountAmount,
          walletAmount: res.result.walletAmount,
          packageAmount: res.result.packageAmount,
          taxAmount: res.result.taxAmount,
          tipsAmount: res.result.tipsAmount,
          totalAmount: res.result.totalAmount,
          receiptNumber: res.result.receiptNumber,
          transactionId: "",
        });

        // Initialize payments list to equal total
        setPayments([{ method: "card", amount: res.result.totalAmount }]);
      }
    } catch (err) {
      console.error("Preview failed:", err);
    }
  };

  // Add product to checkout list
  const addProductToCheckout = (prod: CatalogProduct) => {
    const existing = products.find((p) => p.product_id === prod.id);
    if (existing) {
      setProducts(products.map((p) => (p.product_id === prod.id ? { ...p, qty: p.qty + 1 } : p)));
    } else {
      setProducts([
        ...products,
        {
          product_id: prod.id,
          name: lang === "ar" ? prod.name_ar : prod.name_en,
          price: Number(prod.price),
          qty: 1,
          discount: 0,
          snapshot: {
            name: lang === "ar" ? prod.name_ar : prod.name_en,
            price: Number(prod.price),
          },
        },
      ]);
    }
    toast.success(`${lang === "ar" ? prod.name_ar : prod.name_en} added`);
  };

  // Remove or decrement product quantity
  const decrementProduct = (prodId: string) => {
    const existing = products.find((p) => p.product_id === prodId);
    if (!existing) return;
    if (existing.qty > 1) {
      setProducts(products.map((p) => (p.product_id === prodId ? { ...p, qty: p.qty - 1 } : p)));
    } else {
      setProducts(products.filter((p) => p.product_id !== prodId));
    }
  };

  const incrementProduct = (prodId: string) => {
    setProducts(products.map((p) => (p.product_id === prodId ? { ...p, qty: p.qty + 1 } : p)));
  };

  // Validate Promo discount code
  const handleValidateDiscount = async () => {
    if (!discountCode.trim()) return;
    try {
      const res = await validateDiscountCode(discountCode, "00000000-0000-0000-0000-000000000000");
      if (res.valid && res.discount) {
        let amt = 0;
        const sub = previewTotals.subtotal;
        if (res.discount.type === "percentage") {
          amt = (sub * res.discount.amount) / 100;
        } else {
          amt = res.discount.amount;
        }
        setDiscountAmount(Math.min(amt, sub));
        toast.success(`${t.discountApplied}: -${amt.toFixed(2)} AED`);
      } else {
        toast.error(t.invalidDiscount);
      }
    } catch (err) {
      toast.error(t.invalidDiscount);
    }
  };

  // Lookup Wallet Voucher Code drawdown
  const handleVoucherLookup = async () => {
    if (!voucherCode.trim()) return;
    try {
      const res = await lookupVoucherBalance(voucherCode, "00000000-0000-0000-0000-000000000000");
      if (res.found && res.balance !== undefined) {
        const remaining = Math.max(0, previewTotals.subtotal - discountAmount);
        const drawdown = Math.min(res.balance, remaining);
        setVoucherDrawdown(drawdown);
        toast.success(
          `${t.walletDrawdown}: -${drawdown.toFixed(2)} AED (${res.balance - drawdown} remaining)`,
        );
      } else {
        toast.error(t.invalidVoucher);
      }
    } catch (err) {
      toast.error(t.invalidVoucher);
    }
  };

  // Package Benefit Redeem session
  const redeemPackageBenefit = (benefit: ActivePackageBenefit) => {
    // Look up service in the checkout list
    const hasService = services.find((s) => s.service_id === benefit.service_id);
    if (!hasService) {
      toast.error(
        lang === "ar"
          ? "هذه الباقة لا تنطبق على الخدمات المحددة"
          : "This package is not applicable to any listed service.",
      );
      return;
    }

    const usage: CheckoutPackageUsage = {
      benefit_id: benefit.id,
      service_id: benefit.service_id,
      qty: 1,
    };

    setPackageUsage([...packageUsage, usage]);

    // Automatically apply a 100% discount on that service
    setServices(
      services.map((s) => (s.service_id === benefit.service_id ? { ...s, discount: s.price } : s)),
    );
    toast.success(t.packageBenefitUsed);
  };

  // Authorize atomic transactional write
  const handleAuthorizeCheckout = async () => {
    if (!customer) return;

    if (!cashierSession.active) {
      toast.error(t.openSessionFirst);
      return;
    }

    // Validate payments equal total
    const sum = payments.reduce((acc, p) => acc + Number(p.amount), 0);
    if (Math.abs(sum - previewTotals.totalAmount) > 0.02) {
      toast.error(
        lang === "ar"
          ? `المجموع الموزع (${sum.toFixed(2)}) لا يساوي المجموع الصافي المطلق (${previewTotals.totalAmount.toFixed(2)}).`
          : `Sum of payments (${sum.toFixed(2)}) must exactly equal Net Total (${previewTotals.totalAmount.toFixed(2)}).`,
      );
      return;
    }

    try {
      setBusy(true);
      const res = await executeCheckoutTransaction({
        action: "complete",
        bookingId,
        queueTicketId,
        customerId: customer.id,
        services,
        products,
        tips,
        walletAmount: voucherDrawdown,
        packageUsage,
        membershipDiscount,
        discount: discountAmount,
        discountCode: discountCode.trim() || undefined,
        tax: previewTotals.taxAmount,
        payments:
          voucherDrawdown > 0 && voucherCode.trim()
            ? [
                ...payments,
                { method: "wallet_reference", amount: 0, wallet_code: voucherCode.trim() },
              ]
            : payments,
        notes: notes || undefined,
      });

      if (res.success && res.result) {
        setPreviewTotals((prev) => ({
          ...prev,
          receiptNumber: res.result.receiptNumber,
          transactionId: res.result.transactionId,
        }));
        setSuccess(true);
        toast.success(t.success);
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.error || t.rollbackError);
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, t.rollbackError));
    } finally {
      setBusy(false);
    }
  };

  // Filtering products list
  const filteredProducts = catalogProducts.filter(
    (p) =>
      p.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name_ar.includes(searchQuery),
  );

  // Manage split payment additions
  const adjustPaymentAmount = (index: number, val: number) => {
    const list = [...payments];
    list[index].amount = Number(val);
    setPayments(list);
  };

  const removePaymentMethod = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const addSplitPaymentMethod = (method: "cash" | "card" | "transfer") => {
    // Calculate remaining sum
    const sum = payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const diff = Math.max(0, previewTotals.totalAmount - sum);
    setPayments([...payments, { method, amount: diff }]);
  };

  const getPaymentLabel = (method: string) => {
    if (method === "cash") return t.cash;
    if (method === "card") return t.card;
    return t.transfer;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={lang === "ar" ? "left" : "right"}
        className="w-full sm:max-w-[1100px] p-0 bg-background/95 backdrop-blur-xl border-border/40 text-foreground flex flex-col h-full"
      >
        {/* Success Screen Overlay */}
        {success ? (
          <div className="absolute inset-0 bg-background/98 flex flex-col items-center justify-center p-8 z-[60] overflow-y-auto">
            <div className="w-full max-w-md bg-secondary/30 border border-border/60 rounded-2xl p-8 backdrop-blur-md shadow-2xl flex flex-col items-center">
              <div className="bg-emerald-500/10 p-4 rounded-full border border-emerald-500/30 mb-4 animate-bounce">
                <CheckCircle className="h-10 w-10 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-emerald-400 mb-2">{t.success}</h2>
              <span className="text-sm text-muted-foreground mb-6">Casa Operational Core</span>

              <div className="w-full space-y-3 bg-secondary/50 rounded-xl p-5 border border-border/40 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.receiptNo}:</span>
                  <span className="font-semibold text-foreground tracking-wider">
                    {previewTotals.receiptNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.customer}:</span>
                  <span className="font-medium text-foreground">{customer?.name}</span>
                </div>
                <Separator className="bg-border/40" />
                <div className="flex justify-between text-base font-bold">
                  <span>{t.total}:</span>
                  <span className="text-emerald-400">
                    {previewTotals.totalAmount.toFixed(2)} AED
                  </span>
                </div>
              </div>

              <div className="w-full grid grid-cols-2 gap-3 mt-8">
                <Button
                  variant="outline"
                  className="gap-2 border-border/60"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4" /> {lang === "ar" ? "طباعة" : "Print"}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-border/60"
                  onClick={() => toast.success("WhatsApp receipt queued")}
                >
                  <Share2 className="h-4 w-4" /> {lang === "ar" ? "مشاركة" : "WhatsApp"}
                </Button>
              </div>

              <Button
                className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                onClick={() => onOpenChange(false)}
              >
                {t.close}
              </Button>
            </div>
          </div>
        ) : null}

        {/* Drawer Header */}
        <SheetHeader
          className={cn(
            "p-6 border-b border-border/40 bg-secondary/20",
            lang === "ar" ? "text-right sm:text-right" : "text-left sm:text-left",
          )}
        >
          <div className="flex justify-between items-center">
            <div>
              <SheetTitle className="text-xl font-bold bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                {t.checkoutTitle}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1">
                Casa Operating Cockpit &bull; Unified Front-Desk Core
              </SheetDescription>
            </div>
            {customer && (
              <Badge className="bg-amber-500/10 text-amber-200 border border-amber-500/30 gap-1.5 px-3 py-1">
                <Sparkles className="h-3 w-3 text-amber-400" />
                {customer.name}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Resolving financial entities...</span>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Operational Workspace (60%) */}
            <div className="w-full lg:w-[60%] border-r border-border/40 flex flex-col h-full overflow-hidden bg-background">
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {/* Guest Profile Section */}
                  <div className="p-4 rounded-xl border border-border/40 bg-secondary/10 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{customer?.name}</h3>
                      <span className="text-xs text-muted-foreground">{customer?.phone}</span>
                    </div>
                  </div>

                  {/* Services List */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-primary/70">
                      {t.services}
                    </h3>
                    <div className="space-y-2">
                      {services.map((svc, idx) => (
                        <div
                          key={svc.service_id}
                          className="flex justify-between items-center p-3 rounded-lg border border-border/30 bg-secondary/5"
                        >
                          <div className="flex items-center gap-2">
                            <Scissors className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="font-medium text-sm">{svc.name}</span>
                              {svc.discount > 0 && (
                                <Badge className="ml-2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px]">
                                  {t.packageBenefitUsed}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <span className="font-semibold text-sm">{svc.price} AED</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Added Products List */}
                  {products.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-primary/70">
                        Added Products
                      </h3>
                      <div className="space-y-2">
                        {products.map((prod) => (
                          <div
                            key={prod.product_id}
                            className="flex justify-between items-center p-3 rounded-lg border border-border/30 bg-secondary/5"
                          >
                            <span className="font-medium text-sm">{prod.name}</span>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 bg-secondary/40 border border-border/40 rounded-md p-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => decrementProduct(prod.product_id)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-xs font-semibold px-2">{prod.qty}</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => incrementProduct(prod.product_id)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <span className="font-semibold text-sm">
                                {prod.price * prod.qty} AED
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Operational Tabs (Products Search, Packages, Wallets) */}
                  <Tabs defaultValue="products" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-secondary/30 border border-border/40 p-1 rounded-xl">
                      <TabsTrigger value="products" className="rounded-lg">
                        {t.products}
                      </TabsTrigger>
                      <TabsTrigger value="packages" className="rounded-lg">
                        {t.packages}
                      </TabsTrigger>
                      <TabsTrigger value="wallet" className="rounded-lg">
                        {t.wallet}
                      </TabsTrigger>
                    </TabsList>

                    {/* Product Catalog Search Tab */}
                    <TabsContent value="products" className="pt-4 space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t.searchProducts}
                          className="pl-9 bg-secondary/20 border-border/40"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map((prod) => (
                            <div
                              key={prod.id}
                              className="p-3 rounded-lg border border-border/30 bg-secondary/10 flex justify-between items-center hover:bg-secondary/20 transition-all"
                            >
                              <div>
                                <h4 className="font-semibold text-xs text-foreground">
                                  {lang === "ar" ? prod.name_ar : prod.name_en}
                                </h4>
                                <span className="text-[10px] text-muted-foreground">
                                  {prod.price} AED &bull; {prod.stock_quantity} {t.inStock}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 border-primary/30 text-primary hover:bg-primary/10 gap-1"
                                onClick={() => addProductToCheckout(prod)}
                              >
                                <Plus className="h-3 w-3" /> {lang === "ar" ? "إضافة" : "Add"}
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-2 text-center py-6 text-xs text-muted-foreground">
                            {t.noProducts}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* Active Package Redeems Tab */}
                    <TabsContent value="packages" className="pt-4 space-y-3">
                      <div className="space-y-2">
                        {activePackages.length > 0 ? (
                          activePackages.map((benefit) => (
                            <div
                              key={benefit.id}
                              className="p-3 rounded-lg border border-border/30 bg-secondary/15 flex justify-between items-center"
                            >
                              <div className="flex items-center gap-2">
                                <Award className="h-4 w-4 text-amber-400" />
                                <div>
                                  <h4 className="font-semibold text-xs">
                                    {lang === "ar"
                                      ? benefit.services.title_ar
                                      : benefit.services.title_en}
                                  </h4>
                                  <span className="text-[10px] text-amber-300 font-medium">
                                    {lang === "ar"
                                      ? benefit.customer_packages.packages.name_ar
                                      : benefit.customer_packages.packages.name_en}
                                    ({benefit.remaining_quantity} / {benefit.total_quantity} left)
                                  </span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="h-7 bg-amber-500/10 border border-amber-500/30 text-amber-200 hover:bg-amber-500/20"
                                onClick={() => redeemPackageBenefit(benefit)}
                              >
                                Redeem Session
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-xs text-muted-foreground flex flex-col items-center gap-1.5">
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            {lang === "ar"
                              ? "لا توجد باقات نشطة لدى هذا العميل"
                              : "No active packages found for this customer profile."}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* Wallet Drawer / Voucher Lookup Tab */}
                    <TabsContent value="wallet" className="pt-4 space-y-4">
                      {/* Promo Code Input */}
                      <div className="grid grid-cols-3 gap-2 items-end">
                        <div className="col-span-2">
                          <Label htmlFor="promo" className="text-xs font-semibold">
                            {t.discount}
                          </Label>
                          <Input
                            id="promo"
                            placeholder="PROMO2026"
                            className="bg-secondary/20 border-border/40 mt-1"
                            value={discountCode}
                            onChange={(e) => setDiscountCode(e.target.value)}
                          />
                        </div>
                        <Button
                          variant="outline"
                          className="border-border/60 hover:bg-secondary"
                          onClick={handleValidateDiscount}
                        >
                          {t.validateCode}
                        </Button>
                      </div>

                      <Separator className="bg-border/30" />

                      {/* Wallet Voucher Code Drawdown */}
                      <div className="grid grid-cols-3 gap-2 items-end">
                        <div className="col-span-2">
                          <Label htmlFor="voucher" className="text-xs font-semibold">
                            {t.wallet}
                          </Label>
                          <Input
                            id="voucher"
                            placeholder="CASA-VOUCH-XXXX"
                            className="bg-secondary/20 border-border/40 mt-1"
                            value={voucherCode}
                            onChange={(e) => setVoucherCode(e.target.value)}
                          />
                        </div>
                        <Button
                          variant="outline"
                          className="border-border/60 hover:bg-secondary"
                          onClick={handleVoucherLookup}
                        >
                          {t.lookupVoucher}
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </ScrollArea>
            </div>

            {/* Right Receipt & Split Payments Cockpit (40%) */}
            <div className="w-[40%] hidden lg:flex flex-col bg-secondary/15 h-full overflow-hidden border-l border-border/40">
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-primary/70">
                    {t.receiptTitle}
                  </h3>

                  {/* Cashier Session Gate */}
                  <div className="space-y-3 rounded-xl border border-border/40 bg-background/50 p-4 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold uppercase tracking-wider text-primary/70">
                          {t.cashierSession}
                        </h3>
                        <p className="mt-1 text-muted-foreground">
                          {cashierSession.active ? t.sessionOpen : t.sessionClosed}
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          "border",
                          cashierSession.active
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-rose-500/30 bg-rose-500/10 text-rose-300",
                        )}
                      >
                        {cashierSession.active ? "OPEN" : "CLOSED"}
                      </Badge>
                    </div>

                    {cashierSession.active ? (
                      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/30 bg-secondary/15 p-3">
                        <div>
                          <span className="text-muted-foreground">{t.openingCash}</span>
                          <p className="font-semibold text-foreground">
                            {(cashierSession.opening_cash || 0).toFixed(2)} AED
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t.expectedCash}</span>
                          <p className="font-semibold text-foreground">
                            {(cashierSession.expected_cash || 0).toFixed(2)} AED
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <Input
                          type="number"
                          min="0"
                          className="h-9 bg-background/80 text-right"
                          value={openingCash}
                          onChange={(event) => setOpeningCash(event.target.value)}
                          placeholder={t.openingCash}
                        />
                        <Button
                          size="sm"
                          className="h-9 bg-primary text-primary-foreground hover:bg-primary/90"
                          disabled={cashierBusy}
                          onClick={handleOpenCashierSession}
                        >
                          {cashierBusy ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            t.openSession
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Detailed Breakdown */}
                  <div className="space-y-3 bg-background/50 border border-border/40 rounded-xl p-4 text-xs font-medium">
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t.subtotal}</span>
                      <span>{previewTotals.subtotal.toFixed(2)} AED</span>
                    </div>

                    {previewTotals.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>{t.discountApplied}</span>
                        <span>-{previewTotals.discountAmount.toFixed(2)} AED</span>
                      </div>
                    )}

                    {previewTotals.packageAmount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>{t.packageBenefitUsed}</span>
                        <span>-{previewTotals.packageAmount.toFixed(2)} AED</span>
                      </div>
                    )}

                    {previewTotals.walletAmount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>{t.walletDrawdown}</span>
                        <span>-{previewTotals.walletAmount.toFixed(2)} AED</span>
                      </div>
                    )}

                    {/* Tip Entry */}
                    <Separator className="bg-border/30" />
                    <div className="flex items-center justify-between py-1">
                      <Label htmlFor="tip" className="text-muted-foreground text-xs">
                        {t.tips}
                      </Label>
                      <Input
                        id="tip"
                        type="number"
                        placeholder="0.00"
                        className="w-20 h-7 bg-background/80 border-border/40 text-right font-semibold text-xs"
                        value={tips || ""}
                        onChange={(e) => setTips(Number(e.target.value))}
                      />
                    </div>

                    <div className="flex justify-between text-muted-foreground text-[10px]">
                      <span>{t.tax}</span>
                      <span>{previewTotals.taxAmount.toFixed(2)} AED</span>
                    </div>

                    <Separator className="bg-border/30" />

                    {/* Grand NET Total Box */}
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex justify-between items-center text-sm font-bold">
                      <span className="text-foreground">{t.total}</span>
                      <span className="text-xl text-primary tracking-tight font-black">
                        {previewTotals.totalAmount.toFixed(2)} AED
                      </span>
                    </div>
                  </div>

                  {/* Split Payments Allocation */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-primary/70">
                        {t.payments}
                      </h3>
                      <Badge className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                        {t.remaining}:{" "}
                        {Math.max(
                          0,
                          previewTotals.totalAmount -
                            payments.reduce((acc, p) => acc + p.amount, 0),
                        ).toFixed(2)}{" "}
                        AED
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {payments.map((pmt, idx) => (
                        <div
                          key={idx}
                          className="flex gap-2 items-center bg-background/50 border border-border/30 rounded-lg p-2"
                        >
                          <span className="text-xs font-bold w-24 text-muted-foreground px-2">
                            {getPaymentLabel(pmt.method)}
                          </span>
                          <Input
                            type="number"
                            className="h-8 bg-background border-border/40 text-right font-semibold text-xs flex-1"
                            value={pmt.amount || ""}
                            onChange={(e) => adjustPaymentAmount(idx, Number(e.target.value))}
                          />
                          {payments.length > 1 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-rose-400"
                              onClick={() => removePaymentMethod(idx)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Split Quick Selectors */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-7 border-border/40"
                        onClick={() => addSplitPaymentMethod("cash")}
                      >
                        + {t.cash}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-7 border-border/40"
                        onClick={() => addSplitPaymentMethod("card")}
                      >
                        + {t.card}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-7 border-border/40"
                        onClick={() => addSplitPaymentMethod("transfer")}
                      >
                        + {t.transfer}
                      </Button>
                    </div>
                  </div>

                  {/* Notes Field */}
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-xs font-semibold text-muted-foreground">
                      Internal Notes
                    </Label>
                    <textarea
                      id="notes"
                      placeholder={t.notes}
                      className="w-full h-16 bg-background/50 border border-border/40 rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </ScrollArea>

              {/* Bottom Authorization Button */}
              <div className="p-6 border-t border-border/40 bg-secondary/35">
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm py-5 tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg shadow-primary/20 rounded-xl"
                  disabled={busy || !cashierSession.active}
                  onClick={handleAuthorizeCheckout}
                >
                  {busy ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <DollarSign className="h-4 w-4" />
                  )}
                  {t.complete}
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
