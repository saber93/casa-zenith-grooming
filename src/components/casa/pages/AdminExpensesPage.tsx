import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Receipt, User, Wallet, Calendar } from "lucide-react";

import { Section } from "@/components/casa/Section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useBusinessContext } from "@/lib/business-context";
import type { Lang } from "@/lib/i18n";
import { formatPrice, localePath } from "@/lib/i18n";

type Supplier = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

type Expense = {
  id: string;
  expense_name: string;
  payee: string;
  amount: number;
  payment_type: "weekly" | "monthly" | "yearly" | "one_time";
  date: string;
  notes?: string | null;
  receipt_image_url?: string | null;
  supplier_id?: string | null;
};

const LOCAL_DICT = {
  en: {
    title: "Suppliers & Expenses",
    intro: "Track business expenses, operational costs, and supplier payments.",
    recordExpense: "Record Expense",
    expenseName: "Expense Name",
    payee: "Payee / Recipient",
    amount: "Amount",
    frequency: "Frequency",
    date: "Date",
    notes: "Notes",
    supplier: "Supplier",
    empty: "No expenses recorded yet.",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
    one_time: "One-time",
    receiptImage: "Receipt Image URL",
    saveSuccess: "Expense recorded successfully.",
    saveError: "Unable to record expense.",
    addSupplier: "Add New Supplier",
    supplierName: "Supplier Name",
    supplierPhone: "Supplier Phone",
    supplierEmail: "Supplier Email",
    supplierSuccess: "Supplier registered successfully.",
    summaryTitle: "Expense Summary",
    totalSpent: "Total Expenses",
    monthlySpent: "This Month",
    oneTimeSpent: "One-time Expenses",
    noSupplier: "Direct / No Supplier",
    notesPlaceholder: "Enter optional remarks...",
    saveSupplier: "Save Supplier",
  },
  ar: {
    title: "الموردون والمصاريف",
    intro: "تتبع مصاريف النشاط، التكاليف التشغيلية، ودفعات الموردين.",
    recordExpense: "تسجيل مصروف",
    expenseName: "اسم المصروف",
    payee: "المستفيد / المستلم",
    amount: "المبلغ",
    frequency: "التكرار",
    date: "التاريخ",
    notes: "ملاحظات",
    supplier: "المورد",
    empty: "لا توجد مصاريف مسجلة بعد.",
    weekly: "أسبوعي",
    monthly: "شهري",
    yearly: "سنوي",
    one_time: "مرة واحدة",
    receiptImage: "رابط صورة الإيصال",
    saveSuccess: "تم تسجيل المصروف بنجاح.",
    saveError: "تعذر تسجيل المصروف.",
    addSupplier: "إضافة مورد جديد",
    supplierName: "اسم المورد",
    supplierPhone: "هاتف المورد",
    supplierEmail: "البريد الإلكتروني",
    supplierSuccess: "تم تسجيل المورد بنجاح.",
    summaryTitle: "ملخص المصاريف",
    totalSpent: "إجمالي المصاريف",
    monthlySpent: "هذا الشهر",
    oneTimeSpent: "مصاريف لمرة واحدة",
    noSupplier: "مباشر / بدون مورد",
    notesPlaceholder: "أدخل ملاحظات اختيارية...",
    saveSupplier: "حفظ المورد",
  },
};

export function AdminExpensesPage({ lang }: { lang: Lang }) {
  const router = useRouter();
  const auth = useAuth();
  const businessContext = useBusinessContext();
  const business = businessContext.business;
  const d = LOCAL_DICT[lang];

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State - Expense
  const [expenseName, setExpenseName] = useState("");
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Expense["payment_type"]>("one_time");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [supplierId, setSupplierId] = useState<string>("none");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [notes, setNotes] = useState("");

  // Form State - Supplier Modal/Section
  const [newSupName, setNewSupName] = useState("");
  const [newSupPhone, setNewSupPhone] = useState("");
  const [newSupEmail, setNewSupEmail] = useState("");
  const [showAddSupplier, setShowAddSupplier] = useState(false);

  const loginHref = `${localePath(lang, "/login")}?redirect=${encodeURIComponent(
    localePath(lang, "/admin/expenses"),
  )}`;

  const loadData = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    try {
      const [suppliersResult, expensesResult] = await Promise.all([
        supabase
          .from("suppliers")
          .select("id, name, phone, email")
          .eq("business_id", business.id)
          .order("name"),
        supabase
          .from("expenses")
          .select(
            "id, expense_name, payee, amount, payment_type, date, notes, receipt_image_url, supplier_id",
          )
          .eq("business_id", business.id)
          .order("date", { ascending: false }),
      ]);

      if (suppliersResult.error) throw suppliersResult.error;
      if (expensesResult.error) throw expensesResult.error;

      setSuppliers(suppliersResult.data as Supplier[]);
      setExpenses(expensesResult.data as Expense[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error loading expenses data.");
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

  const handleRecordExpense = async () => {
    if (!business || !expenseName || !payee || !amount) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("expenses").insert({
        business_id: business.id,
        expense_name: expenseName,
        payee,
        amount: Number(amount),
        payment_type: frequency,
        date,
        notes: notes || null,
        receipt_image_url: receiptUrl || null,
        supplier_id: supplierId === "none" ? null : supplierId,
      });

      if (error) throw error;
      toast.success(d.saveSuccess);
      setExpenseName("");
      setPayee("");
      setAmount("");
      setNotes("");
      setReceiptUrl("");
      setSupplierId("none");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : d.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSupplier = async () => {
    if (!business || !newSupName) return;
    try {
      const { error } = await supabase.from("suppliers").insert({
        business_id: business.id,
        name: newSupName,
        phone: newSupPhone || null,
        email: newSupEmail || null,
      });
      if (error) throw error;
      toast.success(d.supplierSuccess);
      setNewSupName("");
      setNewSupPhone("");
      setNewSupEmail("");
      setShowAddSupplier(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error adding supplier.");
    }
  };

  // Summaries
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

  const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
  const thisMonthExpenses = expenses
    .filter((item) => item.date.startsWith(currentMonthStr))
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const oneTimeExpenses = expenses
    .filter((item) => item.payment_type === "one_time")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  if (auth.loading || businessContext.loading || loading) {
    return (
      <Section lang={lang}>
        <div className="rounded-lg border border-border/60 bg-card p-6 text-sm text-muted-foreground">
          {lang === "ar" ? "جاري التحميل..." : "Loading..."}
        </div>
      </Section>
    );
  }

  if (!auth.user) return null;

  return (
    <Section
      lang={lang}
      eyebrow={
        businessContext.business
          ? lang === "ar"
            ? businessContext.business.name_ar
            : businessContext.business.name_en
          : d.title
      }
      title={d.title}
    >
      <div className="space-y-6">
        <p className="max-w-3xl text-sm text-muted-foreground">{d.intro}</p>

        {/* Dynamic Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border/60 bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {d.totalSpent}
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-primary">
                {formatPrice(lang, totalExpenses)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {d.monthlySpent}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-foreground">
                {formatPrice(lang, thisMonthExpenses)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {d.oneTimeSpent}
              </CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-muted-foreground">
                {formatPrice(lang, oneTimeExpenses)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Record Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/60 bg-card">
              <CardHeader>
                <CardTitle className="font-serif text-2xl">{d.recordExpense}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{d.expenseName}</Label>
                  <Input
                    value={expenseName}
                    onChange={(e) => setExpenseName(e.target.value)}
                    placeholder="e.g. Rent, Electricity, Cleaning Supplies"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{d.payee}</Label>
                  <Input
                    value={payee}
                    onChange={(e) => setPayee(e.target.value)}
                    placeholder="e.g. FEWA, Real Estate LLC, Staff Name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{d.amount} (AED)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{d.frequency}</Label>
                  <Select
                    value={frequency}
                    onValueChange={(val) => setFrequency(val as Expense["payment_type"])}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">{d.one_time}</SelectItem>
                      <SelectItem value="weekly">{d.weekly}</SelectItem>
                      <SelectItem value="monthly">{d.monthly}</SelectItem>
                      <SelectItem value="yearly">{d.yearly}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{d.date}</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{d.supplier}</Label>
                    <button
                      type="button"
                      onClick={() => setShowAddSupplier(!showAddSupplier)}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> {d.addSupplier}
                    </button>
                  </div>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{d.noSupplier}</SelectItem>
                      {suppliers.map((sup) => (
                        <SelectItem key={sup.id} value={sup.id}>
                          {sup.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>{d.receiptImage}</Label>
                  <Input
                    type="url"
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                    placeholder="https://example.com/receipt.jpg"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>{d.notes}</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={d.notesPlaceholder}
                  />
                </div>

                <div className="sm:col-span-2 pt-2">
                  <Button
                    onClick={handleRecordExpense}
                    disabled={saving || !expenseName || !payee || !amount}
                    className="w-full h-11"
                  >
                    {saving ? (lang === "ar" ? "جاري الحفظ..." : "Recording...") : d.recordExpense}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* List Table of recent expenses */}
            <div className="space-y-3">
              {expenses.length === 0 ? (
                <Card className="border-border/60 bg-card p-5 text-center text-sm text-muted-foreground">
                  {d.empty}
                </Card>
              ) : (
                expenses.map((expense) => {
                  const s = suppliers.find((item) => item.id === expense.supplier_id);
                  return (
                    <Card
                      key={expense.id}
                      className="border-border/60 bg-card hover:bg-card/80 transition-colors"
                    >
                      <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {expense.expense_name} ·{" "}
                            <span className="text-primary">
                              {formatPrice(lang, expense.amount)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-1">
                            <span>
                              {d.payee}: {expense.payee}
                            </span>
                            <span>·</span>
                            <span>
                              {d.date}: {expense.date}
                            </span>
                            {s && (
                              <>
                                <span>·</span>
                                <span className="text-muted-foreground/80">
                                  {d.supplier}: {s.name}
                                </span>
                              </>
                            )}
                            <span>·</span>
                            <span className="capitalize bg-background/50 px-1.5 py-0.5 rounded text-[10px]">
                              {d[expense.payment_type]}
                            </span>
                          </div>
                          {expense.notes && (
                            <div className="text-xs text-muted-foreground/75 mt-1.5 italic">
                              "{expense.notes}"
                            </div>
                          )}
                        </div>
                        {expense.receipt_image_url && (
                          <a
                            href={expense.receipt_image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 self-start sm:self-center"
                          >
                            <Receipt className="h-3.5 w-3.5" /> Receipt
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Sidebar Section: Add Supplier Form & Info */}
          <div className="space-y-6">
            {showAddSupplier && (
              <Card className="border-border/60 bg-card border-primary/40 animate-in fade-in slide-in-from-top-4 duration-300">
                <CardHeader>
                  <CardTitle className="font-serif text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" /> {d.addSupplier}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{d.supplierName}</Label>
                    <Input
                      value={newSupName}
                      onChange={(e) => setNewSupName(e.target.value)}
                      placeholder="e.g. Zenith Cosmetics Ltd"
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">{d.supplierPhone}</Label>
                    <Input
                      value={newSupPhone}
                      onChange={(e) => setNewSupPhone(e.target.value)}
                      placeholder="+971 500000000"
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">{d.supplierEmail}</Label>
                    <Input
                      type="email"
                      value={newSupEmail}
                      onChange={(e) => setNewSupEmail(e.target.value)}
                      placeholder="orders@zenith.com"
                      className="h-9 text-sm"
                    />
                  </div>

                  <Button
                    onClick={handleAddSupplier}
                    disabled={!newSupName}
                    className="w-full h-9 text-sm mt-2"
                  >
                    {d.saveSupplier}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* List of Registered Suppliers */}
            <Card className="border-border/60 bg-card">
              <CardHeader>
                <CardTitle className="font-serif text-lg">
                  {lang === "ar" ? "قائمة الموردين" : "Registered Suppliers"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {suppliers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    {lang === "ar" ? "لا يوجد موردون مسجلون" : "No suppliers registered."}
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {suppliers.map((sup) => (
                      <div key={sup.id} className="p-4 flex flex-col gap-1">
                        <span className="text-sm font-medium">{sup.name}</span>
                        {(sup.phone || sup.email) && (
                          <div className="text-xs text-muted-foreground/80 flex flex-col gap-0.5">
                            {sup.phone && <span>{sup.phone}</span>}
                            {sup.email && <span>{sup.email}</span>}
                          </div>
                        )}
                      </div>
                    ))}
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
