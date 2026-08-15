import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { cn } from "@/lib/utils";
import { routing } from "@/i18n/routing";
import { AuthSessionProvider } from "@/providers/session-provider";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Novakart",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} className={cn("font-sans", geist.variable)}>
      <body>
        <NuqsAdapter>
          <NextIntlClientProvider>
            <AuthSessionProvider>{children}</AuthSessionProvider>
          </NextIntlClientProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
