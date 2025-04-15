import React from 'react';
import { Card } from "@/components/ui/card";
import { Image } from 'lucide-react';

export default function BatchImagePreview({ 
  imageUrl, 
  settings,
  isProcessed = false 
}) {
  const { width, height, padding, resizeMode } = settings;
  
  // Calculate the actual image area dimensions (target size minus padding)
  const innerWidth = width - (padding * 2);
  const innerHeight = height - (padding * 2);
  
  // Preview styles to simulate the final result
  const previewStyle = {
    width: '100%',
    height: '200px',
    position: 'relative',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '0.5rem',
    overflow: 'hidden'
  };
  
  const imageStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    maxWidth: `calc(100% - ${padding * 2}px)`,
    maxHeight: `calc(100% - ${padding * 2}px)`,
    objectFit: resizeMode,
    backgroundColor: '#fff'
  };
  
  if (!imageUrl) {
    return (
      <Card className="flex items-center justify-center h-[200px] bg-gray-50">
        <Image className="w-12 h-12 text-gray-400" />
      </Card>
    );
  }
  
  return (
    <div style={previewStyle}>
      <img 
        src={imageUrl} 
        alt="Preview" 
        style={imageStyle}
      />
      {/* Optional: Show padding guides */}
      {padding > 0 && !isProcessed && (
        <div 
          style={{
            position: 'absolute',
            top: padding,
            left: padding,
            right: padding,
            bottom: padding,
            border: '1px dashed #cbd5e0',
            pointerEvents: 'none'
          }}
        />
      )}
    </div>
  );
}