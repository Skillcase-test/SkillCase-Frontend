import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const offerLetterLoading = (
  <div className="text-xs text-slate-450 font-bold">Loading preview...</div>
);

// Split out so pdf.js only loads when an offer letter is actually shown
export default function OfferLetterCover({ url }) {
  return (
    <Document file={url} loading={offerLetterLoading}>
      <Page
        pageNumber={1}
        width={343}
        renderTextLayer={false}
        renderAnnotationLayer={false}
      />
    </Document>
  );
}
