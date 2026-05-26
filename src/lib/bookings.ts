import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];

export const isBookingConflictError = (error: unknown) => {
  const maybeError = error as { code?: string; message?: string; details?: string } | null;
  const text = `${maybeError?.code ?? ""} ${maybeError?.message ?? ""} ${
    maybeError?.details ?? ""
  }`.toLowerCase();

  return (
    maybeError?.code === "23505" ||
    maybeError?.code === "23P01" ||
    text.includes("bookings_unique_active_barber_slot") ||
    text.includes("booking_items_staff_no_overlap") ||
    text.includes("booking_items_resource_no_overlap") ||
    text.includes("duplicate key value violates unique constraint") ||
    text.includes("exclusion constraint")
  );
};

export const bookingConflictMessage = (error: unknown, lang: Lang) => {
  const maybeError = error as { code?: string; message?: string; details?: string } | null;
  const text = `${maybeError?.code ?? ""} ${maybeError?.message ?? ""} ${
    maybeError?.details ?? ""
  }`.toLowerCase();

  if (text.includes("booking_items_resource_no_overlap")) {
    return lang === "ar"
      ? "الغرفة أو المرفق المختار محجوز بالفعل خلال هذه الفترة الزمنية."
      : "The selected room or treatment space is already occupied during this time.";
  }

  if (text.includes("booking_items_staff_no_overlap")) {
    return lang === "ar"
      ? "الموظف المختار محجوز بالفعل خلال هذه الفترة الزمنية."
      : "The selected professional is already booked during this time.";
  }

  return lang === "ar"
    ? "الموظف المختار أو الفترة الزمنية محجوزة بالفعل. يرجى اختيار موعد آخر."
    : "The selected professional or time slot is already booked. Please try another time.";
};

export async function createAdminBooking(payload: BookingInsert) {
  return supabase.from("bookings").insert(payload).select("*").single();
}

export async function validateBookingSchedule(params: {
  businessId: string;
  barberId: string | null;
  startsAt: string;
  endsAt: string;
  lang: Lang;
}): Promise<{ valid: boolean; error?: string }> {
  const { businessId, barberId, startsAt, endsAt, lang } = params;

  // 1. Business Working Days Check
  const dayOfWeek = new Date(startsAt).getDay(); // 0=Sunday, 6=Saturday
  const { data: workingDay, error: workingDayErr } = await supabase
    .from("business_working_days")
    .select("is_active")
    .eq("business_id", businessId)
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();

  if (workingDay && !workingDay.is_active) {
    return {
      valid: false,
      error: lang === "ar" ? "الصالون مغلق في هذا اليوم." : "The salon is closed on this day.",
    };
  }

  // 2. Staff Vacation & Shift Checks
  if (barberId) {
    // Date comparison formatting (YYYY-MM-DD)
    const bookingDate = startsAt.split("T")[0];

    // Check vacations/leaves
    const { data: vacation, error: vacationErr } = await supabase
      .from("vacations")
      .select("id")
      .eq("business_id", businessId)
      .eq("barber_id", barberId)
      .eq("day", bookingDate)
      .maybeSingle();

    if (vacation) {
      return {
        valid: false,
        error:
          lang === "ar"
            ? "الموظف المختار في إجازة في هذا اليوم."
            : "The selected professional is on vacation on this day.",
      };
    }

    // Check Shifts
    const { data: barber, error: barberErr } = await supabase
      .from("barbers")
      .select("shift_id")
      .eq("id", barberId)
      .maybeSingle();

    let startTime = "10:00:00";
    let endTime = "22:00:00";
    let breakStart: string | null = null;
    let breakEnd: string | null = null;

    if (barber && barber.shift_id) {
      const { data: shift, error: shiftErr } = await supabase
        .from("shifts")
        .select("start_time, end_time, break_start, break_end")
        .eq("id", barber.shift_id)
        .maybeSingle();

      if (shift) {
        startTime = shift.start_time;
        endTime = shift.end_time;
        breakStart = shift.break_start;
        breakEnd = shift.break_end;
      }
    }

    // Convert booking date times to local "HH:MM:SS" strings
    const startDt = new Date(startsAt);
    const endDt = new Date(endsAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const bookingStart = `${pad(startDt.getHours())}:${pad(startDt.getMinutes())}:${pad(startDt.getSeconds())}`;
    const bookingEnd = `${pad(endDt.getHours())}:${pad(endDt.getMinutes())}:${pad(endDt.getSeconds())}`;

    // Verify time fits inside shift working hours
    if (bookingStart < startTime || bookingEnd > endTime) {
      const displayStart = startTime.slice(0, 5);
      const displayEnd = endTime.slice(0, 5);
      return {
        valid: false,
        error:
          lang === "ar"
            ? `وقت الحجز يقع خارج ساعات العمل الحالية للموظف (${displayStart} - ${displayEnd}).`
            : `Booking time falls outside of the professional's working hours (${displayStart} - ${displayEnd}).`,
      };
    }

    // Verify time does not overlap with shift breaks
    if (breakStart && breakEnd) {
      if (bookingStart < breakEnd && bookingEnd > breakStart) {
        const displayBStart = breakStart.slice(0, 5);
        const displayBEnd = breakEnd.slice(0, 5);
        return {
          valid: false,
          error:
            lang === "ar"
              ? `وقت الحجز يتعارض مع فترة استراحة الموظف (${displayBStart} - ${displayBEnd}).`
              : `Booking time overlaps with the professional's break (${displayBStart} - ${displayBEnd}).`,
        };
      }
    }
  }

  return { valid: true };
}

export async function createDurationBooking(payload: {
  businessId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  startsAt: string;
  endsAt: string;
  staffId?: string | null;
  resourceId?: string | null;
  language?: Lang;
  notes?: string | null;
}) {
  const validation = await validateBookingSchedule({
    businessId: payload.businessId,
    barberId: payload.staffId || null,
    startsAt: payload.startsAt,
    endsAt: payload.endsAt,
    lang: payload.language || "en",
  });

  if (!validation.valid) {
    return {
      data: null,
      error: new Error(validation.error || "Schedule validation failed"),
    };
  }

  return supabase.rpc("create_duration_booking", {
    p_business_id: payload.businessId,
    p_service_id: payload.serviceId,
    p_customer_name: payload.customerName,
    p_customer_phone: payload.customerPhone,
    p_starts_at: payload.startsAt,
    p_ends_at: payload.endsAt,
    p_staff_id: payload.staffId || undefined,
    p_resource_id: payload.resourceId || undefined,
    p_language: payload.language || "en",
    p_notes: payload.notes || undefined,
  });
}

export type CheckoutBreakdown = {
  subtotal: number;
  discountAmount: number;
  discountLabel: string | null;
  voucherDrawdown: number;
  voucherLabel: string | null;
  voucherBalanceAfter: number | null;
  commissionAmount: number;
  netTotal: number;
};

export async function validateDiscountCode(code: string, businessId: string) {
  const normalizedCode = code.toUpperCase().trim();
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const { data, error } = await supabase
    .from("discounts")
    .select("*")
    .eq("business_id", businessId)
    .eq("code", normalizedCode)
    .eq("status", "active")
    .lte("starts_at", today)
    .gte("ends_at", today)
    .maybeSingle();

  if (error || !data) {
    return { valid: false };
  }

  // Check if benefit_numbers is limited and has been depleted (using_type = 'limited_quantity')
  if (
    data.using_type === "limited_quantity" &&
    data.benefit_numbers !== null &&
    data.benefit_numbers <= 0
  ) {
    return { valid: false };
  }

  return {
    valid: true,
    discount: {
      id: data.id,
      type: data.type as "percentage" | "fixed",
      amount: data.amount,
      code: data.code,
      using_type: data.using_type,
    },
  };
}

export async function lookupVoucherBalance(code: string, businessId: string) {
  const normalizedCode = code.toUpperCase().trim();
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("business_id", businessId)
    .eq("code", normalizedCode)
    .eq("status", "active")
    .lte("starts_at", today)
    .gte("ends_at", today)
    .maybeSingle();

  if (error || !data) {
    return { found: false };
  }

  return {
    found: true,
    code: data.code,
    balance: data.amount,
    walletId: data.id,
  };
}

export async function completeBookingCheckout(params: {
  bookingId: string;
  businessId: string;
  paymentType: "cash" | "card" | "voucher" | "mixed" | "package";
  discountCode?: string | null;
  voucherCode?: string | null;
  customerPackageBenefitId?: string | null;
  lang: Lang;
}): Promise<{ success: boolean; error?: string; breakdown?: CheckoutBreakdown }> {
  const {
    bookingId,
    businessId,
    paymentType,
    discountCode,
    voucherCode,
    customerPackageBenefitId,
    lang,
  } = params;

  // 1. Fetch the booking
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingErr || !booking) {
    return { success: false, error: "Booking not found" };
  }

  if (!booking.service_id) {
    return { success: false, error: "Booking service not specified" };
  }

  // 2. Fetch the service to get the price (subtotal)
  const { data: service, error: serviceErr } = await supabase
    .from("services")
    .select("*")
    .eq("id", booking.service_id)
    .maybeSingle();

  if (serviceErr || !service) {
    return { success: false, error: "Service not found" };
  }

  const subtotal = service.price;

  // 3. Process Package Redemption if provided
  let discountAmount = 0;
  let discountLabel: string | null = null;
  let isPackageRedemption = false;
  let packageLabel = "";
  const packageUsage: CheckoutPackageUsage[] = [];

  if (customerPackageBenefitId) {
    const { data: benefit, error: benefitErr } = await supabase
      .from("customer_package_benefits")
      .select("*, customer_packages(*, packages(*))")
      .eq("id", customerPackageBenefitId)
      .maybeSingle();

    if (benefitErr || !benefit) {
      return { success: false, error: "Package benefit not found" };
    }

    if (benefit.remaining_quantity <= 0) {
      return { success: false, error: "Package benefit has no remaining sessions" };
    }

    isPackageRedemption = true;
    const pkgName =
      lang === "ar"
        ? benefit.customer_packages.packages.name_ar
        : benefit.customer_packages.packages.name_en;
    packageLabel = `${pkgName} (${benefit.remaining_quantity - 1}/${benefit.total_quantity} left)`;
    packageUsage.push({
      benefit_id: benefit.id,
      service_id: benefit.service_id,
      qty: 1,
    });

    discountAmount = subtotal;
    discountLabel = lang === "ar" ? `استهلاك باقة: ${pkgName}` : `Package Redemption: ${pkgName}`;
  }

  // 4. Process discount if provided (only if not already fully paid by package)
  if (!isPackageRedemption && discountCode) {
    const { valid, discount } = await validateDiscountCode(discountCode, businessId);
    if (valid && discount) {
      if (discount.type === "percentage") {
        discountAmount = (subtotal * discount.amount) / 100;
        discountLabel = `${discount.code} (-${discount.amount}%)`;
      } else {
        discountAmount = discount.amount;
        discountLabel = `${discount.code} (-${discount.amount} AED)`;
      }
      discountAmount = Math.min(discountAmount, subtotal);

      // Phase B: committed discount effects are server-authoritative in checkout_transaction.
    }
  }

  // 5. Process voucher if provided (only if not already fully paid by package)
  let voucherDrawdown = 0;
  let voucherLabel: string | null = null;
  let voucherBalanceAfter: number | null = null;
  let commissionAmount = 0;

  const remainingAfterDiscount = subtotal - discountAmount;

  if (!isPackageRedemption && voucherCode && remainingAfterDiscount > 0) {
    const { found, balance, walletId, code } = await lookupVoucherBalance(voucherCode, businessId);
    if (found && balance !== undefined && walletId) {
      voucherDrawdown = Math.min(balance, remainingAfterDiscount);
      voucherBalanceAfter = balance - voucherDrawdown;
      voucherLabel = `${code} (Balance: ${balance} AED)`;

      // Look up user_wallets to get commission_percent
      const { data: userWallet } = await supabase
        .from("user_wallets")
        .select("commission_percent")
        .eq("wallet_id", walletId)
        .maybeSingle();

      if (userWallet && userWallet.commission_percent !== null) {
        commissionAmount = (voucherDrawdown * userWallet.commission_percent) / 100;
      }
    }
  }

  const netTotal = Math.max(0, remainingAfterDiscount - voucherDrawdown);

  if (!booking.customer_id) {
    return { success: false, error: "Booking must be linked to a customer before checkout." };
  }

  const paymentMethod = paymentType === "cash" || paymentType === "card" ? paymentType : "card";
  const payments: SplitPayment[] = [{ method: paymentMethod, amount: netTotal }];
  const walletReference =
    voucherCode && voucherDrawdown > 0
      ? [{ method: "wallet_reference", amount: 0, wallet_code: voucherCode } as SplitPayment]
      : [];

  const checkout = await executeCheckoutTransaction({
    action: "complete",
    bookingId,
    customerId: booking.customer_id,
    services: [
      {
        service_id: service.id,
        name: lang === "ar" ? service.title_ar : service.title_en,
        price: Number(service.price),
        qty: 1,
        staff_id: booking.barber_id,
        discount: 0,
        snapshot: {
          service_id: service.id,
          name_en: service.title_en,
          name_ar: service.title_ar,
          price: Number(service.price),
          duration_minutes: service.duration_minutes,
        },
      },
    ],
    walletAmount: voucherDrawdown,
    packageUsage,
    discount: discountAmount,
    discountCode,
    payments: [...payments, ...walletReference],
    notes: isPackageRedemption
      ? `[Checkout: Subtotal ${subtotal}, Paid via Package: ${packageLabel}, Net 0]`
      : `[Checkout: Subtotal ${subtotal}, Discount -${discountAmount} (${
          discountLabel || "None"
        }), Voucher -${voucherDrawdown} (${
          voucherLabel || "None"
        }), Net ${netTotal}, Commission ${commissionAmount}, Payment: ${paymentType}]`,
  });

  if (!checkout.success) {
    return { success: false, error: checkout.error };
  }

  return {
    success: true,
    breakdown: {
      subtotal,
      discountAmount,
      discountLabel,
      voucherDrawdown,
      voucherLabel,
      voucherBalanceAfter,
      commissionAmount,
      netTotal,
    },
  };
}

export async function fetchActivePackages(businessId: string) {
  const { data, error } = await supabase
    .from("packages")
    .select("*, package_services(*, services(*))")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchCustomerPackageBenefits(businessId: string, phone: string) {
  const { data, error } = await supabase
    .from("customer_package_benefits")
    .select("*, customer_packages(*, packages(*)), services(*)")
    .eq("customer_packages.business_id", businessId)
    .eq("customer_packages.customer_phone", phone.trim())
    .eq("customer_packages.status", "active")
    .gt("remaining_quantity", 0);

  if (error) throw error;
  return (data || []).filter((item) => item.customer_packages !== null);
}

export async function sellPackage(params: {
  businessId: string;
  customerName: string;
  customerPhone: string;
  packageId: string;
  pricePaid: number;
}) {
  const { businessId, customerName, customerPhone, packageId, pricePaid } = params;

  // 1. Fetch package template and services
  const { data: pkg, error: pkgErr } = await supabase
    .from("packages")
    .select("*, package_services(*)")
    .eq("id", packageId)
    .single();

  if (pkgErr || !pkg) {
    return { success: false, error: "Package not found" };
  }

  // 2. Insert customer package
  const { data: customerPkg, error: cpErr } = await supabase
    .from("customer_packages")
    .insert({
      business_id: businessId,
      customer_name: customerName,
      customer_phone: customerPhone.trim(),
      package_id: packageId,
      price_paid: pricePaid,
      status: "active",
    })
    .select("*")
    .single();

  if (cpErr || !customerPkg) {
    return { success: false, error: cpErr?.message || "Failed to create customer package" };
  }

  // 3. Create benefits records
  const benefitsToInsert = pkg.package_services.map(
    (ps: { service_id: string; quantity: number }) => ({
      customer_package_id: customerPkg.id,
      service_id: ps.service_id,
      total_quantity: ps.quantity,
      remaining_quantity: ps.quantity,
    }),
  );

  const { error: benefitsErr } = await supabase
    .from("customer_package_benefits")
    .insert(benefitsToInsert);

  if (benefitsErr) {
    return { success: false, error: benefitsErr.message || "Failed to create package benefits" };
  }

  return { success: true };
}

export async function checkInBooking(bookingId: string) {
  const { data, error } = await supabase.rpc("check_in_booking", {
    p_booking_id: bookingId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const row = (
    data as
      | { ticket_id: string; public_token: string; queue_number: number; status: string }[]
      | null
  )?.[0];
  if (!row) {
    return { success: false, error: "Failed to check in booking" };
  }

  return {
    success: true,
    ticketId: row.ticket_id,
    publicToken: row.public_token,
    queueNumber: row.queue_number,
    status: row.status,
  };
}

export type SplitPayment = {
  method: string;
  amount: number;
  wallet_id?: string;
  wallet_code?: string;
};

export type CheckoutServiceItem = {
  service_id: string;
  name: string;
  price: number;
  qty: number;
  staff_id?: string | null;
  discount: number;
  resource_id?: string | null;
  snapshot: Json;
};

export type CheckoutProductItem = {
  product_id: string;
  name: string;
  price: number;
  qty: number;
  staff_id?: string | null;
  discount: number;
  snapshot: Json;
};

export type CheckoutPackageUsage = {
  benefit_id: string;
  service_id: string;
  qty: number;
};

type RpcError = { message: string };

type UntypedRpc = <TData = unknown>(
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: TData | null; error: RpcError | null }>;

const callUntypedRpc = supabase.rpc.bind(supabase) as unknown as UntypedRpc;

type CheckoutRpcResult = {
  action?: string;
  receipt_number?: string;
  subtotal?: number | string | null;
  discount_amount?: number | string | null;
  wallet_amount?: number | string | null;
  package_amount?: number | string | null;
  tax_amount?: number | string | null;
  tips_amount?: number | string | null;
  total_amount?: number | string | null;
  transaction_id?: string | null;
  cashier_session_id?: string | null;
};

export type CashierSessionSummary = {
  active: boolean;
  id?: string;
  business_id?: string;
  opened_at?: string;
  closed_at?: string;
  opening_cash?: number;
  expected_cash?: number;
  actual_cash?: number;
  variance?: number;
  status?: "open" | "closed";
};

const normalizeCashierSession = (value: unknown): CashierSessionSummary => {
  const session = value as Record<string, unknown> | null;

  if (!session || session.active !== true) {
    return { active: false };
  }

  return {
    active: true,
    id: typeof session.id === "string" ? session.id : undefined,
    business_id: typeof session.business_id === "string" ? session.business_id : undefined,
    opened_at: typeof session.opened_at === "string" ? session.opened_at : undefined,
    closed_at: typeof session.closed_at === "string" ? session.closed_at : undefined,
    opening_cash: Number(session.opening_cash || 0),
    expected_cash: Number(session.expected_cash || 0),
    actual_cash: Number(session.actual_cash || 0),
    variance: Number(session.variance || 0),
    status: session.status === "closed" ? "closed" : "open",
  };
};

export async function getActiveCashierSession(businessId?: string | null) {
  const { data, error } = await callUntypedRpc("get_active_cashier_session", {
    p_business_id: businessId || undefined,
  });

  if (error) {
    return { success: false, error: error.message, session: { active: false } };
  }

  return { success: true, session: normalizeCashierSession(data) };
}

export async function openCashierSession(params: {
  businessId?: string | null;
  openingCash?: number;
  notes?: string | null;
}) {
  const { data, error } = await callUntypedRpc("open_cashier_session", {
    p_business_id: params.businessId || undefined,
    p_opening_cash: params.openingCash || 0,
    p_notes: params.notes || undefined,
  });

  if (error) {
    return { success: false, error: error.message, session: { active: false } };
  }

  return { success: true, session: normalizeCashierSession(data) };
}

export async function closeCashierSession(params: {
  sessionId: string;
  actualCash: number;
  notes?: string | null;
}) {
  const { data, error } = await callUntypedRpc("close_cashier_session", {
    p_session_id: params.sessionId,
    p_actual_cash: params.actualCash,
    p_notes: params.notes || undefined,
  });

  if (error) {
    return { success: false, error: error.message, session: { active: false } };
  }

  return { success: true, session: normalizeCashierSession(data) };
}

export async function executeCheckoutTransaction(params: {
  action: "preview" | "create" | "complete" | "refund";
  bookingId?: string | null;
  queueTicketId?: string | null;
  customerId: string;
  services?: CheckoutServiceItem[];
  products?: CheckoutProductItem[];
  tips?: number;
  walletAmount?: number;
  packageUsage?: CheckoutPackageUsage[];
  membershipDiscount?: number;
  discount?: number;
  discountCode?: string | null;
  discountId?: string | null;
  tax?: number;
  payments?: SplitPayment[];
  notes?: string | null;
}) {
  const { data, error } = await callUntypedRpc("checkout_transaction", {
    p_action: params.action,
    p_booking_id: params.bookingId || undefined,
    p_queue_ticket_id: params.queueTicketId || undefined,
    p_customer_id: params.customerId,
    p_services: params.services || [],
    p_products: params.products || [],
    p_tips: params.tips || 0,
    p_wallet_amount: params.walletAmount || 0,
    p_package_usage: params.packageUsage || [],
    p_membership_discount: params.membershipDiscount || 0,
    p_discount: params.discount || 0,
    p_tax: params.tax || 0,
    p_payments: params.payments || [],
    p_notes: params.notes || undefined,
    p_discount_code: params.discountCode || undefined,
    p_discount_id: params.discountId || undefined,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const resultObj = (data || {}) as CheckoutRpcResult;

  return {
    success: true,
    result: {
      action: resultObj.action,
      receiptNumber: resultObj.receipt_number ?? "PREVIEW-ONLY",
      subtotal: Number(resultObj.subtotal || 0),
      discountAmount: Number(resultObj.discount_amount || 0),
      walletAmount: Number(resultObj.wallet_amount || 0),
      packageAmount: Number(resultObj.package_amount || 0),
      taxAmount: Number(resultObj.tax_amount || 0),
      tipsAmount: Number(resultObj.tips_amount || 0),
      totalAmount: Number(resultObj.total_amount || 0),
      transactionId: resultObj.transaction_id ?? "",
      cashierSessionId: resultObj.cashier_session_id ?? "",
    },
  };
}
