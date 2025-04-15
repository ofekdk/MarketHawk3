
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Filter,
  Package2
} from "lucide-react";

export default function ProductFilters({ filters, onFilterChange }) {
  return (
    <div className="bg-white rounded-lg mb-6 space-y-4">
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products by name, SKU, or marketplace URL..."
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Stock Status */}
        <Select
          value={filters.stockStatus}
          onValueChange={(value) => onFilterChange("stockStatus", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock Status</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock Only</SelectItem>
          </SelectContent>
        </Select>

        {/* Category */}
        <Select
          value={filters.category}
          onValueChange={(value) => onFilterChange("category", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="electronics">Electronics</SelectItem>
            <SelectItem value="clothing">Clothing</SelectItem>
            <SelectItem value="books">Books</SelectItem>
            <SelectItem value="home">Home & Garden</SelectItem>
            <SelectItem value="toys">Toys</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        {/* Marketplace Status */}
        <Select
          value={filters.marketplaceStatus}
          onValueChange={(value) => onFilterChange("marketplaceStatus", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Marketplace Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {/* Stock Sort */}
        <Select
          value={filters.stockSort}
          onValueChange={(value) => onFilterChange("stockSort", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sort by Stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Sort</SelectItem>
            <SelectItem value="asc">Stock: Low to High</SelectItem>
            <SelectItem value="desc">Stock: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
