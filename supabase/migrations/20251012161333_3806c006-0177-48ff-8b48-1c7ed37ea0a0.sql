-- Create table for custom user accounts
CREATE TABLE public.user_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for custom user categories
CREATE TABLE public.user_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_name TEXT NOT NULL,
  is_expense BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enum for recurring frequency
CREATE TYPE public.recurrence_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly');

-- Create table for recurring transactions
CREATE TABLE public.recurring_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  account TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  gross_income NUMERIC DEFAULT 0,
  net_income NUMERIC DEFAULT 0,
  tax_paid NUMERIC DEFAULT 0,
  expense NUMERIC DEFAULT 0,
  frequency recurrence_frequency NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_occurrence_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_accounts
CREATE POLICY "Users can view their own accounts"
ON public.user_accounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own accounts"
ON public.user_accounts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
ON public.user_accounts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
ON public.user_accounts FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for user_categories
CREATE POLICY "Users can view their own categories"
ON public.user_categories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories"
ON public.user_categories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
ON public.user_categories FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
ON public.user_categories FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for recurring_transactions
CREATE POLICY "Users can view their own recurring transactions"
ON public.recurring_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurring transactions"
ON public.recurring_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring transactions"
ON public.recurring_transactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring transactions"
ON public.recurring_transactions FOR DELETE
USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_user_accounts_updated_at
BEFORE UPDATE ON public.user_accounts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_user_categories_updated_at
BEFORE UPDATE ON public.user_categories
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_recurring_transactions_updated_at
BEFORE UPDATE ON public.recurring_transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add unique constraints
ALTER TABLE public.user_accounts ADD CONSTRAINT unique_user_account UNIQUE (user_id, account_name);
ALTER TABLE public.user_categories ADD CONSTRAINT unique_user_category UNIQUE (user_id, category_name);