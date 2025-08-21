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
import * as XLSX from 'xlsx';

// PDF.js Worker Setup - Worker-less mode for maximum compatibility
const EXPECTED_VERSION = "4.0.379";

console.log(`🔍 PDF.js API version: ${pdfjsLib.version}`);

// Disable worker for maximum compatibility and to avoid all worker loading issues
pdfjsLib.GlobalWorkerOptions.workerSrc = '';
pdfjsLib.GlobalWorkerOptions.workerPort = null;
console.log(`✅ PDF.js configured in worker-less mode for maximum compatibility`);

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
    // Worker is now automatically configured on module load

    return new Promise((resolve, reject) => {
      // Global timeout for entire file processing (90 seconds for large files)
      const globalTimeoutId = setTimeout(() => {
        reject(new Error(`⏱ File processing timeout (90s) - ${file.name} may be too large or corrupted`));
      }, 90000);

      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            throw new Error('📁 Failed to read file as ArrayBuffer');
          }

          // File size validation
          const fileSizeMB = arrayBuffer.byteLength / (1024 * 1024);
          if (fileSizeMB > 50) {
            console.warn(`⚠ Large file detected: ${fileSizeMB.toFixed(1)}MB`);
          }

          const typedarray = new Uint8Array(arrayBuffer);
          
          // Enhanced PDF.js configuration - worker-less mode for maximum compatibility
          const loadingTask = pdfjsLib.getDocument({
            data: typedarray,
            useWorkerFetch: false,
            isEvalSupported: false,
            disableAutoFetch: true,
            disableStream: fileSizeMB > 10, // Disable streaming for large files
            disableRange: true,
            stopAtErrors: false,
            maxImageSize: 2048 * 2048, // Increased for better quality
            cMapPacked: true,
            verbosity: 0, // Reduce console noise
            password: '', // Handle password-protected PDFs gracefully
            // Remove external CDN dependencies - use local resources only
            cMapUrl: null,
            standardFontDataUrl: null,
            fontExtraProperties: true,
            enableXfa: false // Disable XFA forms for performance
          });

          let pdf;
          try {
            // Longer timeout for large files
            const loadTimeout = fileSizeMB > 10 ? 60000 : 40000;
            pdf = await Promise.race([
              loadingTask.promise,
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`📄 PDF loading timeout (${loadTimeout/1000}s)`)), loadTimeout)
              )
            ]) as any;
            
            console.log(`📖 Loaded PDF: ${file.name} (${pdf.numPages} pages, ${fileSizeMB.toFixed(1)}MB)`);
          } catch (loadError) {
            loadingTask.destroy();
            throw new Error(`📄 Failed to load PDF: ${loadError instanceof Error ? loadError.message : 'Unknown error'}`);
          }

          let fullText = '';
          const maxPages = Math.min(pdf.numPages, 25); // Process more pages for CVs
          let processedPages = 0;
          let failedPages = 0;
          
          console.log(`🔄 Processing ${maxPages} pages from ${file.name}`);
          
          for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            try {
              const page = await Promise.race([
                pdf.getPage(pageNum),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error(`Page ${pageNum} loading timeout`)), 15000)
                )
              ]) as any;

              const textContent = await Promise.race([
                page.getTextContent({
                  normalizeWhitespace: true,
                  disableCombineTextItems: false,
                  includeMarkedContent: false // Skip marked content for performance
                }),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error(`Page ${pageNum} text extraction timeout`)), 15000)
                )
              ]) as any;
              
              // Enhanced text processing with better normalization
              const pageText = textContent.items
                .map((item: any) => {
                  if (item.str && typeof item.str === 'string') {
                    return item.str.trim();
                  }
                  return '';
                })
                .filter((str: string) => str.length > 0)
                .join(' ')
                .replace(/\s+/g, ' ')
                .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' '); // Replace various space characters
              
              if (pageText && pageText.length > 10) {
                fullText += pageText + '\n';
                processedPages++;
              }

              // Proper cleanup
              page.cleanup();
              
            } catch (pageError) {
              failedPages++;
              console.warn(`⚠ Page ${pageNum} extraction failed:`, pageError);
              
              // If too many pages are failing, it might be an image-based PDF
              if (failedPages > maxPages / 2) {
                console.warn(`🖼 High page failure rate (${failedPages}/${pageNum}) - possibly image-based PDF`);
              }
              continue;
            }
          }

          // Cleanup resources
          pdf.cleanup();
          loadingTask.destroy();
          clearTimeout(globalTimeoutId);
          
          // Enhanced text validation and quality assessment
          const cleanText = fullText.trim().replace(/\s+/g, ' ');
          const extractionQuality = {
            totalPages: maxPages,
            processedPages,
            failedPages,
            textLength: cleanText.length,
            wordsCount: cleanText.split(' ').length
          };
          
          console.log(`📊 Extraction quality for ${file.name}:`, extractionQuality);
          
          if (cleanText.length === 0) {
            reject(new Error(`🚫 No readable text found in ${file.name}. This appears to be an image-based PDF or the file is corrupted. Consider using OCR tools.`));
          } else if (cleanText.length < 100) {
            console.warn(`⚠ Minimal text extracted from ${file.name}: ${cleanText.length} characters`);
            if (failedPages > processedPages) {
              reject(new Error(`📄 Very little text extracted (${cleanText.length} chars). This may be an image-based PDF requiring OCR.`));
              return;
            }
          }
          
          resolve(cleanText);
          
        } catch (error) {
          clearTimeout(globalTimeoutId);
          console.error(`💥 PDF extraction error for ${file.name}:`, error);
          reject(new Error(`Failed to extract text from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      
      reader.onerror = (error) => {
        clearTimeout(globalTimeoutId);
        console.error(`📁 FileReader error for ${file.name}:`, error);
        reject(new Error(`Failed to read ${file.name} - file may be corrupted or access denied`));
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

    // Worker is automatically initialized on module load
    addLog(`✅ PDF.js v${pdfjsLib.version} worker configured successfully`);

    setIsProcessing(true);
    setExtractedData([]);
    setStats({ total: files.length, processed: 0, successful: 0, failed: 0 });
    addLog(`🚀 Starting batch processing of ${files.length} files`);

    const results: ExtractedData[] = [];
    let batchStartTime = Date.now();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileStartTime = Date.now();
      
      setStats(prev => ({ ...prev, currentFile: file.name }));
      addLog(`📄 Processing file ${i + 1}/${files.length}: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);

      try {
        // Enhanced file processing with comprehensive validation
        const fileProcessingPromise = (async () => {
          // Pre-flight validation
          if (file.size === 0) {
            throw new Error('File is empty (0 bytes)');
          }
          if (file.size > 50 * 1024 * 1024) {
            throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB > 50MB limit)`);
          }
          if (!file.type.includes('pdf')) {
            throw new Error(`Invalid file type: ${file.type} (expected PDF)`);
          }
          
          // Extract text with enhanced error context
          const text = await extractTextFromPDF(file);
          
          if (!text || text.trim().length === 0) {
            throw new Error('No text content extracted - PDF may be image-based or corrupted');
          }
          
          if (text.length < 50) {
            throw new Error(`Extracted text too short (${text.length} chars) - likely not a valid CV`);
          }
          
          // Extract structured data
          const extractedData = extractDataFromText(text, file.name);
          
          // Data quality validation
          const hasBasicData = extractedData.firstName || extractedData.email || extractedData.phone;
          const hasDetailedData = extractedData.skills?.length || extractedData.currentRole || extractedData.experience;
          
          if (!hasBasicData && !hasDetailedData) {
            extractedData.status = 'error';
            extractedData.errorMessage = 'No recognizable CV data found - check if this is a valid resume PDF';
          } else {
            // Log extraction quality
            const dataFields = [
              extractedData.firstName, extractedData.lastName, extractedData.email,
              extractedData.phone, extractedData.location, extractedData.currentRole,
              extractedData.skills?.length, extractedData.education, extractedData.experience,
              extractedData.about, extractedData.languages?.length
            ].filter(Boolean).length;
            
            console.log(`📊 Data extraction quality for ${file.name}: ${dataFields}/11 fields extracted`);
          }
          
          return extractedData;
        })();

        // File-specific timeout with size-based adjustment
        const timeoutMs = Math.min(90000, Math.max(30000, file.size / 1024 / 1024 * 5000)); // 5s per MB, 30-90s range
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`File processing timeout (${timeoutMs/1000}s) - file may be very large or complex`)), timeoutMs);
        });

        const extractedData = await Promise.race([fileProcessingPromise, timeoutPromise]);
        results.push(extractedData);

        // Update statistics
        setStats(prev => ({
          ...prev,
          processed: i + 1,
          successful: prev.successful + (extractedData.status === 'success' ? 1 : 0),
          failed: prev.failed + (extractedData.status === 'error' ? 1 : 0)
        }));

        // Detailed logging with timing
        const processingTime = ((Date.now() - fileStartTime) / 1000).toFixed(1);
        if (extractedData.status === 'success') {
          addLog(`✅ Successfully processed: ${file.name} (${processingTime}s)`);
        } else {
          addLog(`⚠️ Processed with issues: ${file.name} - ${extractedData.errorMessage} (${processingTime}s)`);
        }
        
      } catch (error) {
        const processingTime = ((Date.now() - fileStartTime) / 1000).toFixed(1);
        const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
        
        const errorData: ExtractedData = {
          filename: file.name,
          status: 'error',
          errorMessage
        };
        results.push(errorData);

        setStats(prev => ({
          ...prev,
          processed: i + 1,
          failed: prev.failed + 1
        }));

        addLog(`❌ Failed to process: ${file.name} - ${errorMessage} (${processingTime}s)`);
        console.error(`Processing error for ${file.name}:`, error);
      }

      // Update results in real-time
      setExtractedData([...results]);

      // Memory management: small pause between files to prevent browser overload
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Final statistics and cleanup
    setStats(prev => ({ ...prev, currentFile: undefined }));
    setIsProcessing(false);
    
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;
    const batchTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);
    
    addLog(`🏁 Batch processing completed in ${batchTime}s! ✅ ${successful} successful, ❌ ${failed} failed out of ${files.length} total files.`);
    
    // Performance summary
    const avgTimePerFile = (Date.now() - batchStartTime) / files.length / 1000;
    console.log(`📈 Batch performance: ${avgTimePerFile.toFixed(1)}s avg per file, ${(successful/files.length*100).toFixed(1)}% success rate`);
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

  const exportToExcel = () => {
    if (extractedData.length === 0) return;

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Main data sheet
    const mainData = extractedData.map(data => ({
      'Filename': data.filename,
      'First Name': data.firstName || '',
      'Last Name': data.lastName || '',
      'Email': data.email || '',
      'Phone': data.phone || '',
      'Location': data.location || '',
      'Current Role': data.currentRole || '',
      'Skills': data.skills?.join('; ') || '',
      'Education': data.education || '',
      'Experience': data.experience || '',
      'About': data.about || '',
      'Languages': data.languages?.join('; ') || '',
      'Status': data.status
    }));
    
    const ws = XLSX.utils.json_to_sheet(mainData);
    
    // Set column widths for better readability
    ws['!cols'] = [
      { width: 25 }, // Filename
      { width: 15 }, // First Name
      { width: 15 }, // Last Name
      { width: 25 }, // Email
      { width: 15 }, // Phone
      { width: 20 }, // Location
      { width: 25 }, // Current Role
      { width: 40 }, // Skills
      { width: 30 }, // Education
      { width: 40 }, // Experience
      { width: 30 }, // About
      { width: 20 }, // Languages
      { width: 12 }  // Status
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'CV Data');
    
    // Summary sheet
    const summaryData = [
      { 'Metric': 'Total Files Processed', 'Value': stats.total },
      { 'Metric': 'Successfully Processed', 'Value': stats.successful },
      { 'Metric': 'Failed Processing', 'Value': stats.failed },
      { 'Metric': 'Success Rate', 'Value': `${stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(1) : 0}%` },
      { 'Metric': 'Export Date', 'Value': new Date().toLocaleString() }
    ];
    
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    summaryWs['!cols'] = [{ width: 25 }, { width: 20 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
    
    // Generate filename with timestamp
    const filename = `cv_extraction_results_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Download file
    XLSX.writeFile(wb, filename);
    
    addLog(`Exported ${extractedData.length} records to Excel`);
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
                      variant="default"
                      size="lg"
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {isProcessing ? 'Processing...' : 'Start Processing'}
                    </Button>
                    
                    {extractedData.length > 0 && (
                      <div className="flex gap-2">
                        <Button 
                          onClick={exportToExcel}
                          variant="outline"
                          size="lg"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export Excel
                        </Button>
                        <Button 
                          onClick={exportToCSV}
                          variant="outline"
                          size="lg"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export CSV
                        </Button>
                      </div>
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