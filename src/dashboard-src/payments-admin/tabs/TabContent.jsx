import { AllViewTab } from "./AllViewTab";
import { BatchViewTab } from "./BatchViewTab";
import { DiscountsViewTab } from "./DiscountsViewTab";
import { InvoiceViewTab } from "./InvoiceViewTab";
import { MonthViewTab } from "./MonthViewTab";
import { PaymentViewTab } from "./PaymentViewTab";
import { RawLogsViewTab } from "./RawLogsViewTab";
import { TotalFeeViewTab } from "./TotalFeeViewTab";

export function TabContent({ tab, props }) {
  if (tab === "all") return <AllViewTab {...props} />;
  if (tab === "month") return <MonthViewTab {...props} />;
  if (tab === "batch") return <BatchViewTab {...props} />;
  if (tab === "fee") return <TotalFeeViewTab {...props} />;
  if (tab === "discounts") return <DiscountsViewTab {...props} />;
  if (tab === "payments") return <PaymentViewTab {...props} />;
  if (tab === "rawlogs") return <RawLogsViewTab {...props} />;
  if (tab === "invoice") return <InvoiceViewTab {...props} />;
  return <RawLogsViewTab {...props} />;
}
