import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../../api/axios";
import diamond from "../../assets/diamond.webp";

const STATUS_STYLES = {
  success: "bg-green-700/10 outline-green-700/30 text-green-700",
  pending: "bg-yellow-50 outline-yellow-600/30 text-yellow-600",
  failed: "bg-rose-200 outline-rose-300 text-red-500",
};

const STATUS_LABELS = {
  success: "Success",
  pending: "Pending",
  failed: "Failed",
};

function formatAmount(paise) {
  const amount = Number(paise || 0) / 100;
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${day} | ${time}`;
}

export default function TransactionHistoryPage() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get("/user/payments")
      .then((res) => {
        if (alive) setPayments(res.data?.payments || []);
      })
      .catch((err) => {
        console.error("Failed to load payment history:", err);
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="size-7 flex items-center justify-center rounded-md border-2 border-black/40 text-black hover:bg-slate-50 transition-colors cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-blue-950 text-base font-semibold font-['Poppins']">
          Transaction History
        </h1>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-9 overflow-y-auto">
        {payments === null && !error ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="size-8 border-3 border-[#002856] border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-xs font-medium">
              Loading your transactions...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-slate-600 text-sm font-semibold">
              Could not load your transactions
            </p>
            <button
              onClick={() => navigate(0)}
              className="px-4 py-2 bg-[#002856] text-white rounded-lg text-xs font-semibold hover:bg-[#001e40] transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="size-24 rounded-3xl overflow-hidden bg-slate-50">
              <img
                src={diamond}
                alt="No transactions yet"
                className="w-full h-full object-cover opacity-70"
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-blue-950 text-base font-semibold">
                No transactions yet
              </p>
              <p className="text-black/60 text-xs font-normal">
                Your payments will appear here once you subscribe to Premium.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {payments.map((tx, idx) => {
              const status = STATUS_LABELS[tx.status] ? tx.status : "pending";
              return (
                <div key={tx.payment_id || idx}>
                  {idx > 0 && <div className="h-0 border-t border-black/10" />}
                  <div className="py-3 flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <span className="text-black text-xs font-bold leading-4">
                        Premium Plan
                      </span>
                      <span className="text-black/60 text-xs font-normal leading-4">
                        {formatDate(tx.created_at)}
                      </span>
                      <span className="text-black/60 text-xs font-normal leading-4 break-all">
                        Transaction ID: {tx.payment_id}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-black text-xs font-bold leading-4">
                        {formatAmount(tx.amount_paise)}
                      </span>
                      <span
                        className={`px-1 py-0.5 rounded-[40px] outline-1 outline-offset-[-1px] inline-flex items-center justify-center ${
                          STATUS_STYLES[status]
                        }`}
                      >
                        <span className="text-[8px] font-medium leading-[10.40px]">
                          {STATUS_LABELS[status]}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
