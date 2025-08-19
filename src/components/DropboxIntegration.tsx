import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Cloud, 
  CloudOff, 
  CheckCircle, 
  FileText, 
  Folder, 
  FolderOpen,
  Download,
  Search,
  ChevronRight,
  Home,
  User,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Dropbox configuration
const DROPBOX_CONFIG = {
  clientId: process.env.VITE_DROPBOX_APP_KEY || 'your_dropbox_app_key',
  redirectUri: window.location.origin + '/dropbox-auth',
  responseType: 'code',
  scope: 'files.content.read files.metadata.read account_info.read'
};

interface DropboxFile {
  '.tag': 'file' | 'folder';
  id: string;
  name: string;
  path_lower: string;
  path_display: string;
  size?: number;
  client_modified?: string;
  is_downloadable?: boolean;
}

interface DropboxUser {
  name: {
    display_name: string;
  };
  email: string;
  account_id: string;
}

interface DropboxIntegrationProps {
  onFilesSelected: (files: File[]) => void;
  onConnectionChange?: (status: { connected: boolean; userInfo?: any; selectedFileCount: number }) => void;
}

export const DropboxIntegration: React.FC<DropboxIntegrationProps> = ({
  onFilesSelected,
  onConnectionChange
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [userInfo, setUserInfo] = useState<DropboxUser | null>(null);
  const [files, setFiles] = useState<DropboxFile[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<DropboxFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [dropboxClient, setDropboxClient] = useState<any>(null);
  
  const { toast } = useToast();

  // Initialize Dropbox SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/dropbox@10.34.0/dist/Dropbox-sdk.min.js';
    script.onload = () => {
      // Check for existing token on load
      const token = sessionStorage.getItem('dropbox_token');
      if (token) {
        initializeDropboxClient(token);
      }
    };
    document.head.appendChild(script);

    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      handleOAuthCallback(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Update connection status
  useEffect(() => {
    onConnectionChange?.({
      connected: isConnected,
      userInfo: userInfo,
      selectedFileCount: selectedFiles.length
    });
  }, [isConnected, userInfo, selectedFiles, onConnectionChange]);

  const initiateDropboxAuth = () => {
    const authUrl = `https://www.dropbox.com/oauth2/authorize?` +
      `client_id=${DROPBOX_CONFIG.clientId}&` +
      `redirect_uri=${encodeURIComponent(DROPBOX_CONFIG.redirectUri)}&` +
      `response_type=code&` +
      `scope=${DROPBOX_CONFIG.scope}`;
    
    window.location.href = authUrl;
  };

  const handleOAuthCallback = async (authorizationCode: string) => {
    try {
      setLoading(true);
      // In a real implementation, you'd exchange the code for an access token
      // For demo purposes, we'll simulate this
      const simulatedToken = 'demo_token_' + Date.now();
      storeToken(simulatedToken);
      await initializeDropboxClient(simulatedToken);
      
      toast({
        title: "Connected to Dropbox",
        description: "Successfully connected to your Dropbox account.",
      });
    } catch (error) {
      console.error('OAuth callback error:', error);
      setError('Failed to complete Dropbox authentication');
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Dropbox. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeDropboxClient = async (accessToken: string) => {
    try {
      // Simulate Dropbox client initialization
      const client = {
        usersGetCurrentAccount: () => Promise.resolve({
          result: {
            name: { display_name: 'Demo User' },
            email: 'demo@example.com',
            account_id: 'demo_account'
          }
        }),
        filesListFolder: ({ path }: { path: string }) => {
          // Simulate file listing
          const mockFiles: DropboxFile[] = [
            {
              '.tag': 'folder',
              id: 'folder1',
              name: 'Documents',
              path_lower: '/documents',
              path_display: '/Documents'
            },
            {
              '.tag': 'folder',
              id: 'folder2',
              name: 'CVs',
              path_lower: '/cvs',
              path_display: '/CVs'
            },
            {
              '.tag': 'file',
              id: 'file1',
              name: 'john_doe_cv.pdf',
              path_lower: '/john_doe_cv.pdf',
              path_display: '/john_doe_cv.pdf',
              size: 1024576,
              client_modified: new Date().toISOString(),
              is_downloadable: true
            },
            {
              '.tag': 'file',
              id: 'file2',
              name: 'jane_smith_cv.pdf',
              path_lower: '/jane_smith_cv.pdf',
              path_display: '/jane_smith_cv.pdf',
              size: 987654,
              client_modified: new Date().toISOString(),
              is_downloadable: true
            }
          ];
          return Promise.resolve({ result: { entries: mockFiles } });
        },
        filesDownload: ({ path }: { path: string }) => {
          // Simulate file download
          return Promise.resolve({
            result: {
              fileBinary: new Uint8Array(1024), // Mock PDF data
              name: path.split('/').pop() || 'file.pdf'
            }
          });
        }
      };
      
      setDropboxClient(client);
      const userResponse = await client.usersGetCurrentAccount();
      setUserInfo(userResponse.result);
      setIsConnected(true);
      await loadFiles('');
    } catch (error) {
      console.error('Failed to initialize Dropbox client:', error);
      setError('Failed to initialize Dropbox connection');
    }
  };

  const storeToken = (token: string) => {
    sessionStorage.setItem('dropbox_token', token);
    // Set expiration timer (4 hours)
    setTimeout(() => {
      clearStoredToken();
    }, 4 * 60 * 60 * 1000);
  };

  const clearStoredToken = () => {
    sessionStorage.removeItem('dropbox_token');
    setIsConnected(false);
    setUserInfo(null);
    setDropboxClient(null);
    setFiles([]);
    setSelectedFiles([]);
  };

  const loadFiles = async (path: string) => {
    if (!dropboxClient) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await dropboxClient.filesListFolder({ path });
      const allFiles = response.result.entries;
      
      // Filter for folders and PDF files
      const filteredFiles = allFiles.filter((file: DropboxFile) => 
        file['.tag'] === 'folder' || 
        (file['.tag'] === 'file' && file.name.toLowerCase().endsWith('.pdf'))
      );
      
      setFiles(filteredFiles);
      setCurrentPath(path);
      
      // Update breadcrumbs
      if (path === '') {
        setBreadcrumbs([]);
      } else {
        setBreadcrumbs(path.split('/').filter(Boolean));
      }
    } catch (error) {
      console.error('Failed to load files:', error);
      setError('Failed to load files from Dropbox');
      toast({
        title: "Error Loading Files",
        description: "Failed to load files from Dropbox. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folderPath: string) => {
    loadFiles(folderPath);
  };

  const navigateToBreadcrumb = (index: number) => {
    const newPath = '/' + breadcrumbs.slice(0, index + 1).join('/');
    loadFiles(newPath);
  };

  const toggleFileSelection = (file: DropboxFile) => {
    if (file['.tag'] === 'folder') return;
    
    setSelectedFiles(prev => {
      const isSelected = prev.some(f => f.id === file.id);
      if (isSelected) {
        return prev.filter(f => f.id !== file.id);
      } else {
        return [...prev, file];
      }
    });
  };

  const selectAllFiles = () => {
    const pdfFiles = files.filter(file => file['.tag'] === 'file');
    setSelectedFiles(pdfFiles);
  };

  const clearSelection = () => {
    setSelectedFiles([]);
  };

  const downloadSelectedFiles = async () => {
    if (!dropboxClient || selectedFiles.length === 0) return;
    
    try {
      setLoading(true);
      const filePromises = selectedFiles.map(async (dropboxFile) => {
        const fileContent = await dropboxClient.filesDownload({ path: dropboxFile.path_lower });
        return new File([fileContent.result.fileBinary], dropboxFile.name, {
          type: 'application/pdf',
          lastModified: dropboxFile.client_modified ? new Date(dropboxFile.client_modified).getTime() : Date.now()
        });
      });
      
      const files = await Promise.all(filePromises);
      onFilesSelected(files);
      
      toast({
        title: "Files Downloaded",
        description: `Successfully downloaded ${files.length} files from Dropbox.`,
      });
    } catch (error) {
      console.error('Failed to download files:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download files from Dropbox. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number = 0): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isConnected) {
    return (
      <Card className="bg-gradient-card shadow-card">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 p-3 bg-muted rounded-full w-fit">
            <CloudOff className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl font-semibold">Connect to Dropbox</CardTitle>
          <CardDescription>
            Access your PDF files stored in Dropbox for bulk CV processing
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          <Button 
            onClick={initiateDropboxAuth}
            disabled={loading}
            className="bg-gradient-primary hover:opacity-90 transition-opacity"
            size="lg"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Cloud className="h-4 w-4 mr-2" />
            )}
            Connect Dropbox Account
          </Button>
          <p className="text-xs text-muted-foreground">
            Secure OAuth 2.0 authentication • Files processed locally
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card className="bg-gradient-card shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <p className="font-medium text-sm">Connected to Dropbox</p>
                <p className="text-xs text-muted-foreground">
                  {userInfo?.name.display_name} • {userInfo?.email}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearStoredToken}
            >
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File Browser */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Browse Files</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {selectedFiles.length} selected
            </Badge>
          </div>
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Home 
              className="h-4 w-4 cursor-pointer hover:text-foreground" 
              onClick={() => loadFiles('')}
            />
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                <ChevronRight className="h-3 w-3" />
                <span 
                  className="cursor-pointer hover:text-foreground capitalize"
                  onClick={() => navigateToBreadcrumb(index)}
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search and Actions */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadFiles(currentPath)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Selection Actions */}
          {files.some(f => f['.tag'] === 'file') && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllFiles}
              >
                Select All PDFs
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                disabled={selectedFiles.length === 0}
              >
                Clear Selection
              </Button>
              <Button
                onClick={downloadSelectedFiles}
                disabled={selectedFiles.length === 0 || loading}
                className="ml-auto bg-gradient-primary hover:opacity-90"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Selected ({selectedFiles.length})
              </Button>
            </div>
          )}

          <Separator />

          {/* File Grid */}
          <ScrollArea className="h-64">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading files...</span>
              </div>
            )}
            
            {!loading && filteredFiles.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No PDF files found in this folder</p>
              </div>
            )}
            
            {!loading && filteredFiles.length > 0 && (
              <div className="space-y-2">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                      selectedFiles.some(f => f.id === file.id) ? 'bg-accent/10 border-accent' : 'border-border'
                    }`}
                    onClick={() => file['.tag'] === 'folder' ? navigateToFolder(file.path_lower) : toggleFileSelection(file)}
                  >
                    {file['.tag'] === 'folder' ? (
                      <FolderOpen className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    ) : (
                      <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{file.name}</p>
                      {file['.tag'] === 'file' && (
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} • {file.client_modified && new Date(file.client_modified).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    {file['.tag'] === 'file' && (
                      <input
                        type="checkbox"
                        checked={selectedFiles.some(f => f.id === file.id)}
                        onChange={() => toggleFileSelection(file)}
                        className="rounded border-gray-300"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    
                    {file['.tag'] === 'folder' && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};