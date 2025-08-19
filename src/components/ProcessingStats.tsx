import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

interface ProcessingStatsProps {
  stats: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    currentFile?: string;
  };
  isProcessing: boolean;
}

export const ProcessingStats: React.FC<ProcessingStatsProps> = ({ stats, isProcessing }) => {
  if (stats.total === 0 && !isProcessing) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-gradient-card shadow-card border-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Files</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card shadow-card border-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-success/10">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{stats.successful}</p>
              <p className="text-sm text-muted-foreground">Successful</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card shadow-card border-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card shadow-card border-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.processed}</p>
              <p className="text-sm text-muted-foreground">Processed</p>
            </div>
          </div>
          {isProcessing && stats.currentFile && (
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                Processing: {stats.currentFile.length > 20 ? 
                  `${stats.currentFile.substring(0, 20)}...` : 
                  stats.currentFile
                }
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};