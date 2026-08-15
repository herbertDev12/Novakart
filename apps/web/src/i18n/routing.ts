import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
  localePrefix: "always",
  localeCookie: {
    name: "LOCALE",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
});
