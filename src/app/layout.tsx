import type { Metadata } from "next";
import "./globals.css";
import AuthSessionProvider from "@/components/SessionProvider";
import { Toaster } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Boilerplate",
  description: "Boilerplate for Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthSessionProvider>
            {children}
            <Toaster />
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
