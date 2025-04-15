import React from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Save, Filter } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ImagePresetManager({ presets, onApplyPreset, onDeletePreset, onSavePresetClick }) {
  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={onSavePresetClick}>
        <Save className="w-4 h-4 mr-2" />
        Save Current Settings
      </Button>
      
      <div className="text-sm font-medium text-gray-500 pt-2">Saved Presets</div>
      
      <ScrollArea className="h-[300px] pr-2">
        <div className="space-y-2">
          {presets.map((preset, index) => (
            <div 
              key={index} 
              className="border rounded-md p-3 hover:border-blue-300 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="font-medium">{preset.name}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeletePreset(preset.name)}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-xs text-gray-500 space-y-1">
                <div>Size: {preset.width}×{preset.height}px</div>
                <div>Format: {preset.format.toUpperCase()}</div>
                {preset.format === 'jpg' && (
                  <div>Quality: {preset.quality}%</div>
                )}
                <div>Padding: {preset.padding}px</div>
                <div>Mode: {preset.resizeMode}</div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => onApplyPreset(preset)}
              >
                <Filter className="w-3 h-3 mr-2" />
                Apply
              </Button>
            </div>
          ))}
          
          {presets.length === 0 && (
            <div className="text-center py-4 text-gray-500 text-sm">
              No saved presets yet
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}