
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Package2, 
  Tag, 
  Boxes,
  ShoppingCart,
  ExternalLink,
  Edit,
  Trash2
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Product } from "@/api/entities";
import { ActivityLog } from "@/api/entities";
import { User } from "@/api/entities";

export default function ProductDetailsModal({ product, open, onOpenChange, onProductDeleted }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  if (!product) return null;

  const getTotalStock = () => {
    if (!product.marketplaces || product.marketplaces.length === 0) return 0;
    return product.marketplaces[0].stock || 0;
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return { label: "Out of Stock", class: "bg-red-100 text-red-800" };
    if (stock > 0 && stock <= 5) return { label: "Low Stock", class: "bg-amber-100 text-amber-800" };
    return { label: "In Stock", class: "bg-green-100 text-green-800" };
  };

  const stockStatus = getStockStatus(getTotalStock());

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await Product.delete(product.id);
      
      // Log the deletion
      const currentUser = await User.me();
      await ActivityLog.create({
        activity_type: "product_deleted",
        details: {
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku
        },
        user_id: currentUser.id,
        activity_date: new Date().toISOString()
      });

      setIsDeleting(false);
      setShowDeleteDialog(false);
      onOpenChange(false);
      // Notify parent to refresh products list
      if (onProductDeleted) {
        onProductDeleted();
      }
      navigate(createPageUrl("Products")); // Redirect to products page after deletion
    } catch (error) {
      console.error("Error deleting product:", error);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package2 className="w-5 h-5 text-blue-500" />
                Product Details
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Link to={createPageUrl("AddProduct") + `?edit=${product.id}`}>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Product
                  </Button>
                </Link>
              </div>

            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[80vh]">
            <div className="space-y-6 p-1">
              <div className="grid grid-cols-2 gap-4 border rounded-lg p-4">
                <div>
                  <h3 className="text-lg font-semibold">{product.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-gray-600">
                    <Tag className="w-4 h-4" />
                    SKU: {product.sku}
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={stockStatus.class}>
                    {stockStatus.label}
                  </Badge>
                  <div className="mt-1 text-gray-600 flex items-center justify-end gap-2">
                    <Boxes className="w-4 h-4" />
                    Stock: {getTotalStock()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Category</h4>
                  <p className="text-gray-600">{product.category || "Not specified"}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-gray-600">{product.description || "No description available"}</p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-4">Marketplace Listings</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Marketplace</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.marketplaces?.map((marketplace, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {marketplace.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <ShoppingCart className="w-4 h-4 text-gray-500" />
                            ${marketplace.price}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            marketplace.status === 'active' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {marketplace.status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {marketplace.contacts && marketplace.contacts.length > 0 ? (
                            <div className="text-sm space-y-2">
                              {marketplace.contacts.map((contact, idx) => (
                                <div key={`contact-${marketplace.name}-${idx}`} className="p-1">
                                  <div>{contact.name}</div>
                                  <div className="text-gray-500">{contact.email}</div>
                                  {contact.notify_stock_changes && (
                                    <Badge variant="outline" className="mt-1 text-xs">
                                      Auto notifications on
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">No contacts</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {marketplace.product_url && (
                            <a
                              href={marketplace.product_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                            >
                              View Listing <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{product.name}" (SKU: {product.sku}) and all its marketplace listings.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                "Delete Product"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
