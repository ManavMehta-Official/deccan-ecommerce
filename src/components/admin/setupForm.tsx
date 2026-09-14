// src/components/admin/setupForm.tsx
'use client';

import * as React from 'react';
import { User, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SetupForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  return (
    <form 
      onSubmit={async (e) => {
        e.preventDefault();
        setIsPending(true);
        const formData = new FormData(e.currentTarget);
        try {
          await action(formData);
        } catch {
          setIsPending(false);
        }
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label className="text-xs font-medium text-foreground/80" htmlFor="name">
          Full Name
        </Label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            className="pl-10 h-11 text-sm rounded-xl bg-background/50" 
            id="name" 
            name="name" 
            placeholder="John Doe" 
            required 
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-foreground/80" htmlFor="email">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            className="pl-10 h-11 text-sm rounded-xl bg-background/50" 
            id="email" 
            name="email" 
            type="email" 
            placeholder="admin@example.com" 
            required 
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-foreground/80" htmlFor="password">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            className="pl-10 pr-10 h-11 text-sm rounded-xl bg-background/50" 
            id="password" 
            name="password" 
            type={showPassword ? 'text' : 'password'} 
            placeholder="••••••••" 
            required 
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
      </div>

      <div className="pt-2">
        <Button 
          className="w-full h-11 text-sm font-medium rounded-xl shadow-sm transition-all cursor-pointer bg-blue-500 text-white hover:bg-blue-500/90 disabled:cursor-not-allowed disabled:opacity-50" 
          type="submit"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Initializing system...
            </>
          ) : (
            'Initialize System'
          )}
        </Button>
      </div>
    </form>
  );
}