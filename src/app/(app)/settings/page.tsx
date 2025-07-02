
"use client"

import React, { useRef, useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import jsQR from "jsqr"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { KeyRound, Save, QrCode, Power, PowerOff, Loader2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"

const settingsSchema = z.object({
  apiKey: z.string().min(1, "API Key is required."),
  secretKey: z.string().min(1, "Secret Key is required."),
})

export default function SettingsPage() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    apiKey,
    setApiKey,
    secretKey,
    setSecretKey,
    isConnected,
    setIsConnected,
    apiLimit,
    setApiLimit,
  } = useApi()
  const [isConnecting, setIsConnecting] = useState(false)
  const [ipAddress, setIpAddress] = useState<string | null>(null)

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      apiKey: apiKey || "",
      secretKey: secretKey || "",
    },
  })

  useEffect(() => {
    form.reset({
      apiKey: apiKey || '',
      secretKey: secretKey || '',
    });
  }, [apiKey, secretKey, form]);

  useEffect(() => {
    const fetchIp = async () => {
        try {
        const response = await fetch('/api/ip');
        const data = await response.json();
        setIpAddress(data.ip);
        } catch (error) {
        console.error("Could not fetch IP address:", error);
        setIpAddress("Unavailable");
        }
    };
    fetchIp();
  }, []);


  const processQrCodeFile = (file: File) => {
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          toast({
            title: "QR Scan Failed",
            description: "Could not get canvas context.",
            variant: "destructive",
          })
          return
        }
        ctx.drawImage(img, 0, 0, img.width, img.height)
        const imageData = ctx.getImageData(0, 0, img.width, img.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)

        if (code) {
          try {
            const data = JSON.parse(code.data)
            if (data.apiKey && data.secretKey) {
              form.setValue("apiKey", data.apiKey, { shouldValidate: true })
              form.setValue("secretKey", data.secretKey, { shouldValidate: true })
              toast({ title: "Success", description: "API keys loaded from QR code." })
            } else {
              throw new Error("Invalid QR code data format.")
            }
          } catch (error) {
            form.setValue("apiKey", code.data, { shouldValidate: true })
            toast({
              title: "Loaded from QR Code",
              description: "Content loaded into API Key field. Please verify.",
            })
          }
        } else {
          toast({
            title: "QR Scan Failed",
            description: "No QR code found in the image.",
            variant: "destructive",
          })
        }
      }
      img.onerror = () => {
        toast({
          title: "Image Error",
          description: "Could not load the uploaded image.",
          variant: "destructive",
        })
      }
      img.src = imageUrl
    }
    reader.onerror = () => {
      toast({
        title: "File Error",
        description: "Could not read the uploaded file.",
        variant: "destructive",
      })
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      processQrCodeFile(event.target.files[0])
    }
    event.target.value = ""
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (isConnected) return;
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      processQrCodeFile(event.dataTransfer.files[0])
      event.dataTransfer.clearData()
    }
  }

  function onSubmit(values: z.infer<typeof settingsSchema>) {
    setApiKey(values.apiKey)
    setSecretKey(values.secretKey)
    toast({
      title: "Settings Saved",
      description: "Your Binance API keys have been saved.",
    })
  }

  const handleConnectToggle = async () => {
    setIsConnecting(true)

    if (!isConnected) {
      if (apiKey && secretKey) {
        try {
          // Test the connection by fetching the balance
          await getAccountBalance(apiKey, secretKey)
          setIsConnected(true)
          toast({
            title: "Connection Successful",
            description: "Successfully connected to Binance API.",
          })
          // This random limit can be improved later
          setApiLimit({ used: Math.floor(Math.random() * 200), limit: 1200 })
        } catch (error: any) {
          setIsConnected(false)
          toast({
            title: "Connection Failed",
            description: error.message || "Please check your API keys and permissions.",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Connection Failed",
          description: "Please provide and save valid API keys before connecting.",
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
            <span className="text-xs font-normal text-muted-foreground">
                IP: {ipAddress || 'Loading...'}
            </span>
          </CardTitle>
          <CardDescription>
            Manage your connection to the Binance API. Your keys must be saved first.
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
            <Button onClick={handleConnectToggle} disabled={isConnecting} variant={isConnected ? "destructive" : "default"}>
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
        {isConnected && (
          <CardFooter className="flex-col items-start gap-4 border-t pt-6">
            <div className="w-full">
              <h3 className="text-sm font-medium mb-2">API Rate Limits (Requests per Minute)</h3>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Used: {apiLimit.used}</span>
                <span>Limit: {apiLimit.limit}</span>
              </div>
              <Progress value={(apiLimit.used / apiLimit.limit) * 100} />
            </div>
          </CardFooter>
        )}
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound/> API Settings</CardTitle>
          <CardDescription>
            Connect your Binance account to enable automated trading. Your keys are stored securely.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Binance API Key</FormLabel>
                    <FormControl>
                      <Input
                        type={isConnected ? "password" : "text"}
                        placeholder="Enter your API Key"
                        {...field}
                        disabled={isConnected}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="secretKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Binance Secret Key</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your Secret Key"
                        {...field}
                        disabled={isConnected}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="relative py-4">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  OR
                </span>
              </div>

              <div className="space-y-2">
                <FormLabel>Load from QR Code</FormLabel>
                <div
                  className={cn(
                    "flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-center transition-colors",
                    !isConnected ? "cursor-pointer hover:border-primary/80 hover:bg-muted/50" : "bg-muted/50 opacity-50"
                  )}
                  onClick={() => {
                    if (!isConnected) fileInputRef.current?.click()
                  }}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={(e) => e.preventDefault()}
                >
                  <QrCode className="w-10 h-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click or drag & drop a QR code image</p>
                  <Input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                    disabled={isConnected}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isConnected}>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}
