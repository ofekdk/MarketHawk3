import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function StockChangeAlert({ changes, open, onOpenChange }) {
  const stockOutProducts = changes.filter(c => c.type === 'out_of_stock');
  const backInStockProducts = changes.filter(c => c.type === 'back_in_stock');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Stock Status Changes
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            The following products have had significant stock changes:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="max-h-[400px] mt-4">
          {stockOutProducts.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium flex items-center gap-2 mb-3">
                <XCircle className="w-4 h-4 text-red-500" />
                Products Now Out of Stock
              </h3>
              <div className="space-y-3">
                {stockOutProducts.map((product, index) => (
                  <div
                    key={index}
                    className="p-3 bg-red-50 border border-red-100 rounded-lg"
                  >
                    <div className="font-medium text-red-900">
                      {product.name}
                    </div>
                    <div className="text-sm text-red-700">
                      SKU: {product.sku}
                    </div>
                    <div className="text-sm text-red-700 mt-1">
                      Previous stock: {product.previousStock}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {backInStockProducts.length > 0 && (
            <div>
              <h3 className="font-medium flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Products Back in Stock
              </h3>
              <div className="space-y-3">
                {backInStockProducts.map((product, index) => (
                  <div
                    key={index}
                    className="p-3 bg-green-50 border border-green-100 rounded-lg"
                  >
                    <div className="font-medium text-green-900">
                      {product.name}
                    </div>
                    <div className="text-sm text-green-700">
                      SKU: {product.sku}
                    </div>
                    <div className="text-sm text-green-700 mt-1">
                      New stock: {product.newStock}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}