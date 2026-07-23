import React, { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Phone } from "lucide-react";
import { fetchTrustPageContent } from "../api/trustPageApi";
import CartBlocks from "./startNow/CartBlocks";
import CartCheckoutBar from "./startNow/CartCheckoutBar";

export default function StartNowCart() {
  const [cartBlocks, setCartBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchTrustPageContent()
      .then((res) => {
        if (mounted) {
          setCartBlocks(res.data.cart_blocks || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load cart blocks:", err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="bg-white min-h-screen relative overflow-x-hidden pb-32 selection:bg-[#F9C53D] selection:text-[#002856]">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-white shadow-xs border-b border-slate-100 w-full">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto h-16">
          <a
            href="/start-now"
            aria-label="Go back"
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors text-[#002856]"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          <h1 className="font-extrabold text-lg sm:text-xl text-[#002856] flex-1 text-center pr-8">
            Choose Your Service
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 max-w-5xl mx-auto w-full pt-8 pb-12">
        <div className="text-center mb-10">
          <p className="text-slate-500 text-sm sm:text-base max-w-2xl mx-auto">
            Select the program(s) that best suit your requirement.
          </p>
        </div>

        {loading ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
            <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
            Loading services...
          </div>
        ) : (
          <CartBlocks blocks={cartBlocks} />
        )}
      </main>

      <footer className="mt-auto py-8 bg-slate-50/50 text-center px-4">
        <p className="text-slate-500 text-sm">
          Need Help Choosing? Speak to our counsellor
          <a
            href="tel:+919972266767"
            className="text-[#002856] font-bold hover:underline ml-1.5 inline-flex items-center gap-1"
          >
            <Phone className="w-3.5 h-3.5" /> +91 99722 66767
          </a>
        </p>
      </footer>

      <CartCheckoutBar blocks={cartBlocks} />
    </div>
  );
}
