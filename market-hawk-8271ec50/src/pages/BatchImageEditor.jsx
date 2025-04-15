
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Save, FileImage, Trash2, Settings, CheckCircle, XCircle, Filter, Loader2, Package } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { UploadFile } from "@/api/integrations";
import ImagePresetManager from '../components/image-editor/ImagePresetManager';
import BatchImagePreview from '../components/image-editor/BatchImagePreview';

export default function BatchImageEditor() {
  // File states
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("upload");
  const fileInputRef = useRef(null);
  
  // Settings states
  const [settings, setSettings] = useState({
    width: 1200,
    height: 1200,
    padding: 0,
    format: "png",
    quality: 90,
    resizeMode: "contain", // contain, cover, or exact
    showWarnings: true,
  });
  
  // Processed image states
  const [processedImages, setProcessedImages] = useState([]);
  const [processingProgress, setProcessingProgress] = useState({});
  const [downloadReady, setDownloadReady] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  
  // Preset states
  const [presets, setPresets] = useState([
    { name: 'Amazon', width: 1200, height: 1200, padding: 0, format: 'jpg', quality: 90, resizeMode: 'contain' },
    { name: 'eBay', width: 1600, height: 1600, padding: 0, format: 'jpg', quality: 85, resizeMode: 'contain' },
    { name: 'Etsy', width: 2000, height: 2000, padding: 0, format: 'jpg', quality: 85, resizeMode: 'contain' },
  ]);
  const [savePresetDialog, setSavePresetDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  
  // Handle file drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };
  
  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };
  
  // Handle file input selection
  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };
  
  // Process file selection
  const handleFiles = (fileList) => {
    // Convert FileList to array and validate files
    const newFiles = Array.from(fileList).map(file => {
      // Check if file is an image
      if (!file.type.match('image.*')) {
        return {
          file,
          valid: false,
          preview: null,
          error: 'Not an image file'
        };
      }
      
      return {
        file,
        valid: true,
        preview: URL.createObjectURL(file),
        error: null
      };
    });
    
    setFiles(prev => [...prev, ...newFiles]);
    setActiveTab("settings");
  };
  
  // Handle file removal
  const handleRemoveFile = (index) => {
    setFiles(prev => {
      const newFiles = [...prev];
      // Revoke object URL to avoid memory leaks
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };
  
  // Update settings
  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Apply a preset
  const applyPreset = (preset) => {
    setSettings({
      width: preset.width,
      height: preset.height,
      padding: preset.padding,
      format: preset.format,
      quality: preset.quality,
      resizeMode: preset.resizeMode,
      showWarnings: settings.showWarnings
    });
  };
  
  // Save current settings as a preset
  const savePreset = () => {
    if (presetName.trim() === '') return;
    
    const newPreset = {
      name: presetName,
      width: settings.width,
      height: settings.height,
      padding: settings.padding,
      format: settings.format,
      quality: settings.quality,
      resizeMode: settings.resizeMode
    };
    
    setPresets(prev => {
      // If preset name already exists, replace it
      const exists = prev.findIndex(p => p.name === presetName);
      if (exists >= 0) {
        const newPresets = [...prev];
        newPresets[exists] = newPreset;
        return newPresets;
      }
      return [...prev, newPreset];
    });
    
    setSavePresetDialog(false);
    setPresetName('');
  };
  
  // Delete a preset
  const deletePreset = (presetName) => {
    setPresets(prev => prev.filter(p => p.name !== presetName));
  };
  
  const processImages = async () => {
    setProcessingFiles(true);
    setError(null);
    setProcessedImages([]);
    let successful = 0;
    
    try {
      const results = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.valid) continue;
        
        setProcessingProgress(prev => ({
          ...prev,
          [i]: 0
        }));
        
        try {
          // Create a new canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set canvas to final dimensions
          canvas.width = settings.width;
          canvas.height = settings.height;
          
          // Fill with white background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Load the image
          const img = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = file.preview;
          });
          
          // Calculate dimensions for the image within the padding
          const targetWidth = canvas.width - (settings.padding * 2);
          const targetHeight = canvas.height - (settings.padding * 2);
          
          // Calculate scaling based on resize mode
          let scale = 1;
          let scaledWidth = img.width;
          let scaledHeight = img.height;
          
          if (settings.resizeMode === 'contain') {
            scale = Math.min(
              targetWidth / img.width,
              targetHeight / img.height
            );
          } else if (settings.resizeMode === 'cover') {
            scale = Math.max(
              targetWidth / img.width,
              targetHeight / img.height
            );
          } else { // 'exact'
            scaledWidth = targetWidth;
            scaledHeight = targetHeight;
          }
          
          if (settings.resizeMode !== 'exact') {
            scaledWidth = img.width * scale;
            scaledHeight = img.height * scale;
          }
          
          // Warn about upscaling if necessary
          if (settings.showWarnings && (scaledWidth > img.width || scaledHeight > img.height)) {
            console.warn(`Upscaling detected for ${file.file.name}`);
          }
          
          // Calculate position to center the image
          const x = settings.padding + (targetWidth - scaledWidth) / 2;
          const y = settings.padding + (targetHeight - scaledHeight) / 2;
          
          // Draw the image
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
          
          // Convert to desired format
          const mimeType = settings.format === 'png' ? 'image/png' : 'image/jpeg';
          const quality = settings.format === 'png' ? undefined : settings.quality / 100;
          const dataUrl = canvas.toDataURL(mimeType, quality);
          
          // Upload processed image
          const blob = await (await fetch(dataUrl)).blob();
          const processedFile = new File([blob], `processed_${file.file.name}`, { type: mimeType });
          const { file_url } = await UploadFile({ file: processedFile });
          
          results.push({
            name: file.file.name,
            originalUrl: file.preview,
            processedUrl: file_url,
            success: true
          });
          
          successful++;
          setProcessingProgress(prev => ({
            ...prev,
            [i]: 100
          }));
          
        } catch (error) {
          console.error(`Error processing ${file.file.name}:`, error);
          results.push({
            name: file.file.name,
            originalUrl: file.preview,
            error: error.message,
            success: false
          });
          
          setProcessingProgress(prev => ({
            ...prev,
            [i]: 100
          }));
        }
      }
      
      setProcessedImages(results);
      if (successful > 0) {
        setDownloadReady(true);
        setActiveTab("results");
      }
      
    } catch (error) {
      console.error("Processing error:", error);
      setError("Failed to process images. Please try again.");
    } finally {
      setProcessingFiles(false);
    }
  };
  
  // Helper function to simulate processing time
  const simulateProcessing = async (fileName, start, end) => {
    const steps = 10;
    const increment = (end - start) / steps;
    
    for (let j = 0; j <= steps; j++) {
      const progress = Math.min(start + (j * increment), end);
      setProcessingProgress(prev => ({
        ...prev,
        [fileName]: {
          progress,
          status: 'processing'
        }
      }));
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };
  
  // Remove JSZip import and modify the download function to handle files individually
  const downloadAllAsZip = async () => {
    if (processedImages.length === 0) return;
    
    setZipProgress(0);
    
    try {
      // Create a temporary folder for downloads
      const timestamp = new Date().toISOString().slice(0, 10);
      
      // Download each file sequentially
      for (let i = 0; i < processedImages.length; i++) {
        const img = processedImages[i];
        const response = await fetch(img.processedUrl);
        const blob = await response.blob();
        
        let fileName = img.name;
        // Add file extension if it doesn't match the output format
        if (!fileName.toLowerCase().endsWith(`.${settings.format}`)) {
          const extension = fileName.lastIndexOf('.');
          if (extension !== -1) {
            fileName = fileName.substring(0, extension);
          }
          fileName = `${fileName}.${settings.format}`;
        }
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setZipProgress(Math.round(((i + 1) / processedImages.length) * 100));
        
        // Add a small delay between downloads to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setZipProgress(0);
    } catch (error) {
      console.error("Error downloading files:", error);
      setError("Failed to download files. Please try downloading images individually.");
    }
  };
  
  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
    };
  }, [files]);
  
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Batch Image Editor</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="upload" disabled={processingFiles}>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="settings" disabled={files.length === 0 || processingFiles}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="results" disabled={!downloadReady}>
              <Download className="w-4 h-4 mr-2" />
              Results
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload Images</CardTitle>
                <CardDescription>
                  Drag and drop image files or click to select files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className={`border-2 border-dashed rounded-lg p-10 text-center ${
                    dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                >
                  <FileImage className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 mb-4">
                    Drag and drop your image files here, or click to select files
                  </p>
                  <Button 
                    onClick={() => fileInputRef.current.click()}
                    variant="outline"
                  >
                    Select Files
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileInput}
                    style={{ display: 'none' }}
                  />
                </div>
              </CardContent>
              
              {files.length > 0 && (
                <CardFooter className="flex-col">
                  <div className="w-full flex justify-between items-center mb-4">
                    <h3 className="font-medium">Selected Images ({files.length})</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFiles([])}
                      className="text-red-500"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-[300px] w-full">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
                      {files.map((file, index) => (
                        <div 
                          key={index} 
                          className={`relative rounded-md overflow-hidden border ${
                            file.valid ? 'border-gray-200' : 'border-red-300 bg-red-50'
                          }`}
                        >
                          {file.valid ? (
                            <img 
                              src={file.preview} 
                              alt={file.file.name}
                              className="w-full h-40 object-cover"
                            />
                          ) : (
                            <div className="w-full h-40 flex items-center justify-center bg-red-50">
                              <XCircle className="w-10 h-10 text-red-400" />
                            </div>
                          )}
                          <div className="p-2 text-sm truncate">
                            {file.file.name.substring(0, 20)}
                            {file.file.name.length > 20 ? '...' : ''}
                          </div>
                          {file.error && (
                            <div className="p-1 text-xs text-red-600 bg-red-50">
                              {file.error}
                            </div>
                          )}
                          <button 
                            className="absolute top-1 right-1 bg-gray-800 bg-opacity-70 rounded-full p-1 text-white"
                            onClick={() => handleRemoveFile(index)}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardFooter>
              )}
            </Card>
          </TabsContent>
          
          <TabsContent value="settings">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Image Settings</CardTitle>
                    <CardDescription>
                      Configure output settings for all images
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="width">Width (px)</Label>
                          <Input
                            id="width"
                            type="number"
                            value={settings.width}
                            onChange={(e) => handleSettingChange('width', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="height">Height (px)</Label>
                          <Input
                            id="height"
                            type="number"
                            value={settings.height}
                            onChange={(e) => handleSettingChange('height', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="padding">Padding (px)</Label>
                          <Input
                            id="padding"
                            type="number"
                            value={settings.padding}
                            onChange={(e) => handleSettingChange('padding', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="format">Output Format</Label>
                          <Select
                            value={settings.format}
                            onValueChange={(value) => handleSettingChange('format', value)}
                          >
                            <SelectTrigger id="format">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="png">PNG (Lossless)</SelectItem>
                              <SelectItem value="jpg">JPG (Compressed)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {settings.format === 'jpg' && (
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label htmlFor="quality">JPEG Quality: {settings.quality}%</Label>
                            </div>
                            <Slider
                              id="quality"
                              min={10}
                              max={100}
                              step={5}
                              value={[settings.quality]}
                              onValueChange={(value) => handleSettingChange('quality', value[0])}
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Smaller file</span>
                              <span>Higher quality</span>
                            </div>
                          </div>
                        )}
                        
                        <div>
                          <Label htmlFor="resizeMode">Resize Mode</Label>
                          <Select
                            value={settings.resizeMode}
                            onValueChange={(value) => handleSettingChange('resizeMode', value)}
                          >
                            <SelectTrigger id="resizeMode">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="contain">Contain (Letterbox)</SelectItem>
                              <SelectItem value="cover">Cover (Crop)</SelectItem>
                              <SelectItem value="exact">Exact (Stretch)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex items-center space-x-2 pt-2">
                          <Switch
                            id="showWarnings"
                            checked={settings.showWarnings}
                            onCheckedChange={(checked) => handleSettingChange('showWarnings', checked)}
                          />
                          <Label htmlFor="showWarnings">Show upscaling warnings</Label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('upload')}
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={processImages} 
                      disabled={processingFiles || files.filter(f => f.valid).length === 0}
                    >
                      {processingFiles ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Process {files.filter(f => f.valid).length} Images
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
              
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Presets</CardTitle>
                    <CardDescription>Load and save setting presets</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ImagePresetManager
                      presets={presets}
                      onApplyPreset={applyPreset}
                      onDeletePreset={deletePreset}
                      onSavePresetClick={() => setSavePresetDialog(true)}
                    />
                  </CardContent>
                </Card>
                
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Preview</CardTitle>
                    <CardDescription>How images will be processed</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BatchImagePreview
                      file={files.find(f => f.valid)?.preview}
                      settings={settings}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="results">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Processed Images</CardTitle>
                  
                  <Button onClick={downloadAllAsZip} disabled={zipProgress > 0 || processedImages.length === 0}>
                    {zipProgress > 0 ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Downloading ({zipProgress}%)
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download All
                      </>
                    )}
                  </Button>
                </div>
                <CardDescription>
                  {processedImages.length} images processed. Click on an image to download.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <ScrollArea className="h-[600px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {processedImages.map((image, index) => (
                      <Card key={index} className="overflow-hidden">
                        <div className="aspect-square bg-gray-100 relative overflow-hidden">
                          <div className="grid grid-cols-2 h-full">
                            <div className="border-r border-dashed border-gray-300 p-2">
                              <div className="text-xs font-medium mb-1 text-gray-500">Original</div>
                              <div className="h-[calc(100%-20px)] relative">
                                <img
                                  src={image.originalUrl}
                                  alt="Original"
                                  className="absolute inset-0 w-full h-full object-contain"
                                />
                              </div>
                            </div>
                            <div className="p-2">
                              <div className="text-xs font-medium mb-1 text-gray-500">Processed</div>
                              <div className="h-[calc(100%-20px)] relative">
                                <img
                                  src={image.processedUrl}
                                  alt="Processed"
                                  className="absolute inset-0 w-full h-full object-contain"
                                />
                              </div>
                            </div>
                          </div>
                          <a
                            href={image.processedUrl}
                            download={image.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity flex items-center justify-center opacity-0 hover:opacity-100"
                          >
                            <Button className="z-10">
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </a>
                        </div>
                        <CardFooter className="flex flex-col items-start p-4">
                          <h3 className="font-medium text-sm truncate w-full">{image.name}</h3>
                          {image.success && (
                            <div className="text-xs text-gray-500 w-full">
                              <div className="flex justify-between mt-1">
                                <span>Format:</span>
                                <span>{settings.format?.toUpperCase()} {settings.format === 'jpg' ? `(${settings.quality}%)` : ''}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Dimensions:</span>
                                <span>{settings.width}×{settings.height}px</span>
                              </div>
                              {settings.padding > 0 && (
                                <div className="flex justify-between">
                                  <span>Padding:</span>
                                  <span>{settings.padding}px</span>
                                </div>
                              )}
                            </div>
                          )}
                          {!image.success && (
                            <div className="text-xs text-red-500 mt-1">
                              {image.error || 'Processing failed'}
                            </div>
                          )}
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Save preset dialog */}
      <Dialog open={savePresetDialog} onOpenChange={setSavePresetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Preset</DialogTitle>
            <DialogDescription>
              Save current settings as a preset for future use
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="presetName">Preset Name</Label>
            <Input
              id="presetName"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="My Custom Preset"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSavePresetDialog(false)}>
              Cancel
            </Button>
            <Button onClick={savePreset} disabled={presetName.trim() === ''}>
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
