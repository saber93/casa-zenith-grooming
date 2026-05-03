import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { useUnavailableBookingSlots } from "@/hooks/use-unavailable-booking-slots";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const DEFAULT_BOOKING_SLOTS = [
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:00",
  "14:00",
  "15:30",
  "17:00",
  "18:30",
  "20:00",
];

type TimeSlotPickerProps = {
  lang: Lang;
  barberId?: string | null;
  date: string;
  selectedTime: string;
  onChange: (time: string) => void;
  slots?: string[];
};

export function TimeSlotPicker({
  lang,
  barberId,
  date,
  selectedTime,
  onChange,
  slots = DEFAULT_BOOKING_SLOTS,
}: TimeSlotPickerProps) {
  const tt = t(lang);
  const { unavailableSlots, loading, error } = useUnavailableBookingSlots(barberId, date);
  const unavailableSet = useMemo(() => new Set(unavailableSlots), [unavailableSlots]);
  const availableCount = slots.filter((time) => !unavailableSet.has(time)).length;
  const [staleMessage, setStaleMessage] = useState("");
  const lastCleared = useRef("");

  useEffect(() => {
    if (!selectedTime || !unavailableSet.has(selectedTime)) return;
    if (lastCleared.current === `${date}:${selectedTime}`) return;

    lastCleared.current = `${date}:${selectedTime}`;
    onChange("");
    setStaleMessage(tt.reservation.timeJustBooked);
    toast.warning(tt.reservation.timeJustBooked);
  }, [date, onChange, selectedTime, tt.reservation.timeJustBooked, unavailableSet]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" dir="ltr">
        {slots.map((time) => {
          const isBooked = unavailableSet.has(time);
          const isSelected = selectedTime === time;
          return (
            <button
              type="button"
              key={time}
              disabled={isBooked}
              aria-pressed={isSelected}
              onClick={() => {
                setStaleMessage("");
                onChange(time);
              }}
              className={cn(
                "min-h-14 rounded-md border px-2 py-2 text-center text-sm transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-70",
                isSelected &&
                  "border-primary bg-primary text-primary-foreground shadow-glow hover:brightness-110",
                !isSelected &&
                  !isBooked &&
                  "border-border/60 text-muted-foreground hover:border-primary/60 hover:text-foreground",
                isBooked && "border-destructive/40 bg-destructive/10 text-destructive",
              )}
            >
              <span className="block font-medium">{time}</span>
              <span className="mt-1 block text-[11px]">
                {isBooked
                  ? tt.reservation.booked
                  : isSelected
                    ? tt.reservation.selected
                    : tt.reservation.available}
              </span>
            </button>
          );
        })}
      </div>

      {loading && <p className="text-xs text-muted-foreground">{tt.common.loading}</p>}
      {error && (
        <p className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
      {staleMessage && (
        <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          {staleMessage}
        </p>
      )}
      {barberId && date && availableCount === 0 && !loading && (
        <p className="text-xs text-muted-foreground">{tt.reservation.noAvailableSlots}</p>
      )}
    </div>
  );
}
