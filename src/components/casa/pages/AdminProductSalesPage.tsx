import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth-context";
import { executeCheckoutTransaction } from "@/lib/bookings";
import { useBusinessContext } from "@/lib/business-context";
import type { Lang } from "@/lib/i18n";
import { formatPrice, localePath, t } from "@/lib/i18n";

type ProductRow = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  "id" | "name_en" | "name_ar" | "price"
>;
type StaffRow = Pick<Database["public"]["Tables"]["barbers"]["Row"], "id" | "name_en" | "name_ar">;
type ProductSaleRow = {
  id: string;
  total_amount: number;
  payment_status: string;
  payments: unknown;
  created_at: string;
};
type PaymentType = "cash" | "card" | "wallet" | "online" | "other";

const paymentTypes: PaymentType[] = ["cash", "card", "wallet", "online", "other"];

export function AdminProductSalesPage({ lang }: { lang: Lang }) {
  const tt = t(lang);
  const router = useRouter();
  const auth = useAuth();
  const businessContext = useBusinessContext();
  const business = businessContext.business;
  const canAccess =
    auth.isAdmin ||
    ["business_owner", "business_admin", "business_manager", "cashier"].includes(
      businessContext.currentUserRole ?? "",
    );
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [sales, setSales] = useState<ProductSaleRow[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [paymentType, setPaymentType] = useState<PaymentType>("cash");
  const [staffId, setStaffId] = useState<string>("none");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loginHref = `${localePath(lang, "/login")}?redirect=${encodeURIComponent(
    localePath(lang, "/admin/product-sales"),
  )}`;

  const loadData = useCallback(async () => {
    if (!business || !canAccess) return;
    setLoading(true);
    try {
      const [productsResult, staffResult, salesResult] = await Promise.all([
        supabase
          .from("products")
          .select("id, name_en, name_ar, price")
          .eq("business_id", business.id)
          .eq("is_active", true)
          .order("name_en"),
        supabase
          .from("barbers")
          .select("id, name_en, name_ar")
          .eq("business_id", business.id)
          .eq("is_active", true)
          .order("name_en"),
        supabase
          .from("checkout_transactions")
          .select("id, total_amount, payment_status, payments, created_at")
          .eq("business_id", business.id)
          .gt("total_amount", 0)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (productsResult.error) throw productsResult.error;
      if (staffResult.error) throw staffResult.error;
      if (salesResult.error) throw salesResult.error;

      const nextProducts = (productsResult.data ?? []) as ProductRow[];
      setProducts(nextProducts);
      setStaff((staffResult.data ?? []) as StaffRow[]);
      setSales((salesResult.data ?? []) as ProductSaleRow[]);
      setProductId((current) => current || nextProducts[0]?.id || "");
    } catch (error) {
      const message = error instanceof Error ? error.message : tt.common.error;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [business, canAccess, tt.common.error]);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.navigate({ to: loginHref });
      return;
    }
    if (!auth.loading && auth.user && canAccess && business) void loadData();
  }, [auth.loading, auth.user, canAccess, business, loadData, loginHref, router]);

  const selectedProduct = products.find((product) => product.id === productId);
  const subtotal = (selectedProduct?.price ?? 0) * quantity;
  const total = Math.max(0, subtotal - discount);

  const businessName = useMemo(() => {
    if (!business) return "";
    return lang === "ar" ? business.name_ar : business.name_en;
  }, [business, lang]);

  const recordSale = async () => {
    if (!business || !selectedProduct || quantity <= 0) return;
    setSaving(true);
    try {
      const walkInPhone = `walkin-product-${business.id}`;
      let customerId: string | null = null;
      const { data: existingCustomer, error: customerLookupError } = await supabase
        .from("customers")
        .select("id")
        .eq("business_id", business.id)
        .eq("phone", walkInPhone)
        .maybeSingle();

      if (customerLookupError) throw customerLookupError;
      customerId = existingCustomer?.id ?? null;

      if (!customerId) {
        const { data: newCustomer, error: customerCreateError } = await supabase
          .from("customers")
          .insert({
            business_id: business.id,
            full_name: "Walk-in Product Customer",
            phone: walkInPhone,
            preferred_language: lang,
          })
          .select("id")
          .single();
        if (customerCreateError) throw customerCreateError;
        customerId = newCustomer.id;
      }

      if (!customerId) {
        throw new Error("Unable to resolve walk-in customer for product checkout.");
      }

      const checkout = await executeCheckoutTransaction({
        action: "complete",
        customerId,
        products: [
          {
            product_id: selectedProduct.id,
            name: lang === "ar" ? selectedProduct.name_ar : selectedProduct.name_en,
            price: Number(selectedProduct.price),
            qty: quantity,
            staff_id: staffId === "none" ? null : staffId || null,
            discount: 0,
            snapshot: {
              product_id: selectedProduct.id,
              name_en: selectedProduct.name_en,
              name_ar: selectedProduct.name_ar,
              price: Number(selectedProduct.price),
            },
          },
        ],
        discount,
        payments: [{ method: paymentType === "online" ? "card" : paymentType, amount: total }],
        notes: notes || undefined,
      });
      if (!checkout.success) throw new Error(checkout.error);
      toast.success(tt.productSales.saleRecorded);
      setQuantity(1);
      setDiscount(0);
      setNotes("");
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : tt.common.error;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (auth.loading || businessContext.loading) {
    return (
      <Section lang={lang}>
        <div className="rounded-lg border border-border/60 bg-card p-6 text-sm text-muted-foreground">
          {tt.common.loading}
        </div>
      </Section>
    );
  }

  if (!auth.user) return null;

  if (!canAccess) {
    return (
      <Section lang={lang} eyebrow={tt.admin.eyebrow} title={tt.productSales.title}>
        <Alert>
          <AlertTitle>{tt.admin.notAdmin}</AlertTitle>
          <AlertDescription>{tt.admin.notAdmin}</AlertDescription>
        </Alert>
      </Section>
    );
  }

  return (
    <Section lang={lang} eyebrow={tt.business.productSales} title={tt.productSales.title}>
      <div className="space-y-6">
        <p className="max-w-3xl text-sm text-muted-foreground">
          {tt.productSales.intro} {businessName}
        </p>

        <Card className="border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">{tt.productSales.recordSale}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{tt.productSales.product}</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {lang === "ar" ? product.name_ar : product.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{tt.productSales.quantity}</Label>
              <Input
                min={1}
                type="number"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label>{tt.productSales.paymentType}</Label>
              <Select
                value={paymentType}
                onValueChange={(value) => setPaymentType(value as PaymentType)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {tt.productSales[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{tt.productSales.staff}</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {staff.map((staffMember) => (
                    <SelectItem key={staffMember.id} value={staffMember.id}>
                      {lang === "ar" ? staffMember.name_ar : staffMember.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{tt.productSales.discount}</Label>
              <Input
                min={0}
                type="number"
                value={discount}
                onChange={(event) => setDiscount(Number(event.target.value) || 0)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>{tt.productSales.notes}</Label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>

            <div className="rounded-lg border border-border/60 bg-background/70 p-4 md:col-span-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{tt.productSales.subtotal}</span>
                <span>{formatPrice(lang, subtotal)}</span>
              </div>
              <div className="mt-2 flex justify-between text-lg font-semibold">
                <span>{tt.productSales.total}</span>
                <span>{formatPrice(lang, total)}</span>
              </div>
            </div>

            <div className="md:col-span-2">
              <Button
                onClick={recordSale}
                disabled={saving || loading || !productId}
                className="w-full"
              >
                {saving ? tt.common.loading : tt.productSales.recordSale}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3">
          {sales.length === 0 ? (
            <Card className="border-border/60 bg-card p-5 text-sm text-muted-foreground">
              {tt.productSales.empty}
            </Card>
          ) : (
            sales.map((sale) => (
              <Card key={sale.id} className="border-border/60 bg-card">
                <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-medium">
                      {formatPrice(lang, Number(sale.total_amount))} · {sale.payment_status}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(sale.created_at ?? "").toLocaleString(
                        lang === "ar" ? "ar-AE" : "en-GB",
                      )}{" "}
                      · {tt.productSales.recordSale}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{sale.payment_status}</div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Section>
  );
}
