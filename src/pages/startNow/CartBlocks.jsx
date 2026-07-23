import React, { useEffect, useState } from "react";
import { Star, ShieldAlert, CheckCircle } from "lucide-react";
import {
  getCartIds,
  toggleCartItem,
  onCartChanged,
  formatInr,
} from "../../utils/startNowCart";

const FLAG_GRADIENT =
  "bg-[linear-gradient(90deg,#000_0%,#000_33%,#ff0000_33%,#ff0000_66%,#ffcc00_66%,#ffcc00_100%)]";

function CartBlockCard({ block, selected, onToggle, featured }) {
  return (
    <label
      className={`cursor-pointer relative flex flex-col rounded-2xl border overflow-hidden bg-white shadow-xs transition-all hover:shadow-md ${
        featured
          ? "col-span-1 md:col-span-2 lg:col-span-3 border-2 border-[#002856]"
          : "border-slate-100 hover:border-[#002856]/30"
      } ${selected ? "ring-2 ring-[#F9C53D]" : ""}`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(block.id)}
        className="sr-only"
      />

      {featured ? (
        <div className={`h-2 w-full ${FLAG_GRADIENT}`} />
      ) : (
        <div
          className={`absolute top-0 left-0 w-1 h-full ${FLAG_GRADIENT} opacity-70`}
        />
      )}

      {featured && (
        <div className="absolute top-2 right-0 bg-[#002856] text-white text-[10px] font-extrabold uppercase tracking-wider py-1 px-3 rounded-l-full">
          Recommended
        </div>
      )}

      <div
        className={`p-6 md:p-8 flex flex-col ${
          featured
            ? "md:flex-row gap-6 items-start md:items-center"
            : "gap-4 h-full pl-7"
        }`}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {featured && (
              <Star className="w-5 h-5 text-[#F9C53D] fill-current" />
            )}
            <h3
              className={`font-extrabold text-[#002856] ${
                featured ? "text-xl md:text-2xl" : "text-base md:text-lg"
              }`}
            >
              {block.title}
            </h3>
          </div>
          {block.description && (
            <p className="text-slate-500 text-sm mt-1 mb-4">
              {block.description}
            </p>
          )}

          {block.urgency_badge_text && (
            <div className="relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#F9C53D]/20 text-amber-700 border border-[#F9C53D]/40 mb-4 w-fit">
              <ShieldAlert className="relative z-10 w-3.5 h-3.5" />
              <span className="relative z-10">{block.urgency_badge_text}</span>
              <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/80 to-transparent" />
            </div>
          )}

          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-extrabold text-[#002856] ${
                featured ? "text-2xl md:text-3xl" : "text-lg md:text-xl"
              }`}
            >
              {formatInr(block.price_paise)}
            </span>
            {block.show_gst_badge && (
              <span className="text-sm text-slate-400">+ GST</span>
            )}
          </div>
        </div>

        <div className={featured ? "w-full md:w-auto" : "mt-auto"}>
          <div
            className={`w-full ${featured ? "md:w-48" : ""} border-2 rounded-xl py-2.5 px-4 text-center font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              selected
                ? "bg-[#002856] text-white border-[#002856]"
                : "bg-white text-[#002856] border-[#002856] hover:shadow-sm"
            }`}
          >
            {selected ? (
              <>
                <CheckCircle className="w-4 h-4" /> Selected
              </>
            ) : (
              "Select"
            )}
          </div>
        </div>
      </div>
    </label>
  );
}

export default function CartBlocks({ blocks = [] }) {
  const [selectedIds, setSelectedIds] = useState(() => getCartIds());

  useEffect(() => {
    const unsubscribe = onCartChanged(() => setSelectedIds(getCartIds()));
    return unsubscribe;
  }, []);

  if (blocks.length === 0) return null;

  const handleToggle = (id) => {
    setSelectedIds(toggleCartItem(id));
  };

  const recommended = blocks.find((b) => b.is_recommended);
  const rest = blocks.filter((b) => !b.is_recommended);

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommended && (
          <CartBlockCard
            block={recommended}
            selected={selectedIds.includes(recommended.id)}
            onToggle={handleToggle}
            featured
          />
        )}
        {rest.map((block) => (
          <CartBlockCard
            key={block.id}
            block={block}
            selected={selectedIds.includes(block.id)}
            onToggle={handleToggle}
          />
        ))}
      </div>

      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 1.8s linear infinite;
        }
      `}</style>
    </div>
  );
}
