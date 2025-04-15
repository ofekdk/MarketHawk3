import React, { useState, useEffect } from "react";
import { ActivityLog } from "@/api/entities";
import { User } from "@/api/entities";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
  ArrowLeft,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Upload,
  Plus,
  Mail,
  Filter,
  RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState({});
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadActivityLogs();
    loadUsers();
  }, []);

  const loadActivityLogs = async () => {
    try {
      const data = await ActivityLog.list('-activity_date');
      setLogs(data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading activity logs:", error);
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersList = await User.list();
      const usersMap = {};
      usersList.forEach(user => {
        usersMap[user.id] = user.full_name || user.email;
      });
      setUsers(usersMap);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    loadActivityLogs();
  };

  const getActivityIcon = (activity) => {
    switch (activity.activity_type) {
      case "notification_sent":
        return <Mail className="w-4 h-4 text-blue-500" />;
      case "products_imported":
        return <FileText className="w-4 h-4 text-green-500" />;
      case "inventory_updated":
        return <Upload className="w-4 h-4 text-amber-500" />;
      case "product_created":
        return <Plus className="w-4 h-4 text-indigo-500" />;
      case "product_updated":
        return <RefreshCw className="w-4 h-4 text-purple-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityTitle = (activity) => {
    switch (activity.activity_type) {
      case "notification_sent":
        return "Notification Sent";
      case "products_imported":
        return "Products Imported";
      case "inventory_updated":
        return "Inventory Updated";
      case "product_created":
        return "Product Created";
      case "product_updated":
        return "Product Updated";
      default:
        return "Activity";
    }
  };

  const getActivityDetails = (activity) => {
    const details = activity.details || {};
    
    switch (activity.activity_type) {
      case "notification_sent":
        return `Sent to: ${details.recipient_email || "Unknown"}, Subject: ${details.subject || "No subject"}`;
      case "products_imported":
        return `Imported ${details.products_count || "?"} products from ${details.file_name || "file"}`;
      case "inventory_updated":
        return `Updated ${details.products_updated || "?"} products, ${details.stock_changes || 0} stock changes`;
      case "product_created":
        return `Created product: ${details.product_name || "Unknown"} (SKU: ${details.product_sku || "N/A"})`;
      case "product_updated":
        return `Updated product: ${details.product_name || "Unknown"} (SKU: ${details.product_sku || "N/A"})`;
      default:
        return JSON.stringify(details);
    }
  };

  const filteredLogs = logs.filter(log => {
    // Filter by type
    if (filter !== "all" && log.activity_type !== filter) {
      return false;
    }
    
    // Search term matching
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const details = getActivityDetails(log).toLowerCase();
      const title = getActivityTitle(log).toLowerCase();
      const user = (users[log.user_id] || "").toLowerCase();
      
      return details.includes(searchLower) || 
             title.includes(searchLower) || 
             user.includes(searchLower);
    }
    
    return true;
  });

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl("Dashboard"))}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Activity Logs
            </CardTitle>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="w-full md:w-64">
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="notification_sent">Notifications Sent</SelectItem>
                    <SelectItem value="products_imported">Products Imported</SelectItem>
                    <SelectItem value="inventory_updated">Inventory Updated</SelectItem>
                    <SelectItem value="product_created">Products Created</SelectItem>
                    <SelectItem value="product_updated">Products Updated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array(5).fill(0).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No activities found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActivityIcon(log)}
                            <span>{getActivityTitle(log)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {users[log.user_id] || "Unknown"}
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {getActivityDetails(log)}
                        </TableCell>
                        <TableCell>
                          {log.activity_date ? (
                            format(new Date(log.activity_date), 'MMM dd, yyyy HH:mm')
                          ) : (
                            "Unknown date"
                          )}
                        </TableCell>
                        <TableCell>
                          {log.success !== false ? (
                            <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Success
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Failed
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}