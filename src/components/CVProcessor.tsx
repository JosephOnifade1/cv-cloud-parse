import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUploader } from './FileUploader';
import { ExtractedDataDisplay } from './ExtractedDataDisplay';
import { ProcessingStats } from './ProcessingStats';
import { ExtractionSettings } from './ExtractionSettings';
import { ProcessingLog } from './ProcessingLog';
import { Upload, FileText, Download, Settings, Activity } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker with synchronous fallback handling
let isWorkerSetup = false;
let workerSetupPromise: Promise<void> | null = null;

const setupPDFWorker = () => {
  if (typeof window === 'undefined') return Promise.resolve();
  if (workerSetupPromise) return workerSetupPromise;

  workerSetupPromise = (async () => {
    const workerUrls = [
      `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.js`,
      `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.js`,
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`,
      '/pdf.worker.js'
    ];

    let workerConfigured = false;

    // Try each worker URL with timeout
    for (const url of workerUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        const response = await fetch(url, { 
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = url;
          workerConfigured = true;
          console.log(`PDF.js worker configured with: ${url}`);
          break;
        }
      } catch (error) {
        console.warn(`Failed to load worker from ${url}:`, error);
      }
    }

    // If no worker URL works, configure for worker-less mode
    if (!workerConfigured) {
      console.warn('All worker URLs failed, configuring worker-less mode');
      pdfjsLib.GlobalWorkerOptions.workerSrc = null;
      // @ts-ignore - disableWorker is not in types but exists
      pdfjsLib.disableWorker = true;
    }

    isWorkerSetup = true;
  })();

  return workerSetupPromise;
};

// Initialize worker setup
setupPDFWorker();

interface ExtractedData {
  filename: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;
  currentRole?: string;
  skills?: string[];
  education?: string;
  experience?: string;
  about?: string;
  languages?: string[];
  status: 'success' | 'error' | 'processing';
  errorMessage?: string;
}

interface ProcessingStats {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentFile?: string;
}

export const CVProcessor: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<ProcessingStats>({ total: 0, processed: 0, successful: 0, failed: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const [dropboxConnection, setDropboxConnection] = useState<{
    connected: boolean;
    userInfo?: any;
    selectedFileCount: number;
  }>({ connected: false, selectedFileCount: 0 });
  const [extractionSettings, setExtractionSettings] = useState({
    extractName: true,
    extractEmail: true,
    extractPhone: true,
    extractLocation: true,
    extractRole: true,
    extractSkills: true,
    extractEducation: true,
    extractExperience: true,
    extractAbout: true,
    extractLanguages: true,
  });

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    setFiles(selectedFiles);
    addLog(`Selected ${selectedFiles.length} files for processing`);
  }, [addLog]);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    // Ensure worker is set up before processing
    await setupPDFWorker();

    return new Promise((resolve, reject) => {
      // Set up timeout for the entire operation
      const timeoutId = setTimeout(() => {
        reject(new Error('PDF processing timeout - file may be too large or corrupted'));
      }, 30000); // 30 second timeout

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
          
          let pdf;
          const loadingTask = pdfjsLib.getDocument({
            data: typedarray,
            useWorkerFetch: false,
            isEvalSupported: false,
            disableAutoFetch: true,
            disableStream: true,
            disableRange: true,
            stopAtErrors: false,
            maxImageSize: 1024 * 1024, // 1MB max image size
            cMapPacked: true,
            verbosity: 0 // Reduce console spam
          });

          // Add timeout to PDF loading
          const loadTimeout = setTimeout(() => {
            loadingTask.destroy();
            reject(new Error('PDF loading timeout'));
          }, 15000);

          try {
            pdf = await loadingTask.promise;
            clearTimeout(loadTimeout);
          } catch (loadError) {
            clearTimeout(loadTimeout);
            console.error('PDF loading failed:', loadError);
            throw new Error(`Failed to load PDF: ${loadError instanceof Error ? loadError.message : 'Unknown error'}`);
          }

          let fullText = '';
          const maxPages = Math.min(pdf.numPages, 20); // Limit to 20 pages for performance
          
          // Extract text from each page with individual timeouts
          for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            try {
              const pageTimeout = setTimeout(() => {
                throw new Error(`Page ${pageNum} processing timeout`);
              }, 5000);

              const page = await pdf.getPage(pageNum);
              const textContent = await page.getTextContent();
              clearTimeout(pageTimeout);
              
              // Combine text items from the page with proper spacing
              const pageText = textContent.items
                .map((item: any) => {
                  if (item.str && typeof item.str === 'string') {
                    return item.str;
                  }
                  return '';
                })
                .filter(str => str.trim().length > 0)
                .join(' ');
              
              fullText += pageText + '\n';

              // Clean up page resources
              page.cleanup();
            } catch (pageError) {
              console.warn(`Failed to extract text from page ${pageNum}:`, pageError);
              // Continue with other pages
            }
          }

          // Clean up PDF resources
          pdf.cleanup();
          
          clearTimeout(timeoutId);
          
          if (fullText.trim().length === 0) {
            reject(new Error('No text content found in PDF. The file might be an image-based PDF or corrupted.'));
          } else {
            resolve(fullText.trim());
          }
          
        } catch (error) {
          clearTimeout(timeoutId);
          console.error('PDF extraction error:', error);
          reject(new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      
      reader.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  const extractDataFromText = (text: string, filename: string): ExtractedData => {
    const data: ExtractedData = {
      filename,
      status: 'success'
    };

    try {
      // Extract name - improved patterns for real CVs
      if (extractionSettings.extractName) {
        const namePatterns = [
          /^([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*\s+[A-Z][a-z]+)/m, // First line name
          /Name:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*\s+[A-Z][a-z]+)/i, // Name: label
          /([A-Z][A-Z\s]+)(?=\s*[\n\r])/m, // All caps name
        ];
        
        for (const pattern of namePatterns) {
          const nameMatch = text.match(pattern);
          if (nameMatch) {
            const fullName = nameMatch[1].replace(/\s+/g, ' ').trim();
            const nameParts = fullName.split(' ');
            data.firstName = nameParts[0];
            data.lastName = nameParts.slice(1).join(' ');
            break;
          }
        }
      }

      // Extract email - improved pattern
      if (extractionSettings.extractEmail) {
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          data.email = emailMatch[0];
        }
      }

      // Extract phone - improved patterns for various formats
      if (extractionSettings.extractPhone) {
        const phonePatterns = [
          /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/,
          /(?:\+[0-9]{1,3}[-.\s]?)?(?:\([0-9]{1,4}\)[-.\s]?)?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}/,
        ];
        
        for (const pattern of phonePatterns) {
          const phoneMatch = text.match(pattern);
          if (phoneMatch) {
            data.phone = phoneMatch[0];
            break;
          }
        }
      }

      // Extract location - improved patterns for various formats
      if (extractionSettings.extractLocation) {
        const locationPatterns = [
          /([A-Z][a-z]+,?\s+[A-Z]{2,3}(?:\s+[0-9]{5})?)/g, // City, State ZIP
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g, // City, Country
          /Location:?\s*([A-Z][a-z]+(?:[\s,]+[A-Z][a-z]+)*)/i, // Location: label
        ];
        
        for (const pattern of locationPatterns) {
          const locationMatch = text.match(pattern);
          if (locationMatch) {
            data.location = locationMatch[1] || locationMatch[0];
            break;
          }
        }
      }

      // Extract current role - expanded role patterns
      if (extractionSettings.extractRole) {
        const rolePatterns = [
          /(Senior|Lead|Principal|Staff)?\s*(Software|Web|Mobile|Frontend|Backend|Full[- ]?Stack|DevOps|Data|Machine Learning|AI)?\s*(Engineer|Developer|Programmer|Architect|Scientist)/i,
          /(Project|Product|Engineering|Technical|Program)?\s*Manager/i,
          /(Business|Data|Systems|Financial|Research)?\s*Analyst/i,
          /(UX|UI|Graphic|Web|Product)?\s*Designer/i,
          /(IT|Technical|Management|Strategy|Marketing|Sales)?\s*Consultant/i,
          /(Chief|Head)\s+of\s+[A-Z][a-z]+/i,
          /Director\s+of\s+[A-Z][a-z]+/i,
        ];
        
        for (const pattern of rolePatterns) {
          const roleMatch = text.match(pattern);
          if (roleMatch) {
            data.currentRole = roleMatch[0].trim();
            break;
          }
        }
      }

      // Extract skills - improved pattern matching
      if (extractionSettings.extractSkills) {
        const skillsPatterns = [
          /(?:SKILLS|TECHNICAL\s+SKILLS|CORE\s+COMPETENCIES|TECHNOLOGIES|PROGRAMMING\s+LANGUAGES)[:\s]*\n?(.*?)(?=\n\s*[A-Z\s]{2,}[:\n]|$)/is,
          /Skills[:\s]+(.*?)(?=\n\s*[A-Z][a-z]*[:\s]|$)/is,
        ];
        
        for (const pattern of skillsPatterns) {
          const skillsSection = text.match(pattern);
          if (skillsSection) {
            const skills = skillsSection[1]
              .split(/[,\n•·]/)
              .map(skill => skill.replace(/[-•·]/g, '').trim())
              .filter(skill => skill.length > 1 && !skill.match(/^\d+$/))
              .slice(0, 20); // Limit to reasonable number
            if (skills.length > 0) {
              data.skills = skills;
              break;
            }
          }
        }
      }

      // Extract education - improved patterns
      if (extractionSettings.extractEducation) {
        const educationPatterns = [
          /(?:EDUCATION|ACADEMIC\s+BACKGROUND|QUALIFICATIONS)[:\s]*\n?(.*?)(?=\n\s*[A-Z\s]{2,}[:\n]|$)/is,
          /(Bachelor|Master|PhD|Doctorate|Associate|Certificate)[^.\n]*(?:University|College|Institute|School)[^.\n]*/gi,
          /(B\.?S\.?|M\.?S\.?|Ph\.?D\.?|MBA)[^.\n]*(?:in\s+)?[A-Z][a-z\s]*/gi,
        ];
        
        for (const pattern of educationPatterns) {
          const educationMatch = text.match(pattern);
          if (educationMatch) {
            // Handle global flag patterns that return arrays
            if (pattern.global && Array.isArray(educationMatch)) {
              data.education = educationMatch.join('; ');
            } else {
              // Handle single match patterns
              const match = educationMatch as RegExpMatchArray;
              data.education = match[1] ? match[1].trim() : match[0].trim();
            }
            if (data.education && data.education.length > 5) break;
          }
        }
      }

      // Extract experience - improved patterns
      if (extractionSettings.extractExperience) {
        const experiencePatterns = [
          /(?:WORK\s+EXPERIENCE|PROFESSIONAL\s+EXPERIENCE|EXPERIENCE|EMPLOYMENT\s+HISTORY)[:\s]*\n?(.*?)(?=\n\s*[A-Z\s]{2,}[:\n]|$)/is,
          /Experience[:\s]+(.*?)(?=\n\s*[A-Z][a-z]*[:\s]|$)/is,
        ];
        
        for (const pattern of experiencePatterns) {
          const experienceMatch = text.match(pattern);
          if (experienceMatch) {
            const experience = experienceMatch[1].trim().substring(0, 500); // Limit length
            if (experience && experience.length > 10) {
              data.experience = experience;
              break;
            }
          }
        }
      }

      // Extract about/summary - improved patterns
      if (extractionSettings.extractAbout) {
        const aboutPatterns = [
          /(?:ABOUT|SUMMARY|PROFILE|OBJECTIVE|PROFESSIONAL\s+SUMMARY|CAREER\s+SUMMARY)[:\s]*\n?(.*?)(?=\n\s*[A-Z\s]{2,}[:\n]|$)/is,
          /Summary[:\s]+(.*?)(?=\n\s*[A-Z][a-z]*[:\s]|$)/is,
        ];
        
        for (const pattern of aboutPatterns) {
          const aboutMatch = text.match(pattern);
          if (aboutMatch) {
            const about = aboutMatch[1].trim().substring(0, 300); // Limit length
            if (about && about.length > 10) {
              data.about = about;
              break;
            }
          }
        }
      }

      // Extract languages - improved patterns
      if (extractionSettings.extractLanguages) {
        const languagePatterns = [
          /(?:LANGUAGES|LANGUAGE\s+SKILLS)[:\s]*\n?(.*?)(?=\n\s*[A-Z\s]{2,}[:\n]|$)/is,
          /Languages[:\s]+(.*?)(?=\n\s*[A-Z][a-z]*[:\s]|$)/is,
        ];
        
        for (const pattern of languagePatterns) {
          const languagesMatch = text.match(pattern);
          if (languagesMatch) {
            const languages = languagesMatch[1]
              .split(/[,\n•·]/)
              .map(lang => lang.replace(/[-•·]/g, '').replace(/\([^)]*\)/g, '').trim())
              .filter(lang => lang.length > 1)
              .slice(0, 10); // Limit to reasonable number
            if (languages.length > 0) {
              data.languages = languages;
              break;
            }
          }
        }
      }

    } catch (error) {
      data.status = 'error';
      data.errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    }

    return data;
  };

  const processFiles = async () => {
    if (files.length === 0) return;

    // Pre-flight check: ensure worker is ready
    try {
      await setupPDFWorker();
      addLog('PDF.js worker initialized successfully');
    } catch (error) {
      addLog('Warning: PDF.js worker setup failed, continuing with worker-less mode');
    }

    setIsProcessing(true);
    setExtractedData([]);
    setStats({ total: files.length, processed: 0, successful: 0, failed: 0 });
    addLog(`Starting processing of ${files.length} files`);

    const results: ExtractedData[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setStats(prev => ({ ...prev, currentFile: file.name }));
      addLog(`Processing file ${i + 1}/${files.length}: ${file.name}`);

      try {
        // Add per-file timeout wrapper
        const fileProcessingPromise = (async () => {
          const text = await extractTextFromPDF(file);
          
          if (!text || text.trim().length === 0) {
            throw new Error('No text content extracted from PDF');
          }
          
          const extractedData = extractDataFromText(text, file.name);
          
          // Validate that at least some data was extracted
          const hasData = extractedData.firstName || extractedData.email || 
                         extractedData.phone || extractedData.skills?.length;
          
          if (!hasData) {
            extractedData.status = 'error';
            extractedData.errorMessage = 'No recognizable CV data found in the PDF';
          }
          
          return extractedData;
        })();

        // Add 45-second timeout per file
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('File processing timeout (45s)')), 45000);
        });

        const extractedData = await Promise.race([fileProcessingPromise, timeoutPromise]);
        results.push(extractedData);

        setStats(prev => ({
          ...prev,
          processed: i + 1,
          successful: prev.successful + (extractedData.status === 'success' ? 1 : 0),
          failed: prev.failed + (extractedData.status === 'error' ? 1 : 0)
        }));

        if (extractedData.status === 'success') {
          addLog(`✓ Successfully processed: ${file.name}`);
        } else {
          addLog(`⚠ Processed with warnings: ${file.name} - ${extractedData.errorMessage}`);
        }
      } catch (error) {
        const errorData: ExtractedData = {
          filename: file.name,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        };
        results.push(errorData);

        setStats(prev => ({
          ...prev,
          processed: i + 1,
          failed: prev.failed + 1
        }));

        addLog(`✗ Failed to process: ${file.name} - ${errorData.errorMessage}`);
      }

      // Update results after each file for real-time feedback
      setExtractedData([...results]);

      // Small delay between files to prevent overwhelming the browser
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setStats(prev => ({ ...prev, currentFile: undefined }));
    setIsProcessing(false);
    
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;
    addLog(`Processing completed. ${successful} successful, ${failed} failed.`);
  };

  const exportToCSV = () => {
    if (extractedData.length === 0) return;

    const headers = [
      'filename', 'firstName', 'lastName', 'email', 'phone', 'location',
      'currentRole', 'skills', 'education', 'experience', 'about', 'languages', 'status'
    ];

    const csvContent = [
      headers.join(','),
      ...extractedData.map(data => [
        data.filename,
        data.firstName || '',
        data.lastName || '',
        data.email || '',
        data.phone || '',
        data.location || '',
        data.currentRole || '',
        data.skills?.join('; ') || '',
        data.education || '',
        data.experience || '',
        data.about || '',
        data.languages?.join('; ') || '',
        data.status
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cv_extraction_results_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addLog(`Exported ${extractedData.length} records to CSV`);
  };

  const progress = stats.total > 0 ? (stats.processed / stats.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-secondary/20">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-primary">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              CV Cloud Parser
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional CV processing tool that extracts LinkedIn-style profile data from PDF resumes with advanced text analysis.
          </p>
        </div>

        {/* Stats Overview */}
        <ProcessingStats stats={stats} isProcessing={isProcessing} />

        {/* Main Content */}
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-card shadow-card">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <FileUploader 
              onFilesSelected={handleFilesSelected} 
              files={files} 
              onConnectionChange={setDropboxConnection}
            />
            
            {files.length > 0 && (
              <Card className="bg-gradient-card shadow-lg border-0">
                <CardHeader>
                  <CardTitle>Process Files</CardTitle>
                  <CardDescription>
                    Ready to process {files.length} PDF files
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Processing: {stats.currentFile || 'Initializing...'}</span>
                        <span>{stats.processed} / {stats.total}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <Button 
                      onClick={processFiles} 
                      disabled={isProcessing}
                      variant="gradient"
                      size="lg"
                      className="flex-1"
                    >
                      {isProcessing ? 'Processing...' : 'Start Processing'}
                    </Button>
                    
                    {extractedData.length > 0 && (
                      <Button 
                        onClick={exportToCSV}
                        variant="outline"
                        size="lg"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <ExtractionSettings 
              settings={extractionSettings}
              onSettingsChange={setExtractionSettings}
            />
          </TabsContent>

          <TabsContent value="results">
            <ExtractedDataDisplay data={extractedData} />
          </TabsContent>

          <TabsContent value="logs">
            <ProcessingLog logs={logs} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};