"use client"; 
import PersonaForm from '@/components/personas/PersonaForm';
import PageHeader from '@/components/shared/PageHeader'; // Keep PageHeader for title consistency
import { UserPlus, Globe, Wifi, AlertCircle } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react'; 
import Button from '@/components/ta/ui/button/Button';

function NewPersonaPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [personaType, setPersonaType] = useState<'http' | 'dns' | null>(null);
  const [isValidType, setIsValidType] = useState(false);
  const [isLoadingType, setIsLoadingType] = useState(true);


  useEffect(() => {
    if (!searchParams) {
      setIsValidType(false);
      setPersonaType(null);
      setIsLoadingType(false);
      return;
    }
    const typeParam = searchParams.get('type');
    if (typeParam === 'http' || typeParam === 'dns') {
      setPersonaType(typeParam);
      setIsValidType(true);
    } else {
      setIsValidType(false);
      // Don't default here, let the UI show an error or selection prompt
      console.warn("Invalid or missing persona type in URL query parameter.");
    }
    setIsLoadingType(false);
  }, [searchParams]);

  if (isLoadingType) {
    /* TailAdmin migration: Skeleton replaced with inline Tailwind animate-pulse pattern */
    return (
      <>
        <PageHeader title="Create New Persona" icon={UserPlus} />
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-10 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-20 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-40 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-40 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="flex justify-end gap-2">
            <div className="h-10 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-10 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </>
    );
  }
  
  if (!isValidType || !personaType) {
     return (
        <>
         <PageHeader title="Invalid Persona Type" description="Please select a valid persona type to create using the buttons below or ensure the URL includes '?type=http' or '?type=dns'." icon={AlertCircle} />
          <div className="max-w-3xl mx-auto text-center py-10 flex justify-center gap-2">
            <Button variant="primary" onClick={() => router.push('/personas/new?type=http')} startIcon={<Globe className="h-4 w-4" />}>
              Create HTTP Persona
            </Button>
            <Button variant="outline" onClick={() => router.push('/personas/new?type=dns')} startIcon={<Wifi className="h-4 w-4" />}>
              Create DNS Persona
            </Button>
          </div>
        </>
     );
  }

  const IconToUse = personaType === 'http' ? Globe : Wifi;
  const typeNameDisplay = personaType.toUpperCase();

  return (
    <>
      <PageHeader 
        title={`Create New ${typeNameDisplay} Persona`}
        description={`Define a synthetic ${typeNameDisplay} persona for network operations.`}
        icon={IconToUse}
      />
      <PersonaForm personaType={personaType} />
    </>
  );
}

export default function NewPersonaPage() {
  return (
    <Suspense fallback={
      <div className="p-6 text-center">
        Loading new persona form...
        <div className="h-60 w-full mt-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    }>
      <NewPersonaPageContent />
    </Suspense>
  );
}