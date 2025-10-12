import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
// import { Progress } from '@/components/ui/progress';
import { Paperclip, Upload, X, Eye, Download, FileImage, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface Attachment {
  id: number;
  filename: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by_name?: string;
  created_at: string;
}

interface AttachmentManagerProps {
  sheetId: number;
  onAttachmentChange?: () => void;
  attachmentCount?: number;
  returnId?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

export function AttachmentManager({ sheetId, onAttachmentChange, attachmentCount, returnId }: AttachmentManagerProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAttachments = useCallback(async () => {
    if (!dialogOpen) return;
    
    setIsLoading(true);
    setError('');
    try {
      const result = await apiClient.getAttachments(sheetId);
      setAttachments(result);
    } catch (error: any) {
      setError('Failed to load attachments');
      console.error('Load attachments error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sheetId, dialogOpen]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Check file count limit
    if (attachments.length + files.length > 10) {
      setError(`Cannot upload ${files.length} files. Maximum 10 files per row. Current: ${attachments.length}`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      // Simulate progress (since we can't track real upload progress easily)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await apiClient.uploadAttachments(sheetId, files);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Reload attachments
      await loadAttachments();
      onAttachmentChange?.();
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      setError(error.message || 'Failed to upload files');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      await apiClient.deleteAttachment(attachmentId);
      await loadAttachments();
      onAttachmentChange?.();
      setDeleteConfirmOpen(false);
      setAttachmentToDelete(null);
    } catch (error: any) {
      setError('Failed to delete attachment');
      console.error('Delete error:', error);
    }
  };

  const openViewAttachment = (attachmentId: number) => {
    const url = apiClient.getAttachmentViewUrl(attachmentId);
    window.open(url, '_blank');
  };

  const downloadAttachment = (attachmentId: number, filename: string) => {
    const url = apiClient.getAttachmentDownloadUrl(attachmentId);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  React.useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <button
            className="rounded-md px-2 py-1 text-white group-hover:text-black hover:bg-gray-100 flex items-center gap-1"
            title="Manage attachments"
          >
            <Paperclip className="h-4 w-4" />
            <span className="text-xs">
              {attachmentCount !== undefined ? attachmentCount : (attachments.length || 0)}
            </span>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attachments for Row {returnId || sheetId}</DialogTitle>
            <DialogDescription>
              Upload and manage files for this row. Maximum 10 files per row.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Area */}
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium">Drop files here or click to upload</p>
                <p className="text-sm text-gray-500">
                  Images, PDFs, and text files up to 50MB each. Maximum 10 files per row.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.txt"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || attachments.length >= 10}
                >
                  Select Files
                </Button>
              </div>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Uploading...</span>
                  <span className="text-sm text-gray-500">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Attachments List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading attachments...</div>
            ) : attachments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No attachments yet</div>
            ) : (
              <div className="space-y-2">
                <h3 className="font-medium">Attachments ({attachments.length}/10)</h3>
                <div className="grid grid-cols-1 gap-3">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-shrink-0">
                        {isImageFile(attachment.mime_type) ? (
                          <FileImage className="h-8 w-8 text-blue-500" />
                        ) : (
                          <Paperclip className="h-8 w-8 text-gray-500" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" title={attachment.original_name}>
                          {attachment.original_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(attachment.file_size)}
                          {attachment.uploaded_by_name && ` • Uploaded by ${attachment.uploaded_by_name}`}
                          {' • '}{new Date(attachment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isImageFile(attachment.mime_type) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openViewAttachment(attachment.id)}
                            title="View image"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadAttachment(attachment.id, attachment.original_name)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAttachmentToDelete(attachment.id);
                            setDeleteConfirmOpen(true);
                          }}
                          title="Delete"
                          className="text-red-600 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attachment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => attachmentToDelete && handleDeleteAttachment(attachmentToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}