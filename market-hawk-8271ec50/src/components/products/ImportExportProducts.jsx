
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  Download,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Info,
} from "lucide-react";
import { StockNotification } from "@/api/entities";

export default function ImportExportProducts({ open, onOpenChange, onProductsUpdate }) {
  const [activeTab, setActiveTab] = useState("import");
  const [importStep, setImportStep] = useState("upload"); // upload, preview, complete
  const [uploadedData, setUploadedData] = useState([]);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploadedFileData, setUploadedFileData] = useState(null);
  const fileInputRef = useRef(null);

  const parseCSV = (text) => {
    // Custom CSV parser
    const lines = text.split(/\r\n|\n/);
    if (lines.length < 2) {
      throw new Error("CSV file must have at least a header row and one data row");
    }
    
    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Validate required columns
    if (!headers.includes('name') || !headers.includes('sku')) {
      throw new Error("CSV must include 'name' and 'sku' columns");
    }
    
    // Parse data rows
    const parsedData = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      // Handle quoted fields correctly
      const row = [];
      let inQuotes = false;
      let currentField = '';
      
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        
        if (char === '"' && (j === 0 || lines[i][j-1] !== '\\')) {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      
      // Add the last field
      row.push(currentField.trim());
      
      // Create object from row data
      const rowData = {};
      for (let j = 0; j < headers.length; j++) {
        // Skip empty headers
        if (!headers[j]) continue;
        
        // Handle numeric fields
        if (headers[j] === 'price') {
          rowData[headers[j]] = parseFloat(row[j]) || 0;
        } else if (headers[j] === 'stock') {
          rowData[headers[j]] = parseInt(row[j], 10) || 0;
        } else {
          rowData[headers[j]] = row[j] || '';
        }
      }
      
      parsedData.push(rowData);
    }
    
    return parsedData;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError(null);
    setImportStep("upload");
    setProgress(20);
    setUploadedFileData({ fileName: file.name });

    try {
      // Read the file directly with FileReader
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const csvText = e.target.result;
          const parsedData = parseCSV(csvText);
          setProgress(70);
          
          // Process the data to match our schema
          const processedData = parsedData.map(item => {
            // Extract marketplace data
            const marketplace = item.marketplace || "Amazon";
            const marketplaceData = {
              name: marketplace,
              price: item.price || 0,
              stock: item.stock || 0,
              status: "active",
              product_url: "",
              contact: { name: "", email: "", notify_stock_changes: false }
            };

            return {
              name: item.name,
              sku: item.sku,
              description: item.description || "",
              category: item.category || "other",
              marketplaces: [marketplaceData]
            };
          });

          setUploadedData(processedData);
          setProgress(100);
          setImportStep("preview");
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
      setError("Failed to upload file: " + error.message);
      setProgress(0);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    setProgress(0);
    setError(null);
    const currentUser = await User.me();

    try {
      // First, check for duplicate SKUs within the uploaded data
      const skuCounts = {};
      uploadedData.forEach(item => {
        skuCounts[item.sku] = (skuCounts[item.sku] || 0) + 1;
      });

      const duplicateSKUs = Object.entries(skuCounts)
        .filter(([_, count]) => count > 1)
        .map(([sku]) => sku);

      if (duplicateSKUs.length > 0) {
        setError(`Duplicate SKUs found in import file: ${duplicateSKUs.join(", ")}`);
        return;
      }

      // Then, check against existing products
      const existingProducts = await Product.list();
      const conflictingSKUs = uploadedData
        .filter(item => existingProducts.some(p => p.sku === item.sku))
        .map(item => item.sku);

      if (conflictingSKUs.length > 0) {
        setError(`The following SKUs already exist: ${conflictingSKUs.join(", ")}. Please use unique SKUs.`);
        return;
      }

      const importPromises = [];
      const stockChanges = [];

      for (const product of uploadedData) {
        importPromises.push(Product.create(product));
      }
      
      const increment = 100 / importPromises.length;
      let completed = 0;

      // Import products one by one and show progress
      for (const importPromise of importPromises) {
        await importPromise;
        completed++;
        setProgress(Math.min(100, completed * increment));
      }

      // Log the activity
      await ActivityLog.create({
        activity_type: "products_imported",
        details: {
          products_count: uploadedData.length,
          file_name: uploadedFileData?.fileName || "Unknown"
        },
        user_id: currentUser.id,
        activity_date: new Date().toISOString()
      });

      onProductsUpdate();
      setImportStep("complete");
    } catch (error) {
      // Log failed activity
      await ActivityLog.create({
        activity_type: "products_imported",
        details: {
          error: error.message || "Unknown error",
          file_name: uploadedFileData?.fileName || "Unknown"
        },
        success: false,
        user_id: currentUser?.id,
        activity_date: new Date().toISOString()
      });
      
      setError(error.message || "Failed to import products. Please try again.");
    }
  };

  const exportProducts = async () => {
    try {
      setProgress(20);
      // Get all products
      const products = await Product.list();
      setProgress(50);

      if (products.length === 0) {
        setError("No products to export.");
        setProgress(0);
        return;
      }

      // Format data for CSV
      const csvData = products.map(p => {
        const marketplace = p.marketplaces && p.marketplaces[0] ? p.marketplaces[0] : {};
        return {
          name: p.name,
          sku: p.sku,
          description: p.description || "",
          category: p.category || "",
          price: marketplace.price || 0,
          stock: marketplace.stock || 0,
          marketplace: marketplace.name || "Amazon",
          status: marketplace.status || "active"
        };
      });

      // Convert to CSV
      const csvHeader = Object.keys(csvData[0]).join(",");
      const csvRows = csvData.map(obj => Object.values(obj).map(
        value => typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(","));
      const csvContent = [csvHeader, ...csvRows].join("\n");

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `products_export_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      
      setProgress(90);
      link.click();
      document.body.removeChild(link);
      setProgress(100);
      
      setTimeout(() => setProgress(0), 1000);
    } catch (error) {
      setError("Failed to export products. Please try again.");
      setProgress(0);
    }
  };

  const downloadTemplate = () => {
    // Create CSV content
    const headers = ["name", "sku", "description", "category", "price", "stock", "marketplace"];
    const sampleData = [
      ["Sample Product 1", "SKU001", "Product description", "electronics", "99.99", "10", "Amazon"],
      ["Sample Product 2", "SKU002", "Another description", "clothing", "49.99", "5", "eBay"]
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
    link.setAttribute('download', 'product_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getImportStepContent = () => {
    switch (importStep) {
      case 'upload':
        return (
          <div className="py-8 text-center">
            <div className="mb-6">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">Upload Product File</h3>
              <p className="mt-2 text-sm text-gray-500">
                Upload a CSV file with product data
              </p>
              <div className="mt-4 text-left max-w-md mx-auto p-3 bg-blue-50 rounded-md border border-blue-100">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <Info className="w-4 h-4 text-blue-500" /> CSV File Format
                </h4>
                <div className="mt-2 text-xs text-blue-700">
                  <p className="font-medium">Header row must include:</p>
                  <ul className="list-disc pl-5 mt-1">
                    <li><span className="font-semibold">name</span> - Product name (required)</li>
                    <li><span className="font-semibold">sku</span> - Product SKU (required)</li>
                  </ul>
                  <p className="font-medium mt-2">Optional columns:</p>
                  <ul className="list-disc pl-5 mt-1">
                    <li>description - Product details</li>
                    <li>category - Product category</li>
                    <li>price - Product price</li>
                    <li>stock - Available quantity</li>
                    <li>marketplace - Platform name</li>
                  </ul>
                </div>
              </div>
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
              <Alert variant="destructive" className="mb-4 mx-auto max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium">{error}</p>
                  <p className="text-sm mt-1">
                    Please ensure your CSV file has the required columns: 'name' and 'sku'.
                    Download the template for the correct format.
                  </p>
                </AlertDescription>
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
                <Info className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Preview of products to import ({uploadedData.length})</span>
              </div>
            </div>
            <ScrollArea className="h-[300px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Marketplace</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadedData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>${item.marketplaces[0].price}</TableCell>
                      <TableCell>{item.marketplaces[0].stock}</TableCell>
                      <TableCell>{item.marketplaces[0].name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            {progress > 0 && (
              <div className="mt-4">
                <Progress value={progress} className="h-2" />
                <p className="mt-2 text-sm text-gray-500">Importing products...</p>
              </div>
            )}
          </>
        );

      case 'complete':
        return (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-medium">Import Complete</h3>
            <p className="mt-2 text-sm text-gray-500">
              Successfully imported {uploadedData.length} products
            </p>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import & Export Products</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="import">Import Products</TabsTrigger>
            <TabsTrigger value="export">Export Products</TabsTrigger>
          </TabsList>
          
          <TabsContent value="import" className="py-4">
            {getImportStepContent()}
          </TabsContent>
          
          <TabsContent value="export" className="py-4">
            <div className="py-8 text-center">
              <div className="mb-6">
                <Download className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium">Export Products</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Download all your products as a CSV file
                </p>
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
                  <p className="mt-2 text-sm text-gray-500">Preparing export...</p>
                </div>
              )}
              <Button onClick={exportProducts} disabled={progress > 0}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV File
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {activeTab === "import" && importStep === "preview" && !progress && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setImportStep('upload')}>
                Upload Different File
              </Button>
              <Button onClick={handleImport}>
                Import {uploadedData.length} Products
              </Button>
            </div>
          )}
          {activeTab === "import" && importStep === "complete" && (
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
