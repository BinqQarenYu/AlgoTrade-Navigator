
"use client"

import React, { useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import jsQR from "jsqr"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Save, QrCode } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import type { ApiProfile } from "@/lib/types"

export const profileSchema = z.object({
  name: z.string().min(1, "Profile name is required."),
  apiKey: z.string().min(10, "API Key seems too short."),
  secretKey: z.string().min(10, "Secret Key seems too short."),
})

interface ApiProfileFormProps {
  onSubmit: (values: z.infer<typeof profileSchema>) => void;
  onCancel: () => void;
  defaultValues?: ApiProfile | null;
}

export function ApiProfileForm({ onSubmit, onCancel, defaultValues }: ApiProfileFormProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      apiKey: defaultValues?.apiKey || "",
      secretKey: defaultValues?.secretKey || "",
    },
  })

  const processQrCodeFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return toast({ variant: "destructive", title: "QR Scan Failed" });
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          try {
            const data = JSON.parse(code.data);
            if (data.apiKey && data.secretKey) {
              form.setValue("apiKey", data.apiKey, { shouldValidate: true });
              form.setValue("secretKey", data.secretKey, { shouldValidate: true });
              toast({ title: "Success", description: "API keys loaded from QR code." });
            } else { throw new Error("Invalid QR data"); }
          } catch (error) {
            form.setValue("apiKey", code.data, { shouldValidate: true });
            toast({ title: "Loaded from QR", description: "Content loaded into API Key field." });
          }
        } else {
          toast({ variant: "destructive", title: "QR Scan Failed", description: "No QR code found." });
        }
      };
      img.src = imageUrl;
    };
    reader.readAsDataURL(file);
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      processQrCodeFile(event.target.files[0]);
    }
    event.target.value = "";
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Live Trading Account" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
        <div className="relative py-2">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">OR</span>
        </div>
         <div className="space-y-2">
            <FormLabel>Load from QR Code</FormLabel>
            <div
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg text-center cursor-pointer hover:border-primary/80 hover:bg-muted/50"
                onClick={() => fileInputRef.current?.click()}
            >
                <QrCode className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload a QR code image</p>
                <Input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                Save Profile
            </Button>
        </div>
      </form>
    </Form>
  )
}
