
import React, { useState, useEffect } from "react";
import { Product } from "@/api/entities";
import { MarketplaceContact } from "@/api/entities";
import { ActivityLog } from "@/api/entities";
import { User } from "@/api/entities";
import { SendEmail } from "@/api/integrations";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AddProduct() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  
  const [product, setProduct] = useState({
    name: "",
    sku: "",
    description: "",
    category: "",
    marketplaces: []
  });

  const [stockValue, setStockValue] = useState(0);
  const marketplaceOptions = ["Amazon", "eBay", "Walmart", "Etsy", "Shopify"];
  const [contacts, setContacts] = useState({});
  const [error, setError] = useState(null);
  
  // Adding a state to track which marketplaces have been manually set
  const [manuallySetStatus, setManuallySetStatus] = useState({});
  
  useEffect(() => {
    if (editId) {
      loadProduct();
    } else {
      setIsLoading(false);
    }
    loadContacts();
  }, [editId]);

  const loadContacts = async () => {
    const marketplaceContacts = await MarketplaceContact.list();
    const groupedContacts = marketplaceContacts.reduce((acc, contact) => {
      if (!acc[contact.marketplace]) {
        acc[contact.marketplace] = [];
      }
      acc[contact.marketplace].push(contact);
      return acc;
    }, {});
    setContacts(groupedContacts);
  };

  const loadProduct = async () => {
    try {
      const products = await Product.list();
      const productToEdit = products.find(p => p.id === editId);
      if (productToEdit) {
        setProduct(productToEdit);
        setStockValue(productToEdit.marketplaces?.[0]?.stock || 0);
        
        // Initialize the manually set status tracker
        const initialManualStatus = {};
        productToEdit.marketplaces?.forEach((marketplace, index) => {
          initialManualStatus[index] = true; // Consider all existing statuses as manually set
        });
        setManuallySetStatus(initialManualStatus);
      }
    } catch (error) {
      console.error("Error loading product:", error);
    }
    setIsLoading(false);
  };

  const handleAddMarketplace = () => {
    setProduct(prev => ({
      ...prev,
      marketplaces: [...prev.marketplaces, {
        name: marketplaceOptions[0],
        price: 0,
        stock: stockValue,
        product_url: "",
        status: "active", // Always start as active
        contacts: []
      }]
    }));
  };

  const handleRemoveMarketplace = (index) => {
    setProduct(prev => ({
      ...prev,
      marketplaces: prev.marketplaces.filter((_, i) => i !== index)
    }));
  };

  const handleMarketplaceChange = (index, field, value) => {
    if (field === "stock") {
      setStockValue(value);
      setProduct(prev => ({
        ...prev,
        marketplaces: prev.marketplaces.map(marketplace => ({
          ...marketplace,
          stock: value
        }))
      }));
    } else {
      // Handle all field changes normally, including status
      setProduct(prev => ({
        ...prev,
        marketplaces: prev.marketplaces.map((item, i) => 
          i === index ? { ...item, [field]: value } : item
        )
      }));
    }
  };

  const handleAddContact = (marketplaceIndex, contactValue) => {
    if (contactValue === "none") return;
    
    const [name, email] = contactValue.split("|");
    const selectedContact = contacts[product.marketplaces[marketplaceIndex].name]?.find(
      c => c.contact_name === name && c.email === email
    );
    
    if (!selectedContact) return;
    
    // Check if contact already exists
    const contactExists = product.marketplaces[marketplaceIndex].contacts?.some(
      c => c.name === selectedContact.contact_name && c.email === selectedContact.email
    );
    
    if (contactExists) return;
    
    setProduct(prev => {
      const updatedMarketplaces = [...prev.marketplaces];
      const marketplace = updatedMarketplaces[marketplaceIndex];
      
      // Ensure contacts array exists
      if (!marketplace.contacts) {
        marketplace.contacts = [];
      }
      
      marketplace.contacts.push({
        name: selectedContact.contact_name,
        email: selectedContact.email,
        notify_stock_changes: selectedContact.notify_on_stock
      });
      
      return {
        ...prev,
        marketplaces: updatedMarketplaces
      };
    });
  };

  const handleRemoveContact = (marketplaceIndex, contactIndex) => {
    setProduct(prev => {
      const updatedMarketplaces = [...prev.marketplaces];
      const marketplace = updatedMarketplaces[marketplaceIndex];
      
      marketplace.contacts = marketplace.contacts.filter((_, i) => i !== contactIndex);
      
      return {
        ...prev,
        marketplaces: updatedMarketplaces
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const currentUser = await User.me();
      
      // Check if SKU already exists
      const existingProducts = await Product.list();
      const skuExists = existingProducts.some(p => 
        p.sku === product.sku && (!editId || p.id !== editId)
      );

      if (skuExists) {
        setError(`SKU "${product.sku}" is already in use. Please use a unique SKU.`);
        setIsSubmitting(false);
        return;
      }

      if (editId) {
        await Product.update(editId, product);
        await ActivityLog.create({
          activity_type: "product_updated",
          details: {
            product_id: editId,
            product_name: product.name,
            product_sku: product.sku
          },
          user_id: currentUser.id,
          activity_date: new Date().toISOString()
        });
      } else {
        const newProduct = await Product.create(product);
        await ActivityLog.create({
          activity_type: "product_created",
          details: {
            product_id: newProduct.id,
            product_name: product.name,
            product_sku: product.sku
          },
          user_id: currentUser.id,
          activity_date: new Date().toISOString()
        });
      }
      navigate(createPageUrl("Dashboard"));
    } catch (error) {
      console.error("Error saving product:", error);
      setError(error.message || "Failed to save product. Please try again.");
      
      try {
        const currentUser = await User.me();
        await ActivityLog.create({
          activity_type: editId ? "product_updated" : "product_created",
          details: {
            error: error.message,
            product_name: product.name,
            product_sku: product.sku
          },
          success: false,
          user_id: currentUser.id,
          activity_date: new Date().toISOString()
        });
      } catch (logError) {
        console.error("Error logging activity:", logError);
      }
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {editId ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-gray-500">
            {editId ? 'Update your product details and marketplace listings' : 'Enter your product details and marketplace listings'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div>
                <label className="text-sm font-medium">Product Name</label>
                <Input
                  value={product.name}
                  onChange={(e) => setProduct({ ...product, name: e.target.value })}
                  placeholder="Enter product name"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">SKU</label>
                <Input
                  value={product.sku}
                  onChange={(e) => setProduct({ ...product, sku: e.target.value })}
                  placeholder="Enter SKU"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  SKU must be unique across all products
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Input
                  value={product.category}
                  onChange={(e) => setProduct({ ...product, category: e.target.value })}
                  placeholder="Enter category"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Stock (shared across all marketplaces)</label>
                <Input
                  type="number"
                  value={stockValue}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setStockValue(value);
                    setProduct(prev => ({
                      ...prev,
                      marketplaces: prev.marketplaces.map(item => ({ 
                        ...item, 
                        stock: value
                      }))
                    }));
                  }}
                  placeholder="Enter stock quantity"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={product.description}
                  onChange={(e) => setProduct({ ...product, description: e.target.value })}
                  placeholder="Enter product description"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Marketplace Listings</CardTitle>
              <Button
                type="button"
                onClick={handleAddMarketplace}
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Marketplace
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {product.marketplaces.map((marketplace, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <Select
                        value={marketplace.name}
                        onValueChange={(value) => handleMarketplaceChange(index, "name", value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {marketplaceOptions.map(option => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMarketplace(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Price</label>
                        <Input
                          type="number"
                          value={marketplace.price}
                          onChange={(e) => handleMarketplaceChange(index, "price", parseFloat(e.target.value))}
                          placeholder="Enter price"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Product URL</label>
                        <Input
                          placeholder="https://..."
                          value={marketplace.product_url || ""}
                          onChange={(e) => handleMarketplaceChange(index, "product_url", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <Select
                          value={marketplace.status}
                          onValueChange={(value) => handleMarketplaceChange(index, "status", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        {stockValue === 0 && marketplace.status === "active" && (
                          <p className="text-xs text-amber-600 mt-1">
                            This listing will remain active despite zero stock because you manually set it.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Contact Person Form */}
                    <div className="mt-4 border-t pt-4">
                      <h3 className="text-sm font-medium mb-3">Marketplace Contacts</h3>
                      
                      {/* Contact Selector */}
                      <Select
                        onValueChange={(value) => handleAddContact(index, value)}
                      >
                        <SelectTrigger className="w-full mb-4">
                          <SelectValue placeholder="Add a contact" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select a contact to add</SelectItem>
                          {contacts[marketplace.name]?.map((contact) => (
                            <SelectItem
                              key={`${contact.id}`}
                              value={`${contact.contact_name}|${contact.email}`}
                            >
                              {contact.contact_name} ({contact.email})
                            </SelectItem>
                          ))}
                          {(!contacts[marketplace.name] || contacts[marketplace.name].length === 0) && (
                            <SelectItem value="none" disabled>
                              No contacts available for {marketplace.name}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      
                      {/* Contact List */}
                      {marketplace.contacts && marketplace.contacts.length > 0 ? (
                        <div className="space-y-3">
                          {marketplace.contacts.map((contact, contactIndex) => (
                            <div key={contactIndex} className="flex items-start justify-between p-3 bg-gray-50 rounded-md">
                              <div>
                                <div className="font-medium">{contact.name}</div>
                                <div className="text-sm text-gray-600">{contact.email}</div>
                                <div className="flex items-center mt-1">
                                  <Checkbox
                                    id={`notify-${index}-${contactIndex}`}
                                    checked={contact.notify_stock_changes || false}
                                    disabled={true}
                                    className="mr-2"
                                  />
                                  <label
                                    htmlFor={`notify-${index}-${contactIndex}`}
                                    className="text-xs text-gray-500"
                                  >
                                    Stock notifications {contact.notify_stock_changes ? 'enabled' : 'disabled'}
                                  </label>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleRemoveContact(index, contactIndex)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-3 text-sm text-gray-500 bg-gray-50 rounded-md">
                          No contacts added. Select a contact above.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {product.marketplaces.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No marketplaces added. Click "Add Marketplace" to start adding listings.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardFooter className="flex justify-end gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(createPageUrl("Dashboard"))}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  "Save Product"
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
}
