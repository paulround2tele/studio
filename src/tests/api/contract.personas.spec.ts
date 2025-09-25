import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

describe('API Contract Personas Pilot', () => {
  const specPath = path.join(process.cwd(), 'backend/openapi/dist/openapi.yaml');
  let spec: any;
  beforeAll(() => {
    const content = fs.readFileSync(specPath, 'utf-8');
    spec = yaml.load(content);
  });

  it('personas list returns array schema (no SuccessEnvelope)', () => {
    const p = spec.paths['/personas'];
    expect(p).toBeTruthy();
    const get200 = p.get.responses['200'];
    const schema = get200?.content?.['application/json']?.schema;
    expect(schema?.type).toBe('array');
  });

  const personaSinglePaths = ['/personas/{id}', '/personas/http/{id}', '/personas/dns/{id}'];
  it.each(personaSinglePaths)('%s returns PersonaResponse directly', (pth) => {
    const ep = spec.paths[pth];
    expect(ep).toBeTruthy();
    const get200 = ep.get.responses['200'];
    const schema = get200?.content?.['application/json']?.schema;
    // Should be $ref to PersonaResponse
    expect(schema?.$ref || schema?.items?.$ref).toMatch(/PersonaResponse/);
    // Ensure no allOf referencing SuccessEnvelope
    const raw = JSON.stringify(get200);
    expect(raw).not.toMatch(/SuccessEnvelope/);
  });
});
