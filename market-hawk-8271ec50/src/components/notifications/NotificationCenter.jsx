import React, { useState, useEffect } from "react";
import { StockNotification } from "@/api/entities";
import { format } from "date-fns";
import {
  Bell,
  BellOff,
  Flag,
  CheckCircle2,
  X,
  AlertCircle,
  Filter,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all"); // all, flagged
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open]);

  const loadNotifications = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await StockNotification.list('-notification_date');
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error("Error loading notifications:", error);
      if (error?.response?.status === 429) {
        setError("Rate limit exceeded. Please try again in a moment.");
      } else {
        setError("Error loading notifications.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notification) => {
    try {
      await StockNotification.update(notification.id, { is_read: true });
      // Update locally to avoid another API call
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleDismiss = async (notification) => {
    try {
      await StockNotification.delete(notification.id);
      // Update locally to avoid another API call
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      if (!notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const handleToggleFlag = async (notification) => {
    try {
      const updatedFlag = !notification.is_flagged;
      await StockNotification.update(notification.id, { 
        is_flagged: updatedFlag
      });
      // Update locally to avoid another API call
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_flagged: updatedFlag } : n)
      );
    } catch (error) {
      console.error("Error changing flag:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      // Update locally first for better UX
      setNotifications(prev => 
        prev.map(n => n.is_read ? n : { ...n, is_read: true })
      );
      setUnreadCount(0);
      
      // Then update in backend
      const promises = unreadNotifications.map(n => 
        StockNotification.update(n.id, { is_read: true })
      );
      await Promise.all(promises);
    } catch (error) {
      console.error("Error marking all as read:", error);
      // If error, reload to get actual state
      loadNotifications();
    }
  };

  // Sort notifications - flagged first, then unread, then by date
  const sortedNotifications = [...notifications]
    .filter(n => filter === "all" || (filter === "flagged" && n.is_flagged))
    .sort((a, b) => {
      // Flagged first
      if (a.is_flagged && !b.is_flagged) return -1;
      if (!a.is_flagged && b.is_flagged) return 1;
      
      // Then unread
      if (!a.is_read && b.is_read) return -1;
      if (a.is_read && !b.is_read) return 1;
      
      // Then by date (newest first)
      return new Date(b.notification_date) - new Date(a.notification_date);
    });

  const getNotificationIcon = (notification) => {
    const { notification_type } = notification;
    
    if (notification_type === "active_but_no_stock") {
      return <AlertCircle className="h-5 w-5 text-amber-500" />;
    } else if (notification_type === "out_of_stock") {
      return <BellOff className="h-5 w-5 text-red-400" />;
    } else {
      return <CheckCircle2 className="h-5 w-5 text-green-400" />;
    }
  };

  const getNotificationTitle = (type) => {
    switch (type) {
      case "out_of_stock":
        return "Product Out of Stock";
      case "back_in_stock":
        return "Product Back in Stock";
      case "active_but_no_stock":
        return "Product Active with No Stock";
      default:
        return "Stock Update";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0">
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="font-medium">Notifications</h3>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-8 w-[120px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                Mark all read
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">
              <RefreshCw className="mx-auto h-6 w-6 text-gray-400 mb-2 animate-spin" />
              <p>Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="mt-4 flex justify-center">
                <Button variant="outline" size="sm" onClick={loadNotifications}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          ) : sortedNotifications.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <BellOff className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {sortedNotifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-3 relative ${notification.is_read ? 'bg-white' : 'bg-blue-50'}`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification)}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {getNotificationTitle(notification.notification_type)}
                            {notification.is_flagged && (
                              <Badge className="ml-2 bg-red-100 text-red-800">
                                Flagged
                              </Badge>
                            )}
                          </p>
                          <Link 
                            to={createPageUrl("AddProduct") + `?edit=${notification.product_id}`}
                            className="text-blue-600 hover:underline inline-block mt-1"
                            onClick={() => setOpen(false)}
                          >
                            {notification.product_name}
                          </Link>
                          <p className="text-xs text-gray-500">
                            SKU: {notification.product_sku}
                          </p>
                          {notification.notification_type === "active_but_no_stock" ? (
                            <p className="text-xs text-amber-600 mt-1">
                              Active on: {notification.active_marketplaces?.join(", ") || "Unknown"}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500 mt-1">
                              {notification.notification_type === "out_of_stock" ? 
                                `Previous stock: ${notification.previous_stock} → Now: 0` : 
                                `Previous stock: 0 → Now: ${notification.new_stock}`}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {format(new Date(notification.notification_date), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFlag(notification);
                            }}
                            className="h-6 w-6"
                          >
                            <Flag className={`h-4 w-4 ${notification.is_flagged ? 'text-red-500' : 'text-gray-400'}`} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismiss(notification);
                            }}
                            className="h-6 w-6"
                          >
                            <X className="h-4 w-4 text-gray-400" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {!notification.is_read && (
                    <div 
                      className="absolute inset-0 cursor-pointer"
                      onClick={() => handleMarkAsRead(notification)}
                    ></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}