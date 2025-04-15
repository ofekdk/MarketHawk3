
import React, { useState, useEffect } from "react";
import { Product } from "@/api/entities";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Package2, ExternalLink, Search, Mail, BarChart2, Upload, Download, ShoppingBag, Edit, AlertCircle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { StockNotification } from "@/api/entities";
import ProductDetailsModal from "../components/products/ProductDetailsModal";
import BulkInventoryModal from "../components/inventory/BulkInventoryModal";
import ProductFilters from "../components/products/ProductFilters";
import ImportExportProducts from "../components/products/ImportExportProducts";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    stockStatus: "all",
    category: "all",
    marketplaceStatus: "all",
    stockSort: "none"
  });

  const marketplaces = ["Amazon", "eBay", "Walmart", "Etsy", "Shopify"];

  const getTotalStock = (product) => {
    return product.marketplaces?.[0]?.stock || 0;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await Product.list();
    setProducts(data);
    setIsLoading(false);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const filterProducts = (products) => {
    return products.filter(product => {
      const stock = getTotalStock(product);
      
      const searchMatch = 
        filters.search === "" ||
        product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.sku.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.marketplaces?.some(marketplace => 
          marketplace.product_url?.toLowerCase().includes(filters.search.toLowerCase())
        );

      const stockStatusMatch = 
        filters.stockStatus === "all" ||
        (filters.stockStatus === "in_stock" && stock > 0) || // Now includes low stock
        (filters.stockStatus === "low_stock" && stock > 0 && stock <= 5) || // Separate low stock filter
        (filters.stockStatus === "out_of_stock" && stock === 0); // New out of stock filter

      const categoryMatch = 
        filters.category === "all" ||
        product.category === filters.category;

      const marketplaceStatusMatch = filters.marketplaceStatus === "all" ||
        product.marketplaces?.some(m => m.status === filters.marketplaceStatus);

      return searchMatch && stockStatusMatch && categoryMatch && marketplaceStatusMatch;
    });
  };

  // Calculate filtered products
  const filteredProducts = filterProducts(products).sort((a, b) => {
    if (filters.stockSort === "none") return 0;
    const stockA = getTotalStock(a);
    const stockB = getTotalStock(b);
    return filters.stockSort === "asc" ? stockA - stockB : stockB - stockA;
  });

  // Simplified useEffect - only update stock and create notifications
  useEffect(() => {
    if (!isLoading && products.length > 0) {
      let needsNotification = false;
      const stockUpdateBatch = [];
      
      products.forEach(product => {
        if (product.marketplaces && product.marketplaces.length > 0) {
          const stock = getTotalStock(product);
          
          // If stock is 0, check for active listings to notify
          if (stock === 0) {
            const activeMarketplaces = product.marketplaces
              .filter(m => m.status === 'active')
              .map(m => m.name);

            if (activeMarketplaces.length > 0) {
              needsNotification = true;
              // Create notification for active listings with no stock
              StockNotification.create({
                product_id: product.id,
                product_name: product.name,
                product_sku: product.sku,
                notification_type: 'active_but_no_stock',
                active_marketplaces: activeMarketplaces,
                notification_date: new Date().toISOString()
              });
            }
          }

          // Only update if stock values are different
          const currentStock = product.marketplaces[0]?.stock;
          if (stock !== currentStock) {
            stockUpdateBatch.push({
              id: product.id,
              marketplaces: product.marketplaces.map(marketplace => ({
                ...marketplace,
                stock: stock
              }))
            });
          }
        }
      });
      
      // Update products in batches with delay
      if (stockUpdateBatch.length > 0) {
        const batchSize = 3;
        const delay = 1000;
        
        const processBatch = async (batch) => {
          await Promise.all(
            batch.map(p => Product.update(p.id, { marketplaces: p.marketplaces }))
          );
        };

        const processAllBatches = async () => {
          for (let i = 0; i < stockUpdateBatch.length; i += batchSize) {
            const currentBatch = stockUpdateBatch.slice(i, i + batchSize);
            await processBatch(currentBatch);
            if (i + batchSize < stockUpdateBatch.length) {
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
          loadProducts();
        };

        processAllBatches().catch(console.error);
      }
    }
  }, [isLoading, products]);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Product Marketplace Tracker</h1>
            <p className="text-gray-500">Track your products across different marketplaces</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => setShowImportExportModal(true)}
            >
              <Download className="w-4 h-4 mr-2" />
              Import/Export Products
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowInventoryModal(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Inventory
            </Button>
            <Link to={createPageUrl("AddProduct")}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add New Product
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package2 className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
              <p className="text-xs text-gray-500">
                Showing {filteredProducts.length} filtered results
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Products with No Stock</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {products.some(product => 
                getTotalStock(product) === 0 && 
                product.marketplaces?.some(m => m.status === 'active')
              ) ? (
                <div className="space-y-2">
                  {(() => {
                    const noStockProducts = products.filter(product => 
                      getTotalStock(product) === 0 && 
                      product.marketplaces?.some(m => m.status === 'active')
                    );
                    
                    // If more than 3 items, make it scrollable
                    const shouldScroll = noStockProducts.length > 3;
                    
                    return (
                      <div className={shouldScroll ? "h-[160px] overflow-auto pr-1" : ""}>
                        {noStockProducts.map(product => {
                          const activeMarketplaces = product.marketplaces
                            .filter(m => m.status === 'active')
                            .map(m => m.name);
                          
                          return (
                            <div 
                              key={product.id} 
                              className="flex items-center justify-between bg-amber-50 rounded-md p-2 text-sm mb-2 last:mb-0"
                            >
                              <div className="flex-1">
                                <div 
                                  className="font-medium text-amber-900 cursor-pointer hover:text-amber-700"
                                  onClick={() => setSelectedProduct(product)}
                                >
                                  {product.name}
                                </div>
                                <div className="text-amber-700 text-xs">
                                  Active on: {activeMarketplaces.join(', ')}
                                </div>
                              </div>
                              <Link 
                                to={createPageUrl("AddProduct") + `?edit=${product.id}`}
                                className="ml-2"
                              >
                                <Button variant="outline" size="sm">
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  No active products with zero stock
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Package2 className="w-5 h-5 text-blue-500" />
              <CardTitle>Products Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ProductFilters 
              filters={filters}
              onFilterChange={handleFilterChange}
            />
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    {marketplaces.map(marketplace => (
                      <TableHead key={marketplace}>{marketplace}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={marketplaces.length + 1} className="text-center py-8">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={marketplaces.length + 1} className="text-center py-8">
                        No products found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => {
                      const stock = getTotalStock(product);
                      const isOutOfStock = stock === 0;
                      const isLowStock = stock > 0 && stock <= 5;
                      
                      return (
                        <TableRow 
                          key={product.id}
                          className={`transition-colors ${isOutOfStock ? "bg-red-50/80" : ""}`}
                        >
                          <TableCell>
                            <div>
                              <div 
                                className="font-medium cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => setSelectedProduct(product)}
                              >
                                {product.name}
                              </div>
                              <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                              <div className="mt-1 flex items-center">
                                <span className={`text-sm font-medium ${isOutOfStock ? "text-red-600" : ""}`}>
                                  Stock: {stock}
                                </span>
                                {isLowStock && (
                                  <Badge className="ml-2 bg-amber-100 text-amber-800">
                                    Low Stock
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          {marketplaces.map(marketplace => {
                            const marketplaceData = product.marketplaces?.find(m => m.name === marketplace);
                            return (
                              <TableCell key={marketplace}>
                                {marketplaceData ? (
                                  <div className="space-y-2">
                                    <Badge className={getStatusColor(marketplaceData.status)}>
                                      {marketplaceData.status}
                                    </Badge>
                                    <div className="text-sm">
                                      <div>${marketplaceData.price}</div>
                                      {marketplaceData.product_url && (
                                        <a
                                          href={marketplaceData.product_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                                        >
                                          View <ExternalLink className="w-3 h-3" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">Not listed</span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      <ImportExportProducts 
        open={showImportExportModal}
        onOpenChange={setShowImportExportModal}
        onProductsUpdate={loadProducts}
      />
      <ProductDetailsModal 
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
        onProductDeleted={() => {
          loadProducts();
          setSelectedProduct(null);
        }}
      />
      <BulkInventoryModal
        open={showInventoryModal}
        onOpenChange={setShowInventoryModal}
        products={products}
        onInventoryUpdate={loadProducts}
      />
    </div>
  );
}
