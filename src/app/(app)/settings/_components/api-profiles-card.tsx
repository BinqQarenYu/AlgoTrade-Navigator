"use client"

import React, { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { KeyRound, PlusCircle, Trash2, Edit, CheckCircle, Send, BookOpen, ChevronDown } from "lucide-react"
import { ApiProfileForm, profileSchema } from "@/components/api-profile-form"
import type { ApiProfile } from "@/lib/types"
import { z } from "zod"
import { useApi } from "@/context/api-context"

export function ApiProfilesCard() {
  const { toast } = useToast()
  const {
    profiles, activeProfile, setActiveProfile,
    addProfile, updateProfile, deleteProfile, isConnected
  } = useApi()

  const [isProfilesOpen, setProfilesOpen] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ApiProfile | null>(null)

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

  const openEditForm = (profile: ApiProfile) => { setEditingProfile(profile); setIsFormOpen(true); }
  const openAddForm = () => { setEditingProfile(null); setIsFormOpen(true); }

  return (
    <Card className="bg-slate-950/50 border-slate-800 shadow-lg">
      <Collapsible open={isProfilesOpen} onOpenChange={setProfilesOpen}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle className="flex items-center gap-2"><KeyRound/> API Profiles</CardTitle><CardDescription>Manage your Binance API keys. Keys are now stored on the server.</CardDescription></div>
          <div className="flex items-center gap-2">
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild><Button size="sm" onClick={openAddForm}><PlusCircle /> Add New Profile</Button></DialogTrigger>
                <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{editingProfile ? "Edit" : "Add"} API Profile</DialogTitle><DialogDescription>Provide a name and your Binance API keys. Keys are stored safely.</DialogDescription></DialogHeader>
                    <ApiProfileForm onSubmit={handleFormSubmit} onCancel={() => setIsFormOpen(false)} defaultValues={editingProfile}/>
                </DialogContent>
            </Dialog>
            <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><ChevronDown className={cn("h-4 w-4 transition-transform", isProfilesOpen && "rotate-180")} /><span className="sr-only">Toggle</span></Button></CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
              <div className="border rounded-md">
              <Table>
                  <TableHeader><TableRow><TableHead className="w-[180px]">Profile Name</TableHead><TableHead>API Key</TableHead><TableHead>Permissions</TableHead><TableHead>Status</TableHead><TableHead className="text-right w-[200px]">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                      {profiles.length > 0 ? (
                          profiles.map((profile) => (
                              <TableRow key={profile.id} className={cn(activeProfile?.id === profile.id && "bg-muted/50")}>
                                  <TableCell className="font-medium">{profile.name}</TableCell>
                                  <TableCell className="font-mono text-xs">{`${profile.apiKey.substring(0, 6)}...${profile.apiKey.slice(-4)}`}</TableCell>
                                  <TableCell><Badge variant={profile.permissions === 'FuturesTrading' ? 'default' : 'secondary'}>{profile.permissions === 'FuturesTrading' ? <Send className="mr-1 h-3 w-3"/> : <BookOpen className="mr-1 h-3 w-3"/>}{profile.permissions === 'FuturesTrading' ? 'Trading' : 'Read-Only'}</Badge></TableCell>
                                  <TableCell>{activeProfile?.id === profile.id && (<Badge variant="default" className="bg-green-600 hover:bg-green-600"><CheckCircle className="mr-1 h-3 w-3" /> Active</Badge>)}</TableCell>
                                  <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-2">
                                          <Button variant="outline" size="sm" onClick={() => setActiveProfile(profile.id)} disabled={activeProfile?.id === profile.id || isConnected}>Activate</Button>
                                          <Tooltip>
                                              <TooltipTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(profile)} disabled={isConnected} aria-label="Edit profile"><Edit className="h-4 w-4"/></Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Edit Profile</TooltipContent>
                                          </Tooltip>
                                          <AlertDialog>
                                              <Tooltip>
                                                  <TooltipTrigger asChild>
                                                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled={isConnected} aria-label="Delete profile"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
                                                  </TooltipTrigger>
                                                  <TooltipContent>Delete Profile</TooltipContent>
                                              </Tooltip>
                                              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the profile '{profile.name}'. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteProfile(profile.id)} className={cn(buttonVariants({ variant: "destructive" }))}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                          </AlertDialog>
                                      </div>
                                  </TableCell>
                              </TableRow>
                          ))
                      ) : (<TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No API profiles found. Add one to get started.</TableCell></TableRow>)}
                  </TableBody>
              </Table>
              </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
