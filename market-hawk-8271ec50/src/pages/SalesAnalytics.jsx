
import React, { useState, useEffect } from "react";
import { Sale, Product, Order } from "@/api/entities";
import { ExtractDataFromUploadedFile, UploadFile } from "@/api/integrations";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  UploadCloud,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Users,
  DollarSign,
  AlertTriangle
} from "lucide-react";
import { format, subDays, isWithinInterval, startOfDay, parseISO } from "date-fns";
import SalesAIAssistant from "../components/analytics/SalesAIAssistant";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SalesAnalytics() {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("30");
  const [marketplace, setMarketplace] = useState("all");
  const [uploadStatus, setUploadStatus] = useState("");
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load each data type separately to avoid rate limit issues
      const productsData = await Product.list();
      setProducts(productsData);
      
      // Short delay between API calls
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const salesData = await Sale.list();
      setSales(salesData);
      
      // Short delay between API calls
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const ordersData = await Order.list('-order_date', 100);
      setOrders(ordersData);
      
    } catch (error) {
      console.error("Error loading data:", error);
      if (error?.response?.status === 429) {
        setError("Too many requests. Please wait a moment and try again.");
      } else {
        setError("Failed to load data. Please try refreshing the page.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    loadData();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadStatus("Uploading file...");
    try {
      const { file_url } = await UploadFile({ file });

      setUploadStatus("Processing sales data...");
      const result = await ExtractDataFromUploadedFile({
        file_url,
        json_schema: Sale.schema()
      });

      if (result.status === "success" && result.output) {
        setUploadStatus("Saving sales records...");
        
        // Ensure SKU uniqueness before bulk creating
        const existingSales = await Sale.list();
        const existingSKUs = new Set(existingSales.map(sale => sale.sku));
        
        const newSales = result.output.filter(sale => !existingSKUs.has(sale.sku));
        
        if (newSales.length < result.output.length) {
          setUploadStatus("Filtered duplicate SKUs before saving.");
        }
        
        await Sale.bulkCreate(newSales);
        await loadData();
        setUploadStatus("Sales data imported successfully!");
      } else {
        setUploadStatus("Error processing file. Please check the format.");
      }
    } catch (error) {
      console.error("Error uploading sales:", error);
      if (error?.response?.status === 429) {
        setUploadStatus("Rate limit exceeded. Please wait a moment and try again.");
      } else {
        setUploadStatus("Error uploading sales data.");
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFilteredSales = () => {
    const daysAgo = parseInt(timeRange);
    const startDate = subDays(new Date(), daysAgo);
    return sales.filter(sale => 
      isWithinInterval(new Date(sale.sale_date), {
        start: startOfDay(startDate),
        end: new Date()
      }) && 
      (marketplace === "all" || sale.marketplace === marketplace)
    );
  };

  const getFilteredOrders = () => {
    const daysAgo = parseInt(timeRange);
    const startDate = subDays(new Date(), daysAgo);
    return orders.filter(order => 
      isWithinInterval(parseISO(order.order_date), {
        start: startOfDay(startDate),
        end: new Date()
      }) &&
      (marketplace === "all" || order.marketplace === marketplace)
    );
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Unknown Product';
  };

  // Combine sales and order data
  const combinedSalesData = () => {
    const filteredOrders = getFilteredOrders();
    const filteredSales = getFilteredSales();
    
    // Calculate sales from orders (one order may have multiple products)
    const orderSales = filteredOrders.flatMap(order => {
      return order.items ? order.items.map(item => ({
        product_id: item.product_id,
        marketplace: order.marketplace,
        sale_date: order.order_date,
        quantity: item.quantity || 1,
        price: item.price || 0,
        total_amount: (item.price || 0) * (item.quantity || 1),
        order_id: order.id,
        buyer_location: order.shipping_address?.country || 'Unknown'
      })) : [];
    });
    
    // Combine with direct sales data
    return [...orderSales, ...filteredSales];
  };

  // Sales by Marketplace
  const salesByMarketplace = () => {
    const data = combinedSalesData().reduce((acc, sale) => {
      acc[sale.marketplace] = (acc[sale.marketplace] || 0) + sale.total_amount;
      return acc;
    }, {});
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  };

  // Daily Sales Trend
  const dailySalesTrend = () => {
    const data = combinedSalesData().reduce((acc, sale) => {
      const date = format(new Date(sale.sale_date), 'MMM dd');
      acc[date] = (acc[date] || 0) + sale.total_amount;
      return acc;
    }, {});
    return Object.entries(data).map(([date, amount]) => ({ date, amount }));
  };

  // Top Products
  const topProducts = () => {
    const data = combinedSalesData().reduce((acc, sale) => {
      const productName = getProductName(sale.product_id);
      acc[productName] = (acc[productName] || 0) + sale.total_amount;
      return acc;
    }, {});
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  // Buyer Geography
  const salesByLocation = () => {
    const data = combinedSalesData().reduce((acc, sale) => {
      const location = sale.buyer_location || 'Unknown';
      acc[location] = (acc[location] || 0) + sale.total_amount;
      return acc;
    }, {});
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  // Add this new function for category data
  const salesByCategory = () => {
    const data = combinedSalesData().reduce((acc, sale) => {
      const product = products.find(p => p.id === sale.product_id);
      const category = product?.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + sale.total_amount;
      return acc;
    }, {});
    return Object.entries(data)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
      .sort((a, b) => b.value - a.value);
  };

  // Calculate total stats
  const calculateStats = () => {
    const combined = combinedSalesData();
    const uniqueCustomers = new Set(
      combined.map(sale => sale.customer_id || sale.order_id)
    ).size;
    
    return {
      totalSales: combined.reduce((sum, sale) => sum + sale.total_amount, 0),
      totalOrders: new Set(combined.map(sale => sale.order_id)).size,
      avgOrderValue: combined.length ? 
        combined.reduce((sum, sale) => sum + sale.total_amount, 0) / combined.length : 0,
      totalUnits: combined.reduce((sum, sale) => sum + (sale.quantity || 0), 0),
      uniqueCustomers,
      marketplace: marketplace === "all" ? "All Marketplaces" : marketplace
    };
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500">Loading sales data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[500px]">
        <Alert variant="destructive" className="mb-4 max-w-md">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={handleRetry}>Retry Loading Data</Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Dashboard"))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>
            <p className="text-gray-500">Track and analyze your sales performance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Sales
              </CardTitle>
              <DollarSign className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalSales.toFixed(2)}</div>
              <p className="text-sm text-gray-500 mt-1">
                {stats.marketplace}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Orders
              </CardTitle>
              <BarChart3 className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Avg Order Value
              </CardTitle>
              <PieChartIcon className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.avgOrderValue.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Units Sold
              </CardTitle>
              <Calendar className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUnits}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Unique Customers
              </CardTitle>
              <Users className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueCustomers}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={marketplace} 
              onValueChange={setMarketplace}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select marketplace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Marketplaces</SelectItem>
                <SelectItem value="Amazon">Amazon</SelectItem>
                <SelectItem value="eBay">eBay</SelectItem>
                <SelectItem value="Walmart">Walmart</SelectItem>
                <SelectItem value="Etsy">Etsy</SelectItem>
                <SelectItem value="Shopify">Shopify</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailySalesTrend()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#8884d8" 
                      name="Sales"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {marketplace === "all" ? "Sales by Marketplace" : "Sales by Category"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={marketplace === "all" ? salesByMarketplace() : salesByCategory()}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {(marketplace === "all" ? salesByMarketplace() : salesByCategory())
                        .map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                          />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => `$${value.toFixed(2)}`} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Products by Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    <Bar dataKey="value" fill="#8884d8" name="Sales" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales by Quantity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts().map(product => ({
                    name: product.name,
                    quantity: combinedSalesData()
                      .filter(sale => getProductName(sale.product_id) === product.name)
                      .reduce((sum, sale) => sum + (sale.quantity || 0), 0)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value} units`} />
                    <Bar dataKey="quantity" fill="#82ca9d" name="Units Sold" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* AI Sales Assistant */}
        <div className="mt-6">
          <SalesAIAssistant 
            salesData={combinedSalesData()}
            products={products}
          />
        </div>
      </div>
    </div>
  );
}
