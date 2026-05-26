import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  DollarSign,
  LogOut,
  Receipt,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { Section } from "@/components/casa/Section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth-context";
import { useBusinessContext } from "@/lib/business-context";
import type { Lang } from "@/lib/i18n";
import { localePath, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type RangePreset = "today" | "7d" | "30d" | "custom";

type Expense = {
  id: string;
  amount: number | string | null;
  date: string;
  expense_name: string;
};

type BarberRow = {
  id: string;
  name_en: string;
  name_ar: string;
};

type CheckoutTransaction = {
  id: string;
  business_id: string;
  cashier_session_id: string | null;
  created_at: string;
  discount_amount: number | string | null;
  membership_amount: number | string | null;
  package_amount: number | string | null;
  payment_status: string;
  payments: Json;
  receipt_number: string;
  refund_status: string;
  refunded_amount: number | string | null;
  tax_amount: number | string | null;
  tips_amount: number | string | null;
  total_amount: number | string | null;
  transaction_type?: string | null;
  wallet_amount: number | string | null;
};

type CheckoutItem = {
  id: string;
  business_id: string;
  created_at: string;
  discount: number | string | null;
  name: string;
  product_snapshot: Json | null;
  qty: number | string | null;
  service_snapshot: Json | null;
  staff_id: string | null;
  staff_snapshot?: Json | null;
  total: number | string | null;
  transaction_id: string;
  type: string;
  unit_price: number | string | null;
};

type LedgerEntry = {
  id: string;
  checkout_transaction_id: string | null;
  entry_type: string;
  amount: number | string;
  direction: "debit" | "credit";
  category: string;
  created_at: string;
};

type CashierSession = {
  id: string;
  opened_by: string;
  opened_at: string;
  closed_at: string | null;
  opening_cash: number | string;
  expected_cash: number | string;
  actual_cash: number | string;
  variance: number | string;
  status: string;
};

type InventoryMovement = {
  product_id: string;
  checkout_transaction_id: string | null;
  qty_delta: number;
  movement_type: string;
  created_at: string;
};

type ReportQueryResult = { data: unknown; error: { message: string } | null };
type ReportFilterQuery = PromiseLike<ReportQueryResult> & {
  eq(column: string, value: unknown): ReportFilterQuery;
  gte(column: string, value: unknown): ReportFilterQuery;
  lte(column: string, value: unknown): ReportFilterQuery;
};
type ReportQueryBuilder = {
  select(columns: string): ReportFilterQuery;
};
const reportFrom = (relation: string) =>
  (supabase as unknown as { from(relation: string): ReportQueryBuilder }).from(relation);

type FinancialSummary = {
  serviceRevenue: number;
  productRevenue: number;
  grossRevenue: number;
  refunds: number;
  netRevenue: number;
  expenses: number;
  netProfit: number;
  walletUsage: number;
  packageUsage: number;
  discounts: number;
  tips: number;
  commissions: number;
  tax: number;
  averageTicket: number;
  transactionCount: number;
};

type PaymentMethodSummary = {
  cash: number;
  card: number;
  transfer: number;
  wallet: number;
  other: number;
};

type StaffFinancialSummary = {
  staffId: string;
  staffName: string;
  serviceRevenue: number;
  completedServices: number;
  tips: number;
  commissions: number;
  averageServiceValue: number;
};

type NamedSummary = {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
  discounts: number;
  tips: number;
  commissions: number;
  refunds?: number;
  stockMovement?: number;
};

type CashierSessionSummary = {
  sessionId: string;
  cashier: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  expectedCash: number;
  actualCash: number;
  variance: number;
  transactionCount: number;
  cashPaymentTotal: number;
  status: string;
};

const LOCAL_DICT = {
  en: {
    eyebrow: "Reports",
    title: "Financial Reports",
    intro: "Checkout, ledger, cashier sessions, refunds, and inventory movements.",
    checkoutSource: "Checkout source of truth",
    serviceRevenue: "Service Revenue",
    productRevenue: "Product Revenue",
    grossRevenue: "Gross Revenue",
    refunds: "Refunds",
    netRevenue: "Net Revenue",
    totalExpenses: "Total Expenses",
    netProfit: "Net Profit",
    walletUsage: "Wallet Usage",
    packageUsage: "Package Usage",
    discounts: "Discounts",
    tax: "Tax",
    totalCommissions: "Commissions",
    totalTips: "Tips",
    avgTicketSize: "Avg. Ticket",
    transactions: "Transactions",
    staffPerformance: "Staff Financials",
    servicePerformance: "Service Financials",
    productPerformance: "Product Financials",
    dailyBreakdown: "Daily Breakdown",
    paymentMethods: "Split Payments",
    cashierSessions: "Cashier Sessions",
    topExpenses: "Top Expenses",
    staff: "Staff",
    service: "Service",
    product: "Product",
    quantity: "Qty",
    revenue: "Revenue",
    commission: "Commission",
    tips: "Tips",
    stock: "Stock",
    dateRange: "Date Range",
    today: "Today",
    last7: "Last 7 Days",
    last30: "Last 30 Days",
    refresh: "Refresh",
    loading: "Loading...",
    noData: "No financial data for this period.",
    cash: "Cash",
    card: "Card",
    transfer: "Transfer",
    wallet: "Wallet",
    other: "Other",
    opened: "Opened",
    closed: "Closed",
    active: "Active",
    expectedCash: "Expected Cash",
    actualCash: "Actual Cash",
    variance: "Variance",
    currency: "AED",
  },
  ar: {
    eyebrow: "التقارير",
    title: "التقارير المالية",
    intro: "الخروج المالي، دفتر القيود، جلسات الكاشير، الاستردادات، وحركة المخزون.",
    checkoutSource: "مصدر الحقيقة: الخروج المالي",
    serviceRevenue: "إيرادات الخدمات",
    productRevenue: "إيرادات المنتجات",
    grossRevenue: "إجمالي الإيرادات",
    refunds: "الاستردادات",
    netRevenue: "صافي الإيرادات",
    totalExpenses: "إجمالي المصاريف",
    netProfit: "صافي الربح",
    walletUsage: "استخدام المحفظة",
    packageUsage: "استخدام الباقات",
    discounts: "الخصومات",
    tax: "الضريبة",
    totalCommissions: "العمولات",
    totalTips: "البقاشيش",
    avgTicketSize: "متوسط الفاتورة",
    transactions: "المعاملات",
    staffPerformance: "ماليات الموظفين",
    servicePerformance: "ماليات الخدمات",
    productPerformance: "ماليات المنتجات",
    dailyBreakdown: "التفصيل اليومي",
    paymentMethods: "الدفعات المقسمة",
    cashierSessions: "جلسات الكاشير",
    topExpenses: "أعلى المصاريف",
    staff: "الموظف",
    service: "الخدمة",
    product: "المنتج",
    quantity: "الكمية",
    revenue: "الإيرادات",
    commission: "العمولة",
    tips: "البقاشيش",
    stock: "المخزون",
    dateRange: "نطاق التاريخ",
    today: "اليوم",
    last7: "آخر 7 أيام",
    last30: "آخر 30 يوماً",
    refresh: "تحديث",
    loading: "جارٍ التحميل...",
    noData: "لا توجد بيانات مالية لهذه الفترة.",
    cash: "نقداً",
    card: "بطاقة",
    transfer: "تحويل",
    wallet: "محفظة",
    other: "أخرى",
    opened: "مفتوحة",
    closed: "مغلقة",
    active: "نشطة",
    expectedCash: "النقد المتوقع",
    actualCash: "النقد الفعلي",
    variance: "الفرق",
    currency: "د.إ",
  },
} as const;

const todayIso = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const toNumber = (value: number | string | null | undefined) => {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value: number, lang: Lang) =>
  new Intl.NumberFormat(lang === "ar" ? "ar-AE" : "en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

const asRecord = (value: Json | null | undefined): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};

const snapshotId = (snapshot: Json | null | undefined, keys: string[]) => {
  const record = asRecord(snapshot);
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value) return value;
  }
  return null;
};

const normalizePaymentMethod = (method: unknown): keyof PaymentMethodSummary => {
  if (typeof method !== "string") return "other";
  const clean = method.toLowerCase();
  if (clean.includes("cash")) return "cash";
  if (clean.includes("card") || clean.includes("online")) return "card";
  if (clean.includes("transfer") || clean.includes("bank")) return "transfer";
  if (clean.includes("wallet")) return "wallet";
  return "other";
};

const readPayments = (payments: Json): { method: keyof PaymentMethodSummary; amount: number }[] => {
  if (!Array.isArray(payments)) return [];
  return payments
    .map((payment) => {
      const record = asRecord(payment);
      return {
        method: normalizePaymentMethod(record.method),
        amount: toNumber(record.amount as number | string | null | undefined),
      };
    })
    .filter((payment) => payment.amount > 0);
};

const staffNameFromItem = (item: CheckoutItem, barbers: Map<string, BarberRow>, lang: Lang) => {
  const snapshot = asRecord(item.staff_snapshot);
  const snapshotName = lang === "ar" ? snapshot.name_ar : snapshot.name_en;
  if (typeof snapshotName === "string" && snapshotName) return snapshotName;
  const barber = item.staff_id ? barbers.get(item.staff_id) : undefined;
  return barber ? (lang === "ar" ? barber.name_ar : barber.name_en) : "—";
};

export function AdminReportsPage({ lang }: { lang: Lang }) {
  const dd = LOCAL_DICT[lang];
  const tt = t(lang);
  const auth = useAuth();
  const businessContext = useBusinessContext();
  const business = businessContext.business;
  const canAccess =
    auth.isAdmin ||
    ["business_owner", "business_admin", "business_manager", "cashier"].includes(
      businessContext.currentUserRole ?? "",
    );

  const [transactions, setTransactions] = useState<CheckoutTransaction[]>([]);
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [cashierSessions, setCashierSessions] = useState<CashierSession[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rangePreset, setRangePreset] = useState<RangePreset>("30d");
  const [customStart, setCustomStart] = useState(addDays(todayIso(), -29));
  const [customEnd, setCustomEnd] = useState(todayIso());

  const loginHref = `${localePath(lang, "/login")}?redirect=${encodeURIComponent(
    localePath(lang, "/admin/reports"),
  )}`;

  const dateRange = useMemo(() => {
    const today = todayIso();
    if (rangePreset === "today") return { start: today, end: today };
    if (rangePreset === "7d") return { start: addDays(today, -6), end: today };
    if (rangePreset === "30d") return { start: addDays(today, -29), end: today };
    return customStart <= customEnd
      ? { start: customStart, end: customEnd }
      : { start: customEnd, end: customStart };
  }, [customEnd, customStart, rangePreset]);

  const loadData = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    setLoadError(null);

    try {
      const from = `${dateRange.start}T00:00:00`;
      const to = `${dateRange.end}T23:59:59`;
      const [
        txResult,
        itemResult,
        ledgerResult,
        cashierResult,
        inventoryResult,
        expenseResult,
        barberResult,
      ] = await Promise.all([
        supabase
          .from("checkout_transactions")
          .select(
            "id,business_id,cashier_session_id,created_at,discount_amount,membership_amount,package_amount,payment_status,payments,receipt_number,refund_status,refunded_amount,tax_amount,tips_amount,total_amount,transaction_type,wallet_amount",
          )
          .eq("business_id", business.id)
          .gte("created_at", from)
          .lte("created_at", to),
        supabase
          .from("checkout_transaction_items")
          .select(
            "id,business_id,created_at,discount,name,product_snapshot,qty,service_snapshot,staff_id,staff_snapshot,total,transaction_id,type,unit_price",
          )
          .eq("business_id", business.id)
          .gte("created_at", from)
          .lte("created_at", to),
        reportFrom("financial_ledger_entries")
          .select("id,checkout_transaction_id,entry_type,amount,direction,category,created_at")
          .eq("business_id", business.id)
          .gte("created_at", from)
          .lte("created_at", to),
        reportFrom("cashier_sessions")
          .select(
            "id,opened_by,opened_at,closed_at,opening_cash,expected_cash,actual_cash,variance,status",
          )
          .eq("business_id", business.id)
          .gte("opened_at", from)
          .lte("opened_at", to),
        reportFrom("product_inventory_movements")
          .select("product_id,checkout_transaction_id,qty_delta,movement_type,created_at")
          .eq("business_id", business.id)
          .gte("created_at", from)
          .lte("created_at", to),
        supabase
          .from("expenses")
          .select("id, amount, date, expense_name")
          .eq("business_id", business.id)
          .gte("date", dateRange.start)
          .lte("date", dateRange.end),
        supabase
          .from("barbers")
          .select("id, name_en, name_ar")
          .eq("business_id", business.id)
          .eq("is_active", true),
      ]);

      if (txResult.error) throw txResult.error;
      if (itemResult.error) throw itemResult.error;
      if (ledgerResult.error) throw ledgerResult.error;
      if (cashierResult.error) throw cashierResult.error;
      if (inventoryResult.error) throw inventoryResult.error;
      if (expenseResult.error) throw expenseResult.error;
      if (barberResult.error) throw barberResult.error;

      setTransactions((txResult.data ?? []) as unknown as CheckoutTransaction[]);
      setItems((itemResult.data ?? []) as unknown as CheckoutItem[]);
      setLedger((ledgerResult.data ?? []) as unknown as LedgerEntry[]);
      setCashierSessions((cashierResult.data ?? []) as unknown as CashierSession[]);
      setInventoryMovements((inventoryResult.data ?? []) as unknown as InventoryMovement[]);
      setExpenses((expenseResult.data ?? []) as Expense[]);
      setBarbers((barberResult.data ?? []) as BarberRow[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : tt.common.error;
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [business, dateRange.end, dateRange.start, tt.common.error]);

  useEffect(() => {
    if (!auth.loading && auth.user && canAccess && !businessContext.loading) {
      void loadData();
    }
  }, [auth.loading, auth.user, canAccess, businessContext.loading, loadData]);

  const barberById = useMemo(() => new Map(barbers.map((b) => [b.id, b])), [barbers]);

  const saleTransactions = useMemo(
    () =>
      transactions.filter(
        (tx) => (tx.transaction_type ?? "sale") === "sale" && tx.payment_status === "completed",
      ),
    [transactions],
  );

  const transactionById = useMemo(
    () => new Map(transactions.map((tx) => [tx.id, tx])),
    [transactions],
  );

  const saleTransactionIds = useMemo(
    () => new Set(saleTransactions.map((tx) => tx.id)),
    [saleTransactions],
  );

  const saleItems = useMemo(
    () => items.filter((item) => saleTransactionIds.has(item.transaction_id)),
    [items, saleTransactionIds],
  );

  const summary = useMemo<FinancialSummary>(() => {
    const rawServiceRevenue = saleItems
      .filter((item) => item.type === "service")
      .reduce((total, item) => total + toNumber(item.total), 0);
    const productRevenue = saleItems
      .filter((item) => item.type === "product")
      .reduce((total, item) => total + toNumber(item.total), 0);
    const refunds = ledger
      .filter((entry) => entry.category === "refund")
      .reduce((total, entry) => total + toNumber(entry.amount), 0);
    const tips = ledger
      .filter((entry) => entry.category === "tip" && entry.direction === "credit")
      .reduce((total, entry) => total + toNumber(entry.amount), 0);
    const commissions = ledger
      .filter((entry) => entry.category === "commission")
      .reduce((total, entry) => total + toNumber(entry.amount), 0);
    const tax = ledger
      .filter((entry) => entry.category === "tax")
      .reduce((total, entry) => total + toNumber(entry.amount), 0);
    const expensesTotal = expenses.reduce((total, expense) => total + toNumber(expense.amount), 0);
    const walletUsage = saleTransactions.reduce(
      (total, tx) => total + toNumber(tx.wallet_amount),
      0,
    );
    const packageUsage = saleTransactions.reduce(
      (total, tx) => total + toNumber(tx.package_amount),
      0,
    );
    const serviceRevenue = Math.max(0, rawServiceRevenue - packageUsage);
    const discounts = saleTransactions.reduce(
      (total, tx) => total + toNumber(tx.discount_amount) + toNumber(tx.membership_amount),
      0,
    );
    const grossRevenue = serviceRevenue + productRevenue + tips + tax;
    const netRevenue = grossRevenue - refunds;
    const transactionCount = saleTransactions.length;
    const averageTicket = transactionCount > 0 ? netRevenue / transactionCount : 0;

    return {
      serviceRevenue,
      productRevenue,
      grossRevenue,
      refunds,
      netRevenue,
      expenses: expensesTotal,
      netProfit: netRevenue - expensesTotal - commissions,
      walletUsage,
      packageUsage,
      discounts,
      tips,
      commissions,
      tax,
      averageTicket,
      transactionCount,
    };
  }, [expenses, ledger, saleItems, saleTransactions]);

  const paymentBreakdown = useMemo<PaymentMethodSummary>(() => {
    const breakdown: PaymentMethodSummary = { cash: 0, card: 0, transfer: 0, wallet: 0, other: 0 };
    for (const tx of saleTransactions) {
      for (const payment of readPayments(tx.payments)) {
        breakdown[payment.method] += payment.amount;
      }
    }
    return breakdown;
  }, [saleTransactions]);

  const staffMetrics = useMemo<StaffFinancialSummary[]>(() => {
    const map = new Map<string, StaffFinancialSummary>();
    const tipsByTx = new Map<string, number>();
    const commissionsByTx = new Map<string, number>();

    for (const entry of ledger) {
      if (!entry.checkout_transaction_id) continue;
      if (entry.category === "tip") {
        tipsByTx.set(
          entry.checkout_transaction_id,
          (tipsByTx.get(entry.checkout_transaction_id) ?? 0) + toNumber(entry.amount),
        );
      }
      if (entry.category === "commission") {
        commissionsByTx.set(
          entry.checkout_transaction_id,
          (commissionsByTx.get(entry.checkout_transaction_id) ?? 0) + toNumber(entry.amount),
        );
      }
    }

    const serviceItems = saleItems.filter((item) => item.type === "service" && item.staff_id);
    const serviceCountByTx = new Map<string, number>();
    const serviceTotalByTx = new Map<string, number>();
    for (const item of serviceItems) {
      serviceCountByTx.set(
        item.transaction_id,
        (serviceCountByTx.get(item.transaction_id) ?? 0) + 1,
      );
      serviceTotalByTx.set(
        item.transaction_id,
        (serviceTotalByTx.get(item.transaction_id) ?? 0) + toNumber(item.total),
      );
    }

    for (const item of serviceItems) {
      if (!item.staff_id) continue;
      const existing = map.get(item.staff_id) ?? {
        staffId: item.staff_id,
        staffName: staffNameFromItem(item, barberById, lang),
        serviceRevenue: 0,
        completedServices: 0,
        tips: 0,
        commissions: 0,
        averageServiceValue: 0,
      };
      const divisor = serviceCountByTx.get(item.transaction_id) || 1;
      const tx = transactionById.get(item.transaction_id);
      const packageAmount = toNumber(tx?.package_amount);
      const txServiceTotal = serviceTotalByTx.get(item.transaction_id) ?? 0;
      const packageShare =
        packageAmount > 0 && txServiceTotal > 0
          ? Math.min(toNumber(item.total), packageAmount * (toNumber(item.total) / txServiceTotal))
          : 0;
      existing.serviceRevenue += Math.max(0, toNumber(item.total) - packageShare);
      existing.completedServices += toNumber(item.qty) || 1;
      existing.tips += (tipsByTx.get(item.transaction_id) ?? 0) / divisor;
      existing.commissions += (commissionsByTx.get(item.transaction_id) ?? 0) / divisor;
      existing.averageServiceValue =
        existing.completedServices > 0 ? existing.serviceRevenue / existing.completedServices : 0;
      map.set(item.staff_id, existing);
    }

    return [...map.values()].sort((a, b) => b.serviceRevenue - a.serviceRevenue);
  }, [barberById, lang, ledger, saleItems, transactionById]);

  const serviceMetrics = useMemo<NamedSummary[]>(() => {
    const map = new Map<string, NamedSummary>();
    const serviceItems = saleItems.filter((entry) => entry.type === "service");
    const serviceTotalByTx = new Map<string, number>();
    for (const item of serviceItems) {
      serviceTotalByTx.set(
        item.transaction_id,
        (serviceTotalByTx.get(item.transaction_id) ?? 0) + toNumber(item.total),
      );
    }
    for (const item of serviceItems) {
      const id =
        snapshotId(item.service_snapshot, ["service_id", "id"]) ??
        `${item.transaction_id}:${item.id}`;
      const existing = map.get(id) ?? {
        id,
        name: item.name,
        quantity: 0,
        revenue: 0,
        discounts: 0,
        tips: 0,
        commissions: 0,
      };
      const tx = transactionById.get(item.transaction_id);
      const packageAmount = toNumber(tx?.package_amount);
      const txServiceTotal = serviceTotalByTx.get(item.transaction_id) ?? 0;
      const packageShare =
        packageAmount > 0 && txServiceTotal > 0
          ? Math.min(toNumber(item.total), packageAmount * (toNumber(item.total) / txServiceTotal))
          : 0;
      existing.quantity += toNumber(item.qty) || 1;
      existing.revenue += Math.max(0, toNumber(item.total) - packageShare);
      existing.discounts += toNumber(item.discount);
      map.set(id, existing);
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [saleItems, transactionById]);

  const productMetrics = useMemo<NamedSummary[]>(() => {
    const movementsByProduct = new Map<string, number>();
    for (const movement of inventoryMovements) {
      movementsByProduct.set(
        movement.product_id,
        (movementsByProduct.get(movement.product_id) ?? 0) + movement.qty_delta,
      );
    }

    const map = new Map<string, NamedSummary>();
    for (const item of saleItems.filter((entry) => entry.type === "product")) {
      const id =
        snapshotId(item.product_snapshot, ["product_id", "id"]) ??
        `${item.transaction_id}:${item.id}`;
      const existing = map.get(id) ?? {
        id,
        name: item.name,
        quantity: 0,
        revenue: 0,
        discounts: 0,
        tips: 0,
        commissions: 0,
        refunds: 0,
        stockMovement: movementsByProduct.get(id) ?? 0,
      };
      existing.quantity += toNumber(item.qty) || 1;
      existing.revenue += toNumber(item.total);
      existing.discounts += toNumber(item.discount);
      existing.stockMovement = movementsByProduct.get(id) ?? existing.stockMovement ?? 0;
      map.set(id, existing);
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [inventoryMovements, saleItems]);

  const cashierSummaries = useMemo<CashierSessionSummary[]>(() => {
    return cashierSessions
      .map((session) => {
        const sessionTxs = saleTransactions.filter((tx) => tx.cashier_session_id === session.id);
        const cashPaymentTotal = sessionTxs.reduce(
          (total, tx) =>
            total +
            readPayments(tx.payments)
              .filter((payment) => payment.method === "cash")
              .reduce((sum, payment) => sum + payment.amount, 0),
          0,
        );
        return {
          sessionId: session.id,
          cashier: session.opened_by.slice(0, 8),
          openedAt: session.opened_at,
          closedAt: session.closed_at,
          openingCash: toNumber(session.opening_cash),
          expectedCash: toNumber(session.expected_cash),
          actualCash: toNumber(session.actual_cash),
          variance: toNumber(session.variance),
          transactionCount: sessionTxs.length,
          cashPaymentTotal,
          status: session.status,
        };
      })
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  }, [cashierSessions, saleTransactions]);

  const dailyData = useMemo(() => {
    const dayMap = new Map<
      string,
      { date: string; services: number; products: number; refunds: number; expenses: number }
    >();
    const ensure = (date: string) => {
      const existing = dayMap.get(date) ?? {
        date,
        services: 0,
        products: 0,
        refunds: 0,
        expenses: 0,
      };
      dayMap.set(date, existing);
      return existing;
    };

    for (const item of saleItems) {
      const day = item.created_at.slice(0, 10);
      const row = ensure(day);
      if (item.type === "service") row.services += toNumber(item.total);
      if (item.type === "product") row.products += toNumber(item.total);
    }
    for (const entry of ledger.filter((item) => item.category === "refund")) {
      ensure(entry.created_at.slice(0, 10)).refunds += toNumber(entry.amount);
    }
    for (const expense of expenses) {
      ensure(expense.date).expenses += toNumber(expense.amount);
    }

    return [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [expenses, ledger, saleItems]);

  const topExpensesList = useMemo(
    () => [...expenses].sort((a, b) => toNumber(b.amount) - toNumber(a.amount)).slice(0, 8),
    [expenses],
  );

  if (auth.loading) {
    return (
      <Section lang={lang} eyebrow={dd.eyebrow} title={dd.title}>
        <p className="text-sm text-muted-foreground">{dd.loading}</p>
      </Section>
    );
  }

  if (!auth.user) {
    return (
      <Section lang={lang} eyebrow={dd.eyebrow} title={dd.title}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tt.nav.login}</AlertTitle>
          <AlertDescription>{tt.admin.signedOut}</AlertDescription>
        </Alert>
        <Button asChild className="mt-6">
          <a href={loginHref}>{tt.admin.signInCta}</a>
        </Button>
      </Section>
    );
  }

  if (!canAccess) {
    return (
      <Section lang={lang} eyebrow={dd.eyebrow} title={dd.title}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tt.common.error}</AlertTitle>
          <AlertDescription>{tt.admin.notAdmin}</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-6" onClick={auth.signOut}>
          <LogOut className="h-4 w-4" /> {tt.nav.logout}
        </Button>
      </Section>
    );
  }

  const paymentRows = [
    { type: "cash", label: dd.cash, amount: paymentBreakdown.cash },
    { type: "card", label: dd.card, amount: paymentBreakdown.card },
    { type: "transfer", label: dd.transfer, amount: paymentBreakdown.transfer },
    { type: "wallet", label: dd.wallet, amount: paymentBreakdown.wallet },
    { type: "other", label: dd.other, amount: paymentBreakdown.other },
  ].filter((row) => row.amount > 0);

  const hasData =
    saleTransactions.length > 0 ||
    ledger.length > 0 ||
    expenses.length > 0 ||
    cashierSessions.length > 0;

  return (
    <Section
      lang={lang}
      eyebrow={dd.eyebrow}
      title={dd.title}
      intro={dd.intro}
      className="py-10 md:py-16"
    >
      <div data-testid="admin-reports" className="space-y-8">
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
          <Receipt className="me-2 inline h-4 w-4 text-primary" />
          {dd.checkoutSource}
        </div>

        <div className="rounded-lg border border-border/60 bg-card p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-primary" />
                {dd.dateRange}
              </div>
              <div className="flex flex-wrap gap-2">
                {(["today", "7d", "30d"] as RangePreset[]).map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={rangePreset === preset ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRangePreset(preset)}
                  >
                    {preset === "today" ? dd.today : preset === "7d" ? dd.last7 : dd.last30}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={rangePreset === "custom" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRangePreset("custom")}
                >
                  {dd.dateRange}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="report-start">{dd.dateRange}</Label>
                <Input
                  id="report-start"
                  type="date"
                  value={customStart}
                  onChange={(event) => {
                    setCustomStart(event.target.value);
                    setRangePreset("custom");
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-end">{dd.dateRange}</Label>
                <Input
                  id="report-end"
                  type="date"
                  value={customEnd}
                  onChange={(event) => {
                    setCustomEnd(event.target.value);
                    setRangePreset("custom");
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadData()}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                {dd.refresh}
              </Button>
            </div>
          </div>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{tt.common.error}</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {loading && !hasData ? (
          <div className="rounded-lg border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
            {dd.loading}
          </div>
        ) : !hasData ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-card p-10 text-center text-muted-foreground">
            {dd.noData}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label={dd.serviceRevenue}
                value={`${formatMoney(summary.serviceRevenue, lang)} ${dd.currency}`}
                icon={<DollarSign className="h-4 w-4 text-emerald-400" />}
              />
              <KpiCard
                label={dd.productRevenue}
                value={`${formatMoney(summary.productRevenue, lang)} ${dd.currency}`}
                icon={<DollarSign className="h-4 w-4 text-sky-400" />}
              />
              <KpiCard
                label={dd.grossRevenue}
                value={`${formatMoney(summary.grossRevenue, lang)} ${dd.currency}`}
                icon={<TrendingUp className="h-4 w-4 text-primary" />}
                highlight
              />
              <KpiCard
                label={dd.refunds}
                value={`${formatMoney(summary.refunds, lang)} ${dd.currency}`}
                icon={<TrendingDown className="h-4 w-4 text-red-400" />}
                negative={summary.refunds > 0}
              />
              <KpiCard
                label={dd.netRevenue}
                value={`${formatMoney(summary.netRevenue, lang)} ${dd.currency}`}
                icon={<Wallet className="h-4 w-4 text-amber-400" />}
                highlight
              />
              <KpiCard
                label={dd.netProfit}
                value={`${formatMoney(summary.netProfit, lang)} ${dd.currency}`}
                icon={<BarChart3 className="h-4 w-4 text-cyan-400" />}
                negative={summary.netProfit < 0}
              />
              <KpiCard
                label={dd.totalCommissions}
                value={`${formatMoney(summary.commissions, lang)} ${dd.currency}`}
                icon={<Users className="h-4 w-4 text-violet-400" />}
              />
              <KpiCard
                label={dd.avgTicketSize}
                value={`${formatMoney(summary.averageTicket, lang)} ${dd.currency}`}
                icon={<Receipt className="h-4 w-4 text-primary" />}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricPill label={dd.transactions} value={summary.transactionCount.toString()} />
              <MetricPill
                label={dd.discounts}
                value={`${formatMoney(summary.discounts, lang)} ${dd.currency}`}
              />
              <MetricPill
                label={dd.walletUsage}
                value={`${formatMoney(summary.walletUsage, lang)} ${dd.currency}`}
              />
              <MetricPill
                label={dd.packageUsage}
                value={`${formatMoney(summary.packageUsage, lang)} ${dd.currency}`}
              />
              <MetricPill
                label={dd.totalTips}
                value={`${formatMoney(summary.tips, lang)} ${dd.currency}`}
              />
              <MetricPill
                label={dd.tax}
                value={`${formatMoney(summary.tax, lang)} ${dd.currency}`}
              />
              <MetricPill
                label={dd.totalExpenses}
                value={`${formatMoney(summary.expenses, lang)} ${dd.currency}`}
              />
            </div>

            {dailyData.length > 0 && (
              <ReportPanel title={dd.dailyBreakdown} icon={<BarChart3 className="h-5 w-5" />}>
                <ChartContainer
                  config={{
                    services: { label: dd.serviceRevenue, color: "#34d399" },
                    products: { label: dd.productRevenue, color: "#60a5fa" },
                    refunds: { label: dd.refunds, color: "#f87171" },
                    expenses: { label: dd.totalExpenses, color: "#f59e0b" },
                  }}
                  className="min-h-72"
                >
                  <BarChart data={dailyData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} />
                    <YAxis tickLine={false} axisLine={false} width={50} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="services" fill="var(--color-services)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="products" fill="var(--color-products)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="refunds" fill="var(--color-refunds)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </ReportPanel>
            )}

            <div className="grid gap-6 xl:grid-cols-2">
              <ReportPanel title={dd.paymentMethods} icon={<Wallet className="h-5 w-5" />}>
                {paymentRows.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">{dd.noData}</p>
                ) : (
                  <div className="space-y-3">
                    {paymentRows.map((row) => {
                      const pct =
                        summary.netRevenue > 0 ? (row.amount / summary.netRevenue) * 100 : 0;
                      return (
                        <div key={row.type} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{row.label}</span>
                            <span className="text-muted-foreground">
                              {formatMoney(row.amount, lang)} {dd.currency}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ReportPanel>

              <ReportPanel title={dd.cashierSessions} icon={<Receipt className="h-5 w-5" />}>
                {cashierSummaries.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">{dd.noData}</p>
                ) : (
                  <div className="space-y-3">
                    {cashierSummaries.slice(0, 8).map((session) => (
                      <div
                        key={session.sessionId}
                        className="rounded-md border border-border/60 bg-background/40 p-4 text-sm"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="font-medium">
                            {session.status === "open" ? dd.active : dd.closed}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(session.openedAt).toLocaleString(
                              lang === "ar" ? "ar-AE" : "en-GB",
                            )}
                          </span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-4">
                          <MiniMetric
                            label={dd.cash}
                            value={formatMoney(session.cashPaymentTotal, lang)}
                          />
                          <MiniMetric
                            label={dd.expectedCash}
                            value={formatMoney(session.expectedCash, lang)}
                          />
                          <MiniMetric
                            label={dd.actualCash}
                            value={formatMoney(session.actualCash, lang)}
                          />
                          <MiniMetric
                            label={dd.variance}
                            value={formatMoney(session.variance, lang)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ReportPanel>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <SummaryList
                title={dd.staffPerformance}
                empty={dd.noData}
                rows={staffMetrics.map((row) => ({
                  id: row.staffId,
                  title: row.staffName,
                  meta: `${row.completedServices} ${dd.service}`,
                  amount: row.serviceRevenue,
                  detail: `${dd.tips}: ${formatMoney(row.tips, lang)} ${dd.currency} · ${
                    dd.commission
                  }: ${formatMoney(row.commissions, lang)} ${dd.currency}`,
                }))}
                lang={lang}
                currency={dd.currency}
              />
              <SummaryList
                title={dd.servicePerformance}
                empty={dd.noData}
                rows={serviceMetrics.map((row) => ({
                  id: row.id,
                  title: row.name,
                  meta: `${row.quantity} ${dd.quantity}`,
                  amount: row.revenue,
                  detail: `${dd.discounts}: ${formatMoney(row.discounts, lang)} ${dd.currency}`,
                }))}
                lang={lang}
                currency={dd.currency}
              />
              <SummaryList
                title={dd.productPerformance}
                empty={dd.noData}
                rows={productMetrics.map((row) => ({
                  id: row.id,
                  title: row.name,
                  meta: `${row.quantity} ${dd.quantity}`,
                  amount: row.revenue,
                  detail: `${dd.stock}: ${row.stockMovement ?? 0}`,
                }))}
                lang={lang}
                currency={dd.currency}
              />
            </div>

            <ReportPanel title={dd.topExpenses} icon={<TrendingDown className="h-5 w-5" />}>
              {topExpensesList.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">{dd.noData}</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {topExpensesList.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/40 p-3 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="truncate">{expense.expense_name}</span>
                        <span className="ms-2 text-xs text-muted-foreground">{expense.date}</span>
                      </div>
                      <span className="whitespace-nowrap font-medium text-red-300">
                        {formatMoney(toNumber(expense.amount), lang)} {dd.currency}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ReportPanel>
          </>
        )}
      </div>
    </Section>
  );
}

function KpiCard({
  label,
  value,
  icon,
  highlight,
  negative,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card p-5 transition-colors",
        highlight && !negative && "border-primary/30 bg-primary/5",
        negative && "border-red-500/30 bg-red-500/5",
      )}
    >
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "break-words font-serif text-2xl",
          negative ? "text-red-300" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card px-4 py-3">
      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-xl text-foreground">{value}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium text-foreground">{value}</div>
    </div>
  );
}

function SummaryList({
  title,
  empty,
  rows,
  lang,
  currency,
}: {
  title: string;
  empty: string;
  rows: { id: string; title: string; meta: string; amount: number; detail: string }[];
  lang: Lang;
  currency: string;
}) {
  return (
    <ReportPanel title={title} icon={<BarChart3 className="h-5 w-5" />}>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-3">
          {rows.slice(0, 8).map((row) => (
            <div key={row.id} className="rounded-md border border-border/60 bg-background/40 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-medium">{row.title}</span>
                <span className="whitespace-nowrap text-sm text-muted-foreground">{row.meta}</span>
              </div>
              <div className="font-serif text-xl">
                {formatMoney(row.amount, lang)} {currency}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{row.detail}</div>
            </div>
          ))}
        </div>
      )}
    </ReportPanel>
  );
}

function ReportPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-5 py-4">
        {icon && <span className="text-primary">{icon}</span>}
        <h3 className="font-serif text-lg">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
