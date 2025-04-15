

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { User } from "@/api/entities";
import NotificationCenter from "./components/notifications/NotificationCenter";
import { 
  Package2, 
  ShoppingBag, 
  BarChart2, 
  Mail,
  Menu,
  X,
  UserCircle,
  LogOut,
  Clock,
  FileImage
} from "lucide-react";

export default function Layout({ children, currentPageName }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const handleLogout = async () => {
    try {
      await User.logout();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };
  
  const navLinks = [
    { name: "Dashboard", path: "Dashboard", icon: <Package2 className="w-5 h-5" /> },
    { name: "Orders", path: "Orders", icon: <ShoppingBag className="w-5 h-5" /> },
    { name: "Analytics", path: "SalesAnalytics", icon: <BarChart2 className="w-5 h-5" /> },
    { name: "Contacts", path: "MarketplaceContacts", icon: <Mail className="w-5 h-5" /> },
    { name: "Image Editor", path: "BatchImageEditor", icon: <FileImage className="w-5 h-5" /> },
    { name: "Activity Logs", path: "ActivityLogs", icon: <Clock className="w-5 h-5" /> }
  ];
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Link to={createPageUrl("Dashboard")} className="flex items-center">
              <span className="text-xl font-bold text-blue-600">MarketHawk</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={createPageUrl(link.path)}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentPageName === link.path
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center space-x-3">
            <NotificationCenter />
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleLogout}
              className="hidden md:flex"
            >
              <LogOut className="h-5 w-5" />
            </Button>
            
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </header>
      
      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b">
          <nav className="flex flex-col space-y-1 px-2 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={createPageUrl(link.path)}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                  currentPageName === link.path
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="mr-3">{link.icon}</span>
                {link.name}
              </Link>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="mt-2 justify-start pl-3 text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </Button>
          </nav>
        </div>
      )}
      
      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}

