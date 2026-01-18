'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { signInWithGoogle } from '@/lib/supabase/auth';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2, CheckCircle, User, LogIn } from 'lucide-react';

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();

  const [profileData, setProfileData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Load existing profile when user is authenticated
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/users/profile');
      if (res.ok) {
        const data = await res.json();
        setProfileData(data.profile || {});
        setHasProfile(true);
      } else if (res.status === 404) {
        // No profile yet, that's okay
        setHasProfile(false);
        setProfileData({});
      } else if (res.status === 401) {
        // Not authenticated
        setError('Please sign in to view your profile');
      } else {
        setError('Failed to load profile');
      }
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) {
      setError('Please sign in to save your profile');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const method = hasProfile ? 'PUT' : 'POST';

      // Convert camelCase to snake_case for API
      const apiData = {
        age: profileData.age,
        state: profileData.state,
        city: profileData.city,
        zip_code: profileData.zipCode,
        household_size: profileData.householdSize,
        marital_status: profileData.maritalStatus,
        employment_status: profileData.employmentStatus,
        individual_income: profileData.individualIncome,
        household_income: profileData.householdIncome,
        tax_filing_status: profileData.taxFilingStatus,
        industry: profileData.industry,
        rent_vs_own: profileData.rentVsOwn,
        annual_housing_payment: profileData.annualHousingPayment,
        student_loan_balance: profileData.studentLoanBalance,
        other_debts: profileData.otherDebts,
        insurance_status: profileData.insuranceStatus,
        insurance_type: profileData.insuranceType,
        dependents_covered: profileData.dependentsCovered,
        student_status: profileData.studentStatus,
        institution_type: profileData.institutionType,
        in_state_vs_out_of_state: profileData.inStateVsOutOfState,
        current_benefits: profileData.currentBenefits,
      };

      const res = await fetch('/api/users/profile', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save profile');
      }

      setHasProfile(true);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle('/profile');
    } catch (error) {
      console.error('Sign in failed:', error);
      setIsSigningIn(false);
    }
  };

  // Calculate completeness
  const completenessFields = [
    'age', 'state', 'householdSize', 'maritalStatus',
    'employmentStatus', 'householdIncome', 'taxFilingStatus',
    'insuranceStatus', 'studentStatus', 'rentVsOwn',
  ];
  const filledFields = completenessFields.filter(f => profileData[f] !== undefined && profileData[f] !== '');
  const completeness = Math.round((filledFields.length / completenessFields.length) * 100);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <Card className="text-center py-12">
            <CardContent>
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Sign in to manage your profile
              </h1>
              <p className="text-gray-500 mb-6">
                Your profile helps calculate how policies affect you personally.
              </p>
              <Button onClick={handleSignIn} disabled={isSigningIn} size="lg">
                {isSigningIn ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                Sign in with Google
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Profile loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-500" />
                <h1 className="font-semibold text-gray-900">Your Profile</h1>
              </div>
            </div>
            <Button onClick={saveProfile} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : saveSuccess ? (
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saveSuccess ? 'Saved!' : 'Save Profile'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Completeness Card */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Profile Completeness
              </span>
              <span className="text-sm font-bold text-blue-600">{completeness}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              A more complete profile enables more accurate impact calculations.
            </p>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Profile Form */}
        <ProfileForm data={profileData} onChange={setProfileData} />

        {/* Save Button (bottom) */}
        <div className="mt-6 flex justify-end">
          <Button onClick={saveProfile} disabled={isSaving} size="lg">
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Profile
          </Button>
        </div>

        {/* Privacy Notice */}
        <p className="text-xs text-gray-500 mt-6 text-center">
          Your profile data is stored securely and used only to calculate personalized policy impacts.
          We never share your information with third parties.
        </p>
      </div>
    </div>
  );
}
