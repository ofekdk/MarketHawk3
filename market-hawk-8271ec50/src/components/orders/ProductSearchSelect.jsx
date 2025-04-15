import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, ExternalLink, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProductSearchSelect({ products = [], value = [], onChange = () => {}, isAutoMatched = false }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownHeight, setDropdownHeight] = useState(200); // Default height
  
  // Make sure products is always an array
  const productsList = Array.isArray(products) ? products : [];
  
  const filteredProducts = useMemo(() => {
    if (searchTerm.length === 0) return productsList;
    
    return productsList.filter(product => 
      (product.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (product.sku?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );
  }, [productsList, searchTerm]);
  
  // Convert value to array if it's not already
  const selectedProductIds = Array.isArray(value) ? value : value ? [value] : [];
  const selectedProducts = selectedProductIds.map(id => productsList.find(p => p.id === id)).filter(Boolean);
  
  // Handle input click
  const handleInputClick = (e) => {
    e.stopPropagation();
    setShowDropdown(true);
  };
  
  // Handle dropdown click
  const handleDropdownClick = (e) => {
    e.stopPropagation();
  };

  // Handle product selection
  const handleProductSelect = (productId) => {
    const newValue = selectedProductIds.includes(productId)
      ? selectedProductIds.filter(id => id !== productId)
      : [...selectedProductIds, productId];
    
    // When deselecting the last product, make sure we pass an empty array to trigger the UI update
    onChange(newValue);
  };
  
  // Hide dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(false);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);
  
  // Determine dropdown height based on window size to avoid ResizeObserver issues
  useEffect(() => {
    const setResponsiveHeight = () => {
      const windowHeight = window.innerHeight;
      const maxHeight = Math.min(Math.max(100, windowHeight * 0.3), 300);
      setDropdownHeight(maxHeight);
    };
    
    setResponsiveHeight();
    window.addEventListener('resize', setResponsiveHeight);
    
    return () => {
      window.removeEventListener('resize', setResponsiveHeight);
    };
  }, []);
  
  return (
    <div className="space-y-4">
      {/* Selected Products Display */}
      {selectedProducts.length > 0 && (
        <div className="space-y-2">
          {isAutoMatched && (
            <Badge className="mb-2 bg-green-100 text-green-800">
              Auto-matched from previous bundle
            </Badge>
          )}
          {selectedProducts.map((product) => (
            <div key={product.id} className={`p-3 rounded-md ${isAutoMatched ? 'bg-green-50' : 'bg-blue-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`font-medium ${isAutoMatched ? 'text-green-800' : 'text-blue-800'}`}>
                  {product.name || 'Unnamed Product'}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleProductSelect(product.id)}
                  className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className={`text-sm ${isAutoMatched ? 'text-green-700' : 'text-blue-700'}`}>
                SKU: {product.sku || 'No SKU'}
              </div>
              <div className="flex justify-between mt-2 text-sm">
                <div className={isAutoMatched ? 'text-green-700' : 'text-blue-700'}>
                  Stock: {product.marketplaces?.[0]?.stock || 0}
                </div>
                {product.marketplaces?.[0]?.product_url && (
                  <a 
                    href={product.marketplaces[0].product_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 flex items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by product name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClick={handleInputClick}
          className="pl-9 pr-8"
        />
        {searchTerm && (
          <button 
            className="absolute right-3 top-2.5"
            onClick={(e) => {
              e.stopPropagation();
              setSearchTerm("");
            }}
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
        
        {/* Dropdown */}
        {showDropdown && searchTerm && (
          <div 
            className="absolute z-50 w-full mt-1 border rounded-md overflow-hidden bg-white shadow-lg"
            onClick={handleDropdownClick}
          >
            <div style={{ maxHeight: `${dropdownHeight}px`, overflowY: 'auto' }}>
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No products found
                </div>
              ) : (
                <div>
                  {filteredProducts.map((product) => (
                    <div 
                      key={product.id}
                      className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                        selectedProductIds.includes(product.id) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        handleProductSelect(product.id);
                        setSearchTerm("");
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{product.name || 'Unnamed Product'}</div>
                          <div className="text-sm text-gray-500">SKU: {product.sku || 'No SKU'}</div>
                        </div>
                        {selectedProductIds.includes(product.id) && (
                          <Badge className="bg-blue-100 text-blue-800">Selected</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}