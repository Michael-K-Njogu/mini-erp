ALTER TABLE public.customers
ADD COLUMN customer_number text;

CREATE UNIQUE INDEX customers_customer_number_key
ON public.customers (customer_number);
