import { client } from "@/lib/client";
import Image from "next/image";
import Link from "next/link";
import ConnectButton from "./ConnectButton";
import { WalletSelector } from "./WalletSelector";
import AptosGreen from '@/public/aptosgreen.png'

function Header() {
  return (
    <header className="flex items-center justify-between w-full py-4 px-6 bg-transparent shadow-md text-white">
      <div className="flex items-center">
        <Image
          src={AptosGreen}
          alt="aptosdefi logo"
          width={100}
          height={100}
          className="w-12 h-12"
          style={{
            filter: "drop-shadow(0px 0px 24px #a726a9a8)",
          }}
        />
        <span className="ml-3 text-xl font-bold text-gray-700">
          Aptos Vocal Ai Trading
        </span>
      </div>
      <nav className="hidden md:flex space-x-6">
        <Link href="/" legacyBehavior>
          <a className="text-gray-700 hover:text-gray-900">Home</a>
        </Link>
      </nav>
      <div className="flex items-center">
        <WalletSelector />
      </div>
      <div className="md:hidden">
        {/* Mobile menu button */}
        <button
          className="text-gray-700 hover:text-gray-900 focus:outline-none focus:text-gray-900"
          aria-label="Toggle menu"
        // Implement the menu toggle functionality here
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            ></path>
          </svg>
        </button>
      </div>
    </header>
  );
}

export default function Navbar() {
  return (
    <main className="container mx-auto">
      <Header />
    </main>
  );
}
