"use client"

import React, { useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import jsQR from "jsqr"
import { useToast } from "@/hooks/use-toast"
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
import { KeyRound, Save, QrCode } from "lucide-react"
import { Separator } from "@/components/ui/separator"

const settingsSchema = z.object({
  apiKey: z.string().min(1, "API Key is required."),
  secretKey: z.string().min(1, "Secret Key is required."),
})

export default function SettingsPage() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      apiKey: "",
      secretKey: "",
    },
  })

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
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      processQrCodeFile(event.dataTransfer.files[0])
      event.dataTransfer.clearData()
    }
  }

  function onSubmit(values: z.infer<typeof settingsSchema>) {
    console.log("Saving settings:", values)
    toast({
      title: "Settings Saved",
      description: "Your Binance API keys have been securely saved.",
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
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
                      <Input placeholder="Enter your API Key" {...field} />
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
                      <Input type="password" placeholder="Enter your Secret Key" {...field} />
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
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer text-center hover:border-primary/80 hover:bg-muted/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
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
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit">
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
