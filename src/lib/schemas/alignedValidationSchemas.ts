// Aligned validation schemas for API requests
import { z } from 'zod';

// Login request validation schema
const loginRequest = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// Campaign creation request validation schema
const createCampaignRequest = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  description: z.string().optional(),
  campaignType: z.enum(['domain_generation', 'dns_validation', 'http_keyword_validation']),
  metadata: z.record(z.any()).optional(),
});

// Persona creation request validation schema
const createPersonaRequest = z.object({
  name: z.string().min(1, 'Persona name is required'),
  description: z.string().optional(),
  personaType: z.enum(['http', 'dns']),
  configDetails: z.record(z.any()),
});

// Proxy creation request validation schema  
const createProxyRequest = z.object({
  address: z.string().min(1, 'Proxy address is required'),
  port: z.number().min(1).max(65535),
  protocol: z.enum(['http', 'https', 'socks4', 'socks5']),
  username: z.string().optional(),
  password: z.string().optional(),
  description: z.string().optional(),
});

// Export all validation schemas
export const validationSchemas = {
  loginRequest,
  createCampaignRequest,
  createPersonaRequest,
  createProxyRequest,
};

// Export individual schemas for convenience
export {
  loginRequest,
  createCampaignRequest,
  createPersonaRequest,
  createProxyRequest,
};