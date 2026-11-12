import * as CPF from 'npm:@fnando/cpf@1.0.2';
import {createHandler} from './handler.mjs';

Deno.serve(createHandler({
  TURNSTILE_SECRET_KEY: Deno.env.get('TURNSTILE_SECRET_KEY'),
  SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
}, {validateCPF: (value: string) => CPF.isValid(value, true)}));