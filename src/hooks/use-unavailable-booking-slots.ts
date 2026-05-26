import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

type BookingSlotChangedPayload = {
  payload?: {
    event?: string;
  };
};

type UnavailableBookingSlot = {
  booking_time: string;
};

export function useUnavailableBookingSlots(barberId: string | null | undefined, date: string) {
  const [unavailableSlots, setUnavailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: Replace exact-slot availability with duration-aware starts_at/ends_at overlap logic using range/exclusion constraints.
  const refetch = useCallback(async () => {
    if (!barberId || !date) {
      setUnavailableSlots([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("get_unavailable_booking_slots", {
      p_barber_id: barberId,
      p_booking_date: date,
    });

    if (rpcError) {
      setError(rpcError.message);
      setUnavailableSlots([]);
    } else {
      setUnavailableSlots(
        ((data ?? []) as UnavailableBookingSlot[]).map((slot) => slot.booking_time),
      );
    }
    setLoading(false);
  }, [barberId, date]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!barberId || !date) return undefined;

    const topic = `booking-slots:${barberId}:${date}`;
    const channel = supabase
      .channel(topic, { config: { private: false } })
      .on("broadcast", { event: "booking_slot_changed" }, (message: BookingSlotChangedPayload) => {
        if (message.payload?.event === "booking_slot_changed") {
          void refetch();
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [barberId, date, refetch]);

  return useMemo(
    () => ({ unavailableSlots, loading, error, refetch }),
    [error, loading, refetch, unavailableSlots],
  );
}
