import React, { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { getCartIds, onCartChanged, formatInr } from "../../utils/startNowCart";
import { checkoutCart } from "../../api/startNowCartApi";

export default function CartCheckoutBar({ blocks = [] }) {
  const [selectedIds, setSelectedIds] = useState(() => getCartIds());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onCartChanged(() => setSelectedIds(getCartIds()));
    return unsubscribe;
  }, []);

  if (selectedIds.length === 0) return null;

  const selectedBlocks = blocks.filter((b) => selectedIds.includes(b.id));
  const totalPaise = selectedBlocks.reduce(
    (sum, b) => sum + (b.price_paise || 0),
    0,
  );

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await checkoutCart(selectedIds);
      window.location.href = res.data.checkoutUrl;
    } catch (err) {
      console.error("Cart checkout failed:", err);
      toast.error(
        err.response?.data?.message ||
          "Payment checkout is temporarily unavailable. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white shadow-[0_-8px_30px_rgba(0,40,86,0.1)] z-50 border-t border-slate-100 p-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-center sm:text-left">
          <p className="text-xs text-slate-400 font-semibold">
            Total Amount ({selectedBlocks.length} selected)
          </p>
          <p className="text-xl font-extrabold text-[#002856]">
            {formatInr(totalPaise)}
          </p>
        </div>
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full sm:w-auto bg-[#F9C53D] hover:bg-[#e0b02f] text-[#002856] font-extrabold py-3 px-8 rounded-xl shadow-lg active:scale-95 transition-all duration-150 flex items-center justify-center gap-2 text-sm disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Continue to Payment <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
