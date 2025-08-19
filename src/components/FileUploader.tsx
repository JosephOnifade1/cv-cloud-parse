import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, File, X, Trash2, Cloud, HardDrive } from 'lucide-react';
import { DropboxIntegration } from './DropboxIntegration';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  files: File[];
  onConnectionChange?: (status: { connected: boolean; userInfo?: any; selectedFileCount: number }) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelected, files, onConnectionChange }) => {
  const [activeTab, setActiveTab] = useState('local');
  
  const handleLocalFilesSelected = (newFiles: File[]) => {
    onFilesSelected([...files, ...newFiles]);
  };

  const handleDropboxFilesSelected = (dropboxFiles: File[]) => {
    onFilesSelected([...files, ...dropboxFiles]);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
    handleLocalFilesSelected(pdfFiles);
  }, [files, onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesSelected(newFiles);
  };

  const clearAll = () => {
    onFilesSelected([]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* File Source Selector */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">File Source</CardTitle>
          <CardDescription>
            Choose where to upload your PDF files from
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="local" className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Local Upload
              </TabsTrigger>
              <TabsTrigger value="dropbox" className="flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                Dropbox
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="local" className="mt-4">
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200",
                  isDragActive 
                    ? "border-primary bg-primary/5 scale-[1.02]" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {isDragActive ? 'Drop files here' : 'Upload PDF Files'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {isDragActive
                    ? 'Release to upload files'
                    : 'Drag and drop PDF files here, or click to select files'}
                </p>
                <Button variant="outline" type="button">
                  Browse Files
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="dropbox" className="mt-4">
              <DropboxIntegration 
                onFilesSelected={handleDropboxFilesSelected}
                onConnectionChange={onConnectionChange}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Selected Files</CardTitle>
              <CardDescription>
                {files.length} PDF file{files.length !== 1 ? 's' : ''} ready for processing
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={clearAll}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-md bg-primary/10">
                      <File className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      PDF
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Total size: {formatFileSize(files.reduce((total, file) => total + file.size, 0))}
                </span>
                <span className="font-medium">
                  {files.length} file{files.length !== 1 ? 's' : ''} selected
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};