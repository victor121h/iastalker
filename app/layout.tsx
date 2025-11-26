import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "DeepGram - O que realmente ele(a) faz quando tá no Insta?",
  description: "Descubra a verdade sobre qualquer pessoa do Instagram. Só com o @.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
