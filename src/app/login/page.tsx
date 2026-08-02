'use client';

import { useState, useTransition } from 'react';
import { loginAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Activity } from 'lucide-react';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = await loginAction(null, formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black p-4">
      <div className="absolute inset-0 z-0 overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/30 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/30 blur-[120px]" />
      </div>
      
      <Card className="w-full max-w-md z-10 border-neutral-800 bg-neutral-950/50 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-inner">
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center tracking-tight text-white">
            AlgoTrade Navigator
          </CardTitle>
          <CardDescription className="text-center text-neutral-400">
            Enter your credentials to access the mother node
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-neutral-300">Username</Label>
              <Input 
                id="username" 
                name="username" 
                type="text" 
                placeholder="admin" 
                required 
                disabled={isPending}
                className="bg-neutral-900/50 border-neutral-800 text-white placeholder:text-neutral-600 focus-visible:ring-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-neutral-300">Password</Label>
              </div>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="••••••••" 
                required 
                disabled={isPending}
                className="bg-neutral-900/50 border-neutral-800 text-white placeholder:text-neutral-600 focus-visible:ring-blue-500"
              />
            </div>
            
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-950/50 border border-red-900/50 rounded-md">
                {error}
              </div>
            )}
          </CardContent>
          
          <CardFooter className="pt-2">
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all duration-300" 
              disabled={isPending}
            >
              {isPending ? 'Authenticating...' : 'Sign In'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
