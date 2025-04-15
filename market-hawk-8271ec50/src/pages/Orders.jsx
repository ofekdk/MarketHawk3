
import React, { useState, useEffect } from "react";
import { Order, Product } from "@/api/entities";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ShoppingBag,
  Search,
  Upload,
  Filter,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  ArrowDownUp,
  AlertTriangle,
  Package2,
  Trash2,
  PackageOpen
} from "lucide-react";
import { format } from "date-fns";
import ImportOrdersModal from "../components/orders/ImportOrdersModal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import OrderDetailsModal from "../components/orders/OrderDetailsModal";
import {useNavigate} from "react-router-dom";
import {createPageUrl} from "@/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [marketplaceFilter, setMarketplaceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortField, setSortField] = useState("order_date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [error, setError] = useState(null);
    const [incompletedOrdersCount, setIncompletedOrdersCount] = useState(0);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("processing");
  const [isBulkStatusUpdating, setIsBulkStatusUpdating] = useState(false);

    const navigate = useNavigate();

  useEffect(() => {
    loadData();
    
    // For testing purposes only - create sample orders if none exist
    const createSampleOrders = async () => {
      const existingOrders = await Order.list();
      if (existingOrders.length === 0) {
        console.log("Creating sample orders for testing...");
        
        try {
          // Create some sample products first
          const headphones = await Product.create({
            name: "Wireless Headphones Pro",
            sku: "TECH-001",
            description: "High-quality wireless headphones with noise cancellation",
            category: "electronics",
            marketplaces: [{
              name: "Amazon",
              price: 199.99,
              stock: 50,
              status: "active"
            }]
          });
          
          const case_product = await Product.create({
            name: "Headphone Carrying Case",
            sku: "ACC-101",
            description: "Protective carrying case for headphones",
            category: "accessories",
            marketplaces: [{
              name: "Amazon",
              price: 29.99,
              stock: 100,
              status: "active"
            }]
          });
          
          const cable = await Product.create({
            name: "USB-C Charging Cable",
            sku: "TECH-015",
            description: "Fast charging USB-C cable",
            category: "electronics",
            marketplaces: [{
              name: "Amazon",
              price: 14.99,
              stock: 200,
              status: "active"
            }]
          });
          
          const lightbulb = await Product.create({
            name: "Smart LED Light Bulb",
            sku: "HOME-221",
            description: "Smart LED bulb with app control",
            category: "smart home",
            marketplaces: [{
              name: "eBay",
              price: 12.99,
              stock: 150,
              status: "active"
            }]
          });
          
          const hub = await Product.create({
            name: "Smart Home Hub",
            sku: "HOME-223",
            description: "Central hub for smart home devices",
            category: "smart home",
            marketplaces: [{
              name: "eBay",
              price: 89.99,
              stock: 30,
              status: "active"
            }]
          });
          
          // Now create orders referencing these products
          await Order.create({
            order_id: "ORD-2024-001",
            marketplace: "Amazon",
            order_date: new Date().toISOString(),
            customer_name: "Sarah Johnson",
            customer_email: "sarah.j@example.com",
            order_status: "processing",
            shipping_address: {
              street: "123 Pine Street",
              city: "Seattle",
              state: "WA",
              zip: "98101",
              country: "US"
            },
            items: [
              {
                product_id: headphones.id,
                product_sku: "TECH-001",
                product_name: "Wireless Headphones Pro",
                quantity: 1,
                price: 199.99
              },
              {
                product_id: case_product.id,
                product_sku: "ACC-101",
                product_name: "Headphone Carrying Case",
                quantity: 1,
                price: 29.99
              },
              {
                product_id: cable.id,
                product_sku: "TECH-015",
                product_name: "USB-C Charging Cable",
                quantity: 2,
                price: 14.99
              }
            ],
            shipping_method: "Express Shipping",
            payment_method: "Credit Card",
            subtotal: 259.96,
            shipping_cost: 15.00,
            tax: 26.00,
            total: 300.96
          });
          
          await Order.create({
            order_id: "ORD-2024-002",
            marketplace: "eBay",
            order_date: new Date().toISOString(),
            customer_name: "Michael Smith",
            customer_email: "m.smith@example.com",
            order_status: "pending",
            shipping_address: {
              street: "456 Oak Avenue",
              city: "Portland",
              state: "OR",
              zip: "97201",
              country: "US"
            },
            items: [
              {
                product_id: lightbulb.id,
                product_sku: "HOME-221",
                product_name: "Smart LED Light Bulb",
                quantity: 4,
                price: 12.99
              },
              {
                product_id: hub.id,
                product_sku: "HOME-223",
                product_name: "Smart Home Hub",
                quantity: 1,
                price: 89.99
              }
            ],
            shipping_method: "Standard Shipping",
            payment_method: "PayPal",
            subtotal: 141.95,
            shipping_cost: 8.99,
            tax: 15.00,
            total: 165.94
          });
          
          console.log("Sample orders created successfully");
          loadData(); // Reload data to show new orders
        } catch (error) {
          console.error("Error creating sample orders:", error);
        }
      }
    };
    
    createSampleOrders();
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
      
      // Only load orders that don't require product matching
      const ordersData = await Order.list();
      const completedOrders = ordersData.filter(order => !order.requires_product_matching);
      setOrders(completedOrders);
      setFilteredOrders(completedOrders);

      // Calculate incompleted orders count - this counts orders that need product matching
      const incompleted = ordersData.filter(order => order.requires_product_matching).length;
      setIncompletedOrdersCount(incompleted);
    } catch (error) {
      console.error("Error loading data:", error);
      if (error?.response?.status === 429) {
        setError("Too many requests. Please wait a moment and try again.");
      } else {
        setError("Failed to load orders. Please try refreshing the page.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [orders, searchTerm, statusFilter, marketplaceFilter, dateFilter, sortField, sortDirection]);

  const applyFilters = () => {
    let result = [...orders];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        order => 
          order.order_id.toLowerCase().includes(search) ||
          order.customer_name?.toLowerCase().includes(search) ||
          order.customer_email?.toLowerCase().includes(search) ||
          order.items?.some(item => 
            item.product_sku?.toLowerCase().includes(search) ||
            item.product_name?.toLowerCase().includes(search)
          )
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(order => order.order_status === statusFilter);
    }

    // Apply marketplace filter
    if (marketplaceFilter !== "all") {
      result = result.filter(order => order.marketplace === marketplaceFilter);
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      let startDate;
      
      switch (dateFilter) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "yesterday":
          startDate = new Date(now.setDate(now.getDate() - 1));
          startDate.setHours(0, 0, 0, 0);
          break;
        case "last7days":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "last30days":
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        result = result.filter(order => new Date(order.order_date) >= startDate);
      }
    }

    // Apply sorting
    result.sort((a, b) => {
      let valueA, valueB;
      
      if (sortField === "order_date") {
        valueA = new Date(a.order_date).getTime();
        valueB = new Date(b.order_date).getTime();
      } else if (sortField === "total") {
        valueA = a.total || 0;
        valueB = b.total || 0;
      } else if (sortField === "items") {
        valueA = a.items?.length || 0;
        valueB = b.items?.length || 0;
      } else {
        valueA = a[sortField] || "";
        valueB = b[sortField] || "";
      }

      if (sortDirection === "asc") {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    setFilteredOrders(result);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowDownUp className="h-4 w-4 ml-1 text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-indigo-100 text-indigo-800",
      delivered: "bg-green-100 text-green-800",
      canceled: "bg-red-100 text-red-800",
      refunded: "bg-orange-100 text-orange-800"
    };

    return (
      <Badge className={statusClasses[status] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const calculateTotalOrders = () => {
    return orders.length;
  };

  const calculatePendingOrders = () => {
    return orders.filter(o => o.order_status === "pending" || o.order_status === "processing").length;
  };

  const calculateCompletedOrders = () => {
    return orders.filter(o => o.order_status === "delivered" || o.order_status === "shipped").length;
  };
  
  const calculateCanceledOrders = () => {
    return orders.filter(o => o.order_status === "canceled" || o.order_status === "refunded").length;
  };

  const calculateTotalRevenue = () => {
    return orders.reduce((sum, order) => sum + (order.total || 0), 0);
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
  };

  const handleRetry = () => {
    loadData();
  };

  const handleSelectOrder = (orderId, isChecked) => {
    if (isChecked) {
      setSelectedOrderIds(prev => [...prev, orderId]);
    } else {
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      setSelectedOrderIds(filteredOrders.map(order => order.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleDeleteSelected = async () => {
    setIsLoading(true);
    try {
      for (const orderId of selectedOrderIds) {
        await Order.delete(orderId);
      }
      await loadData();
      setSelectedOrderIds([]);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting orders:", error);
      setError("Failed to delete selected orders. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBulkStatusChange = async () => {
    setIsBulkStatusUpdating(true);
    try {
      for (const orderId of selectedOrderIds) {
        await Order.update(orderId, { order_status: bulkStatus });
      }
      await loadData();
      setShowBulkStatusModal(false);
      setSelectedOrderIds([]);
    } catch (error) {
      console.error("Error updating order statuses:", error);
      setError("Failed to update order statuses. Please try again.");
    } finally {
      setIsBulkStatusUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500">Loading orders...</p>
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
        <Button onClick={handleRetry} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Loading Data
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                    <p className="text-gray-500">Manage and track your marketplace orders</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => navigate(createPageUrl("OrdersToComplete"))}
                        className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                    >
                        <Package2 className="w-4 h-4 mr-2" />
                        Orders To Complete
                        {incompletedOrdersCount > 0 && (
                            <Badge
                                variant="secondary"
                                className="ml-2 bg-amber-200 text-amber-800"
                            >
                                {incompletedOrdersCount}
                            </Badge>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => navigate(createPageUrl("BundleMatches"))}
                    >
                        <PackageOpen className="w-4 h-4 mr-2" />
                        Matches History
                    </Button>

                    <Button onClick={() => setShowImportModal(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Import Orders
                    </Button>
                
                {selectedOrderIds.length > 0 && (
                  <>
                    <Button 
                      variant="outline"
                      onClick={() => setShowBulkStatusModal(true)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Change Status ({selectedOrderIds.length})
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete ({selectedOrderIds.length})
                    </Button>
                  </>
                )}
            </div>
            </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calculateTotalOrders()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <ShoppingBag className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calculatePendingOrders()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <ShoppingBag className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calculateCompletedOrders()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Canceled</CardTitle>
              <ShoppingBag className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calculateCanceledOrders()}</div>
            </CardContent>
          </Card>
          <Card className="md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <ShoppingBag className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${calculateTotalRevenue().toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Orders List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders by ID, customer, or product..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={marketplaceFilter} onValueChange={setMarketplaceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Marketplace" />
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

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="last7days">Last 7 Days</SelectItem>
                    <SelectItem value="last30days">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Input 
                        type="checkbox" 
                        className="w-4 h-4"
                        checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("order_id")}
                    >
                      <div className="flex items-center">
                        Order ID {getSortIcon("order_id")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("marketplace")}
                    >
                      <div className="flex items-center">
                        Marketplace {getSortIcon("marketplace")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("order_date")}
                    >
                      <div className="flex items-center">
                        Date {getSortIcon("order_date")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("customer_name")}
                    >
                      <div className="flex items-center">
                        Customer {getSortIcon("customer_name")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("items")}
                    >
                      <div className="flex items-center">
                        Items {getSortIcon("items")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("total")}
                    >
                      <div className="flex items-center">
                        Total {getSortIcon("total")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("order_status")}
                    >
                      <div className="flex items-center">
                        Status {getSortIcon("order_status")}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                        {orders.length === 0 ? 
                          "No orders found. Import your orders to get started." :
                          "No orders match your current filters."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow 
                        key={order.id}
                        className={`hover:bg-gray-50 ${selectedOrderIds.includes(order.id) ? 'bg-blue-50' : ''}`}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Input 
                            type="checkbox" 
                            className="w-4 h-4"
                            checked={selectedOrderIds.includes(order.id)}
                            onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell 
                          className="font-medium cursor-pointer"
                          onClick={() => handleViewOrder(order)}
                        >
                          {order.order_id}
                        </TableCell>
                        <TableCell>{order.marketplace}</TableCell>
                        <TableCell>{formatDate(order.order_date)}</TableCell>
                        <TableCell>
                          {order.customer_name || 
                            (order.customer_email ? order.customer_email : "Anonymous")}
                        </TableCell>
                        <TableCell>{order.items?.length || 0} items</TableCell>
                        <TableCell>${order.total?.toFixed(2) || "0.00"}</TableCell>
                        <TableCell>{getStatusBadge(order.order_status || "pending")}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <ImportOrdersModal 
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onOrdersImported={loadData}
      />

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          products={products}
          open={!!selectedOrder}
          onOpenChange={() => setSelectedOrder(null)}
          onOrderUpdated={loadData}
        />
      )}
  
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Selected Orders?</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to delete {selectedOrderIds.length} order{selectedOrderIds.length !== 1 ? 's' : ''}. 
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDeleteSelected}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
      
      <Dialog open={showBulkStatusModal} onOpenChange={setShowBulkStatusModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Change the status for {selectedOrderIds.length} selected order{selectedOrderIds.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkStatusModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkStatusChange}
              disabled={isBulkStatusUpdating}
            >
              {isBulkStatusUpdating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Status'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
