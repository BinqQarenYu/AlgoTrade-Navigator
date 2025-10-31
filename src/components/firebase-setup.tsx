"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
// import { Badge } from "@/components/ui/badge";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Copy, 
  Eye, 
  EyeOff,
  AlertTriangle,
  Settings,
  Shield
} from "lucide-react";
import { useToast } from "../hooks/use-toast";

interface FirebaseSetupProps {
  className?: string;
}

export function FirebaseSetup({ className }: FirebaseSetupProps) {
  const [showKeys, setShowKeys] = useState(false);
  const { toast } = useToast();

  // Check Firebase configuration status
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const isConfigured = Object.values(firebaseConfig).every(
    value => value && !value.startsWith("YOUR_")
  );

  const configStatus = Object.entries(firebaseConfig).map(([key, value]) => ({
    key,
    configured: value && !value.startsWith("YOUR_"),
    value: value || "Not set"
  }));

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard", description: "Configuration copied successfully." });
  };

  const openFirebaseConsole = () => {
    window.open('https://console.firebase.google.com/', '_blank');
  };

  const openDocumentation = () => {
    window.open('https://firebase.google.com/docs/auth/web/google-signin', '_blank');
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Google Authentication Setup
            </CardTitle>
            <CardDescription>
              Configure Firebase for Google sign-in functionality
            </CardDescription>
          </div>
          <Badge variant={isConfigured ? "default" : "destructive"}>
            {isConfigured ? "Configured" : "Setup Required"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration Status
            </h3>
            <div className="space-y-1">
              {configStatus.map(({ key, configured }) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  {configured ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span className="font-mono text-xs">
                    {key.replace('NEXT_PUBLIC_FIREBASE_', '')}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                onClick={openFirebaseConsole}
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Firebase Console
              </Button>
              <Button
                onClick={openDocumentation}
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Documentation
              </Button>
            </div>
          </div>
        </div>

        {/* Configuration Details */}
        {!isConfigured && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Google authentication is not configured. Follow the setup guide in GOOGLE_AUTH_SETUP.md
              or use the Firebase Console to get your configuration values.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Current Configuration</h3>
            <Button
              onClick={() => setShowKeys(!showKeys)}
              variant="ghost"
              size="sm"
            >
              {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showKeys ? "Hide" : "Show"} Values
            </Button>
          </div>
          
          <div className="grid gap-3">
            {configStatus.map(({ key, configured, value }) => (
              <div key={key} className="space-y-1">
                <Label className="flex items-center gap-2 text-xs">
                  {configured ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  {key}
                </Label>
                {showKeys ? (
                  <div className="flex gap-2">
                    <Input
                      value={value}
                      readOnly
                      className="font-mono text-xs"
                      type={configured ? "text" : "text"}
                    />
                    <Button
                      onClick={() => copyToClipboard(value)}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="p-2 bg-muted rounded text-xs font-mono">
                    {configured ? "●●●●●●●●●●●●●●●●" : "Not configured"}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="space-y-3">
          <h3 className="font-semibold">Setup Instructions</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600 min-w-[20px]">1.</span>
              <span>Create a Firebase project at console.firebase.google.com</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600 min-w-[20px]">2.</span>
              <span>Enable Authentication and add Google as a sign-in provider</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600 min-w-[20px]">3.</span>
              <span>Register a web app and copy the configuration</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600 min-w-[20px]">4.</span>
              <span>Update your .env.local file with the configuration values</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600 min-w-[20px]">5.</span>
              <span>Restart your development server</span>
            </div>
          </div>
        </div>

        {/* Environment File Template */}
        <div className="space-y-3">
          <h3 className="font-semibold">Environment File Template</h3>
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`# Add these to your .env.local file
NEXT_PUBLIC_FIREBASE_API_KEY="your_api_key_here"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"`}
            </pre>
            <Button
              onClick={() => copyToClipboard(`# Add these to your .env.local file
NEXT_PUBLIC_FIREBASE_API_KEY="your_api_key_here"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"`)}
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}