-- Payments table for Razorpay integration
create table if not exists payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  expense_id uuid references public.expenses(id) on delete set null,
  amount numeric(10,2) not null,
  currency text not null default 'INR',
  status text not null check (status in ('created','authorized','captured','failed','refunded')) default 'created',
  razorpay_order_id text unique,
  razorpay_payment_id text,
  razorpay_signature text,
  method text,
  email text,
  contact text,
  notes jsonb,
  created_at timestamptz default now(),
  verified_at timestamptz,
  updated_at timestamptz default now()
);

alter table payments enable row level security;

create policy if not exists payments_select_own
on payments for select using (auth.uid() = user_id);

create policy if not exists payments_insert_own
on payments for insert with check (auth.uid() = user_id);

create policy if not exists payments_update_own
on payments for update using (auth.uid() = user_id);

-- Reuse update_updated_at_column if exists else define
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_payments_updated_at'
  ) THEN
    CREATE TRIGGER update_payments_updated_at
      BEFORE UPDATE ON payments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;