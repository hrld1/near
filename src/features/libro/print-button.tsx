"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

// Imprimir o guardar como PDF: el navegador hace el trabajo; el CSS de
// impresión (globals) convierte la página en documento.
export function PrintButton() {
  return (
    <Button variant="secondary" size="sm" onClick={() => window.print()} className="no-print">
      <Printer className="h-4 w-4" /> Imprimir · PDF
    </Button>
  );
}
