
import React, { useState, useEffect } from "react";
import { Order, Product, OrderTemplate, BundleMatch } from "@/api/entities";
import { User } from "@/api/entities";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Package2,
    AlertTriangle,
    ChevronLeft,
    Search,
    Save,
    RefreshCw,
    ExternalLink,
    Check,
    X,
    Plus,
    Trash2,
    PackageOpen
} from "lucide-react";
import OrderTemplateModal from "../components/orders/OrderTemplateModal";
import ProductSearchSelect from "../components/orders/ProductSearchSelect";

export default function OrdersToComplete() {
    const navigate = useNavigate();
    const [incompleteOrders, setIncompleteOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [selectedProducts, setSelectedProducts] = useState({});
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [bundleMatches, setBundleMatches] = useState([]);
    const [autoMatchApplied, setAutoMatchApplied] = useState({}); // Keep track of auto-matched items

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [productsData, templatesData, bundleMatchesData] = await Promise.all([
                Product.list(),
                OrderTemplate.list(),
                BundleMatch.list()
            ]);
            setProducts(productsData);
            setTemplates(templatesData);
            setBundleMatches(bundleMatchesData);
            
            // Load only orders that require product matching
            const ordersData = await Order.list();
            const incomplete = ordersData.filter(order => 
                order.requires_product_matching || // Check the flag
                order.items.some(item => !item.product_id) // Fallback check for orders without the flag
            );
            setIncompleteOrders(incomplete);
        } catch (error) {
            console.error("Error loading data:", error);
            setError("Failed to load data. Please try refreshing the page.");
        }
        setIsLoading(false);
    };

    // Check for existing bundle matches
    useEffect(() => {
        if (selectedOrder && bundleMatches.length > 0 && products.length > 0) {
            // Create a new object to track which items have been auto-matched
            const newAutoMatchApplied = { ...autoMatchApplied };
            let anyMatchesApplied = false;

            // Check for bundle matches for each item in the order
            selectedOrder.items.forEach((item, index) => {
                const key = `${selectedOrder.id}-${index}`;
                
                // Skip if we've already selected products for this item manually
                if (selectedProducts[key]) return;
                
                // Skip if we've already applied auto-matching to this item
                if (autoMatchApplied[key]) return;

                // Look for a bundle match for this item's SKU from this marketplace
                const match = bundleMatches.find(
                    m => m.marketplace === selectedOrder.marketplace &&
                         m.original_sku === item.product_sku
                );

                if (match) {
                    // Check if all the matched products still exist
                    const validProductIds = match.matched_product_ids.filter(
                        id => products.some(p => p.id === id)
                    );
                    
                    if (validProductIds.length > 0) {
                        // Apply the bundle match
                        setSelectedProducts(prev => ({
                            ...prev,
                            [key]: validProductIds
                        }));
                        
                        // Mark this item as auto-matched
                        newAutoMatchApplied[key] = true;
                        anyMatchesApplied = true;
                    }
                }
            });

            if (anyMatchesApplied) {
                setAutoMatchApplied(newAutoMatchApplied);
            }
        }
    }, [selectedOrder, bundleMatches, products]);

    // Update the handleProductMatch function to handle arrays
    const handleProductMatch = (orderId, itemIndex, productIds) => {
        if (!orderId) return;
        
        if (Array.isArray(productIds) && productIds.length === 0) {
            // If an empty array is passed, it means all products were deselected
            setSelectedProducts(prev => {
                const updated = {...prev};
                delete updated[`${orderId}-${itemIndex}`];
                return updated;
            });
        } else {
            setSelectedProducts(prev => ({
                ...prev,
                [`${orderId}-${itemIndex}`]: productIds
            }));
        }
    };

    // Updated save matches function
    const handleSaveMatches = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const updates = [];
            const bundleUpdates = [];
            
            // Focus specifically on the selected order if one is selected
            if (selectedOrder) {
                const updatedItems = selectedOrder.items.map((item, index) => {
                    const selectedProductIds = selectedProducts[`${selectedOrder.id}-${index}`];
                    if (selectedProductIds && selectedProductIds.length > 0) {
                        // Get the first product as the main match
                        const mainProductId = Array.isArray(selectedProductIds) ? selectedProductIds[0] : selectedProductIds;
                        const matchedProduct = products.find(p => p.id === mainProductId);
                        
                        // Get additional matches
                        const allProductIds = Array.isArray(selectedProductIds) 
                            ? selectedProductIds 
                            : [selectedProductIds];
                        
                        // Save or update bundle match if there are multiple products matched
                        if (allProductIds.length > 0 && item.product_sku) {
                            const existingMatchIndex = bundleMatches.findIndex(
                                m => m.marketplace === selectedOrder.marketplace && 
                                     m.original_sku === item.product_sku
                            );
                            
                            if (existingMatchIndex >= 0) {
                                // Update existing match
                                const existingMatch = bundleMatches[existingMatchIndex];
                                bundleUpdates.push(
                                    BundleMatch.update(existingMatch.id, {
                                        matched_product_ids: allProductIds,
                                        match_count: (existingMatch.match_count || 0) + 1,
                                        last_matched: new Date().toISOString(),
                                        original_product_name: item.product_name || existingMatch.original_product_name
                                    })
                                );
                            } else {
                                // Create new match
                                bundleUpdates.push(
                                    BundleMatch.create({
                                        marketplace: selectedOrder.marketplace,
                                        original_sku: item.product_sku,
                                        original_product_name: item.product_name || "",
                                        matched_product_ids: allProductIds,
                                        match_count: 1,
                                        last_matched: new Date().toISOString()
                                    })
                                );
                            }
                        }
                        
                        return {
                            ...item,
                            product_id: mainProductId,
                            product_name: matchedProduct.name,
                            product_sku: matchedProduct.sku,
                            additional_matches: allProductIds.filter(id => id !== mainProductId)
                        };
                    }
                    return item;
                });

                const allProductsMatched = updatedItems.every(item => item.product_id);
                
                if (updatedItems.some(item => item.product_id)) {
                    updates.push(Order.update(selectedOrder.id, { 
                        items: updatedItems,
                        requires_product_matching: !allProductsMatched
                    }));
                }
            }

            await Promise.all([...updates, ...bundleUpdates]);
            await loadData(); // Reload all data including bundle matches
            
            // Reset auto-match tracking
            setAutoMatchApplied({});
            
            // Reset selection if all items in the selected order were matched
            if (selectedOrder && !selectedOrder.items.some((item, index) => !selectedProducts[`${selectedOrder.id}-${index}`])) {
                setSelectedOrder(null);
            }
            
            // Clear the selections for orders that are now complete
            const newSelectedProducts = { ...selectedProducts };
            incompleteOrders.forEach(order => {
                if (order.items.every((_, index) => selectedProducts[`${order.id}-${index}`])) {
                    order.items.forEach((_, index) => {
                        delete newSelectedProducts[`${order.id}-${index}`];
                    });
                }
            });
            setSelectedProducts(newSelectedProducts);
            
        } catch (error) {
            console.error("Error saving matches:", error);
            setError("Failed to save product matches. Please try again.");
        }
        setIsLoading(false);
    };

    const createTestOrder = async () => {
        setIsLoading(true);
        try {
            const randomPrefix = `TEST-${Math.floor(Math.random() * 10000)}`;
            
            // Randomly decide how many items to include (1-5 items)
            const itemCount = Math.floor(Math.random() * 5) + 1;
            
            // Create an array of random items
            const items = [];
            for (let i = 1; i <= itemCount; i++) {
                items.push({
                    product_sku: `${randomPrefix}-SKU${i}`,
                    product_name: `Test Product ${i} Needs Matching`,
                    quantity: Math.floor(Math.random() * 5) + 1,
                    price: (Math.random() * 50 + 9.99).toFixed(2) * 1 // Random price between $9.99 and $59.99
                });
            }
            
            // Calculate the order totals
            const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const shippingCost = 5.00;
            const tax = subtotal * 0.1; // 10% tax
            const total = subtotal + shippingCost + tax;
            
            // Create the test order
            await Order.create({
                order_id: `${randomPrefix}-ORDER`,
                marketplace: ["Amazon", "eBay", "Walmart", "Etsy", "Shopify", "LASTPRICE"][Math.floor(Math.random() * 6)],
                order_date: new Date().toISOString(),
                customer_name: "Test Customer",
                customer_email: "test@example.com",
                order_status: "processing",
                requires_product_matching: true,
                shipping_address: {
                    street: "123 Test St",
                    city: "Test City",
                    state: "TS",
                    zip: "12345",
                    country: "US"
                },
                items: items,
                shipping_method: "Standard Shipping",
                payment_method: "Credit Card",
                subtotal: subtotal,
                shipping_cost: shippingCost,
                tax: tax,
                total: total
            });
            
            await loadData();
        } catch (error) {
            console.error("Error creating test order:", error);
            setError("Failed to create test order");
        }
        setIsLoading(false);
    };

    const filteredOrders = incompleteOrders.filter(order => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            order.order_id.toLowerCase().includes(search) ||
            order.items.some(item => 
                item.product_name?.toLowerCase().includes(search) ||
                item.product_sku?.toLowerCase().includes(search)
            )
        );
    });

    const selectOrder = (order) => {
        setSelectedOrder(order);
    };

    const deleteOrder = async (orderId) => {
        setIsLoading(true);
        setError(null);
        try {
            await Order.delete(orderId);
            await loadData();
            setSelectedOrder(null); // Clear selected order after deletion
        } catch (error) {
            console.error("Error deleting order:", error);
            setError("Failed to delete order. Please try again.");
        }
        setIsLoading(false);
    };

    if (isLoading) {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[500px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500">Loading orders...</p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => navigate(createPageUrl("Orders"))}
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Back to Orders
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Orders To Complete</h1>
                            <p className="text-gray-500">Match and assign products to incomplete orders</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <Button
                            onClick={handleSaveMatches}
                            disabled={Object.keys(selectedProducts).length === 0}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save Matches
                        </Button>
                        
                        <Button
                            variant="outline"
                            onClick={() => navigate(createPageUrl("BundleMatches"))}
                        >
                            <PackageOpen className="w-4 h-4 mr-2" />
                            View All Matches
                        </Button>
                        
                        <Button 
                            variant="outline" 
                            onClick={createTestOrder}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Test Order
                        </Button>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Orders List - Left Side */}
                    <Card className="h-[calc(100vh-180px)] flex flex-col">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle>Incomplete Orders</CardTitle>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowTemplateModal(true)}
                                    >
                                        Manage Templates
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={loadData}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="mt-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search orders by ID, product name, or SKU..."
                                        className="pl-9"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow overflow-hidden py-0">
                            <ScrollArea className="h-full pr-4">
                                {filteredOrders.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        No incomplete orders found
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredOrders.map((order) => (
                                            <Card 
                                                key={order.id}
                                                className={`border p-0 cursor-pointer hover:border-blue-300 transition-colors ${selectedOrder?.id === order.id ? 'border-blue-500 ring-1 ring-blue-500' : ''}`}
                                                onClick={() => selectOrder(order)}
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h3 className="font-medium">Order #{order.order_id}</h3>
                                                            <Badge>{order.marketplace}</Badge>
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {new Date(order.order_date).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="text-sm">
                                                        <div><span className="font-medium">Items:</span> {order.items.length}</div>
                                                        <div><span className="font-medium">Total:</span> ${order.total.toFixed(2)}</div>
                                                        {order.customer_name && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                Customer: {order.customer_name}
                                                            </div>
                                                        )}
                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                            {order.items.map((item, idx) => {
                                                                // Check if this item has selected products
                                                                const hasSelection = !!selectedProducts[`${order.id}-${idx}`] && 
                                                                                    selectedProducts[`${order.id}-${idx}`].length > 0;
                                                                
                                                                return (
                                                                    <Badge 
                                                                        key={idx} 
                                                                        variant="outline" 
                                                                        className={hasSelection ? "bg-green-50 text-green-700 border-green-200" : ""}
                                                                    >
                                                                        Item {idx + 1}: {hasSelection ? "✓" : "◯"}
                                                                    </Badge>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                    
                    {/* Matching Area - Right Side */}
                    <Card className="h-[calc(100vh-180px)] flex flex-col">
                        <CardHeader className="pb-3">
                            <CardTitle>Product Matching</CardTitle>
                            {selectedOrder && (
                                <div className="text-sm text-gray-500">
                                    Order #{selectedOrder.order_id} from {selectedOrder.marketplace}
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="flex-grow overflow-hidden p-0">
                            {!selectedOrder ? (
                                <div className="h-full flex items-center justify-center text-gray-500">
                                    Select an order from the left to start matching products
                                </div>
                            ) : (
                                <ScrollArea className="h-full">
                                    <div className="p-4">
                                    {selectedOrder && (
                                        <Card className="mb-4">
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <div className="text-sm text-gray-500">Bundle Matches Applied</div>
                                                        <div className="text-lg font-medium">
                                                            {Object.keys(autoMatchApplied).filter(key => 
                                                                key.startsWith(selectedOrder.id) && autoMatchApplied[key]
                                                            ).length} items auto-matched
                                                        </div>
                                                    </div>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => {
                                                            // Clear auto-matches
                                                            setAutoMatchApplied({});
                                                            
                                                            // Clear selected products that were auto-matched
                                                            const manualSelections = { ...selectedProducts };
                                                            Object.keys(autoMatchApplied).forEach(key => {
                                                                if (autoMatchApplied[key]) {
                                                                    delete manualSelections[key];
                                                                }
                                                            });
                                                            setSelectedProducts(manualSelections);
                                                        }}
                                                    >
                                                        Reset Auto Matches
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                        <div className="divide-y">
                                            {selectedOrder.items.map((item, itemIndex) => (
                                                <div key={`${selectedOrder.id}-${itemIndex}`} className="py-4 first:pt-0 last:pb-0">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {/* Original Order Item */}
                                                        <div className="bg-gray-50 p-4 rounded-lg">
                                                            <div className="text-xs uppercase text-gray-500 mb-2">Original Order Item</div>
                                                            <div className="font-medium mb-1">{item.product_name || "Unnamed Product"}</div>
                                                            {item.product_sku && (
                                                                <div className="text-sm text-gray-600">SKU: {item.product_sku}</div>
                                                            )}
                                                            <div className="mt-2 text-sm">
                                                                <div>Quantity: {item.quantity}</div>
                                                                <div>Price: ${item.price}</div>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Product Match Selection */}
                                                        <div className="border p-4 rounded-lg">
                                                            <div className="text-xs uppercase text-gray-500 mb-2">Match with Your Product</div>
                                                            <ProductSearchSelect
                                                                products={products || []}
                                                                value={selectedProducts[`${selectedOrder?.id}-${itemIndex}`] || []}
                                                                onChange={(value) => handleProductMatch(selectedOrder?.id, itemIndex, value)}
                                                                isAutoMatched={autoMatchApplied[`${selectedOrder?.id}-${itemIndex}`]}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                        <CardFooter className="border-t bg-gray-50 flex justify-between p-4">
                            <Button 
                                variant="destructive"
                                onClick={() => deleteOrder(selectedOrder.id)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Order
                            </Button>
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    onClick={() => setSelectedOrder(null)}
                                    disabled={!selectedOrder}
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSaveMatches}
                                    disabled={!selectedOrder || Object.keys(selectedProducts).filter(
                                        key => key.startsWith(selectedOrder.id)
                                    ).length === 0}
                                >
                                    <Check className="w-4 h-4 mr-2" />
                                    Save Matches
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            </div>

            <OrderTemplateModal
                open={showTemplateModal}
                onOpenChange={setShowTemplateModal}
                templates={templates}
                onTemplatesUpdate={loadData}
            />
        </div>
    );
}
