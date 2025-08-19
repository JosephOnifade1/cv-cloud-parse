import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Download, Trash2, CheckCircle, XCircle, Info } from 'lucide-react';

interface ProcessingLogProps {
  logs: string[];
}

export const ProcessingLog: React.FC<ProcessingLogProps> = ({ logs }) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const clearLogs = () => {
    // This would be handled by parent component
  };

  const exportLogs = () => {
    const logContent = logs.join('\n');
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cv_processing_logs_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogIcon = (message: string) => {
    if (message.includes('✓') || message.includes('Successfully')) {
      return <CheckCircle className="h-4 w-4 text-success" />;
    }
    if (message.includes('✗') || message.includes('Failed')) {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    return <Info className="h-4 w-4 text-primary" />;
  };

  const getLogType = (message: string): 'success' | 'error' | 'info' => {
    if (message.includes('✓') || message.includes('Successfully')) {
      return 'success';
    }
    if (message.includes('✗') || message.includes('Failed')) {
      return 'error';
    }
    return 'info';
  };

  return (
    <Card className="bg-gradient-card shadow-lg border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Processing Log</CardTitle>
              <CardDescription>
                Real-time activity log and processing history
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1">
              {logs.length} entries
            </Badge>
            {logs.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={exportLogs}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={clearLogs}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-muted">
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <p className="text-muted-foreground">No activity yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start processing files to see logs appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log, index) => {
              const logType = getLogType(log);
              const icon = getLogIcon(log);
              
              return (
                <div 
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    logType === 'success' 
                      ? 'bg-success/5 border-success/20' 
                      : logType === 'error'
                      ? 'bg-destructive/5 border-destructive/20'
                      : 'bg-background border-border'
                  }`}
                >
                  <div className="mt-0.5">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-mono ${
                      logType === 'success' 
                        ? 'text-success' 
                        : logType === 'error'
                        ? 'text-destructive'
                        : 'text-foreground'
                    }`}>
                      {log}
                    </p>
                  </div>
                  <Badge 
                    variant={
                      logType === 'success' 
                        ? 'default' 
                        : logType === 'error'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className="text-xs ml-2"
                  >
                    {index + 1}
                  </Badge>
                </div>
              );
            })}
            <div ref={logEndRef} />
          </div>
        )}
        
        {logs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Activity log • {logs.length} total entries
              </span>
              <span className="text-muted-foreground">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};