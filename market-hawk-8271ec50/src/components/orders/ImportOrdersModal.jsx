
import React, { useState, useRef } from "react";
import { Order, Product, ActivityLog } from "@/api/entities";
import { User } from "@/api/entities";
import { ExtractDataFromUploadedFile, UploadFile } from "@/api/integrations";
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
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Download,
  Info,
  AlertTriangle
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ImportOrdersModal({ open, onOpenChange, onOrdersImported }) {
  const [step, setStep] = useState('upload'); // upload, preview, complete
  const [uploadedData, setUploadedData] = useState([]);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [marketplace, setMarketplace] = useState("Amazon");
  const [products, setProducts] = useState([]);
  const [processingDetails, setProcessingDetails] = useState("");
  const [uploadedFileData, setUploadedFileData] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError(null);
    setStep('upload');
    setProgress(20);
    setProcessingDetails("Uploading file...");
    setUploadedFileData({ fileName: file.name });

    try {
      // First, load all products to match SKUs
      setProcessingDetails("Loading product database...");
      const productsData = await Product.list();
      setProducts(productsData);
      setProgress(30);

      // Upload the file
      setProcessingDetails("Uploading order file...");
      const { file_url } = await UploadFile({ file });
      setProgress(40);

      // Extract data from the file
      setProcessingDetails("Extracting order data...");
      const result = await ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            order_id: { type: "string" },
            product_sku: { type: "string" },
            product_name: { type: "string" },
            price: { type: "number" },
            quantity: { type: "integer" },
            date: { type: "string" },
            customer_name: { type: "string" },
            customer_email: { type: "string" },
            shipping_country: { type: "string" },
            status: { type: "string" }
          },
          required: ["order_id", "product_sku"]
        }
      });

      setProgress(60);

      if (result.status === "success" && result.output) {
        setProcessingDetails("Processing order data...");
        
        // Group by order ID
        const orderGroups = result.output.reduce((acc, item) => {
          if (!acc[item.order_id]) {
            acc[item.order_id] = [];
          }
          acc[item.order_id].push(item);
          return acc;
        }, {});

        // Process orders
        const processedOrders = Object.entries(orderGroups).map(([orderId, items]) => {
          const firstItem = items[0];
          
          // Match product SKUs to get product IDs
          const orderItems = items.map(item => {
            const matchedProduct = productsData.find(p => p.sku === item.product_sku);
            
            return {
              product_id: matchedProduct?.id || "",
              product_sku: item.product_sku,
              product_name: item.product_name || matchedProduct?.name || "Unknown Product",
              quantity: item.quantity || 1,
              price: item.price || 0
            };
          });
          
          // Calculate totals
          const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          
          return {
            order_id: orderId,
            marketplace: marketplace,
            order_date: firstItem.date ? new Date(firstItem.date).toISOString() : new Date().toISOString(),
            customer_name: firstItem.customer_name || "",
            customer_email: firstItem.customer_email || "",
            order_status: firstItem.status || "processing",
            shipping_address: {
              country: firstItem.shipping_country || ""
            },
            items: orderItems,
            subtotal: subtotal,
            shipping_cost: 0, // Default values
            tax: 0,
            total: subtotal, // Without shipping and tax for now
            imported_file: uploadedFileData?.fileName
          };
        });

        setUploadedData(processedOrders);
        setProgress(100);
        setStep('preview');
      } else {
        throw new Error(result.details || "Failed to process file");
      }
    } catch (error) {
      console.error("Import error:", error);
      setError("Failed to process file. Please ensure it contains order ID and SKU columns.");
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
      setProcessingDetails("Creating orders...");
      
      // Set all imported orders to require product matching
      const ordersToCreate = uploadedData.map(order => ({
        ...order,
        requires_product_matching: true, // Add flag to indicate this order needs to go through Orders to Complete
        items: order.items.map(item => ({
          ...item,
          product_id: "" // Clear any product IDs to force matching
        }))
      }));
      
      const importPromises = ordersToCreate.map(order => Order.create(order));
      
      const increment = 100 / importPromises.length;
      let completed = 0;

      // Import orders one by one and show progress
      for (const importPromise of importPromises) {
        await importPromise;
        completed++;
        setProgress(Math.min(100, completed * increment));
      }

      // Log the activity
      await ActivityLog.create({
        activity_type: "orders_imported",
        details: {
          orders_count: uploadedData.length,
          file_name: uploadedFileData?.fileName,
          marketplace: marketplace
        },
        user_id: currentUser.id,
        activity_date: new Date().toISOString()
      });

      onOrdersImported && onOrdersImported();
      setStep('complete');
    } catch (error) {
      // Log failed activity
      await ActivityLog.create({
        activity_type: "orders_imported",
        details: {
          error: error.message || "Unknown error",
          file_name: uploadedFileData?.fileName || "Unknown"
        },
        success: false,
        user_id: currentUser?.id,
        activity_date: new Date().toISOString()
      });
      
      setError("Failed to import orders. Please try again.");
    }
  };

  const downloadTemplate = () => {
    // Create CSV content
    const headers = ["order_id", "product_sku", "product_name", "price", "quantity", "date", "customer_name", "customer_email", "shipping_country", "status"];
    const sampleData = [
      ["ORDER-123", "PROD-001", "Sample Product", "29.99", "1", "2023-05-15", "John Doe", "john@example.com", "US", "processing"],
      ["ORDER-123", "PROD-002", "Another Product", "19.99", "2", "2023-05-15", "John Doe", "john@example.com", "US", "processing"],
      ["ORDER-124", "PROD-001", "Sample Product", "29.99", "1", "2023-05-16", "Jane Smith", "jane@example.com", "UK", "shipped"]
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
    link.setAttribute('download', 'order_import_template.csv');
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
              <h3 className="mt-4 text-lg font-medium">Upload Orders File</h3>
              <p className="mt-2 text-sm text-gray-500">
                Upload a CSV or Excel file with your order data
              </p>
              <div className="mt-4 text-left max-w-md mx-auto p-3 bg-blue-50 rounded-md border border-blue-100">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <Info className="w-4 h-4 text-blue-500" /> Required columns:
                </h4>
                <ul className="mt-1 text-xs text-blue-700 list-disc pl-5">
                  <li>order_id - unique order identifier</li>
                  <li>product_sku - SKU of product ordered</li>
                </ul>
                <h4 className="mt-2 text-sm font-semibold">Recommended columns:</h4>
                <ul className="mt-1 text-xs text-blue-700 list-disc pl-5">
                  <li>product_name - name of product</li>
                  <li>price - product price</li>
                  <li>quantity - number ordered</li>
                  <li>date - order date</li>
                  <li>customer_name - buyer's name</li>
                  <li>customer_email - buyer's email</li>
                  <li>shipping_country - delivery country</li>
                  <li>status - order status (pending, processing, shipped, delivered, canceled, refunded)</li>
                </ul>
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
            
            <div className="mt-6 mb-6">
              <Select value={marketplace} onValueChange={setMarketplace}>
                <SelectTrigger className="w-[200px] mx-auto">
                  <SelectValue placeholder="Select Marketplace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Amazon">Amazon</SelectItem>
                  <SelectItem value="eBay">eBay</SelectItem>
                  <SelectItem value="Walmart">Walmart</SelectItem>
                  <SelectItem value="Etsy">Etsy</SelectItem>
                  <SelectItem value="Shopify">Shopify</SelectItem>
                </SelectContent>
              </Select>
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
                <p className="mt-2 text-sm text-gray-500">
                  {processingDetails || "Processing file..."}
                </p>
              </div>
            )}
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={progress > 0}
            >
              <Upload className="w-4 h-4 mr-2" />
              Select File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept=".csv,.xlsx,.xls"
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
                <span className="text-sm font-medium">Review your orders before importing</span>
              </div>
              <div className="text-sm text-gray-500">
                Found {uploadedData.length} orders with {uploadedData.reduce((sum, order) => sum + order.items.length, 0)} total line items
              </div>
            </div>
            
            <ScrollArea className="h-[300px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Marketplace</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadedData.map((order, index) => (
                    <TableRow key={index}>
                      <TableCell>{order.order_id}</TableCell>
                      <TableCell>{order.marketplace}</TableCell>
                      <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                      <TableCell>{order.items.length} items</TableCell>
                      <TableCell>${order.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            
            {progress > 0 && (
              <div className="mt-4">
                <Progress value={progress} className="h-2" />
                <p className="mt-2 text-sm text-gray-500">{processingDetails || "Importing orders..."}</p>
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
              Successfully imported {uploadedData.length} orders
            </p>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Orders</DialogTitle>
        </DialogHeader>

        {getStepContent()}

        <DialogFooter>
          {step === 'preview' && !progress && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Upload Different File
              </Button>
              <Button onClick={handleImport}>
                Import {uploadedData.length} Orders
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
  );
}
