
import React, { useState } from "react";
import { Order, ActivityLog } from "@/api/entities";
import { User } from "@/api/entities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShoppingBag,
  Calendar,
  User as UserIcon,
  MapPin,
  Truck,
  CreditCard,
  Package
} from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OrderDetailsModal({ order, products, open, onOpenChange, onOrderUpdated }) {
  const [orderStatus, setOrderStatus] = useState(order?.order_status || "pending");
  const [isUpdating, setIsUpdating] = useState(false);

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Unknown Product';
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

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "MMMM dd, yyyy h:mm a");
    } catch (error) {
      return "Invalid date";
    }
  };

  const handleUpdateStatus = async () => {
    if (orderStatus === order.order_status) return;
    
    setIsUpdating(true);
    try {
      const currentUser = await User.me();
      
      await Order.update(order.id, {
        order_status: orderStatus
      });
      
      // Log the activity
      await ActivityLog.create({
        activity_type: "order_status_updated",
        details: {
          order_id: order.id,
          external_order_id: order.order_id,
          previous_status: order.order_status,
          new_status: orderStatus,
          marketplace: order.marketplace
        },
        user_id: currentUser.id,
        activity_date: new Date().toISOString()
      });
      
      onOrderUpdated && onOrderUpdated();
    } catch (error) {
      console.error("Error updating order status:", error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-blue-500" />
            Order Details
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh]">
          <div className="space-y-6 p-1">
            <div className="grid grid-cols-2 gap-4 border rounded-lg p-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {order.order_id}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-gray-600">
                  {order.marketplace && (
                    <Badge variant="outline">{order.marketplace}</Badge>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(order.order_date)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex justify-end mb-2">
                  {getStatusBadge(order.order_status)}
                </div>
                <div className="font-bold text-xl">${order.total?.toFixed(2) || "0.00"}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Customer Information
                </h4>
                <div className="space-y-2">
                  <p className="text-gray-600">
                    <span className="font-medium">Name:</span> {order.customer_name || "Not specified"}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Email:</span> {order.customer_email || "Not specified"}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Shipping Information
                </h4>
                <div className="space-y-2">
                  {order.shipping_address ? (
                    <>
                      {order.shipping_address.street && (
                        <p className="text-gray-600">{order.shipping_address.street}</p>
                      )}
                      {(order.shipping_address.city || order.shipping_address.state) && (
                        <p className="text-gray-600">
                          {order.shipping_address.city}{order.shipping_address.city && order.shipping_address.state ? ', ' : ''}
                          {order.shipping_address.state} {order.shipping_address.zip}
                        </p>
                      )}
                      {order.shipping_address.country && (
                        <p className="text-gray-600">{order.shipping_address.country}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-600">No shipping address provided</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Order Items
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items && order.items.length > 0 ? order.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell>{item.product_sku}</TableCell>
                      <TableCell className="text-right">${item.price?.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${(item.price * item.quantity).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500">
                        No items found
                      </TableCell>
                    </TableRow>
                  )}
                  {order.items && order.items.length > 0 && (
                    <>
                      <TableRow>
                        <TableCell colSpan={4} className="text-right font-medium">
                          Subtotal
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${order.subtotal?.toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={4} className="text-right font-medium">
                          Shipping
                        </TableCell>
                        <TableCell className="text-right">
                          ${order.shipping_cost?.toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={4} className="text-right font-medium">
                          Tax
                        </TableCell>
                        <TableCell className="text-right">
                          ${order.tax?.toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={4} className="text-right font-medium">
                          Total
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${order.total?.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 col-span-2">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Shipping & Payment
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Shipping Method</p>
                    <p className="text-gray-700">{order.shipping_method || "Standard Shipping"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="text-gray-700">{order.payment_method || "Not specified"}</p>
                  </div>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Order Total
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>${order.subtotal?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping:</span>
                    <span>${order.shipping_cost?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax:</span>
                    <span>${order.tax?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                    <span>Total:</span>
                    <span>${order.total?.toFixed(2) || "0.00"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex justify-between items-center gap-4">
          <div className="flex-1">
            <Select value={orderStatus} onValueChange={setOrderStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
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
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button 
              onClick={handleUpdateStatus} 
              disabled={isUpdating || orderStatus === order.order_status}
            >
              {isUpdating ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
