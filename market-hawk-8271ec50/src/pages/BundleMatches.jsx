
import React, { useState, useEffect } from "react";
import { BundleMatch, Product } from "@/api/entities";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search, ChevronLeft, PackageOpen, Trash2 } from "lucide-react";
import { format } from "date-fns";
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

export default function BundleMatches() {
  const navigate = useNavigate();
  const [bundleMatches, setBundleMatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bundleData, productsData] = await Promise.all([
        BundleMatch.list('-last_matched'),
        Product.list()
      ]);
      setBundleMatches(bundleData);
      setProducts(productsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleDeleteMatch = async () => {
    if (!selectedMatch) return;
    
    setIsLoading(true);
    try {
      await BundleMatch.delete(selectedMatch.id);
      await loadData();
      setSelectedMatch(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting bundle match:", error);
    }
    setIsLoading(false);
  };

  const filteredMatches = bundleMatches.filter(match => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      match.original_sku.toLowerCase().includes(search) ||
      match.original_product_name.toLowerCase().includes(search) ||
      match.marketplace.toLowerCase().includes(search)
    );
  });

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Unknown Product';
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("OrdersToComplete"))}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Orders to Complete
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Product Matches</h1>
            <p className="text-gray-500">View and manage your product matching history</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Match History</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <div className="mt-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by SKU, product name, or marketplace..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading bundle matches...</p>
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {bundleMatches.length === 0 ? 
                  "No bundle matches found. Create matches by matching products to orders." :
                  "No matches found for your search."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marketplace</TableHead>
                    <TableHead>Original SKU</TableHead>
                    <TableHead>Original Product Name</TableHead>
                    <TableHead>Matched Products</TableHead>
                    <TableHead>Last Matched</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMatches.map((match) => (
                    <TableRow key={match.id}>
                      <TableCell>
                        <Badge>{match.marketplace}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{match.original_sku}</TableCell>
                      <TableCell>{match.original_product_name || "—"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {match.matched_product_ids.map((productId, idx) => (
                            <div key={idx} className="text-sm bg-gray-50 p-1 rounded">
                              {getProductName(productId)}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {match.last_matched ? format(new Date(match.last_matched), 'MMM d, yyyy') : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{match.match_count || 1}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedMatch(match);
                            setShowDeleteConfirm(true);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bundle Match</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this bundle match?
              This will remove the automatic matching for {selectedMatch?.original_sku} from {selectedMatch?.marketplace}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMatch} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
