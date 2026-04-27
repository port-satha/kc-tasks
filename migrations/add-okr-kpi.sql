-- ============================================
-- OKR & KPI Tracker — Tables + Seed Data
-- ============================================

-- 1. Brands
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view brands" ON public.brands;
CREATE POLICY "Authenticated can view brands" ON public.brands FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can manage brands" ON public.brands;
CREATE POLICY "Authenticated can manage brands" ON public.brands FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. KPIs
CREATE TABLE IF NOT EXISTS public.kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  target_value text NOT NULL,
  unit text DEFAULT '',
  year integer DEFAULT 2026,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view kpis" ON public.kpis;
CREATE POLICY "Authenticated can view kpis" ON public.kpis FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can manage kpis" ON public.kpis;
CREATE POLICY "Authenticated can manage kpis" ON public.kpis FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. KPI Updates
CREATE TABLE IF NOT EXISTS public.kpi_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid REFERENCES public.kpis(id) ON DELETE CASCADE NOT NULL,
  quarter integer NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  current_value text DEFAULT '0',
  percentage integer DEFAULT 0 CHECK (percentage BETWEEN 0 AND 100),
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(kpi_id, quarter)
);

ALTER TABLE public.kpi_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view kpi_updates" ON public.kpi_updates;
CREATE POLICY "Authenticated can view kpi_updates" ON public.kpi_updates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can manage kpi_updates" ON public.kpi_updates;
CREATE POLICY "Authenticated can manage kpi_updates" ON public.kpi_updates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Objectives
CREATE TABLE IF NOT EXISTS public.objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  sort_order integer DEFAULT 0,
  year integer DEFAULT 2026,
  status text DEFAULT 'not-started' CHECK (status IN ('on-track', 'at-risk', 'behind', 'not-started')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view objectives" ON public.objectives;
CREATE POLICY "Authenticated can view objectives" ON public.objectives FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can manage objectives" ON public.objectives;
CREATE POLICY "Authenticated can manage objectives" ON public.objectives FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Key Results
CREATE TABLE IF NOT EXISTS public.key_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid REFERENCES public.objectives(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  owner_name text DEFAULT '',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view key_results" ON public.key_results;
CREATE POLICY "Authenticated can view key_results" ON public.key_results FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can manage key_results" ON public.key_results;
CREATE POLICY "Authenticated can manage key_results" ON public.key_results FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. KR Updates
CREATE TABLE IF NOT EXISTS public.kr_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id uuid REFERENCES public.key_results(id) ON DELETE CASCADE NOT NULL,
  quarter integer NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  target text DEFAULT '',
  actual text DEFAULT '',
  percentage integer DEFAULT 0 CHECK (percentage BETWEEN 0 AND 100),
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(key_result_id, quarter)
);

ALTER TABLE public.kr_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view kr_updates" ON public.kr_updates;
CREATE POLICY "Authenticated can view kr_updates" ON public.kr_updates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can manage kr_updates" ON public.kr_updates;
CREATE POLICY "Authenticated can manage kr_updates" ON public.kr_updates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- SEED DATA (using gen_random_uuid via DO block)
-- ============================================

DO $$
DECLARE
  v_brand_grubby uuid;
  v_brand_onest uuid;
  v_obj_id uuid;
BEGIN

-- Brands
INSERT INTO public.brands (name) VALUES ('grubby') ON CONFLICT (name) DO NOTHING RETURNING id INTO v_brand_grubby;
INSERT INTO public.brands (name) VALUES ('onest') ON CONFLICT (name) DO NOTHING RETURNING id INTO v_brand_onest;

-- If brands already existed, fetch their IDs
IF v_brand_grubby IS NULL THEN SELECT id INTO v_brand_grubby FROM public.brands WHERE name = 'grubby'; END IF;
IF v_brand_onest IS NULL THEN SELECT id INTO v_brand_onest FROM public.brands WHERE name = 'onest'; END IF;

-- ===== GRUBBY KPIs =====
INSERT INTO public.kpis (brand_id, name, target_value, unit, sort_order) VALUES
  (v_brand_grubby, 'Online revenue', '43.6M', '฿', 1),
  (v_brand_grubby, 'LINE CRM members', '10,000', '', 2),
  (v_brand_grubby, 'Premium modern trade', '500K', '฿', 3),
  (v_brand_grubby, '4 vitamins revenue', '12.35M', '฿', 4),
  (v_brand_grubby, 'Pet''s home validation', '800K', '฿', 5);

-- ===== ONEST KPIs =====
INSERT INTO public.kpis (brand_id, name, target_value, unit, sort_order) VALUES
  (v_brand_onest, 'Total revenue', '40M', '฿', 1),
  (v_brand_onest, 'Online revenue', '10M', '฿', 2),
  (v_brand_onest, 'Retail locations', '4', '', 3),
  (v_brand_onest, 'NPD launches', '10 products', '', 4),
  (v_brand_onest, 'Corporate gifting', '1.8M', '฿', 5);

-- KPI updates for all quarters (all start at 0)
INSERT INTO public.kpi_updates (kpi_id, quarter, current_value, percentage)
SELECT k.id, q.q, '0', 0
FROM public.kpis k
CROSS JOIN (VALUES (1),(2),(3),(4)) AS q(q)
ON CONFLICT (kpi_id, quarter) DO NOTHING;

-- ===== GRUBBY OBJECTIVES + KEY RESULTS =====

-- O1
INSERT INTO public.objectives (brand_id, title, sort_order, status)
VALUES (v_brand_grubby, 'O1: Establish grubby as Thailand''s top-of-mind natural and safe choice for plants & pets care', 1, 'not-started')
RETURNING id INTO v_obj_id;

INSERT INTO public.key_results (objective_id, description, owner_name, sort_order) VALUES
  (v_obj_id, 'LINE CRM members growth (quarterly milestones)', 'Jomjam', 1),
  (v_obj_id, 'Monthly content reach across platforms', 'Som', 2),
  (v_obj_id, 'Brand search volume growth on Shopee/Google', 'Pang', 3);

-- O2
INSERT INTO public.objectives (brand_id, title, sort_order, status)
VALUES (v_brand_grubby, 'O2: Prove the grubby category model across plant treatment, vitamins & pet''s home', 2, 'not-started')
RETURNING id INTO v_obj_id;

INSERT INTO public.key_results (objective_id, description, owner_name, sort_order) VALUES
  (v_obj_id, 'Total online revenue (quarterly milestones)', 'Sek', 1),
  (v_obj_id, 'Repeat purchase rate (quarterly milestones)', 'Pang', 2),
  (v_obj_id, 'Pet''s home validated (binary milestone, H2)', 'Sa', 3);

-- O3
INSERT INTO public.objectives (brand_id, title, sort_order, status)
VALUES (v_brand_grubby, 'O3: Establish grubby''s first offline footprint through premium modern trade', 3, 'not-started')
RETURNING id INTO v_obj_id;

INSERT INTO public.key_results (objective_id, description, owner_name, sort_order) VALUES
  (v_obj_id, 'To be defined after mid-May', 'Sek', 1);

-- O4
INSERT INTO public.objectives (brand_id, title, sort_order, status)
VALUES (v_brand_grubby, 'O4: Build the operational and team backbone ready to scale into 2027', 4, 'not-started')
RETURNING id INTO v_obj_id;

INSERT INTO public.key_results (objective_id, description, owner_name, sort_order) VALUES
  (v_obj_id, 'Key hires onboarded', 'First', 1),
  (v_obj_id, 'Fulfillment SLA < 48hrs', 'Sa', 2);

-- ===== ONEST OBJECTIVES + KEY RESULTS =====

-- O1
INSERT INTO public.objectives (brand_id, title, sort_order, status)
VALUES (v_brand_onest, 'O1: Online revenue growth from 1.25M to 10M', 1, 'not-started')
RETURNING id INTO v_obj_id;

INSERT INTO public.key_results (objective_id, description, owner_name, sort_order) VALUES
  (v_obj_id, 'Launch body lotion + cleanser', 'Pim', 1),
  (v_obj_id, 'TikTok revenue reaches 50K in March', 'Pim', 2),
  (v_obj_id, 'Identify 1 product hero signal', 'Pim', 3);

-- O2
INSERT INTO public.objectives (brand_id, title, sort_order, status)
VALUES (v_brand_onest, 'O2: Build brand awareness as premium Thai lifestyle brand', 2, 'not-started')
RETURNING id INTO v_obj_id;

INSERT INTO public.key_results (objective_id, description, owner_name, sort_order) VALUES
  (v_obj_id, 'Instagram followers growth', 'Pim', 1),
  (v_obj_id, 'Press/media features', 'Pim', 2),
  (v_obj_id, 'Content reach monthly', 'Pim', 3);

-- O3
INSERT INTO public.objectives (brand_id, title, sort_order, status)
VALUES (v_brand_onest, 'O3: Find 2 hero products through NPD pipeline', 3, 'not-started')
RETURNING id INTO v_obj_id;

INSERT INTO public.key_results (objective_id, description, owner_name, sort_order) VALUES
  (v_obj_id, 'Launch 3 products in Q1', 'Amp', 1),
  (v_obj_id, 'Customer rating > 4.5 for new launches', 'Amp', 2);

-- O4
INSERT INTO public.objectives (brand_id, title, sort_order, status)
VALUES (v_brand_onest, 'O4: Retail excellence across all locations', 4, 'not-started')
RETURNING id INTO v_obj_id;

INSERT INTO public.key_results (objective_id, description, owner_name, sort_order) VALUES
  (v_obj_id, 'Soul Song Wat launch on time', 'Pim', 1),
  (v_obj_id, 'Siam Discovery monthly target', 'Pim', 2),
  (v_obj_id, 'Stock accuracy > 95%', 'Pim', 3);

-- O5
INSERT INTO public.objectives (brand_id, title, sort_order, status)
VALUES (v_brand_onest, 'O5: Establish CRM and membership foundation', 5, 'not-started')
RETURNING id INTO v_obj_id;

INSERT INTO public.key_results (objective_id, description, owner_name, sort_order) VALUES
  (v_obj_id, 'LINE OA members', 'Pim', 1),
  (v_obj_id, 'Website CRM system live', 'Noon', 2);

-- O6
INSERT INTO public.objectives (brand_id, title, sort_order, status)
VALUES (v_brand_onest, 'O6: Singapore market preparation', 6, 'not-started')
RETURNING id INTO v_obj_id;

INSERT INTO public.key_results (objective_id, description, owner_name, sort_order) VALUES
  (v_obj_id, 'Market research complete', 'Port', 1);

-- KR updates for all quarters (all start at 0)
INSERT INTO public.kr_updates (key_result_id, quarter, target, actual, percentage)
SELECT kr.id, q.q, '', '', 0
FROM public.key_results kr
CROSS JOIN (VALUES (1),(2),(3),(4)) AS q(q)
ON CONFLICT (key_result_id, quarter) DO NOTHING;

END $$;
