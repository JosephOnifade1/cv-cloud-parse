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
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // In a real implementation, we would use PDF.js here
          // For now, we'll simulate PDF text extraction
          const text = `
            John Doe
            Software Engineer
            john.doe@email.com
            +1 (555) 123-4567
            San Francisco, CA
            
            ABOUT
            Experienced software engineer with 5+ years in web development.
            
            SKILLS
            JavaScript, React, Node.js, Python, AWS, Docker
            
            EDUCATION
            BS Computer Science - Stanford University (2018)
            
            EXPERIENCE
            Senior Software Engineer at Tech Corp (2020-Present)
            Software Engineer at StartupXYZ (2018-2020)
            
            LANGUAGES
            English (Native), Spanish (Conversational)
          `;
          resolve(text);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const extractDataFromText = (text: string, filename: string): ExtractedData => {
    const data: ExtractedData = {
      filename,
      status: 'success'
    };

    try {
      // Extract name
      if (extractionSettings.extractName) {
        const nameMatch = text.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+)/m);
        if (nameMatch) {
          const nameParts = nameMatch[1].split(' ');
          data.firstName = nameParts[0];
          data.lastName = nameParts.slice(1).join(' ');
        }
      }

      // Extract email
      if (extractionSettings.extractEmail) {
        const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        if (emailMatch) {
          data.email = emailMatch[0];
        }
      }

      // Extract phone
      if (extractionSettings.extractPhone) {
        const phoneMatch = text.match(/\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
        if (phoneMatch) {
          data.phone = phoneMatch[0];
        }
      }

      // Extract location
      if (extractionSettings.extractLocation) {
        const locationMatch = text.match(/([A-Z][a-z]+,?\s+[A-Z]{2}|[A-Z][a-z]+,?\s+[A-Z][a-z]+)/);
        if (locationMatch) {
          data.location = locationMatch[0];
        }
      }

      // Extract current role
      if (extractionSettings.extractRole) {
        const roleMatch = text.match(/(Software Engineer|Developer|Manager|Analyst|Designer|Consultant)/i);
        if (roleMatch) {
          data.currentRole = roleMatch[0];
        }
      }

      // Extract skills
      if (extractionSettings.extractSkills) {
        const skillsSection = text.match(/SKILLS\s*\n?(.*?)(?=\n\s*[A-Z]+|$)/s);
        if (skillsSection) {
          const skills = skillsSection[1]
            .split(/[,\n]/)
            .map(skill => skill.trim())
            .filter(skill => skill.length > 0);
          data.skills = skills;
        }
      }

      // Extract education
      if (extractionSettings.extractEducation) {
        const educationMatch = text.match(/EDUCATION\s*\n?(.*?)(?=\n\s*[A-Z]+|$)/s);
        if (educationMatch) {
          data.education = educationMatch[1].trim();
        }
      }

      // Extract experience
      if (extractionSettings.extractExperience) {
        const experienceMatch = text.match(/EXPERIENCE\s*\n?(.*?)(?=\n\s*[A-Z]+|$)/s);
        if (experienceMatch) {
          data.experience = experienceMatch[1].trim();
        }
      }

      // Extract about
      if (extractionSettings.extractAbout) {
        const aboutMatch = text.match(/ABOUT\s*\n?(.*?)(?=\n\s*[A-Z]+|$)/s);
        if (aboutMatch) {
          data.about = aboutMatch[1].trim();
        }
      }

      // Extract languages
      if (extractionSettings.extractLanguages) {
        const languagesMatch = text.match(/LANGUAGES\s*\n?(.*?)(?=\n\s*[A-Z]+|$)/s);
        if (languagesMatch) {
          const languages = languagesMatch[1]
            .split(/[,\n]/)
            .map(lang => lang.trim())
            .filter(lang => lang.length > 0);
          data.languages = languages;
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

    setIsProcessing(true);
    setExtractedData([]);
    setStats({ total: files.length, processed: 0, successful: 0, failed: 0 });
    addLog(`Starting processing of ${files.length} files`);

    const results: ExtractedData[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setStats(prev => ({ ...prev, currentFile: file.name }));
      addLog(`Processing file: ${file.name}`);

      try {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const text = await extractTextFromPDF(file);
        const extractedData = extractDataFromText(text, file.name);
        results.push(extractedData);

        setStats(prev => ({
          ...prev,
          processed: i + 1,
          successful: prev.successful + (extractedData.status === 'success' ? 1 : 0),
          failed: prev.failed + (extractedData.status === 'error' ? 1 : 0)
        }));

        addLog(`✓ Successfully processed: ${file.name}`);
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

      setExtractedData([...results]);
    }

    setStats(prev => ({ ...prev, currentFile: undefined }));
    setIsProcessing(false);
    addLog(`Processing completed. ${results.filter(r => r.status === 'success').length} successful, ${results.filter(r => r.status === 'error').length} failed.`);
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
            <FileUploader onFilesSelected={handleFilesSelected} files={files} />
            
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