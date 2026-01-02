"use client";

import PersonaForm from '@/components/personas/PersonaForm';
import PageHeader from '@/components/shared/PageHeader';

// Use backend-generated types directly - no custom types needed
import { UserCogIcon, GlobeIcon, WifiIcon, AlertCircleIcon } from '@/icons';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import type { PersonaResponse } from '@/lib/api-client/models/persona-response';
import Button from '@/components/ta/ui/button/Button';
import { PersonasApi } from '@/lib/api-client/apis/personas-api';
import { apiConfiguration } from '@/lib/api/config';
import { useToast } from '@/hooks/use-toast';

// Professional API client initialization
const config = apiConfiguration;
const personasApi = new PersonasApi(config);

function EditPersonaPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const rawPersonaId = params?.id;
  const personaId = Array.isArray(rawPersonaId) ? rawPersonaId[0] : rawPersonaId;
  const personaTypeValue = searchParams?.get('type') ?? null;
  const personaTypeParam: 'http' | 'dns' | null = personaTypeValue === 'http' || personaTypeValue === 'dns' ? personaTypeValue : null;
  
  const [persona, setPersona] = useState<PersonaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!personaId) {
      setError("Persona ID is missing from URL.");
      setLoading(false);
      return;
    }
    if (personaTypeParam !== 'http' && personaTypeParam !== 'dns') {
      setError("Invalid or missing persona type specified in URL. Please ensure '?type=http' or '?type=dns' is present.");
      setLoading(false);
      return;
    }
    
    const type = personaTypeParam;
    const targetPersonaId = personaId as string;

    async function fetchPersona(id: string, personaType: 'http' | 'dns') {
      setLoading(true);
      setError(null);
      try {
        const response = await personasApi.personasGet(id);
        const data: PersonaResponse | undefined = response.data ?? undefined;
        if (data) {
          // Check if the returned persona matches the expected type
          if (data.personaType !== personaType) {
            setError(`Mismatch: Persona ID '${id}' found, but it is a '${data.personaType}' persona, not '${personaType}'.`);
            setPersona(null);
            toast({ title: "Type Mismatch", description: `Persona found, but it's not of type '${personaType}'.`, variant: "destructive" });
          } else {
            setPersona(data);
          }
        } else {
          setError("Persona not found.");
          setPersona(null);
          toast({ title: "Error Loading Persona", description: "Persona not found.", variant: "destructive" });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load persona data.";
        setError(message);
        setPersona(null);
        toast({ title: "Error Loading Persona Data", description: message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchPersona(targetPersonaId, type);
  }, [personaId, personaTypeParam, toast]); // Removed router from deps as it was not used

  if (loading) {
    /* TailAdmin migration: Skeleton replaced with inline Tailwind animate-pulse pattern */
    const typeName = personaTypeParam === 'http' ? "HTTP" : personaTypeParam === 'dns' ? "DNS" : "Persona";
    return (
      <>
        <PageHeader title={`Edit ${typeName} Persona`} icon={UserCogIcon} />
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-10 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-20 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-40 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
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

  if (error || !persona) {
    return (
       <div className="text-center py-10">
        <AlertCircleIcon className="mx-auto h-12 w-12 text-error-500" />
        <PageHeader title="Error Loading Persona" description={error || "Persona data could not be loaded or found."} icon={UserCogIcon} />
        <div className="mt-6">
          <Button variant="primary" onClick={() => router.push('/personas')}>Back to Personas</Button>
        </div>
      </div>
    );
  }
  
  // Ensure we have a valid persona type
  if (!persona.personaType || (persona.personaType !== 'http' && persona.personaType !== 'dns')) {
    return (
       <div className="text-center py-10">
        <AlertCircleIcon className="mx-auto h-12 w-12 text-error-500" />
        <PageHeader title="Invalid Persona Type" description="Persona type is missing or invalid." icon={UserCogIcon} />
        <div className="mt-6">
          <Button variant="primary" onClick={() => router.push('/personas')}>Back to Personas</Button>
        </div>
      </div>
    );
  }

  const IconToUse = persona.personaType === 'http' ? GlobeIcon : WifiIcon;
  const typeNameDisplay = persona.personaType.toUpperCase();

  return (
    <>
      <PageHeader
        title={`Edit ${typeNameDisplay} Persona: ${persona.name}`}
        description={`Modify the details for this ${typeNameDisplay} persona.`}
        icon={IconToUse}
      />
  <PersonaForm persona={persona} isEditing={true} personaType={persona.personaType} />
    </>
  );
}

export default function EditPersonaPage() {
  return (
    <Suspense fallback={
      <div className="p-6 text-center">
        Loading persona editor...
        <div className="h-60 w-full mt-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    }>
      <EditPersonaPageContent />
    </Suspense>
  );
}