import React, { useState } from "react";
import { OrderTemplate } from "@/api/entities";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Trash2, Save, ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Helper function to generate column letters (A-ZZ)
const generateColumnLetters = () => {
    const letters = [];
    // Add single letters (A-Z)
    for (let i = 65; i <= 90; i++) {
        letters.push(String.fromCharCode(i));
    }
    // Add double letters (AA-ZZ)
    for (let i = 65; i <= 90; i++) {
        for (let j = 65; j <= 90; j++) {
            letters.push(String.fromCharCode(i) + String.fromCharCode(j));
        }
    }
    return letters;
};

export default function OrderTemplateModal({ open, onOpenChange, templates, onTemplatesUpdate }) {
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [error, setError] = useState(null);
    const columnLetters = generateColumnLetters();

    const initialTemplate = {
        marketplace: "",
        column_mappings: {
            order_number: "",
            product_sku: "",
            product_description: "",
            price: "",
            quantity: "",
            date: "",
            buyer_location: "",
            order_status: ""
        }
    };

    const handleEdit = (template) => {
        setEditingTemplate(template);
    };

    const handleAdd = () => {
        setEditingTemplate({ ...initialTemplate });
    };

    const handleDelete = async (templateId) => {
        try {
            await OrderTemplate.delete(templateId);
            onTemplatesUpdate();
        } catch (error) {
            setError("Failed to delete template");
        }
    };

    const handleSave = async () => {
        try {
            if (editingTemplate.id) {
                await OrderTemplate.update(editingTemplate.id, editingTemplate);
            } else {
                await OrderTemplate.create(editingTemplate);
            }
            setEditingTemplate(null);
            onTemplatesUpdate();
        } catch (error) {
            setError("Failed to save template");
        }
    };

    const updateMapping = (field, value) => {
        setEditingTemplate(prev => ({
            ...prev,
            column_mappings: {
                ...prev.column_mappings,
                [field]: value
            }
        }));
    };

    const columnMappingFields = [
        { key: "order_number", label: "Order Number" },
        { key: "product_sku", label: "Product SKU" },
        { key: "product_description", label: "Product Description" },
        { key: "price", label: "Price" },
        { key: "quantity", label: "Quantity" },
        { key: "date", label: "Date" },
        { key: "buyer_location", label: "Buyer Location" },
        { key: "order_status", label: "Order Status" }
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Manage Order Templates</DialogTitle>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-4">
                    {!editingTemplate ? (
                        <>
                            <Button onClick={handleAdd}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Template
                            </Button>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Marketplace</TableHead>
                                        <TableHead>Order Number Column</TableHead>
                                        <TableHead>SKU Column</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {templates.map((template) => (
                                        <TableRow key={template.id}>
                                            <TableCell>{template.marketplace}</TableCell>
                                            <TableCell>{template.column_mappings.order_number}</TableCell>
                                            <TableCell>{template.column_mappings.product_sku}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(template)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDelete(template.id)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    Marketplace
                                </label>
                                <Select
                                    value={editingTemplate.marketplace}
                                    onValueChange={(value) => 
                                        setEditingTemplate(prev => ({ ...prev, marketplace: value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select marketplace" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Amazon">Amazon</SelectItem>
                                        <SelectItem value="eBay">eBay</SelectItem>
                                        <SelectItem value="Walmart">Walmart</SelectItem>
                                        <SelectItem value="Etsy">Etsy</SelectItem>
                                        <SelectItem value="Shopify">Shopify</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-medium text-sm">Column Mappings</h3>
                                <p className="text-xs text-gray-500">
                                    Enter column letters (A, B, C, ...) for each field in your order spreadsheet
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {columnMappingFields.map(({ key, label }) => (
                                        <div key={key} className="space-y-1">
                                            <label className="text-sm font-medium block">
                                                {label}
                                            </label>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder={`Column letter (e.g., A, B, AA)`}
                                                    value={editingTemplate.column_mappings[key]}
                                                    onChange={(e) => updateMapping(key, e.target.value.toUpperCase())}
                                                    className="uppercase"
                                                />
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" size="icon">
                                                            <ChevronDown className="h-4 w-4" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="p-0 w-48 h-[300px] overflow-y-auto">
                                                        <div className="p-1">
                                                            <button
                                                                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100"
                                                                onClick={() => updateMapping(key, "")}
                                                            >
                                                                Not Used
                                                            </button>
                                                            <div className="my-1 border-t"></div>
                                                            <div className="grid grid-cols-5 gap-1">
                                                                {columnLetters.slice(0, 100).map(letter => (
                                                                    <button
                                                                        key={letter}
                                                                        className="text-center px-2 py-1.5 text-sm rounded hover:bg-gray-100"
                                                                        onClick={() => {
                                                                            updateMapping(key, letter);
                                                                        }}
                                                                    >
                                                                        {letter}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setEditingTemplate(null)}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleSave}>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Template
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}