import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, User, Mail, Phone, MapPin, Briefcase, Code, GraduationCap, FileText, MessageSquare, Globe } from 'lucide-react';

interface ExtractionSettingsProps {
  settings: {
    extractName: boolean;
    extractEmail: boolean;
    extractPhone: boolean;
    extractLocation: boolean;
    extractRole: boolean;
    extractSkills: boolean;
    extractEducation: boolean;
    extractExperience: boolean;
    extractAbout: boolean;
    extractLanguages: boolean;
  };
  onSettingsChange: (settings: any) => void;
}

export const ExtractionSettings: React.FC<ExtractionSettingsProps> = ({ 
  settings, 
  onSettingsChange 
}) => {
  const handleToggle = (key: string) => {
    onSettingsChange({
      ...settings,
      [key]: !settings[key as keyof typeof settings]
    });
  };

  const enabledCount = Object.values(settings).filter(Boolean).length;

  const settingItems = [
    {
      key: 'extractName',
      label: 'Full Name',
      description: 'Extract first and last name',
      icon: User,
      enabled: settings.extractName
    },
    {
      key: 'extractEmail',
      label: 'Email Address',
      description: 'Extract email contacts',
      icon: Mail,
      enabled: settings.extractEmail
    },
    {
      key: 'extractPhone',
      label: 'Phone Number',
      description: 'Extract phone contacts',
      icon: Phone,
      enabled: settings.extractPhone
    },
    {
      key: 'extractLocation',
      label: 'Location',
      description: 'Extract current location/address',
      icon: MapPin,
      enabled: settings.extractLocation
    },
    {
      key: 'extractRole',
      label: 'Current Role',
      description: 'Extract current job title/position',
      icon: Briefcase,
      enabled: settings.extractRole
    },
    {
      key: 'extractSkills',
      label: 'Skills & Technologies',
      description: 'Extract technical and soft skills',
      icon: Code,
      enabled: settings.extractSkills
    },
    {
      key: 'extractEducation',
      label: 'Education',
      description: 'Extract educational background',
      icon: GraduationCap,
      enabled: settings.extractEducation
    },
    {
      key: 'extractExperience',
      label: 'Work Experience',
      description: 'Extract work history and experience',
      icon: FileText,
      enabled: settings.extractExperience
    },
    {
      key: 'extractAbout',
      label: 'Professional Summary',
      description: 'Extract about/summary section',
      icon: MessageSquare,
      enabled: settings.extractAbout
    },
    {
      key: 'extractLanguages',
      label: 'Languages',
      description: 'Extract spoken languages',
      icon: Globe,
      enabled: settings.extractLanguages
    }
  ];

  return (
    <Card className="bg-gradient-card shadow-lg border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Extraction Settings</CardTitle>
              <CardDescription>
                Configure which data fields to extract from CV files
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            {enabledCount} / {settingItems.length} enabled
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settingItems.map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.key}
                className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors bg-background/50"
              >
                <div className={`p-2 rounded-md ${
                  item.enabled 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <Label 
                      htmlFor={item.key}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {item.label}
                    </Label>
                    <Switch
                      id={item.key}
                      checked={item.enabled}
                      onCheckedChange={() => handleToggle(item.key)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Extraction Tips</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Disable unused fields to improve processing speed</li>
                <li>• Name and email extraction are highly recommended</li>
                <li>• Skills extraction works best with clearly formatted CVs</li>
                <li>• Processing accuracy depends on CV structure and quality</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};