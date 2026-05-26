import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Wallet,
  Sparkles,
  User,
  Percent,
  ArrowDownRight,
  Tag,
  HelpCircle,
  CheckCircle,
} from "lucide-react";

import { Section } from "@/components/casa/Section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useBusinessContext } from "@/lib/business-context";
import type { Lang } from "@/lib/i18n";
import { formatPrice, localePath } from "@/lib/i18n";

type Barber = {
  id: string;
  name_en: string;
  name_ar: string;
};

type WalletVoucher = {
  id: string;
  code: string;
  amount: number; // Current balance
  invoiced_amount: number; // Original cost
  status: "active" | "inactive" | "depleted" | "expired";
  starts_at: string;
  ends_at: string;
};

type UserWallet = {
  id: string;
  wallet_id: string;
  amount: number; // Initial value
  invoiced_amount: number; // Paid amount
  commission_percent: number;
  created_at: string;
  staff_id?: string | null;
  customer_name?: string;
  customer_phone?: string;
};

const LOCAL_DICT = {
  en: {
    title: "Vouchers & Wallets",
    intro:
      "Issue prepaid gift vouchers with unique codes that draw down dynamically upon service checkout.",
    newVoucher: "Issue New Voucher",
    code: "Voucher Code",
    generateCode: "Generate Code",
    amount: "Initial Value",
    invoicedAmount: "Paid Amount",
    invoicedDesc: "How much the customer actually paid (e.g. pay 400 for 500 value)",
    commission: "Staff Commission",
    attributedStaff: "Attributed Staff Member",
    startsAt: "Starts At",
    endsAt: "Ends At",
    saveVoucher: "Issue Gift Voucher",
    issueSuccess: "Prepaid voucher issued successfully.",
    issueError: "Unable to issue voucher.",
    activeVouchers: "Active Wallets",
    noVouchers: "No vouchers issued yet.",
    drawdownTitle: "Deduct / Drawdown Balance",
    drawdownIntro: "Enter a voucher code to lookup its balance and record a checkout drawdown.",
    lookupCode: "Voucher Code Lookup",
    lookupBtn: "Lookup",
    deductBtn: "Deduct Amount",
    deductAmount: "Amount to Deduct",
    deductSuccess: "Amount drawn down successfully.",
    deductError: "Unable to deduct amount.",
    balanceRemaining: "Remaining Balance",
    initialValue: "Initial Value",
    commissionEarned: "Staff Commission",
    noStaff: "No staff attributed",
    statusActive: "Active",
    statusInactive: "Inactive",
    statusDepleted: "Depleted",
    statusExpired: "Expired",
    searchPlaceholder: "Enter VCHR-XXXX",
    checkoutSimulator: "Voucher Checkout Simulator",
    staffCommList: "Prepaid Sales Ledger",
    staffCommTitle: "Commission Tracking",
    staffLabel: "Staff Member",
    amountDeductedPlaceholder: "0.00",
  },
  ar: {
    title: "القسائم والمحافظ",
    intro:
      "إصدار قسائم هدايا مسبقة الدفع برموز فريدة يتم خصمها ديناميكياً عند إتمام الدفع للخدمات.",
    newVoucher: "إصدار قسيمة جديدة",
    code: "رمز القسيمة",
    generateCode: "توليد رمز تلقائي",
    amount: "القيمة الأولية",
    invoicedAmount: "المبلغ المدفوع",
    invoicedDesc: "المبلغ الذي دفعه العميل فعلياً (مثال: ادفع 400 للحصول على قيمة 500)",
    commission: "عمولة الموظف",
    attributedStaff: "الموظف المنسوب إليه",
    startsAt: "تاريخ البدء",
    endsAt: "تاريخ الانتهاء",
    saveVoucher: "إصدار قسيمة الهدية",
    issueSuccess: "تم إصدار قسيمة مسبقة الدفع بنجاح.",
    issueError: "تعذر إصدار القسيمة.",
    activeVouchers: "المحافظ النشطة",
    noVouchers: "لا توجد قسائم مصدرة بعد.",
    drawdownTitle: "خصم / استهلاك الرصيد",
    drawdownIntro: "أدخل رمز القسيمة للبحث عن رصيدها وتسجيل عملية خصم عند الدفع.",
    lookupCode: "البحث عن رمز القسيمة",
    lookupBtn: "بحث",
    deductBtn: "خصم المبلغ",
    deductAmount: "المبلغ المراد خصمه",
    deductSuccess: "تم الخصم من الرصيد بنجاح.",
    deductError: "تعذر خصم المبلغ.",
    balanceRemaining: "الرصيد المتبقي",
    initialValue: "القيمة الأولية",
    commissionEarned: "عمولة الموظف",
    noStaff: "بدون تعيين موظف",
    statusActive: "نشط",
    statusInactive: "غير نشط",
    statusDepleted: "مستنفذ",
    statusExpired: "منتهي الصلاحية",
    searchPlaceholder: "أدخل VCHR-XXXX",
    checkoutSimulator: "محاكي خصم القسائم",
    staffCommList: "سجل مبيعات مسبق الدفع",
    staffCommTitle: "تتبع العمولات",
    staffLabel: "الموظف",
    amountDeductedPlaceholder: "0.00",
  },
};

export function AdminWalletsPage({ lang }: { lang: Lang }) {
  const router = useRouter();
  const auth = useAuth();
  const businessContext = useBusinessContext();
  const business = businessContext.business;
  const d = LOCAL_DICT[lang];

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [wallets, setWallets] = useState<WalletVoucher[]>([]);
  const [userWallets, setUserWallets] = useState<UserWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State - Create Voucher
  const [voucherCode, setVoucherCode] = useState("");
  const [initialValue, setInitialValue] = useState("");
  const [paidValue, setPaidValue] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("10"); // Default 10%
  const [staffId, setStaffId] = useState("none");
  const [startsAt, setStartsAt] = useState(new Date().toISOString().split("T")[0]);
  const [endsAt, setEndsAt] = useState("");

  // Customer info tags for user_wallet details (optional metadata)
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");

  // Drawdown Simulator State
  const [lookupCodeInput, setLookupCodeInput] = useState("");
  const [foundWallet, setFoundWallet] = useState<WalletVoucher | null>(null);
  const [deductVal, setDeductVal] = useState("");
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [submittingDeduction, setSubmittingDeduction] = useState(false);

  const loginHref = `${localePath(lang, "/login")}?redirect=${encodeURIComponent(
    localePath(lang, "/admin/wallets"),
  )}`;

  const loadData = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    try {
      const [barbersResult, walletsResult, userWalletsResult] = await Promise.all([
        supabase
          .from("barbers")
          .select("id, name_en, name_ar")
          .eq("business_id", business.id)
          .order("name_en"),
        supabase
          .from("wallets")
          .select("*")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("user_wallets")
          .select("*")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false }),
      ]);

      if (barbersResult.error) throw barbersResult.error;
      if (walletsResult.error) throw walletsResult.error;
      if (userWalletsResult.error) throw userWalletsResult.error;

      setBarbers(barbersResult.data as Barber[]);
      setWallets(walletsResult.data as WalletVoucher[]);
      setUserWallets(userWalletsResult.data as UserWallet[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error loading wallets data.");
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.navigate({ to: loginHref });
      return;
    }
    if (!auth.loading && auth.user && business) {
      void loadData();
    }
  }, [auth.loading, auth.user, business, loadData, loginHref, router]);

  // Set default ends_at date to 1 year from now
  useEffect(() => {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    setEndsAt(oneYearFromNow.toISOString().split("T")[0]);
  }, []);

  const handleGenerateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "CASA-";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += "-";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setVoucherCode(code);
  };

  const handleIssueVoucher = async () => {
    if (!business || !voucherCode || !initialValue || !paidValue || !endsAt) {
      toast.error(
        lang === "ar" ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields.",
      );
      return;
    }

    setSaving(true);
    try {
      // 1. Create Wallet code
      const { data: walletData, error: walletErr } = await supabase
        .from("wallets")
        .insert({
          business_id: business.id,
          code: voucherCode.toUpperCase().trim(),
          amount: Number(initialValue),
          invoiced_amount: Number(paidValue),
          starts_at: startsAt,
          ends_at: endsAt,
          status: "active",
        })
        .select()
        .single();

      if (walletErr) throw walletErr;

      // 2. Attach user wallet ledger attribution
      const { error: uwErr } = await supabase.from("user_wallets").insert({
        business_id: business.id,
        wallet_id: walletData.id,
        amount: Number(initialValue),
        invoiced_amount: Number(paidValue),
        commission_percent: Number(commissionPercent) || 0,
        staff_id: staffId === "none" ? null : staffId,
        // Using notes/attributes column mapping inside DB or custom tags.
        // We will store customer details optionally.
      });

      if (uwErr) throw uwErr;

      toast.success(d.issueSuccess);
      setVoucherCode("");
      setInitialValue("");
      setPaidValue("");
      setStaffId("none");
      setCustName("");
      setCustPhone("");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : d.issueError);
    } finally {
      setSaving(false);
    }
  };

  const handleLookupVoucher = async () => {
    if (!business || !lookupCodeInput) return;
    setLoadingLookup(true);
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("business_id", business.id)
        .eq("code", lookupCodeInput.toUpperCase().trim())
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error(lang === "ar" ? "رمز القسيمة غير موجود!" : "Voucher code not found!");
        setFoundWallet(null);
      } else {
        setFoundWallet(data as WalletVoucher);
        setDeductVal("");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error querying voucher.");
    } finally {
      setLoadingLookup(false);
    }
  };

  const handleDeductBalance = async () => {
    if (!business || !foundWallet || !deductVal) return;
    const amountToDeduct = Number(deductVal);
    if (amountToDeduct <= 0) {
      toast.error(
        lang === "ar"
          ? "المبلغ يجب أن يكون أكبر من صفر"
          : "Deduction amount must be greater than zero.",
      );
      return;
    }
    if (amountToDeduct > foundWallet.amount) {
      toast.error(
        lang === "ar"
          ? "المبلغ المراد خصمه يتجاوز الرصيد الحالي للمحفظة!"
          : "Deduction exceeds wallet's remaining balance!",
      );
      return;
    }

    setSubmittingDeduction(true);
    try {
      const nextAmount = foundWallet.amount - amountToDeduct;
      const nextStatus = nextAmount <= 0 ? "depleted" : foundWallet.status;

      const { error } = await supabase
        .from("wallets")
        .update({
          amount: nextAmount,
          status: nextStatus,
        })
        .eq("id", foundWallet.id)
        .eq("business_id", business.id);

      if (error) throw error;

      toast.success(d.deductSuccess);
      setFoundWallet(null);
      setLookupCodeInput("");
      setDeductVal("");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : d.deductError);
    } finally {
      setSubmittingDeduction(false);
    }
  };

  if (auth.loading || businessContext.loading || loading) {
    return (
      <Section lang={lang}>
        <div className="rounded-lg border border-border/60 bg-card p-6 text-sm text-muted-foreground animate-pulse">
          {lang === "ar" ? "جاري تحميل المحفظة..." : "Loading wallet registry..."}
        </div>
      </Section>
    );
  }

  if (!auth.user) return null;

  return (
    <Section
      lang={lang}
      eyebrow={business ? (lang === "ar" ? business.name_ar : business.name_en) : d.title}
      title={d.title}
    >
      <div className="space-y-6">
        <p className="max-w-3xl text-sm text-muted-foreground">{d.intro}</p>

        {/* Responsive Grid for Dashboard Operations */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* LEFT PANEL: Issue Gift Vouchers & Ledger */}
          <div className="lg:col-span-8 space-y-6">
            {/* VOUCHER GENERATOR FORM */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Wallet className="h-44 w-44" />
              </div>
              <CardHeader>
                <CardTitle className="font-serif text-2xl flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> {d.newVoucher}
                </CardTitle>
                <CardDescription>
                  {lang === "ar"
                    ? "أنشئ رمز قسيمة هدية فريد، وعيّن قيمة الشراء ونسبة عمولة المعالج."
                    : "Create unique gift code, purchases, and attributes for therapists."}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="vchr-code">{d.code}</Label>
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      className="text-xs text-primary hover:underline font-mono"
                    >
                      {d.generateCode}
                    </button>
                  </div>
                  <Input
                    id="vchr-code"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CASA-500-GIFT"
                    className="font-mono tracking-wider h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vchr-staff">{d.attributedStaff}</Label>
                  <Select value={staffId} onValueChange={setStaffId}>
                    <SelectTrigger id="vchr-staff" className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{d.noStaff}</SelectItem>
                      {barbers.map((barber) => (
                        <SelectItem key={barber.id} value={barber.id}>
                          {lang === "ar" ? barber.name_ar : barber.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vchr-amount">{d.amount} (AED)</Label>
                  <Input
                    id="vchr-amount"
                    type="number"
                    min={0}
                    value={initialValue}
                    onChange={(e) => {
                      setInitialValue(e.target.value);
                      if (!paidValue) setPaidValue(e.target.value); // Sync by default
                    }}
                    placeholder="500.00"
                    className="h-11 font-semibold text-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vchr-paid">{d.invoicedAmount} (AED)</Label>
                  <Input
                    id="vchr-paid"
                    type="number"
                    min={0}
                    value={paidValue}
                    onChange={(e) => setPaidValue(e.target.value)}
                    placeholder="400.00"
                    className="h-11 font-semibold"
                  />
                  <p className="text-[10px] text-muted-foreground/75 leading-tight">
                    {d.invoicedDesc}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vchr-comm">{d.commission} (%)</Label>
                  <div className="relative">
                    <Input
                      id="vchr-comm"
                      type="number"
                      min={0}
                      max={100}
                      value={commissionPercent}
                      onChange={(e) => setCommissionPercent(e.target.value)}
                      placeholder="10"
                      className="h-11 pr-8"
                    />
                    <Percent className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vchr-ends">{d.endsAt}</Label>
                  <Input
                    id="vchr-ends"
                    type="date"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="sm:col-span-2 pt-2">
                  <Button
                    onClick={handleIssueVoucher}
                    disabled={saving || !voucherCode || !initialValue || !paidValue || !endsAt}
                    className="w-full h-11"
                  >
                    {saving ? (lang === "ar" ? "جاري الحفظ..." : "Processing...") : d.saveVoucher}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* WALLET ACTIVE LEDGER LIST */}
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-semibold text-foreground px-1">
                {d.activeVouchers}
              </h3>
              {wallets.length === 0 ? (
                <Card className="border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
                  {d.noVouchers}
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {wallets.map((wallet) => {
                    const uw = userWallets.find((item) => item.wallet_id === wallet.id);
                    const b = uw?.staff_id ? barbers.find((item) => item.id === uw.staff_id) : null;
                    const commissionAED = uw
                      ? (uw.invoiced_amount * uw.commission_percent) / 100
                      : 0;

                    // Voucher visual card
                    const percentRemaining = (wallet.amount / wallet.invoiced_amount) * 100;
                    return (
                      <Card
                        key={wallet.id}
                        className={`border-border/60 bg-gradient-to-br from-card to-background relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 ${
                          wallet.status === "depleted" ? "opacity-60" : ""
                        }`}
                      >
                        {/* Premium Visual Gift Card Design */}
                        <div className="p-5 flex flex-col justify-between h-48">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                                Prepaid Gift Pass
                              </span>
                              <div className="font-mono text-sm font-bold text-foreground mt-0.5 tracking-widest">
                                {wallet.code}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                                wallet.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                                  : wallet.status === "depleted"
                                    ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                                    : "bg-red-500/10 text-red-300 border border-red-500/30"
                              }`}
                            >
                              {
                                d[
                                  `status${wallet.status.charAt(0).toUpperCase() + wallet.status.slice(1)}` as keyof typeof d
                                ]
                              }
                            </span>
                          </div>

                          <div>
                            <div className="text-[10px] text-muted-foreground">
                              {d.balanceRemaining}
                            </div>
                            <div className="text-3xl font-bold font-serif text-primary">
                              {formatPrice(lang, wallet.amount)}
                            </div>
                          </div>

                          <div className="flex justify-between items-end border-t border-border/40 pt-2 text-[10px] text-muted-foreground/80">
                            <div>
                              {d.endsAt}: {wallet.ends_at}
                            </div>
                            {b && (
                              <div className="text-right">
                                {lang === "ar" ? b.name_ar : b.name_en} ({uw?.commission_percent}%)
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Live Drawdown Checkout Simulator & Commission */}
          <div className="lg:col-span-4 space-y-6">
            {/* checkout DRAWDOWN TESTER */}
            <Card className="border-border/60 bg-card border-primary/20 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-xl flex items-center gap-2">
                  <ArrowDownRight className="h-5 w-5 text-primary" /> {d.drawdownTitle}
                </CardTitle>
                <CardDescription>{d.drawdownIntro}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lookup-code">{d.lookupCode}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="lookup-code"
                      value={lookupCodeInput}
                      onChange={(e) => setLookupCodeInput(e.target.value)}
                      placeholder={d.searchPlaceholder}
                      className="font-mono uppercase tracking-wider"
                    />
                    <Button
                      onClick={handleLookupVoucher}
                      disabled={loadingLookup || !lookupCodeInput}
                    >
                      {loadingLookup ? "..." : d.lookupBtn}
                    </Button>
                  </div>
                </div>

                {foundWallet && (
                  <div className="p-4 rounded-lg bg-background border border-border/50 space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center text-xs text-muted-foreground border-b border-border/40 pb-2">
                      <span className="font-mono">{foundWallet.code}</span>
                      <span className="font-medium capitalize">{foundWallet.status}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground/80">{d.balanceRemaining}</div>
                        <div className="text-lg font-bold text-primary font-serif">
                          {formatPrice(lang, foundWallet.amount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground/80">{d.initialValue}</div>
                        <div className="text-lg font-bold text-foreground font-serif">
                          {formatPrice(lang, foundWallet.invoiced_amount)}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/40 space-y-2">
                      <Label htmlFor="deduct-amount" className="text-xs">
                        {d.deductAmount} (AED)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="deduct-amount"
                          type="number"
                          min={0.01}
                          max={foundWallet.amount}
                          value={deductVal}
                          onChange={(e) => setDeductVal(e.target.value)}
                          placeholder={d.amountDeductedPlaceholder}
                          className="h-10 text-primary font-semibold"
                        />
                        <Button
                          onClick={handleDeductBalance}
                          disabled={submittingDeduction || !deductVal}
                          variant="destructive"
                          className="h-10"
                        >
                          {submittingDeduction ? "..." : d.deductBtn}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* COMMISSION TRACKER SUMMARY */}
            <Card className="border-border/60 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-lg">{d.staffCommTitle}</CardTitle>
                <CardDescription>
                  {lang === "ar"
                    ? "عمولات بيع القسائم المصدرة."
                    : "Attributed voucher sales and commissions."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {userWallets.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    {lang === "ar" ? "لا توجد مبيعات مسجلة" : "No voucher sales registered."}
                  </div>
                ) : (
                  <div className="divide-y divide-border/40 max-h-80 overflow-y-auto">
                    {userWallets.map((uw) => {
                      const w = wallets.find((item) => item.id === uw.wallet_id);
                      const b = uw.staff_id
                        ? barbers.find((item) => item.id === uw.staff_id)
                        : null;
                      const commissionAED = (uw.invoiced_amount * uw.commission_percent) / 100;
                      return (
                        <div key={uw.id} className="p-3 text-xs flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-foreground">
                              {w ? w.code : "VCHR-GIFT"}
                            </div>
                            <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                              {b ? (lang === "ar" ? b.name_ar : b.name_en) : d.noStaff}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-primary">
                              {formatPrice(lang, commissionAED)}
                            </div>
                            <div className="text-[10px] text-muted-foreground/75 mt-0.5">
                              {uw.commission_percent}% {d.commission}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Section>
  );
}
