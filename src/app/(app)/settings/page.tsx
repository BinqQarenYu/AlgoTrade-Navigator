
"use client"

import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useApi } from "@/context/api-context"
import { getAccountBalance } from "@/lib/binance-service"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Label } from "@/components/ui/label"
import { KeyRound, Power, PowerOff, Loader2, PlusCircle, Trash2, Edit, CheckCircle, ShieldAlert, Globe, Copy, ShieldCheck } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import type { ApiProfile } from "@/lib/types"
import { ApiProfileForm, profileSchema } from "@/components/api-profile-form"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"

export default function SettingsPage() {
  const { toast } = useToast()
  const {
    profiles,
    activeProfile,
    setActiveProfile,
    addProfile,
    updateProfile,
    deleteProfile,
    isConnected,
    setIsConnected,
    apiLimit,
    setApiLimit,
    rateLimitThreshold,
    setRateLimitThreshold,
  } = useApi()

  const [isConnecting, setIsConnecting] = useState(false)
  const [clientIpAddress, setClientIpAddress] = useState<string | null>(null)
  const [serverIpAddress, setServerIpAddress] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ApiProfile | null>(null);

  useEffect(() => {
    const fetchIps = async () => {
        try {
            const clientRes = await fetch('/api/ip');
            const clientData = await clientRes.json();
            setClientIpAddress(clientData.ip);

            const serverRes = await fetch('/api/server-ip');
            const serverData = await serverRes.json();
            setServerIpAddress(serverData.ip);

        } catch (error) {
            console.error("Could not fetch IP addresses:", error);
            setClientIpAddress("Unavailable");
            setServerIpAddress("Unavailable");
        }
    };
    fetchIps();
  }, []);

  const handleConnectToggle = async () => {
    if (!activeProfile) {
      toast({
        title: "No Active Profile",
        description: "Please activate an API profile before connecting.",
        variant: "destructive",
      })
      return;
    }

    if (!isConnected && apiLimit.used >= rateLimitThreshold) {
      toast({
        title: "Rate Limit Threshold Reached",
        description: `Used weight (${apiLimit.used}) is above your threshold (${rateLimitThreshold}). Please wait a moment.`,
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true)

    if (!isConnected) {
      try {
        const { data: accountInfo, usedWeight } = await getAccountBalance(activeProfile.apiKey, activeProfile.secretKey)
        setIsConnected(true)
        toast({
          title: "Connection Successful",
          description: `Successfully connected using '${activeProfile.name}' profile.`,
        })
        setApiLimit({ used: usedWeight, limit: 1200 })
      } catch (error: any) {
        setIsConnected(false)
        toast({
          title: "Connection Failed",
          description: error.message || "Please check your API keys and permissions.",
          variant: "destructive",
        })
      }
    } else {
      setIsConnected(false)
      toast({
        title: "Disconnected",
        description: "You have been disconnected from the Binance API.",
      })
    }
    setIsConnecting(false)
  }

  const handleFormSubmit = (values: z.infer<typeof profileSchema>) => {
    if (editingProfile) {
      updateProfile({ ...editingProfile, ...values });
      toast({ title: "Profile Updated", description: `The '${values.name}' profile has been updated.` });
    } else {
      addProfile({ ...values, id: Date.now().toString() });
      toast({ title: "Profile Added", description: `The '${values.name}' profile has been created.` });
    }
    setIsFormOpen(false);
    setEditingProfile(null);
  };

  const openEditForm = (profile: ApiProfile) => {
    setEditingProfile(profile);
    setIsFormOpen(true);
  }

  const openAddForm = () => {
    setEditingProfile(null);
    setIsFormOpen(true);
  }

  const progressColorClass =
    apiLimit.used >= rateLimitThreshold
      ? "bg-red-500"
      : apiLimit.used >= rateLimitThreshold * 0.9
      ? "bg-yellow-500"
      : "bg-primary";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={cn(
                "h-2.5 w-2.5 rounded-full",
                isConnecting ? "bg-yellow-500 animate-pulse" : isConnected ? "bg-green-500" : "bg-red-500"
              )} />
              API Connection
            </div>
          </CardTitle>
          <CardDescription>
            {activeProfile 
              ? `Manage your connection using the active profile: '${activeProfile.name}'.`
              : "Activate a profile below to connect to the Binance API."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Status: <span className={cn(
                "font-semibold", 
                isConnecting ? "text-yellow-500" : isConnected ? "text-green-500" : "text-red-500"
              )}>
                {isConnecting ? "Connecting..." : isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <Button onClick={handleConnectToggle} disabled={isConnecting || !activeProfile} variant={isConnected ? "destructive" : "default"}>
              {isConnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isConnected ? (
                <PowerOff className="mr-2 h-4 w-4" />
              ) : (
                <Power className="mr-2 h-4 w-4" />
              )}
              {isConnecting ? "Please wait" : isConnected ? "Disconnect" : "Connect"}
            </Button>
          </div>
        </CardContent>
        {isConnected && activeProfile && (
          <CardFooter className="flex-col items-start gap-4 border-t pt-6">
            <div className="w-full">
              <h3 className="text-sm font-medium mb-2">API Rate Limits (Requests per Minute)</h3>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Used: {apiLimit.used}</span>
                <span>Limit: {apiLimit.limit}</span>
              </div>
              <Progress value={(apiLimit.used / apiLimit.limit) * 100} indicatorClassName={progressColorClass} />
            </div>
          </CardFooter>
        )}
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="text-primary"/> IP Address Configuration</CardTitle>
            <CardDescription>For API keys with IP restrictions, you must whitelist the server's outbound IP address.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Action Required for Restricted Keys</AlertTitle>
                <AlertDescription>
                    Your API calls originate from our server, not your computer. To use an IP-restricted key, add the Server IP below to your whitelist in the Binance API management panel.
                </AlertDescription>
            </Alert>
            <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-1">
                    <Label>Your Browser IP</Label>
                    <p className="font-mono text-sm">{clientIpAddress || "Loading..."}</p>
                </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-primary/10 p-3">
                 <div className="space-y-1">
                    <Label>Application Server IP (Whitelist this one)</Label>
                    <p className="font-mono text-sm font-semibold text-primary">{serverIpAddress || "Loading..."}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                    if(serverIpAddress) {
                        navigator.clipboard.writeText(serverIpAddress);
                        toast({ title: "Copied!", description: "Server IP copied to clipboard." });
                    }
                }} disabled={!serverIpAddress || serverIpAddress === 'Unavailable'}>
                    <Copy className="mr-2 h-4 w-4" /> Copy
                </Button>
            </div>
        </CardContent>
    </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldAlert/> Rate Limit Settings</CardTitle>
          <CardDescription>
            Set a threshold to prevent hitting Binance API rate limits. The official limit is 1200 requests per minute.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Label htmlFor="threshold">Safety Threshold</Label>
            <Input
              id="threshold"
              type="number"
              value={rateLimitThreshold}
              onChange={(e) => setRateLimitThreshold(parseInt(e.target.value, 10) || 1200)}
              placeholder="e.g., 1100"
              max={1200}
              min={1}
            />
            <p className="text-xs text-muted-foreground mt-2">
              The app will pause API requests when used weight exceeds this value.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2"><KeyRound/> API Profiles</div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" onClick={openAddForm}>
                        <PlusCircle /> Add New Profile
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>{editingProfile ? "Edit" : "Add"} API Profile</DialogTitle>
                        <DialogDescription>
                            Provide a name and your Binance API keys. Keys are stored only in your browser.
                        </DialogDescription>
                    </DialogHeader>
                    <ApiProfileForm
                        onSubmit={handleFormSubmit}
                        onCancel={() => setIsFormOpen(false)}
                        defaultValues={editingProfile}
                    />
                </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            Manage your Binance API keys. You can save multiple profiles and activate one for trading.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[180px]">Profile Name</TableHead>
                        <TableHead>API Key</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right w-[200px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {profiles.length > 0 ? (
                        profiles.map((profile) => (
                            <TableRow key={profile.id} className={cn(activeProfile?.id === profile.id && "bg-muted/50")}>
                                <TableCell className="font-medium">{profile.name}</TableCell>
                                <TableCell className="font-mono text-xs">{`${profile.apiKey.substring(0, 6)}...${profile.apiKey.slice(-4)}`}</TableCell>
                                <TableCell>
                                    {activeProfile?.id === profile.id && (
                                        <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                                            <CheckCircle className="mr-1 h-3 w-3" /> Active
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button 
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setActiveProfile(profile.id)}
                                            disabled={activeProfile?.id === profile.id || isConnected}
                                        >
                                            Activate
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(profile)} disabled={isConnected}>
                                            <Edit className="h-4 w-4"/>
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled={isConnected}>
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete the profile '{profile.name}'. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => deleteProfile(profile.id)} className={cn(buttonVariants({ variant: "destructive" }))}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                No API profiles found. Add one to get started.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  )
}
