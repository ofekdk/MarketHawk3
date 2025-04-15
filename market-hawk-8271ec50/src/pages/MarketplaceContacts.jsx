import React, { useState, useEffect } from "react";
import { MarketplaceContact } from "@/api/entities";
import { SendEmail } from "@/api/integrations";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Mail, Phone, Search, Trash2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export default function MarketplaceContacts() {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [newContact, setNewContact] = useState({
    marketplace: "Amazon",
    contact_name: "",
    email: "",
    phone: "",
    notify_on_stock: true
  });
  const [contactToDelete, setContactToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    const data = await MarketplaceContact.list();
    setContacts(data);
    setIsLoading(false);
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    await MarketplaceContact.create(newContact);
    setNewContact({
      marketplace: "Amazon",
      contact_name: "",
      email: "",
      phone: "",
      notify_on_stock: true
    });
    loadContacts();
  };

  const handleToggleNotification = async (contact) => {
    await MarketplaceContact.update(contact.id, {
      ...contact,
      notify_on_stock: !contact.notify_on_stock
    });
    loadContacts();
  };

  const testNotification = async (contact) => {
    try {
      await SendEmail({
        to: contact.email,
        subject: "Test Notification - Marketplace Stock Alert",
        body: `Hello ${contact.contact_name},\n\nThis is a test notification from your marketplace stock alert system.\n\nBest regards,\nYour Marketplace Tracker`
      });
      alert("Test notification sent successfully!");
    } catch (error) {
      alert("Failed to send test notification");
    }
  };

  const deleteContact = async () => {
    if (!contactToDelete) return;
    
    try {
      await MarketplaceContact.delete(contactToDelete.id);
      loadContacts();
      setContactToDelete(null);
    } catch (error) {
      console.error("Error deleting contact:", error);
      alert("Failed to delete contact. Please try again.");
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      contact.marketplace.toLowerCase().includes(searchTermLower) ||
      contact.contact_name.toLowerCase().includes(searchTermLower) ||
      contact.email.toLowerCase().includes(searchTermLower) ||
      (contact.phone && contact.phone.toLowerCase().includes(searchTermLower))
    );
  });

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl("Dashboard"))}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add New Contact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddContact} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Marketplace</label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={newContact.marketplace}
                    onChange={(e) => setNewContact({...newContact, marketplace: e.target.value})}
                  >
                    {["Amazon", "eBay", "Walmart", "Etsy", "Shopify"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Contact Name</label>
                  <Input
                    value={newContact.contact_name}
                    onChange={(e) => setNewContact({...newContact, contact_name: e.target.value})}
                    placeholder="Enter contact name"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                    placeholder="Enter email"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone (Optional)</label>
                  <Input
                    value={newContact.phone}
                    onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newContact.notify_on_stock}
                    onCheckedChange={(checked) => setNewContact({...newContact, notify_on_stock: checked})}
                  />
                  <label className="text-sm font-medium">Notify on out of stock</label>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  Add Contact
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Marketplace Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search contacts, marketplaces..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Marketplace</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Notifications</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredContacts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                              {searchTerm ? "No contacts match your search" : "No contacts added yet"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredContacts.map((contact) => (
                            <TableRow key={contact.id}>
                              <TableCell>{contact.marketplace}</TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div>{contact.contact_name}</div>
                                  <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Mail className="w-3 h-3" /> {contact.email}
                                  </div>
                                  {contact.phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                      <Phone className="w-3 h-3" /> {contact.phone}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Switch
                                  checked={contact.notify_on_stock}
                                  onCheckedChange={() => handleToggleNotification(contact)}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => testNotification(contact)}
                                  >
                                    Test
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => setContactToDelete(contact)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!contactToDelete} onOpenChange={(isOpen) => !isOpen && setContactToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {contactToDelete?.contact_name} from your contacts list.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteContact} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}