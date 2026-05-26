import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Check,
  Eye,
  Trash,
  Sparkles,
  UserCheck,
  Calendar,
  BookOpen,
  Layers,
  Search,
  Phone,
  User,
  DollarSign,
  Package,
} from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useBusinessContext } from "@/lib/business-context";
import type { Lang } from "@/lib/i18n";
import { formatPrice, localePath } from "@/lib/i18n";
import { sellPackage } from "@/lib/bookings";

type PackageTemplate = {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  price: number;
  is_active: boolean;
  package_services: {
    id: string;
    service_id: string;
    quantity: number;
    services: {
      id: string;
      title_en: string;
      title_ar: string;
      price: number;
    } | null;
  }[];
};

type CustomerPackage = {
  id: string;
  customer_name: string;
  customer_phone: string;
  price_paid: number;
  status: "active" | "completed" | "cancelled";
  created_at: string;
  packages: {
    name_en: string;
    name_ar: string;
  } | null;
  customer_package_benefits: {
    id: string;
    total_quantity: number;
    remaining_quantity: number;
    services: {
      title_en: string;
      title_ar: string;
    } | null;
  }[];
};

const LOCAL_DICT = {
  en: {
    title: "Packages & Bundles",
    intro: "Create service package templates and track customer prepaid session balances.",
    tabTemplates: "Package Templates",
    tabSales: "Sales & Balances",
    createTemplate: "Create Package Template",
    nameEn: "Name (English)",
    nameAr: "Name (Arabic)",
    descEn: "Description (English)",
    descAr: "Description (Arabic)",
    price: "Selling Price (AED)",
    servicesIncluded: "Services Included",
    addService: "Add Service",
    selectService: "Select Service",
    quantity: "Quantity",
    saveTemplate: "Create Template",
    saveSuccess: "Package template created successfully.",
    saveError: "Unable to create package template.",
    activeTemplates: "Active Packages",
    noTemplates: "No package templates available yet.",
    sellPackage: "Sell Package to Client",
    clientName: "Client Name",
    clientPhone: "Client Phone Number",
    pricePaid: "Price Paid (AED)",
    selectPackage: "Select Package Template",
    sellSuccess: "Package sold and activated for client.",
    sellError: "Unable to process package sale.",
    salesHistory: "Customer Packages & Balances",
    noSales: "No package sales recorded yet.",
    statusActive: "Active",
    statusInactive: "Inactive",
    statusCompleted: "Fully Used",
    statusCancelled: "Cancelled",
    searchPlaceholder: "Search client name or phone...",
    details: "Package Benefits Balance",
    remaining: "Remaining",
    sessions: "Sessions",
    totalSessions: "Total sessions: {count}",
    packageName: "Package Name",
    client: "Client",
    pricePaidLabel: "Price Paid",
    date: "Date",
    status: "Status",
  },
  ar: {
    title: "الباقات والحزم",
    intro: "قم بإنشاء قوالب باقات الخدمات وتتبع أرصدة جلسات العملاء مسبقة الدفع.",
    tabTemplates: "قوالب الباقات",
    tabSales: "المبيعات والأرصدة",
    createTemplate: "إنشاء قالب باقة جديدة",
    nameEn: "الاسم (بالإنجليزي)",
    nameAr: "الاسم (بالعربي)",
    descEn: "الوصف (بالإنجليزي)",
    descAr: "الوصف (بالعربي)",
    price: "سعر البيع (درهم)",
    servicesIncluded: "الخدمات المشمولة في الباقة",
    addService: "إضافة خدمة",
    selectService: "اختر خدمة",
    quantity: "العدد",
    saveTemplate: "إنشاء قالب الباقة",
    saveSuccess: "تم إنشاء قالب الباقة بنجاح.",
    saveError: "تعذر إنشاء قالب الباقة.",
    activeTemplates: "الباقات النشطة المتاحة",
    noTemplates: "لا توجد قوالب باقات حالياً.",
    sellPackage: "بيع باقة لعميل",
    clientName: "اسم العميل",
    clientPhone: "رقم هاتف العميل",
    pricePaid: "المبلغ المدفوع (درهم)",
    selectPackage: "اختر قالب الباقة",
    sellSuccess: "تم بيع الباقة وتفعيلها للعميل بنجاح.",
    sellError: "تعذر إتمام عملية بيع الباقة.",
    salesHistory: "باقات العملاء وتتبع الأرصدة",
    noSales: "لا توجد مبيعات باقات مسجلة بعد.",
    statusActive: "نشط",
    statusInactive: "غير نشط",
    statusCompleted: "مستخدم بالكامل",
    statusCancelled: "ملغي",
    searchPlaceholder: "ابحث عن اسم العميل أو الهاتف...",
    details: "رصيد منافع الباقة",
    remaining: "المتبقي",
    sessions: "جلسات",
    totalSessions: "إجمالي الجلسات: {count}",
    packageName: "اسم الباقة",
    client: "العميل",
    pricePaidLabel: "المبلغ المدفوع",
    date: "التاريخ",
    status: "الحالة",
  },
};

export function AdminPackagesPage({ lang }: { lang: Lang }) {
  const router = useRouter();
  const auth = useAuth();
  const businessContext = useBusinessContext();
  const business = businessContext.business;
  const d = LOCAL_DICT[lang];

  const [templates, setTemplates] = useState<PackageTemplate[]>([]);
  const [sales, setSales] = useState<CustomerPackage[]>([]);
  const [services, setServices] = useState<
    { id: string; title_en: string; title_ar: string; price: number }[]
  >([]);
  const [loading, setLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Create Template Modal State
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [price, setPrice] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [serviceQuantity, setServiceQuantity] = useState("5");
  const [addedServices, setAddedServices] = useState<{ serviceId: string; quantity: number }[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Sell Package Modal State
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [pricePaid, setPricePaid] = useState("");
  const [sellingPkg, setSellingPkg] = useState(false);

  const loginHref = `${localePath(lang, "/login")}?redirect=${encodeURIComponent(
    localePath(lang, "/admin/packages"),
  )}`;

  const loadData = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    try {
      // 1. Fetch package templates
      const { data: templatesData, error: templatesErr } = await supabase
        .from("packages")
        .select(
          `
          *,
          package_services (
            id,
            service_id,
            quantity,
            services (
              id,
              title_en,
              title_ar,
              price
            )
          )
        `,
        )
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (templatesErr) throw templatesErr;

      // 2. Fetch customer package sales
      const { data: salesData, error: salesErr } = await supabase
        .from("customer_packages")
        .select(
          `
          *,
          packages (
            name_en,
            name_ar
          ),
          customer_package_benefits (
            id,
            total_quantity,
            remaining_quantity,
            services (
              title_en,
              title_ar
            )
          )
        `,
        )
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (salesErr) throw salesErr;

      // 3. Fetch active services for template dropdown
      const { data: servicesData, error: servicesErr } = await supabase
        .from("services")
        .select("id, title_en, title_ar, price")
        .eq("business_id", business.id)
        .eq("is_active", true);

      if (servicesErr) throw servicesErr;

      setTemplates((templatesData || []) as PackageTemplate[]);
      setSales((salesData || []) as CustomerPackage[]);
      setServices(servicesData || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error loading packages data.");
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

  // Handle template prefill of price when template is selected in Sell Package modal
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template) {
        setPricePaid(template.price.toString());
      }
    }
  }, [selectedTemplateId, templates]);

  const handleAddServiceToTemplate = () => {
    if (!selectedServiceId) return;

    // Check if service already added
    const existing = addedServices.find((s) => s.serviceId === selectedServiceId);
    if (existing) {
      setAddedServices(
        addedServices.map((s) =>
          s.serviceId === selectedServiceId
            ? { ...s, quantity: s.quantity + Number(serviceQuantity) }
            : s,
        ),
      );
    } else {
      setAddedServices([
        ...addedServices,
        { serviceId: selectedServiceId, quantity: Number(serviceQuantity) },
      ]);
    }
    setSelectedServiceId("");
  };

  const handleRemoveServiceFromTemplate = (serviceId: string) => {
    setAddedServices(addedServices.filter((s) => s.serviceId !== serviceId));
  };

  const handleCreateTemplate = async () => {
    if (!business || !nameEn || !nameAr || !price || addedServices.length === 0) {
      toast.error(
        lang === "ar"
          ? "يرجى تعبئة الحقول المطلوبة وإضافة خدمة واحدة على الأقل"
          : "Please enter required fields and add at least one service.",
      );
      return;
    }

    setSavingTemplate(true);
    try {
      // 1. Insert package template
      const { data: newPkg, error: pkgErr } = await supabase
        .from("packages")
        .insert({
          business_id: business.id,
          name_en: nameEn.trim(),
          name_ar: nameAr.trim(),
          description_en: descEn.trim() || null,
          description_ar: descAr.trim() || null,
          price: Number(price),
          is_active: true,
        })
        .select("*")
        .single();

      if (pkgErr || !newPkg) throw pkgErr;

      // 2. Insert package services junction
      const servicesToInsert = addedServices.map((s) => ({
        package_id: newPkg.id,
        service_id: s.serviceId,
        quantity: s.quantity,
      }));

      const { error: junctionErr } = await supabase
        .from("package_services")
        .insert(servicesToInsert);

      if (junctionErr) throw junctionErr;

      toast.success(d.saveSuccess);
      setIsTemplateDialogOpen(false);
      setNameEn("");
      setNameAr("");
      setDescEn("");
      setDescAr("");
      setPrice("");
      setAddedServices([]);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : d.saveError);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSellPackage = async () => {
    if (!business || !custName || !custPhone || !selectedTemplateId || !pricePaid) {
      toast.error(lang === "ar" ? "يرجى تعبئة جميع الحقول" : "Please fill in all fields.");
      return;
    }

    setSellingPkg(true);
    try {
      const result = await sellPackage({
        businessId: business.id,
        customerName: custName.trim(),
        customerPhone: custPhone.trim(),
        packageId: selectedTemplateId,
        pricePaid: Number(pricePaid),
      });

      if (!result.success) throw new Error(result.error);

      toast.success(d.sellSuccess);
      setIsSellDialogOpen(false);
      setCustName("");
      setCustPhone("");
      setSelectedTemplateId("");
      setPricePaid("");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : d.sellError);
    } finally {
      setSellingPkg(false);
    }
  };

  const handleDeactivateTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from("packages")
        .update({ is_active: false })
        .eq("id", templateId);

      if (error) throw error;
      toast.success(lang === "ar" ? "تم إلغاء تنشيط الباقة." : "Package deactivated.");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error deactivating package.");
    }
  };

  const filteredSales = sales.filter((sale) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      sale.customer_name.toLowerCase().includes(query) ||
      sale.customer_phone.includes(query) ||
      (sale.packages?.name_en || "").toLowerCase().includes(query) ||
      (sale.packages?.name_ar || "").includes(query)
    );
  });

  if (loading && templates.length === 0 && sales.length === 0) {
    return (
      <Section lang={lang} title={d.title}>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="max-w-xl text-sm text-muted-foreground">{d.intro}</p>

          <div className="flex flex-wrap gap-3">
            {/* Create Template Dialog Button */}
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  <Plus className="h-4 w-4 mr-2" /> {d.createTemplate}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg border border-border/60 bg-card/95 backdrop-blur-md">
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl">{d.createTemplate}</DialogTitle>
                  <DialogDescription>
                    {lang === "ar"
                      ? "قم بتحديد الخدمات والعدد والسعر الإجمالي لبيع الحزمة."
                      : "Define the package services, quantities, and the bundle price for sale."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name-en">{d.nameEn} *</Label>
                      <Input
                        id="name-en"
                        value={nameEn}
                        onChange={(e) => setNameEn(e.target.value)}
                        placeholder="e.g. Grooming Package x5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name-ar">{d.nameAr} *</Label>
                      <Input
                        id="name-ar"
                        value={nameAr}
                        onChange={(e) => setNameAr(e.target.value)}
                        placeholder="مثال: باقة الحلاقة ٥ مرات"
                        className="text-right"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="desc-en">{d.descEn}</Label>
                      <Input
                        id="desc-en"
                        value={descEn}
                        onChange={(e) => setDescEn(e.target.value)}
                        placeholder="e.g. 5 Haircut sessions"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="desc-ar">{d.descAr}</Label>
                      <Input
                        id="desc-ar"
                        value={descAr}
                        onChange={(e) => setDescAr(e.target.value)}
                        placeholder="مثال: ٥ جلسات قص شعر"
                        className="text-right"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price-tmpl">{d.price} *</Label>
                    <div className="relative">
                      <Input
                        id="price-tmpl"
                        type="number"
                        min={0}
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="350"
                        className="pl-8"
                      />
                      <DollarSign className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="border-t border-border/40 pt-4 space-y-4">
                    <h3 className="font-semibold text-sm">{d.servicesIncluded}</h3>

                    <div className="flex gap-2 items-end">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="service-select">{d.selectService}</Label>
                        <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                          <SelectTrigger id="service-select">
                            <SelectValue placeholder={d.selectService} />
                          </SelectTrigger>
                          <SelectContent>
                            {services.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {lang === "ar" ? s.title_ar : s.title_en} ({s.price} AED)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-24 space-y-2">
                        <Label htmlFor="service-qty">{d.quantity}</Label>
                        <Input
                          id="service-qty"
                          type="number"
                          min={1}
                          value={serviceQuantity}
                          onChange={(e) => setServiceQuantity(e.target.value)}
                        />
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleAddServiceToTemplate}
                        className="h-10"
                      >
                        {d.addService}
                      </Button>
                    </div>

                    {/* Added services list */}
                    <div className="space-y-2">
                      {addedServices.map((item) => {
                        const s = services.find((srv) => srv.id === item.serviceId);
                        return (
                          <div
                            key={item.serviceId}
                            className="flex items-center justify-between p-2 rounded-lg bg-secondary/40 border border-border/40 text-sm"
                          >
                            <span>
                              {s ? (lang === "ar" ? s.title_ar : s.title_en) : ""}
                              <span className="ml-2 font-mono font-bold text-primary">
                                x{item.quantity}
                              </span>
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveServiceFromTemplate(item.serviceId)}
                              className="h-8 w-8 text-destructive hover:text-destructive/80"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4 border-t border-border/40 pt-4">
                  <Button variant="ghost" onClick={() => setIsTemplateDialogOpen(false)}>
                    {lang === "ar" ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button
                    onClick={handleCreateTemplate}
                    disabled={savingTemplate}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    {savingTemplate ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    ) : (
                      d.saveTemplate
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Sell Package Dialog Button */}
            <Dialog open={isSellDialogOpen} onOpenChange={setIsSellDialogOpen}>
              <DialogTrigger asChild>
                <Button className="border border-border/60 bg-secondary/80 hover:bg-secondary text-secondary-foreground font-semibold">
                  <Package className="h-4 w-4 mr-2" /> {d.sellPackage}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md border border-border/60 bg-card/95 backdrop-blur-md">
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl">{d.sellPackage}</DialogTitle>
                  <DialogDescription>
                    {lang === "ar"
                      ? "بيع وتفعيل باقة رصيد جلسات مسبقة الدفع لحساب العميل."
                      : "Sell and activate a pre-paid session bundle for a client."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 px-1">
                  <div className="space-y-2">
                    <Label htmlFor="cust-name">{d.clientName} *</Label>
                    <div className="relative">
                      <Input
                        id="cust-name"
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        placeholder="John Doe"
                        className="pl-8"
                      />
                      <User className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cust-phone">{d.clientPhone} *</Label>
                    <div className="relative">
                      <Input
                        id="cust-phone"
                        value={custPhone}
                        onChange={(e) => setCustPhone(e.target.value)}
                        placeholder="+971501234567"
                        className="pl-8"
                      />
                      <Phone className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-select">{d.selectPackage} *</Label>
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                      <SelectTrigger id="template-select">
                        <SelectValue placeholder={d.selectPackage} />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {lang === "ar" ? t.name_ar : t.name_en} ({t.price} AED)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price-paid">{d.pricePaid} *</Label>
                    <div className="relative">
                      <Input
                        id="price-paid"
                        type="number"
                        min={0}
                        value={pricePaid}
                        onChange={(e) => setPricePaid(e.target.value)}
                        className="pl-8"
                      />
                      <DollarSign className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4 border-t border-border/40 pt-4">
                  <Button variant="ghost" onClick={() => setIsSellDialogOpen(false)}>
                    {lang === "ar" ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button
                    onClick={handleSellPackage}
                    disabled={sellingPkg}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    {sellingPkg ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    ) : (
                      d.sellPackage
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList className="border-b border-border/60 justify-start w-full bg-transparent h-auto p-0 rounded-none gap-6">
            <TabsTrigger
              value="sales"
              className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent px-1 pb-3 pt-0 rounded-none text-sm font-semibold transition-all w-auto bg-transparent"
            >
              <Layers className="h-4 w-4 mr-2 inline" /> {d.tabSales}
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent px-1 pb-3 pt-0 rounded-none text-sm font-semibold transition-all w-auto bg-transparent"
            >
              <BookOpen className="h-4 w-4 mr-2 inline" /> {d.tabTemplates}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: SALES & BALANCES */}
          <TabsContent value="sales" className="space-y-6 outline-none">
            {/* Search Input */}
            <div className="relative max-w-sm">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={d.searchPlaceholder}
                className="pl-9"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>

            {filteredSales.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 p-12 text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">{d.noSales}</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {filteredSales.map((sale) => {
                  const dateStr = sale.created_at
                    ? new Date(sale.created_at).toLocaleDateString(
                        lang === "ar" ? "ar-AE" : "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      )
                    : "";

                  return (
                    <CardComp
                      key={sale.id}
                      className="border-border/60 bg-card hover:shadow-md transition-all duration-300"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="font-serif text-lg text-primary">
                              {sale.packages
                                ? lang === "ar"
                                  ? sale.packages.name_ar
                                  : sale.packages.name_en
                                : d.packageName}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-1.5 mt-1 font-mono text-xs">
                              <User className="h-3 w-3" /> {sale.customer_name} (
                              {sale.customer_phone})
                            </CardDescription>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              sale.status === "active"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : sale.status === "completed"
                                  ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                  : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {sale.status === "active"
                              ? d.statusActive
                              : sale.status === "completed"
                                ? d.statusCompleted
                                : d.statusCancelled}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/40 pb-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> {d.date}: {dateStr}
                          </span>
                          <span>
                            {d.pricePaidLabel}: {formatPrice(lang, sale.price_paid)}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {d.details}
                          </h4>
                          <div className="space-y-2.5">
                            {sale.customer_package_benefits.map((benefit) => {
                              const srvName = benefit.services
                                ? lang === "ar"
                                  ? benefit.services.title_ar
                                  : benefit.services.title_en
                                : "Service";

                              const pct =
                                (benefit.remaining_quantity / benefit.total_quantity) * 100;

                              return (
                                <div key={benefit.id} className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span>{srvName}</span>
                                    <span className="font-semibold text-primary">
                                      {benefit.remaining_quantity} / {benefit.total_quantity}{" "}
                                      {d.sessions}
                                    </span>
                                  </div>
                                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        benefit.remaining_quantity === 0
                                          ? "bg-muted"
                                          : pct <= 30
                                            ? "bg-amber-500"
                                            : "bg-primary"
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </CardComp>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: TEMPLATES */}
          <TabsContent value="templates" className="space-y-6 outline-none">
            {templates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 p-12 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">{d.noTemplates}</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((tmpl) => {
                  const totalItems = tmpl.package_services.reduce(
                    (acc, curr) => acc + curr.quantity,
                    0,
                  );

                  return (
                    <CardComp
                      key={tmpl.id}
                      className={`border-border/60 bg-card hover:shadow-md transition-all duration-300 ${
                        !tmpl.is_active ? "opacity-60" : ""
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="font-serif text-lg">
                              {lang === "ar" ? tmpl.name_ar : tmpl.name_en}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {lang === "ar"
                                ? tmpl.description_ar || "لا يوجد وصف"
                                : tmpl.description_en || "No description"}
                            </CardDescription>
                          </div>
                          {!tmpl.is_active && (
                            <span className="rounded-full bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 text-xs font-semibold">
                              {d.statusInactive}
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-sm font-semibold border-b border-border/40 pb-2">
                          <span className="text-primary font-serif text-base">
                            {formatPrice(lang, tmpl.price)}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {d.totalSessions.replace("{count}", totalItems.toString())}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {tmpl.package_services.map((ps) => {
                            const srvName = ps.services
                              ? lang === "ar"
                                ? ps.services.title_ar
                                : ps.services.title_en
                              : "Service";
                            return (
                              <div
                                key={ps.id}
                                className="flex justify-between text-xs text-muted-foreground"
                              >
                                <span>• {srvName}</span>
                                <span className="font-semibold font-mono">x{ps.quantity}</span>
                              </div>
                            );
                          })}
                        </div>

                        {tmpl.is_active && (
                          <div className="flex justify-end pt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2.5"
                              onClick={() => handleDeactivateTemplate(tmpl.id)}
                            >
                              <Trash className="h-3.5 w-3.5 mr-1" />{" "}
                              {lang === "ar" ? "تعطيل الباقة" : "Deactivate"}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </CardComp>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Section>
  );
}
