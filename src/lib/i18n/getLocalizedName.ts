export function getLocalizedName(
  obj:
    | {
        name_en?: string | null;
        name_ar?: string | null;
        title_en?: string | null;
        title_ar?: string | null;
        [key: string]: unknown;
      }
    | null
    | undefined,
  lang: "en" | "ar",
): string {
  if (!obj) return "";
  if (lang === "ar") {
    return obj.name_ar || obj.title_ar || obj.name_en || obj.title_en || "";
  }
  return obj.name_en || obj.title_en || obj.name_ar || obj.title_ar || "";
}
