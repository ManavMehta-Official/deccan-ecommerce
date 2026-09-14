// src/components/admin/loginForm.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Mail, Lock, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import logo from "../../../public/logo.svg";
import Image from 'next/image';

export function LoginForm({ 
  action, 
  errorMessage 
}: { 
  action: (formData: FormData) => Promise<void>; 
  errorMessage?: string 
}) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md border-border/60 shadow-xl rounded-2xl backdrop-blur-sm bg-card/95">
        <CardHeader className="space-y-4 text-center px-8 pt-8 pb-6">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white text-primary shadow-xs">
            <Image src={logo} alt="Deccan Logo" className="size-10" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-semibold tracking-tight">Admin Login</CardTitle>
            <CardDescription className="text-xs text-muted-foreground/90">
              Sign in to manage system controls and user directories
            </CardDescription>
          </div>
        </CardHeader>

        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            setIsPending(true);
            const formData = new FormData(e.currentTarget);
            try {
              await action(formData);
            } catch {
              // redirect throws an internal error which we catch here, 
              // but if it fails validation, action handles it or page redirects back.
              setIsPending(false);
            }
          }}
        >
          <CardContent className="space-y-5 px-8 pb-6">
            {errorMessage && (
              <div className="flex items-center gap-3 p-3.5 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
                <AlertCircle className="size-4 shrink-0"/>
                <span>{errorMessage}</span>
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground/80" htmlFor="email">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
                <Input className="pl-10 h-11 text-sm rounded-xl bg-background/50" id="email" name="email" placeholder="admin@example.com" required type="email"/>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground/80" htmlFor="password">
                  Password
                </Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
                <Input 
                  className="pl-10 pr-10 h-11 text-sm rounded-xl bg-background/50" 
                  id="password" 
                  name="password" 
                  placeholder="Enter Password" 
                  required 
                  type={showPassword ? 'text' : 'password'} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <Link 
                  href="/admin/forgot-password" 
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
          </CardContent>

          <CardFooter className="px-8 pt-4">
            <Button 
              className="w-full h-11 text-sm font-medium rounded-xl shadow-sm transition-all cursor-pointer bg-blue-500 text-white hover:bg-blue-500/90 disabled:cursor-not-allowed disabled:opacity-50" 
              type="submit"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}