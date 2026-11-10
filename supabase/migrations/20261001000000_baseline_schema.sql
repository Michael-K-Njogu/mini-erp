-- Baseline schema for a fresh Supabase project (e.g. the public demo project).
-- Do NOT run this against the original project: its tables already exist.
-- customers.customer_number and the orders actor-audit columns are added by the
-- migrations that follow this one.

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  role text NOT NULL DEFAULT 'Sales',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  credit_limit numeric NOT NULL,
  customer_type text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  sector text NOT NULL DEFAULT '',
  region text NOT NULL,
  vat_number text NOT NULL,
  contact_person text,
  phone_primary text NOT NULL,
  phone_secondary text,
  delivery_address text NOT NULL,
  city text NOT NULL,
  credit_status text NOT NULL,
  image_url text
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  unit text NOT NULL,
  cost_price numeric DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT products_sku_key UNIQUE (sku)
);

CREATE TABLE public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id),
  quantity_on_hand numeric DEFAULT 0,
  quantity_reserved numeric DEFAULT 0,
  reorder_level numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT inventory_product_id_key UNIQUE (product_id)
);

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id),
  movement_type text NOT NULL DEFAULT '',
  quantity numeric NOT NULL,
  reference_type text,
  reference_id uuid,
  reason text,
  notes text,
  created_by uuid NOT NULL REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  status text NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  posted_at timestamptz,
  processing_started_at timestamptz,
  completed_at timestamptz,
  canceled_at timestamptz,
  CONSTRAINT orders_order_number_key UNIQUE (order_number),
  CONSTRAINT orders_status_check CHECK (
    status IN ('Draft', 'Pending', 'Processing', 'Completed', 'Canceled')
  )
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE RESTRICT,
  sku text NOT NULL,
  product_name text NOT NULL,
  unit text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount numeric DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'system',
  entity_type text,
  entity_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orders_customer_id_idx ON public.orders (customer_id);
CREATE INDEX order_items_order_id_idx ON public.order_items (order_id);
CREATE INDEX stock_movements_product_id_idx ON public.stock_movements (product_id);
CREATE INDEX notifications_user_id_idx ON public.notifications (user_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
