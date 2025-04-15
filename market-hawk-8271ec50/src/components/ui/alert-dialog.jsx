import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// A simpler AlertDialog component that doesn't rely on Radix UI
const AlertDialog = React.forwardRef(({ children, open, onOpenChange, ...props }, ref) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} {...props} ref={ref}>
      {children}
    </Dialog>
  );
});
AlertDialog.displayName = "AlertDialog";

const AlertDialogContent = React.forwardRef(({ children, ...props }, ref) => {
  return <DialogContent {...props} ref={ref}>{children}</DialogContent>;
});
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogHeader = ({ children, ...props }) => {
  return <DialogHeader {...props}>{children}</DialogHeader>;
};
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({ children, ...props }) => {
  return <DialogFooter {...props}>{children}</DialogFooter>;
};
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef(({ children, ...props }, ref) => {
  return <DialogTitle {...props} ref={ref}>{children}</DialogTitle>;
});
AlertDialogTitle.displayName = "AlertDialogTitle";

const AlertDialogDescription = React.forwardRef(({ children, className, ...props }, ref) => {
  return (
    <div 
      className={`text-sm text-gray-500 my-2 ${className || ""}`} 
      {...props} 
      ref={ref}
    >
      {children}
    </div>
  );
});
AlertDialogDescription.displayName = "AlertDialogDescription";

const AlertDialogAction = React.forwardRef(({ children, className, ...props }, ref) => {
  return (
    <Button
      className={className || ""}
      {...props}
      ref={ref}
    >
      {children}
    </Button>
  );
});
AlertDialogAction.displayName = "AlertDialogAction";

const AlertDialogCancel = React.forwardRef(({ children, className, ...props }, ref) => {
  return (
    <Button
      variant="outline"
      className={`mt-2 sm:mt-0 ${className || ""}`}
      {...props}
      ref={ref}
    >
      {children}
    </Button>
  );
});
AlertDialogCancel.displayName = "AlertDialogCancel";

export {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};

export default AlertDialog;