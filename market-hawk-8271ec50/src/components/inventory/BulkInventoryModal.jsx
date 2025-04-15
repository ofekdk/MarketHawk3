
import React, { useState, useRef } from "react";
import { Product } from "@/api/entities";
import { ActivityLog } from "@/api/entities";
import { User } from "@/api/entities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Upload,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download
} from "lucide-react";
import { UploadFile } from "@/api/integrations";
import StockChangeAlert from "./StockChangeAlert";
import { StockNotification } from "@/api/entities";

export default function BulkInventoryModal({ 
  open, 
  onOpenChange, 
  products,
  onInventoryUpdate 
}) {
  const [step, setStep] = useState('upload'); // upload, preview, complete
  const [uploadedData, setUploadedData] = useState([]);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [stockChanges, setStockChanges] = useState([]);
  const [showStockAlert, setShowStockAlert] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadedFileData, setUploadedFileData] = useState(null);

  const parseCSV = (text) => {
    // Custom CSV parser for inventory updates
    const lines = text.split(/\r\n|\n/);
    if (lines.length < 2) {
      throw new Error("CSV file must have at least a header row and one data row");
    }
    
    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Validate required columns
    if (!headers.includes('sku') || !headers.includes('quantity')) {
      throw new Error("CSV must include 'sku' and 'quantity' columns");
    }
    
    // Parse data rows
    const parsedData = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      const row = lines[i].split(',').map(cell => cell.trim());
      
      // Create object from row data
      const rowData = {};
      for (let j = 0; j < headers.length && j < row.length; j++) {
        if (headers[j] === 'quantity') {
          rowData[headers[j]] = parseInt(row[j], 10) || 0;
        } else {
          rowData[headers[j]] = row[j] || '';
        }
      }
      
      // Only add rows with valid SKUs
      if (rowData.sku) {
        parsedData.push(rowData);
      }
    }
    
    return parsedData;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError(null);
    setStep('upload');
    setProgress(20);

    try {
      // Read the file directly
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const csvText = e.target.result;
          const parsedData = parseCSV(csvText);
          setProgress(60);

          setUploadedFileData({
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          });

          // Map the inventory data to our internal format
          const processedData = parsedData.map(item => {
            const product = products.find(p => p.sku === item.sku);
            return {
              sku: item.sku,
              quantity: item.quantity || 0,
              found: !!product,
              productName: product?.name || 'Not found',
              currentStock: product?.marketplaces?.[0]?.stock || 0
            };
          });

          setUploadedData(processedData);
          setProgress(100);
          setStep('preview');
        } catch (error) {
          console.error("CSV parsing error:", error);
          setError("Failed to parse CSV file: " + error.message);
          setProgress(0);
        }
      };
      
      reader.onerror = () => {
        setError("Failed to read the file. Please try again.");
        setProgress(0);
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error("File upload error:", error);
      setError("Failed to process file: " + error.message);
      setProgress(0);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpdate = async () => {
    setProgress(0);
    setError(null);
    const changes = [];
    const currentUser = await User.me();

    try {
      const itemsToUpdate = uploadedData.filter(item => item.found);
      const batchSize = 3;
      const delay = 1000;
      
      for (let i = 0; i < itemsToUpdate.length; i += batchSize) {
        const batch = itemsToUpdate.slice(i, i + batchSize);
        const batchPromises = batch.map(async (item) => {
          const product = products.find(p => p.sku === item.sku);
          if (product) {
            const newStock = item.quantity;
            // Update stock only, preserve all other fields including status
            const updatedMarketplaces = product.marketplaces.map(marketplace => ({
              ...marketplace,
              stock: newStock
            }));

            await Product.update(product.id, { marketplaces: updatedMarketplaces });
            setProgress(Math.min(100, ((i + batch.length) / itemsToUpdate.length) * 100));
          }
        });

        await Promise.all(batchPromises);
        
        if (i + batchSize < itemsToUpdate.length) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      await ActivityLog.create({
        activity_type: "inventory_updated",
        details: {
          products_updated: itemsToUpdate.length,
          file_name: uploadedFileData?.fileName || "Unknown",
          stock_changes: changes.length
        },
        user_id: currentUser.id,
        activity_date: new Date().toISOString()
      });

      onInventoryUpdate();
      setStep('complete');
    } catch (error) {
      // Log failed activity
      await ActivityLog.create({
        activity_type: "inventory_updated",
        details: {
          error: error.message || "Unknown error",
          file_name: uploadedFileData?.fileName || "Unknown"
        },
        success: false,
        user_id: currentUser?.id,
        activity_date: new Date().toISOString()
      });
      
      setError("Failed to update inventory. Please try again.");
    }
  };

  const downloadTemplate = () => {
    // Create CSV content
    const headers = ["sku", "quantity"];
    const sampleData = [
      ["SAMPLE-SKU-001", "10"],
      ["SAMPLE-SKU-002", "5"]
    ];
    
    const csvContent = [
      headers.join(","),
      ...sampleData.map(row => row.join(","))
    ].join("\n");

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'inventory_update_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStepContent = () => {
    switch (step) {
      case 'upload':
        return (
          <div className="py-8 text-center">
            <div className="mb-6">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">Upload Inventory File</h3>
              <p className="mt-2 text-sm text-gray-500">
                Upload a CSV or Excel file with SKU and quantity columns
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download Template
                </Button>
              </div>
            </div>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {progress > 0 && (
              <div className="w-full max-w-xs mx-auto mb-4">
                <Progress value={progress} className="h-2" />
                <p className="mt-2 text-sm text-gray-500">Processing file...</p>
              </div>
            )}
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={progress > 0}
            >
              <Upload className="w-4 h-4 mr-2" />
              Select CSV File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
          </div>
        );

      case 'preview':
        return (
          <>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Please review the changes below</span>
              </div>
              <div className="text-sm text-gray-500">
                Found {uploadedData.filter(d => d.found).length} matching products out of {uploadedData.length} records
              </div>
            </div>
            <ScrollArea className="h-[300px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>New Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadedData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.currentStock}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        {item.found ? (
                          <span className="flex items-center text-green-600">
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Found
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600">
                            <XCircle className="w-4 h-4 mr-1" /> Not found
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            {progress > 0 && (
              <div className="mt-4">
                <Progress value={progress} className="h-2" />
                <p className="mt-2 text-sm text-gray-500">Updating inventory...</p>
              </div>
            )}
          </>
        );

      case 'complete':
        return (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-medium">Update Complete</h3>
            <p className="mt-2 text-sm text-gray-500">
              Successfully updated inventory for {uploadedData.filter(d => d.found).length} products
            </p>
          </div>
        );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Update Inventory</DialogTitle>
          </DialogHeader>

          {getStepContent()}

          <DialogFooter>
            {step === 'preview' && !progress && (
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Upload Different File
                </Button>
                <Button onClick={handleUpdate}>
                  Update Inventory
                </Button>
              </div>
            )}
            {step === 'complete' && (
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StockChangeAlert
        changes={stockChanges}
        open={showStockAlert}
        onOpenChange={setShowStockAlert}
      />
    </>
  );
}
