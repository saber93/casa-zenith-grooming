import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Tag, Percent, Check, Eye, Trash, Sparkles, UserCheck, Calendar } from "lucide-react";

import { Section } from "@/components/casa/Section";
import { Button } from "@/components/ui/button";
import {
  Card as CardComp,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useBusinessContext } from "@/lib/business-context";
import type { Lang } from "@/lib/i18n";
import { formatPrice, localePath } from "@/lib/i18n";

type Discount = {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  amount: number;
  starts_at: string;
  ends_at: string;
  status: "active" | "inactive" | "expired";
  using_type: "unlimited" | "once_per_user" | "limited_quantity";
  benefit_numbers: number;
};

type Membership = {
  id: string;
  membership_no: string;
  discount_percent: number;
  starts_at: string;
  ends_at: string;
  status: "active" | "inactive" | "expired";
  user_id?: string | null;
  customer_name?: string; // Optional metadata placeholder
};

type CustomerFromBookings = {
  name: string;
  phone: string;
};

const LOCAL_DICT = {
  en: {
    title: "Promotions & Loyalty",
    intro: "Manage percentage/fixed coupon discounts and customer VIP loyalty membership cards.",
    tabDiscounts: "Discount Coupons",
    tabMemberships: "VIP Memberships",
    createDiscount: "Create Discount Code",
    code: "Discount Code",
    type: "Discount Type",
    percentage: "Percentage (%)",
    fixed: "Fixed Amount (AED)",
    value: "Discount Value",
    startsAt: "Starts At",
    endsAt: "Ends At",
    usageType: "Usage Type",
    unlimited: "Unlimited Use",
    oncePerUser: "Once Per User",
    limitedQty: "Limited Quantity",
    benefitQty: "Maximum Allowed Uses",
    saveDiscount: "Create Discount Code",
    saveSuccess: "Discount code created successfully.",
    saveError: "Unable to create discount code.",
    activeCoupons: "Active Promotions",
    noDiscounts: "No discount coupons available yet.",
    createMembership: "Issue VIP Loyalty Card",
    membershipNo: "Membership Number",
    generateNo: "Generate Number",
    discountPercent: "Discount Rate (%)",
    discountPercentDesc: "Percentage off on all future appointments",
    saveMembership: "Issue Loyalty Card",
    membershipSuccess: "VIP Membership card issued successfully.",
    membershipError: "Unable to issue membership.",
    activeMemberships: "Loyalty Memberships",
    noMemberships: "No memberships registered yet.",
    statusActive: "Active",
    statusInactive: "Inactive",
    statusExpired: "Expired",
    placeholderCode: "e.g. SAVE20",
    clientLabel: "Customer (Optional)",
    clientNamePlaceholder: "Walk-in Customer Name",
  },
  ar: {
    title: "العروض والولاء",
    intro:
      "إدارة خصومات الكوبونات بنسبة مئوية أو قيمة ثابتة وبطاقات عضويات الولاء لكبار الشخصيات (VIP).",
    tabDiscounts: "كوبونات الخصم",
    tabMemberships: "عضويات VIP",
    createDiscount: "إنشاء رمز خصم",
    code: "رمز الخصم",
    type: "نوع الخصم",
    percentage: "نسبة مئوية (%)",
    fixed: "مبلغ ثابت (درهم)",
    value: "قيمة الخصم",
    startsAt: "تاريخ البدء",
    endsAt: "تاريخ الانتهاء",
    usageType: "نوع الاستخدام",
    unlimited: "استخدام غير محدود",
    oncePerUser: "مرة واحدة لكل مستخدم",
    limitedQty: "كمية محدودة",
    benefitQty: "الحد الأقصى للاستخدامات",
    saveDiscount: "إنشاء رمز الخصم",
    saveSuccess: "تم إنشاء رمز الخصم بنجاح.",
    saveError: "تعذر إنشاء رمز الخصم.",
    activeCoupons: "العروض الترويجية النشطة",
    noDiscounts: "لا توجد كوبونات خصم متاحة حالياً.",
    createMembership: "إصدار بطاقة عضوية VIP",
    membershipNo: "رقم العضوية",
    generateNo: "توليد رقم تلقائي",
    discountPercent: "نسبة الخصم (%)",
    discountPercentDesc: "نسبة الخصم التلقائية على جميع المواعيد المستقبلية",
    saveMembership: "إصدار بطاقة الولاء",
    membershipSuccess: "تم إصدار بطاقة عضوية كبار الشخصيات بنجاح.",
    membershipError: "تعذر إصدار العضوية.",
    activeMemberships: "عضويات الولاء المسجلة",
    noMemberships: "لا توجد عضويات مسجلة بعد.",
    statusActive: "نشط",
    statusInactive: "غير نشط",
    statusExpired: "منتهي الصلاحية",
    placeholderCode: "مثال: SAVE20",
    clientLabel: "العميل (اختياري)",
    clientNamePlaceholder: "اسم العميل",
  },
};

export function AdminPromotionsPage({ lang }: { lang: Lang }) {
  const router = useRouter();
  const auth = useAuth();
  const businessContext = useBusinessContext();
  const business = businessContext.business;
  const d = LOCAL_DICT[lang];

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<CustomerFromBookings[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [savingMembership, setSavingMembership] = useState(false);

  // Form State - Discount
  const [discCode, setDiscCode] = useState("");
  const [discType, setDiscType] = useState<Discount["type"]>("percentage");
  const [discValue, setDiscValue] = useState("");
  const [startsAt, setStartsAt] = useState(new Date().toISOString().split("T")[0]);
  const [endsAt, setEndsAt] = useState("");
  const [usingType, setUsingType] = useState<Discount["using_type"]>("unlimited");
  const [benefitNumbers, setBenefitNumbers] = useState("0");

  // Form State - Membership
  const [membershipNo, setMembershipNo] = useState("");
  const [memberDiscount, setMemberDiscount] = useState("15"); // Default 15% VIP discount
  const [memberStarts, setMemberStarts] = useState(new Date().toISOString().split("T")[0]);
  const [memberEnds, setMemberEnds] = useState("");
  const [memberCustName, setMemberCustName] = useState("");

  const loginHref = `${localePath(lang, "/login")}?redirect=${encodeURIComponent(
    localePath(lang, "/admin/promotions"),
  )}`;

  const loadData = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    try {
      const [discountsResult, membershipsResult, bookingsResult] = await Promise.all([
        supabase
          .from("discounts")
          .select("*")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("memberships")
          .select("*")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("bookings")
          .select("customer_name, customer_phone")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (discountsResult.error) throw discountsResult.error;
      if (membershipsResult.error) throw membershipsResult.error;
      if (bookingsResult.error) throw bookingsResult.error;

      setDiscounts(discountsResult.data as Discount[]);
      setMemberships(membershipsResult.data as Membership[]);

      // Extract unique customers from bookings
      const uniqueCustMap = new Map<string, string>();
      bookingsResult.data?.forEach((b) => {
        if (b.customer_name && b.customer_phone) {
          uniqueCustMap.set(b.customer_phone, b.customer_name);
        }
      });
      const custs: CustomerFromBookings[] = Array.from(uniqueCustMap.entries()).map(
        ([phone, name]) => ({
          name,
          phone,
        }),
      );
      setRecentCustomers(custs);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error loading promotional data.");
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

  // Set default validity dates
  useEffect(() => {
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    setEndsAt(threeMonths.toISOString().split("T")[0]);

    const oneYear = new Date();
    oneYear.setFullYear(oneYear.getFullYear() + 1);
    setMemberEnds(oneYear.toISOString().split("T")[0]);
  }, []);

  const handleGenerateMembershipNo = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random
    setMembershipNo(`VIP-${randomSuffix}`);
  };

  const handleCreateDiscount = async () => {
    if (!business || !discCode || !discValue || !endsAt) {
      toast.error(lang === "ar" ? "يرجى تعبئة الحقول المطلوبة" : "Please enter required fields.");
      return;
    }

    setSavingDiscount(true);
    try {
      const { error } = await supabase.from("discounts").insert({
        business_id: business.id,
        code: discCode.toUpperCase().trim(),
        type: discType,
        amount: Number(discValue),
        starts_at: startsAt,
        ends_at: endsAt,
        using_type: usingType,
        benefit_numbers: usingType === "limited_quantity" ? Number(benefitNumbers) : 0,
        status: "active",
      });

      if (error) throw error;

      toast.success(d.saveSuccess);
      setDiscCode("");
      setDiscValue("");
      setUsingType("unlimited");
      setBenefitNumbers("0");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : d.saveError);
    } finally {
      setSavingDiscount(false);
    }
  };

  const handleIssueMembership = async () => {
    if (!business || !membershipNo || !memberDiscount || !memberEnds) {
      toast.error(
        lang === "ar" ? "يرجى تعبئة جميع حقول العضوية" : "Please fill in all membership fields.",
      );
      return;
    }

    setSavingMembership(true);
    try {
      // Find matching user_id based on customer name / bookings if applicable, or insert general
      // Since user_id is standard auth, we save the membership code
      const { error } = await supabase.from("memberships").insert({
        business_id: business.id,
        membership_no: membershipNo.toUpperCase().trim(),
        discount_percent: Number(memberDiscount),
        starts_at: memberStarts,
        ends_at: memberEnds,
        status: "active",
      });

      if (error) throw error;

      toast.success(d.membershipSuccess);
      setMembershipNo("");
      setMemberDiscount("15");
      setMemberCustName("");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : d.membershipError);
    } finally {
      setSavingMembership(false);
    }
  };

  if (auth.loading || businessContext.loading || loading) {
    return (
      <Section lang={lang}>
        <div className="rounded-lg border border-border/60 bg-card p-6 text-sm text-muted-foreground animate-pulse">
          {lang === "ar" ? "جاري تحميل العروض..." : "Loading promotional details..."}
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

        <Tabs defaultValue="discounts" className="space-y-6">
          <TabsList className="border-b border-border/60 justify-start w-full bg-transparent h-auto p-0 rounded-none gap-6">
            <TabsTrigger
              value="discounts"
              className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent px-1 pb-3 pt-0 rounded-none text-sm font-semibold transition-all w-auto bg-transparent"
            >
              <Tag className="h-4 w-4 mr-2 inline" /> {d.tabDiscounts}
            </TabsTrigger>
            <TabsTrigger
              value="memberships"
              className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent px-1 pb-3 pt-0 rounded-none text-sm font-semibold transition-all w-auto bg-transparent"
            >
              <Sparkles className="h-4 w-4 mr-2 inline" /> {d.tabMemberships}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: DISCOUNT COUPONS */}
          <TabsContent value="discounts" className="space-y-6 outline-none">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Creator Form */}
              <div className="lg:col-span-1">
                <CardComp className="border-border/60 bg-card">
                  <CardHeader>
                    <CardTitle className="font-serif text-xl">{d.createDiscount}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="disc-code">{d.code}</Label>
                      <Input
                        id="disc-code"
                        value={discCode}
                        onChange={(e) => setDiscCode(e.target.value.toUpperCase())}
                        placeholder={d.placeholderCode}
                        className="font-mono tracking-wider"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="disc-type">{d.type}</Label>
                      <Select
                        value={discType}
                        onValueChange={(val) => setDiscType(val as Discount["type"])}
                      >
                        <SelectTrigger id="disc-type" className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">{d.percentage}</SelectItem>
                          <SelectItem value="fixed">{d.fixed}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="disc-val">{d.value}</Label>
                      <div className="relative">
                        <Input
                          id="disc-val"
                          type="number"
                          min={0}
                          value={discValue}
                          onChange={(e) => setDiscValue(e.target.value)}
                          placeholder="20"
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-3 text-xs text-muted-foreground">
                          {discType === "percentage" ? "%" : "AED"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="disc-use">{d.usageType}</Label>
                      <Select
                        value={usingType}
                        onValueChange={(val) => setUsingType(val as Discount["using_type"])}
                      >
                        <SelectTrigger id="disc-use" className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unlimited">{d.unlimited}</SelectItem>
                          <SelectItem value="once_per_user">{d.oncePerUser}</SelectItem>
                          <SelectItem value="limited_quantity">{d.limitedQty}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {usingType === "limited_quantity" && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <Label htmlFor="disc-qty">{d.benefitQty}</Label>
                        <Input
                          id="disc-qty"
                          type="number"
                          min={1}
                          value={benefitNumbers}
                          onChange={(e) => setBenefitNumbers(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="disc-starts" className="text-xs">
                          {d.startsAt}
                        </Label>
                        <Input
                          id="disc-starts"
                          type="date"
                          value={startsAt}
                          onChange={(e) => setStartsAt(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="disc-ends" className="text-xs">
                          {d.endsAt}
                        </Label>
                        <Input
                          id="disc-ends"
                          type="date"
                          value={endsAt}
                          onChange={(e) => setEndsAt(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleCreateDiscount}
                      disabled={savingDiscount || !discCode || !discValue || !endsAt}
                      className="w-full mt-2 h-10"
                    >
                      {savingDiscount ? "..." : d.saveDiscount}
                    </Button>
                  </CardContent>
                </CardComp>
              </div>

              {/* List Ledger */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-serif text-lg font-semibold px-1 text-foreground">
                  {d.activeCoupons}
                </h3>
                {discounts.length === 0 ? (
                  <CardComp className="border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
                    {d.noDiscounts}
                  </CardComp>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {discounts.map((disc) => (
                      <CardComp
                        key={disc.id}
                        className="border-border/60 bg-card hover:border-primary/30 transition-colors"
                      >
                        <CardContent className="p-4 flex justify-between items-start gap-2">
                          <div className="space-y-1">
                            <div className="font-mono text-sm font-bold tracking-wider text-foreground">
                              {disc.code}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {disc.type === "percentage"
                                ? `${disc.amount}% OFF`
                                : `${disc.amount} AED OFF`}
                            </div>
                            <div className="text-[10px] text-muted-foreground/75 flex flex-wrap gap-x-2">
                              <span>
                                {d.startsAt}: {disc.starts_at}
                              </span>
                              <span>·</span>
                              <span>
                                {d.endsAt}: {disc.ends_at}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                                disc.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                                  : "bg-red-500/10 text-red-300 border border-red-500/30"
                              }`}
                            >
                              {
                                d[
                                  `status${disc.status.charAt(0).toUpperCase() + disc.status.slice(1)}` as keyof typeof d
                                ]
                              }
                            </span>
                            <div className="text-[10px] text-muted-foreground/80 mt-1.5 capitalize">
                              {disc.using_type === "unlimited"
                                ? d.unlimited
                                : disc.using_type === "once_per_user"
                                  ? d.oncePerUser
                                  : `${d.limitedQty} (${disc.benefit_numbers})`}
                            </div>
                          </div>
                        </CardContent>
                      </CardComp>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: VIP LOYALTY MEMBERSHIPS */}
          <TabsContent value="memberships" className="space-y-6 outline-none">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Creator Form */}
              <div className="lg:col-span-1">
                <CardComp className="border-border/60 bg-card">
                  <CardHeader>
                    <CardTitle className="font-serif text-xl">{d.createMembership}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="memb-no">{d.membershipNo}</Label>
                        <button
                          type="button"
                          onClick={handleGenerateMembershipNo}
                          className="text-xs text-primary hover:underline font-mono"
                        >
                          {d.generateNo}
                        </button>
                      </div>
                      <Input
                        id="memb-no"
                        value={membershipNo}
                        onChange={(e) => setMembershipNo(e.target.value.toUpperCase())}
                        placeholder="e.g. VIP-1002"
                        className="font-mono tracking-wider"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="memb-cust">{d.clientLabel}</Label>
                      <Select value={memberCustName} onValueChange={setMemberCustName}>
                        <SelectTrigger id="memb-cust" className="h-10">
                          <SelectValue placeholder={d.clientNamePlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {recentCustomers.map((cust) => (
                            <SelectItem key={cust.phone} value={cust.name}>
                              {cust.name} ({cust.phone})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="memb-percent">{d.discountPercent} (%)</Label>
                      <div className="relative">
                        <Input
                          id="memb-percent"
                          type="number"
                          min={0}
                          max={100}
                          value={memberDiscount}
                          onChange={(e) => setMemberDiscount(e.target.value)}
                          placeholder="15"
                          className="pr-8"
                        />
                        <Percent className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-[10px] text-muted-foreground/75 leading-tight">
                        {d.discountPercentDesc}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="memb-starts" className="text-xs">
                          {d.startsAt}
                        </Label>
                        <Input
                          id="memb-starts"
                          type="date"
                          value={memberStarts}
                          onChange={(e) => setMemberStarts(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="memb-ends" className="text-xs">
                          {d.endsAt}
                        </Label>
                        <Input
                          id="memb-ends"
                          type="date"
                          value={memberEnds}
                          onChange={(e) => setMemberEnds(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleIssueMembership}
                      disabled={savingMembership || !membershipNo || !memberDiscount || !memberEnds}
                      className="w-full mt-2 h-10"
                    >
                      {savingMembership ? "..." : d.saveMembership}
                    </Button>
                  </CardContent>
                </CardComp>
              </div>

              {/* Memberships Cards List */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-serif text-lg font-semibold px-1 text-foreground">
                  {d.activeMemberships}
                </h3>
                {memberships.length === 0 ? (
                  <CardComp className="border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
                    {d.noMemberships}
                  </CardComp>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {memberships.map((memb) => (
                      <CardComp
                        key={memb.id}
                        className="border-border/60 bg-gradient-to-br from-card/80 to-background/50 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/20"
                      >
                        {/* Interactive Premium VIP loyalty card look */}
                        <div className="p-5 flex flex-col justify-between h-40">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-[9px] uppercase font-semibold text-primary tracking-widest">
                                VIP Club Member
                              </div>
                              <div className="font-mono text-sm font-bold text-foreground mt-0.5 tracking-wider">
                                {memb.membership_no}
                              </div>
                            </div>
                            <span
                              className={`text-[9px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                                memb.status === "active"
                                  ? "bg-primary/20 text-primary border border-primary/30"
                                  : "bg-red-500/10 text-red-300 border border-red-500/30"
                              }`}
                            >
                              {
                                d[
                                  `status${memb.status.charAt(0).toUpperCase() + memb.status.slice(1)}` as keyof typeof d
                                ]
                              }
                            </span>
                          </div>

                          <div className="flex justify-between items-end border-t border-border/40 pt-2 mt-4 text-[10px] text-muted-foreground/80">
                            <div>
                              <div className="text-[9px] text-muted-foreground/60">
                                {lang === "ar" ? "نسبة التخفيض" : "VIP Benefit"}
                              </div>
                              <div className="text-xl font-bold font-serif text-foreground mt-0.5">
                                {memb.discount_percent}% {lang === "ar" ? "خصم" : "Off"}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] text-muted-foreground/60">
                                {d.endsAt}
                              </span>
                              <div className="mt-0.5 font-mono">{memb.ends_at}</div>
                            </div>
                          </div>
                        </div>
                      </CardComp>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Section>
  );
}
