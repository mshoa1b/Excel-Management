'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export default function RouteTestComponent() {
  const { user } = useAuth();

  if (!user) return null;

  const businessId = user.business_id;
  
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-sm text-blue-800">Route Testing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs">
          <strong>Your Business ID:</strong> {businessId}
        </div>
        
        <div className="space-y-2">
          <div>
            <strong className="text-xs">Test these URLs:</strong>
          </div>
          
          <div className="space-y-1">
            <Link 
              href={`/sheets/${businessId}`}
              className="flex items-center space-x-2 text-xs text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="h-3 w-3" />
              <span>/sheets/{businessId}</span>
            </Link>
            
            <Link 
              href={`/stats/${businessId}`}
              className="flex items-center space-x-2 text-xs text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="h-3 w-3" />
              <span>/stats/{businessId}</span>
            </Link>
          </div>
        </div>

        <div className="pt-2 space-y-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              window.open(`/sheets/${businessId}`, '_blank');
            }}
          >
            Test Sheets Route
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              window.open(`/stats/${businessId}`, '_blank');
            }}
          >
            Test Stats Route
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}