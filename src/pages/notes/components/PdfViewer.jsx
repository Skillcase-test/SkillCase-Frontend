import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Loader2 } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function PdfViewer({ fileUrl, width = 340 }) {
  const [numPages, setNumPages] = useState(null);

  const onDocumentLoadSuccess = ({ numPages: nextNumPages }) => {
    setNumPages(nextNumPages);
  };

  if (!fileUrl) return null;

  return (
    <Document
      file={fileUrl}
      onLoadSuccess={onDocumentLoadSuccess}
      loading={
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#002856]" />
        </div>
      }
      error={
        <div className="p-4 text-center text-slate-500 text-xs">
          Failed to render PDF preview.
        </div>
      }
      className="flex flex-col gap-4 items-center w-full"
    >
      {numPages &&
        Array.from({ length: numPages }, (_, index) => (
          <div
            key={`pdf_page_${index + 1}`}
            className="bg-white rounded-lg border border-zinc-200 overflow-hidden shadow-xs w-full flex justify-center"
          >
            <Page
              pageNumber={index + 1}
              width={width > 100 ? width : 340}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </div>
        ))}
    </Document>
  );
}
