import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Vocal Trades",
  description: "Translate from any language and place trades onchain!",
};


import { Web3Modal } from "@/context/web3modal";
import { ThirdwebProvider } from "thirdweb/react";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
      <Web3Modal >
        <Navbar />
        {children}
      </Web3Modal>
      </body>
    </html>
  );
}
