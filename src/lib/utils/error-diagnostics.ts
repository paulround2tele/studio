// Diagnostic utility to investigate empty object logging
export function debugObjectSerialization(obj: unknown, label: string = 'Object'): void {
  console.group(`🔍 DEBUG: ${label} serialization analysis`);
  
  // Basic info
  console.log('Type:', typeof obj);
  console.log('Constructor:', obj?.constructor?.name);
  console.log('Is Error:', obj instanceof Error);
  console.log('Is Event:', obj instanceof Event);
  
  // Direct console.log (what normally gets logged)
  console.log('Direct console.log:', obj);
  
  // JSON.stringify result
  try {
    const jsonResult = JSON.stringify(obj);
    console.log('JSON.stringify result:', jsonResult);
    console.log('JSON.stringify length:', jsonResult.length);
  } catch (error) {
    console.log('JSON.stringify failed:', error);
  }
  
  // Object.keys (enumerable properties)
  console.log('Object.keys:', Object.keys(obj || {}));
  
  // Object.getOwnPropertyNames (all properties)
  try {
    console.log('Object.getOwnPropertyNames:', Object.getOwnPropertyNames(obj || {}));
  } catch (error) {
    console.log('getOwnPropertyNames failed:', error);
  }
  
  // Property descriptors for key properties
  if (obj instanceof Error) {
    console.log('Error.message descriptor:', Object.getOwnPropertyDescriptor(obj, 'message'));
    console.log('Error.stack descriptor:', Object.getOwnPropertyDescriptor(obj, 'stack'));
    console.log('Error.name descriptor:', Object.getOwnPropertyDescriptor(obj, 'name'));
  }
  
  if (obj instanceof Event) {
    console.log('Event.type descriptor:', Object.getOwnPropertyDescriptor(obj, 'type'));
    console.log('Event.target descriptor:', Object.getOwnPropertyDescriptor(obj, 'target'));
    console.log('Event.isTrusted descriptor:', Object.getOwnPropertyDescriptor(obj, 'isTrusted'));
  }
  
  // Manual property extraction for Error objects
  if (obj instanceof Error) {
    console.log('Manual Error extraction:', {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
      cause: (obj as any).cause
    });
  }
  
  // Manual property extraction for Event objects
  if (obj instanceof Event) {
    console.log('Manual Event extraction:', {
      type: obj.type,
      isTrusted: obj.isTrusted,
      target: obj.target,
      currentTarget: obj.currentTarget,
      timeStamp: obj.timeStamp
    });
  }
  
  console.groupEnd();
}

// Enhanced error serializer
export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: (error as any).cause,
      ...(error as any) // Spread any additional enumerable properties
    };
  }
  
  if (error instanceof Event) {
    return {
      type: error.type,
      isTrusted: error.isTrusted,
      target: error.target?.constructor?.name || 'Unknown',
      currentTarget: error.currentTarget?.constructor?.name || 'Unknown',
      timeStamp: error.timeStamp,
      // Add other relevant Event properties
      bubbles: (error as any).bubbles,
      cancelable: (error as any).cancelable,
      defaultPrevented: (error as any).defaultPrevented
    };
  }
  
  // For other objects, try to extract meaningful properties
  if (typeof error === 'object' && error !== null) {
    try {
      // Try JSON.stringify first
      const jsonStr = JSON.stringify(error);
      if (jsonStr !== '{}') {
        return JSON.parse(jsonStr);
      }
      
      // If JSON.stringify returns {}, manually extract properties
      const extracted: Record<string, unknown> = {};
      const allProps = Object.getOwnPropertyNames(error);
      for (const prop of allProps) {
        try {
          const descriptor = Object.getOwnPropertyDescriptor(error, prop);
          if (descriptor && descriptor.enumerable !== false) {
            extracted[prop] = (error as any)[prop];
          }
        } catch {
          // Skip properties that can't be accessed
        }
      }
      return extracted;
    } catch {
      return { toString: String(error) };
    }
  }
  
  return { value: error, type: typeof error };
}