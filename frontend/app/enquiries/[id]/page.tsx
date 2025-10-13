'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Send, 
  Calendar,
  Package,
  Building2,
  User,
  FileText,
  MessageSquare,
  Clock,
  Paperclip,
  Download,
  X
} from 'lucide-react';

interface EnquiryMessage {
  id: number;
  message: string;
  attachments?: any[];
  created_by: number;
  created_by_username: string;
  created_at: string;
}

interface EnquiryDetail {
  id: number;
  status: 'Awaiting Business' | 'Awaiting Techezm' | 'Resolved';
  enquiry_date: string;
  order_number: string;
  platform: 'amazon' | 'backmarket';
  description: string;
  business_id: number;
  business_name: string;
  created_by: number;
  created_by_username: string;
  created_at: string;
  updated_at: string;
  messages: EnquiryMessage[];
}

export default function EnquiryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const enquiryId = params.id as string;
  
  const [enquiry, setEnquiry] = useState<EnquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messageFiles, setMessageFiles] = useState<File[]>([]);

  useEffect(() => {
    if (enquiryId) {
      loadEnquiry();
    }
  }, [enquiryId]);

  const loadEnquiry = async () => {
    try {
      setLoading(true);
      const data = await apiClient.request(`/enquiries/${enquiryId}`);
      setEnquiry(data);
    } catch (error) {
      console.error('Failed to load enquiry:', error);
      // If enquiry not found, redirect back
      router.push('/enquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && messageFiles.length === 0) || !enquiry) return;

    try {
      setSending(true);
      
      // If there are files, send as FormData
      if (messageFiles.length > 0) {
        const formData = new FormData();
        formData.append('message', newMessage.trim() || 'Attached files');
        messageFiles.forEach(file => {
          formData.append('files', file);
        });
        
        await apiClient.request(`/enquiries/${enquiry.id}/messages`, {
          method: 'POST',
          body: formData
        });
      } else {
        // Text-only message
        await apiClient.request(`/enquiries/${enquiry.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: newMessage.trim() })
        });
      }

      setNewMessage('');
      setMessageFiles([]);
      // Reload enquiry to get updated messages
      loadEnquiry();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!enquiry) return;

    try {
      await apiClient.request(`/enquiries/${enquiry.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      // Reload enquiry to get updated status
      loadEnquiry();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleDownloadAttachment = async (attachment: any, messageId: number) => {
    try {
      if (!attachment.filePath) {
        // Fallback for old attachments that only have metadata
        const fileInfo = `File: ${attachment.originalName}\nSize: ${attachment.size} bytes\nType: ${attachment.mimetype}\nUploaded: ${new Date(attachment.uploadedAt).toLocaleString()}\n\nNote: This is an old attachment where only metadata was stored.`;
        
        const blob = new Blob([fileInfo], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${attachment.originalName}_metadata.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return;
      }

      // Download actual file using the new endpoint
      const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/enquiries/${params.id}/attachments/${attachment.filePath}/download`;
      
      // Get auth token
      const token = localStorage.getItem('token');
      
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download attachment. Please try again.');
    }
  };

  const isMyMessage = (message: EnquiryMessage) => {
    return Number(user?.id) === message.created_by;
  };

  const handleMessageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allowedTypes = ['image/', 'application/pdf', 'text/plain'];
    
    const validFiles = files.filter(file => 
      allowedTypes.some(type => file.type.startsWith(type))
    );
    
    if (validFiles.length !== files.length) {
      alert('Only images, PDF, and text files are allowed');
    }
    
    setMessageFiles(prev => [...prev, ...validFiles]);
  };

  const removeMessageFile = (index: number) => {
    setMessageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Awaiting Business':
        return 'bg-orange-100 text-orange-800';
      case 'Awaiting Techezm':
        return 'bg-blue-100 text-blue-800';
      case 'Resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="User">
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading enquiry...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!enquiry) {
    return (
      <ProtectedRoute requiredRole="User">
        <DashboardLayout>
          <div className="text-center py-12">
            <p className="text-slate-600">Enquiry not found</p>
            <Button onClick={() => router.push('/enquiries')} className="mt-4">
              Back to Enquiries
            </Button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="User">
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => router.push('/enquiries')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Enquiries
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Enquiry #{enquiry.id}</h1>
                <p className="text-slate-600">Order: {enquiry.order_number}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge className={getStatusColor(enquiry.status)}>
                {enquiry.status}
              </Badge>
              
              {/* Status Update Dropdown - only show if not resolved */}
              {enquiry.status !== 'Resolved' && (
                <Select onValueChange={handleStatusUpdate}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Update Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Awaiting Business">Mark as Awaiting Business</SelectItem>
                    <SelectItem value="Awaiting Techezm">Mark as Awaiting Techezm</SelectItem>
                    <SelectItem value="Resolved">Mark as Resolved</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Enquiry Details */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Enquiry Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium">Date:</span>
                    </div>
                    <p className="text-sm text-slate-600 ml-6">
                      {format(new Date(enquiry.enquiry_date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium">Order Number:</span>
                    </div>
                    <p className="text-sm text-slate-600 ml-6 font-mono">
                      {enquiry.order_number}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium">Platform:</span>
                    </div>
                    <Badge variant="outline" className="ml-6 capitalize">
                      {enquiry.platform}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium">Business:</span>
                    </div>
                    <p className="text-sm text-slate-600 ml-6">
                      {enquiry.business_name}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium">Created By:</span>
                    </div>
                    <p className="text-sm text-slate-600 ml-6">
                      {enquiry.created_by_username}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Original Description:</span>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded border">
                      {enquiry.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Conversation */}
            <div className="lg:col-span-2">
              <Card className="h-[600px] flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>Conversation</span>
                  </CardTitle>
                </CardHeader>
                
                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
                  {enquiry.messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`flex ${isMyMessage(message) ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          isMyMessage(message)
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-medium ${
                            isMyMessage(message) ? 'text-blue-100' : 'text-slate-600'
                          }`}>
                            {message.created_by_username}
                          </span>
                          <div className={`flex items-center space-x-1 text-xs ${
                            isMyMessage(message) ? 'text-blue-100' : 'text-slate-500'
                          }`}>
                            <Clock className="h-3 w-3" />
                            <span>
                              {format(new Date(message.created_at), 'dd/MM/yy HH:mm')}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm">{message.message}</p>
                        
                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.attachments.map((attachment: any, attIndex: number) => (
                              <div
                                key={attIndex}
                                className={`flex items-center space-x-2 text-xs p-2 rounded ${
                                  isMyMessage(message) ? 'bg-blue-500' : 'bg-slate-200'
                                }`}
                              >
                                <Paperclip className="h-3 w-3" />
                                <span className="truncate">{attachment.originalName}</span>
                                <Download 
                                  className="h-3 w-3 cursor-pointer hover:text-blue-200" 
                                  onClick={() => handleDownloadAttachment(attachment, message.id)}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
                
                {/* Message Input */}
                {enquiry.status !== 'Resolved' && (
                  <div className="p-4 border-t">
                    {/* File Attachments Preview */}
                    {messageFiles.length > 0 && (
                      <div className="mb-3 space-y-2">
                        <p className="text-sm font-medium text-slate-700">Attachments:</p>
                        <div className="space-y-1">
                          {messageFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded text-sm">
                              <div className="flex items-center space-x-2">
                                <Paperclip className="h-4 w-4 text-slate-400" />
                                <span className="truncate">{file.name}</span>
                                <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMessageFile(index)}
                                className="h-6 w-6 p-0 hover:bg-slate-200"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <Textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message..."
                          className="min-h-[60px] resize-none"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        {/* File Upload Button */}
                        <div>
                          <input
                            type="file"
                            multiple
                            onChange={handleMessageFileSelect}
                            className="hidden"
                            id="message-file-upload"
                            accept="image/*,.pdf,.txt"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('message-file-upload')?.click()}
                            className="px-3"
                            type="button"
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Send Button */}
                        <Button 
                          onClick={handleSendMessage}
                          disabled={(!newMessage.trim() && messageFiles.length === 0) || sending}
                          className="px-4"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Press Enter to send, Shift+Enter for new line. Click 📎 to attach files.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}