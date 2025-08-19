import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Code, 
  GraduationCap, 
  FileText, 
  MessageSquare, 
  Globe,
  CheckCircle,
  XCircle,
  Grid,
  List
} from 'lucide-react';

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

interface ExtractedDataDisplayProps {
  data: ExtractedData[];
}

export const ExtractedDataDisplay: React.FC<ExtractedDataDisplayProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  if (data.length === 0) {
    return (
      <Card className="bg-gradient-card shadow-lg border-0">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-muted">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <CardTitle>No Data Yet</CardTitle>
          <CardDescription>
            Upload and process PDF files to see extracted data here
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const successCount = data.filter(item => item.status === 'success').length;
  const errorCount = data.filter(item => item.status === 'error').length;

  const ProfileCard: React.FC<{ profile: ExtractedData }> = ({ profile }) => (
    <Card className="bg-gradient-card shadow-card border-0 hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {profile.firstName || profile.lastName ? 
                  `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 
                  'Unknown Name'
                }
              </CardTitle>
              <CardDescription className="text-xs">{profile.filename}</CardDescription>
            </div>
          </div>
          <Badge 
            variant={profile.status === 'success' ? 'default' : 'destructive'}
            className="text-xs"
          >
            {profile.status === 'success' ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Success
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Error
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      
      {profile.status === 'success' ? (
        <CardContent className="space-y-3">
          {/* Contact Information */}
          <div className="grid grid-cols-1 gap-2">
            {profile.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{profile.email}</span>
              </div>
            )}
            {profile.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{profile.phone}</span>
              </div>
            )}
            {profile.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{profile.location}</span>
              </div>
            )}
            {profile.currentRole && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{profile.currentRole}</span>
              </div>
            )}
          </div>

          {/* About */}
          {profile.about && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">About</span>
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {profile.about.length > 100 ? 
                  `${profile.about.substring(0, 100)}...` : 
                  profile.about
                }
              </p>
            </div>
          )}

          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Skills</span>
              </div>
              <div className="flex flex-wrap gap-1 pl-6">
                {profile.skills.slice(0, 6).map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {profile.skills.length > 6 && (
                  <Badge variant="outline" className="text-xs">
                    +{profile.skills.length - 6} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Languages */}
          {profile.languages && profile.languages.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Languages</span>
              </div>
              <div className="flex flex-wrap gap-1 pl-6">
                {profile.languages.map((language, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {language}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      ) : (
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">{profile.errorMessage || 'Processing failed'}</span>
          </div>
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-card shadow-lg border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Extraction Results
              </CardTitle>
              <CardDescription>
                {data.length} files processed • {successCount} successful • {errorCount} failed
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                <Grid className="h-4 w-4 mr-2" />
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4 mr-2" />
                Table
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Results Display */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((profile, index) => (
            <ProfileCard key={index} profile={profile} />
          ))}
        </div>
      ) : (
        <Card className="bg-gradient-card shadow-lg border-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((profile, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {profile.firstName || profile.lastName ? 
                          `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 
                          'Unknown'
                        }
                      </TableCell>
                      <TableCell>{profile.email || '-'}</TableCell>
                      <TableCell>{profile.phone || '-'}</TableCell>
                      <TableCell>{profile.location || '-'}</TableCell>
                      <TableCell>{profile.currentRole || '-'}</TableCell>
                      <TableCell>
                        {profile.skills && profile.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {profile.skills.slice(0, 3).map((skill, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {profile.skills.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{profile.skills.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={profile.status === 'success' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {profile.status === 'success' ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Success
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Error
                            </>
                          )}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};