// src/components/admin/importUserDialog.tsx
'use client';

import * as React from 'react';
import { Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, FileText, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { importUsersAction } from '@/app/admin/actions';

export function ImportUsersDialog() {
  const [open, setOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successCount, setSuccessCount] = React.useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setSelectedFile(null);
      setError(null);
      setSuccessCount(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setSuccessCount(null);
      
      if (fileInputRef.current && fileInputRef.current !== e.target) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputRef.current.files = dataTransfer.files;
      }
    }
  };

  const handleDownloadTemplate = (e: React.MouseEvent) => {
    e.preventDefault();
    const headers = ['id', 'name', 'email', 'role', 'image', 'email_verified', 'password', 'created_at', 'updated_at'];
    const sampleRow = ['', 'Sample User', 'sample.user@example.com', 'user', '', 'true', 'TempPassword123!', '', ''];
    const csvContent = `${headers.join(',')}\n${sampleRow.map((c) => `"${c}"`).join(',')}\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'users_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a CSV file to upload.');
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await importUsersAction(null, formData);

      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      } else if (result?.success) {
        setSuccessCount(result.count ?? 0);
        toast.success(`Successfully imported ${result.count ?? 0} users!`);
        setTimeout(() => {
          setOpen(false);
          setSelectedFile(null);
          setSuccessCount(null);
        }, 800);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred during import.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted shadow-2xs cursor-pointer transition-colors">
        <Upload className="size-3.5" />
        Import CSV
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold tracking-tight">Import Users via CSV</DialogTitle>
            
          </div>
          <DialogDescription className="text-xs text-muted-foreground space-y-2 flex flex-col">
            <span>
              Upload a CSV file containing all user schema columns:
            </span>
            <br />
            <span className="font-mono p-2 bg-muted rounded-md">
              id, name, email, role, image, email_verified, password, created_at, updated_at
            </span>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center mt-1 gap-1 text-xs text-primary hover:underline cursor-pointer"
            >
              <Download className="size-3" />
              Download Template
            </button>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="flex items-center gap-2.5 p-3 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successCount !== null && (
            <div className="flex items-center gap-2.5 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Successfully imported {successCount} users!</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="file-upload" className="text-xs font-medium text-foreground/80">
              CSV File
            </Label>
            
            <Input 
              ref={fileInputRef}
              id="file-upload" 
              name="file" 
              type="file" 
              accept=".csv,text/csv" 
              required 
              className="hidden" 
              onChange={handleFileChange}
            />

            {selectedFile ? (
              <div className="flex items-center justify-between p-3.5 border border-border/80 rounded-xl bg-background/50">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="size-5" />
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-medium text-foreground truncate">{selectedFile.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Ready to upload
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <label 
                  htmlFor="file-upload" 
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border/80 rounded-xl cursor-pointer bg-background/50 hover:bg-muted/50 transition-colors px-4 text-center"
                >
                  <FileSpreadsheet className="size-8 mb-2 text-muted-foreground" />
                  <p className="text-xs font-medium text-foreground mb-1">Click to upload or drag and drop</p>
                  <p className="text-[10px] text-muted-foreground">CSV format with all user schema columns</p>
                </label>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="submit" 
              disabled={isPending || !selectedFile || successCount !== null}
              className="w-full h-9 text-xs font-medium rounded-lg cursor-pointer"
              size="lg"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Importing users...
                </>
              ) : successCount !== null ? (
                <>
                  <CheckCircle2 className="mr-2 size-4" />
                  Imported Successfully
                </>
              ) : (
                'Upload & Import'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}