// src/components/auth/UserProfile.tsx
// Simplified user profile component for thin client architecture

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ta/ui/button/Button';
import Input from '@/components/ta/form/input/InputField';
import Label from '@/components/ta/form/Label';
import Badge from '@/components/ta/ui/badge/Badge';
import { EyeIcon, EyeCloseIcon, UserIcon, ShieldIcon } from '@/icons';

interface UserProfileProps {
  onProfileUpdated?: () => void;
  showPasswordChange?: boolean;
}

export function UserProfile({ 
  onProfileUpdated: _onProfileUpdated,
  showPasswordChange = true 
}: UserProfileProps) {
  const router = useRouter();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/v2/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Password updated successfully' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const error = await response.text();
        setMessage({ type: 'error', text: error || 'Failed to update password' });
      }
    } catch (_error) {
      setMessage({ type: 'error', text: 'Failed to update password' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/v2/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (_error) {
      // ignore
    } finally {
      router.push('/login');
    }
  };

  return (
    <div className="space-y-6">
      {/* User Info Section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            <UserIcon className="h-5 w-5" />
            Profile Information
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            THIN CLIENT: User data provided by backend middleware
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldIcon className="h-4 w-4" />
            <Badge color="dark">Authenticated User</Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Backend middleware manages all user session data
          </p>
        </div>
      </div>

      {/* Password Change Section */}
      {showPasswordChange && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Change Password</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Update your password to keep your account secure
            </p>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  defaultValue={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeCloseIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  defaultValue={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeCloseIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  defaultValue={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeCloseIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {message && (
              <div className={`rounded-lg border p-4 ${
                message.type === 'error' 
                  ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400' 
                  : 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
              }`}>
                {message.text}
              </div>
            )}

            <Button variant="primary" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </div>
      )}

      {/* Logout Section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Session Management</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sign out of your account
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export default UserProfile;
