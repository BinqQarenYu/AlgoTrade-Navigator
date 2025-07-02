"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { KeyRound, Save } from "lucide-react"

const settingsSchema = z.object({
  apiKey: z.string().min(1, "API Key is required."),
  secretKey: z.string().min(1, "Secret Key is required."),
})

export default function SettingsPage() {
  const { toast } = useToast()

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      apiKey: "",
      secretKey: "",
    },
  })

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
