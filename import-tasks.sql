-- Import all 135 Asana tasks into KC Tasks
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  user_id uuid;
  task_id uuid;
  sort_idx integer := 0;
  sub_idx integer;
BEGIN
  -- Get your user ID
  SELECT id INTO user_id FROM public.profiles WHERE email = 'mitdanai.s@coroand.co';

  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Make sure you have signed up first.';
  END IF;

  -- ===== 2025 Big Rocks =====
  sort_idx := 0;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Business 100M -> SV & onest Focus (only 2 things)', '2025 Big Rocks', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Healthy: น้ำหนัก 70 และฟิต', '2025 Big Rocks', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Focus: ใจเย็นๆทำทีละอย่าง ทีละไตรมาส อยู่กับปัจจุบัน', '2025 Big Rocks', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Join HOW', '2025 Big Rocks', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Enjoy moment with family', '2025 Big Rocks', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  -- ===== Recently assigned =====

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Check รากฟันเทียม', 'Recently assigned', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('พี่หนึ่งคืนเงิน 5k ถึง 1 July 26 (10 เดือน)', 'Recently assigned', '2026-05-01', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('จัดการเรื่องเครื่องสติกเกอร์', 'Recently assigned', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Send ever pine satin veil set to j and bank', 'Recently assigned', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Scan โฉนดอนุบาลให้อะตอม', 'Recently assigned', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('ดู secret sauce', 'Recently assigned', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Concert for employee?', 'Recently assigned', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Put scientific in usp both sv and onest', 'Recently assigned', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Something related to sleep for onest anti dust mite', 'Recently assigned', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('ม่านดาดฟ้า', 'Recently assigned', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  -- ===== Most Important Lists =====

  -- SV Business Plan & NPD 2026 (with 23 subtasks)
  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('SV Business Plan & NPD 2026', 'Most Important Lists', NULL, '', '', '', 'In Progress', '', NULL, user_id, sort_idx)
  RETURNING id INTO task_id;
  sort_idx := sort_idx + 1;
  sub_idx := 0;
  INSERT INTO public.subtasks (task_id, title, done, sort_order) VALUES
    (task_id, 'Groom all products pricing again', false, 0),
    (task_id, 'Set up SV Roadmap in Y26', false, 1),
    (task_id, 'Brand & Product Ref by Design Team', false, 2),
    (task_id, 'Options for new brand name, Plants & Pets', false, 3),
    (task_id, 'Final NPD for 3.3', false, 4),
    (task_id, 'Final NPD 6.6 (Goal: Max 3 SKUs/round)', false, 5),
    (task_id, 'Branding Structure', false, 6),
    (task_id, 'Prepare SV NPD Plan by Port', false, 7),
    (task_id, 'Re organize Category & Category Naming + Consolidate SKU ซ้ำซ้อน', false, 8),
    (task_id, 'Port SV 2026 Plan & Budget & Goal & Output KPI', false, 9),
    (task_id, '(SV) Final Product Category & Product Naming & Category Packaging Design', false, 10),
    (task_id, 'Follow up Logo & Brand CI Final Draft', false, 11),
    (task_id, '(SV) Share 2026 Plan with Team', false, 12),
    (task_id, '(SV) Team Objective', false, 13),
    (task_id, '(SV) 2026 Budget Plan', false, 14),
    (task_id, '(SV) KPI&OKR 2026 Final in Townhall', false, 15),
    (task_id, 'Final NPD วิตามินใบ 3.3 Spec', false, 16),
    (task_id, 'Final NPD วิตามินบำรุงดิน 4.4 Spec', false, 17),
    (task_id, 'Final NPD วิตามินราก 5.5 Spec', false, 18),
    (task_id, 'Final NPD Ever Bloom 6.6 Spec', false, 19),
    (task_id, 'Final NPD 9.9 (Pet)', false, 20),
    (task_id, 'Final NPD 11.11', false, 21),
    (task_id, 'Final NPD Pet''s Home Cat USP & Spec', false, 22);

  -- onest Business Plan & NPD 2026 (with 20 subtasks)
  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('onest Business Plan & NPD 2026', 'Most Important Lists', NULL, '', '', '', 'In Progress', '', NULL, user_id, sort_idx)
  RETURNING id INTO task_id;
  sort_idx := sort_idx + 1;
  INSERT INTO public.subtasks (task_id, title, done, sort_order) VALUES
    (task_id, '(onest) 2026 Business Plan & Company Objective', false, 0),
    (task_id, 'Consolidate NPD from 1st draft for Amp', false, 1),
    (task_id, 'Amp presents 2nd Draft', false, 2),
    (task_id, '(onest NPD) Update 1st Draft from Peem', false, 3),
    (task_id, '(onest NPD) Update 2nd Draft from Peem', false, 4),
    (task_id, '(onest NPD) Feedback 1st draft from MKT Team', false, 5),
    (task_id, '(onest) Share 2026 Plan & Budget with Team', false, 6),
    (task_id, '(onest) 2026 Recheck Company KPI', false, 7),
    (task_id, '(onest) Team Objective', false, 8),
    (task_id, '(onest) Set up roadmap in Y26', false, 9),
    (task_id, '(onest) 2026 Budget Final', false, 10),
    (task_id, '(onest) 2026 KPI&OKR', false, 11),
    (task_id, '(onest) Set up product Spec Timeline', false, 12),
    (task_id, '(onest) Final Hand cream (3.3) Spec', false, 13),
    (task_id, '(onest) Final Body & Hair Fragrance Mist (25.4) Spec', false, 14),
    (task_id, '(onest) Final Wood Cleanser (6.6) Spec', false, 15),
    (task_id, '(onest) Final Wood Oil (6.6) Spec', false, 16),
    (task_id, '(onest) Final Hair Shampoo & Condi (25.7) Spec', false, 17),
    (task_id, '(onest) Final Anti-Mite Pillow spray (25.9) Spec', false, 18),
    (task_id, '(onest) Final Fabric Fragrance Athleisure (25.10) Spec', false, 19),
    (task_id, '(onest) Final Dry Knit Wash (25.11) Spec', false, 20);

  -- CEO Budget Approve (with 20 subtasks)
  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CEO Budget Approve', 'Most Important Lists', NULL, '', '', '', '', '', NULL, user_id, sort_idx)
  RETURNING id INTO task_id;
  sort_idx := sort_idx + 1;
  INSERT INTO public.subtasks (task_id, title, done, sort_order) VALUES
    (task_id, 'CEO Approve for 16 March Payment', false, 0),
    (task_id, 'CEO Approve for 31 March Payment', false, 1),
    (task_id, 'CEO Approve for 16 April Payment', false, 2),
    (task_id, 'CEO Approve for 30 April Payment', false, 3),
    (task_id, 'CEO Approve for 15 May Payment', false, 4),
    (task_id, 'CEO Approve for 29 May Payment', false, 5),
    (task_id, 'CEO Approve for 15 June Payment', false, 6),
    (task_id, 'CEO Approve for 30 June Payment', false, 7),
    (task_id, 'CEO Approve for 15 July Payment', false, 8),
    (task_id, 'CEO Approve for 30 July Payment', false, 9),
    (task_id, 'CEO Approve for 14 August Payment', false, 10),
    (task_id, 'CEO Approve for 31 August Payment', false, 11),
    (task_id, 'CEO Approve for 15 Sep Payment', false, 12),
    (task_id, 'CEO Approve for 30 Sep Payment', false, 13),
    (task_id, 'CEO Approve for 15 Oct Payment', false, 14),
    (task_id, 'CEO Approve for 30 Oct Payment', false, 15),
    (task_id, 'CEO Approve for 16 Nov Payment', false, 16),
    (task_id, 'CEO Approve for 30 Nov Payment', false, 17),
    (task_id, 'CEO Approve for 15 Dec Payment', false, 18),
    (task_id, 'CEO Approve for 30 Dec Payment', false, 19);

  -- NEW OFFICE (with 1 subtask)
  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('NEW OFFICE', 'Most Important Lists', NULL, '', '', '', 'Done', '', NULL, user_id, sort_idx)
  RETURNING id INTO task_id;
  sort_idx := sort_idx + 1;
  INSERT INTO public.subtasks (task_id, title, done, sort_order) VALUES
    (task_id, 'Plan office Investment', false, 0);

  -- (Cancel) Soul Songwat 20 Feb 2026 (with 10 subtasks)
  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('(Cancel) Soul Songwat 20 Feb 2026', 'Most Important Lists', NULL, '', '', '', '', '', NULL, user_id, sort_idx)
  RETURNING id INTO task_id;
  sort_idx := sort_idx + 1;
  INSERT INTO public.subtasks (task_id, title, done, sort_order) VALUES
    (task_id, 'Confirm Soul Song Wat postpone date', false, 0),
    (task_id, 'DESIGN & DEVELOP', false, 1),
    (task_id, 'ส่งแบบ Design', false, 2),
    (task_id, 'ส่งแบบ ก่อสร้าง และระบบ ให้ผู้รับเหมา', false, 3),
    (task_id, 'Final Quotation from ผู้รับเหมา', false, 4),
    (task_id, 'CONSTRUCTION', false, 5),
    (task_id, 'VISUAL MERCHANDISING', false, 6),
    (task_id, 'OPERATION', false, 7),
    (task_id, 'ADD ON SYSTEM', false, 8),
    (task_id, 'SOFT OPENING', false, 9);

  -- Security at Factory (with 1 subtask)
  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Security at Factory', 'Most Important Lists', NULL, '', '', '', 'Done', '', NULL, user_id, sort_idx)
  RETURNING id INTO task_id;
  sort_idx := sort_idx + 1;
  INSERT INTO public.subtasks (task_id, title, done, sort_order) VALUES
    (task_id, 'Update เรื่องความปลอดภัย และงบลงทุนย้ายคลังด้านหน้า', false, 0);

  -- SV ทะเบียนสินค้าทั้งหมด
  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('SV ทะเบียนสินค้าทั้งหมด', 'Most Important Lists', NULL, '', 'High', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  -- ===== Monday =====

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('(onest) Update haircare NPD', 'Monday', '2026-04-06', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('(onest) Final Hair Shampoo & Condi (25.7) Spec', 'Monday', '2026-04-06', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Monthly Cashflow updates (3 months)', 'Monday', '2026-04-06', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Talk with Sa', 'Monday', '2026-04-06', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Update Salary Cash Flow by Finance', 'Monday', '2026-04-20', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Think about export (onest)', 'Monday', '2026-05-04', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CEO Approve for 30 June Payment', 'Monday', '2026-06-22', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CEO Approve for 15 Sep Payment', 'Monday', '2026-09-07', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  -- ===== Tuesday =====

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Recheck Monthly Income Statement', 'Tuesday', '2026-04-28', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CEO Approve for 15 July Payment', 'Tuesday', '2026-07-07', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('ล้างแอร์บ้าน', 'Tuesday', '2026-08-11', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CEO Approve for 30 Sep Payment', 'Tuesday', '2026-09-22', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CEO Approve for 15 Oct Payment', 'Tuesday', '2026-10-06', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CEO Approve for 30 Dec Payment', 'Tuesday', '2026-12-22', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  -- ===== Wednesday =====

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Recheck forecast', 'Wednesday', '2026-04-01', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('ทำฟันรอบ 6 เดือน', 'Wednesday', '2026-04-01', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('How to turn kind collective into something that solves real value like i love you restaurant', 'Wednesday', '2026-04-01', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Final NPD 9.9 (Pet)', 'Wednesday', '2026-04-08', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Final NPD 11.11', 'Wednesday', '2026-04-08', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CEO Approve for 30 April Payment', 'Wednesday', '2026-04-22', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CEO Approve for 30 July Payment', 'Wednesday', '2026-07-22', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CEO Approve for 30 Oct Payment', 'Wednesday', '2026-10-21', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Ai youtube', 'Wednesday', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  -- ===== Thursday =====

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Follow up on the mall emporium', 'Thursday', '2026-04-02', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('(onest) Update เรื่อง New Location Plan', 'Thursday', '2026-04-02', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Confirm OKR Noon with Amp', 'Thursday', '2026-04-02', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('(onest) Final Product Spec Summary', 'Thursday', '2026-04-02', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Plan recheck รอบ Dead Stock', 'Thursday', '2026-04-02', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('ค่าเดินทาง หรือค่าใช้จ่ายต่างๆที่ไม่ผ่าน PO ตอนนี้ จะทำยังไง', 'Thursday', '2026-04-02', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('(onest) Process Details Final all NPD', 'Thursday', '2026-04-02', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('(onest) Final Dry Knit Wash (25.11) Spec', 'Thursday', '2026-04-02', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Award for onest', 'Thursday', '2026-04-02', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('ทำเครื่องพ่นกลิ่นเอง for B2B model?', 'Thursday', '2026-04-02', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Onest website', 'Thursday', '2026-04-02', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Recheck grubby product spec', 'Thursday', '2026-04-02', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Cafe on 2nd floor talat noi', 'Thursday', '2026-04-02', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Update Future File', 'Thursday', '2026-04-02', 'Low', 'High', 'Low effort', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CEO Approve for 16 April Payment', 'Thursday', '2026-04-02', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Follow up on Procurement Protocol in monthly', 'Thursday', '2026-04-23', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('โอนเงินบ้านประจำเดือน', 'Thursday', '2026-04-30', 'Low', 'Low', 'Low effort', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CEO Approve for 15 May Payment', 'Thursday', '2026-05-07', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CEO Approve for 29 May Payment', 'Thursday', '2026-05-21', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CEO Approve for 14 August Payment', 'Thursday', '2026-08-06', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Be careful น้ำขึ้น Talat noi', 'Thursday', '2026-10-01', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CEO Approve for 15 Dec Payment', 'Thursday', '2026-12-03', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Try claude financial', 'Thursday', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  -- ===== Friday =====

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Stock SV ตรงหรือไม่?', 'Friday', '2026-04-03', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Stock onest ตรงหรือไม่?', 'Friday', '2026-04-03', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('(onest) Follow up on Scan และติด Barcode ผิด prevention', 'Friday', '2026-04-03', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('(onest) Follow up on Online Stock หน้าร้าน Daily', 'Friday', '2026-04-03', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Plan next week + Clear ตารางให้ว่างอาทิตย์ละวัน', 'Friday', '2026-04-03', 'Low', 'High', 'Low effort', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Hr โรงงานร้องทุกข์ system', 'Friday', '2026-04-03', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  -- Recheck KPI (with 2 subtasks)
  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Recheck KPI', 'Friday', '2026-04-03', 'High', 'High', 'Low effort', '', '', NULL, user_id, sort_idx)
  RETURNING id INTO task_id;
  sort_idx := sort_idx + 1;
  INSERT INTO public.subtasks (task_id, title, done, sort_order) VALUES
    (task_id, 'SV - KPI', false, 0),
    (task_id, 'onest - KPI', false, 1);

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Empowering life 2', 'Friday', '2026-04-03', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('New Position for everyone', 'Friday', '2026-04-03', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Family finance', 'Friday', '2026-04-03', 'Low', 'Medium', 'Medium effort', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Work & Personal Finance + บิล at Office', 'Friday', '2026-04-03', 'Low', 'Medium', 'Medium effort', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Update Mid Month Cash Flow (1 Day after Port approve)', 'Friday', '2026-04-11', '', 'High', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('จ่ายค่าน้ำ', 'Friday', '2026-04-25', 'Low', 'Low', 'Low effort', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Pay all Credit card', 'Friday', '2026-04-25', 'Medium', 'Low', 'Medium effort', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Update End of month Cash Flow (1 วันหลัง Port Approve)', 'Friday', '2026-04-26', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Ellie Lead Promotion', 'Friday', '2026-05-01', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Renew US Passport (Port)', 'Friday', '2026-05-01', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Kind Collectives Activation (1 June)', 'Friday', '2026-05-22', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('(Narasiri) ติดตั้งรางระบายน้ำ', 'Friday', '2026-05-22', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CEO Approve for 15 June Payment', 'Friday', '2026-06-05', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Pay SSF/RMF', 'Friday', '2026-06-26', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CEO Approve for 31 August Payment', 'Friday', '2026-08-21', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CEO Approve for 16 Nov Payment', 'Friday', '2026-11-06', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CEO Approve for 30 Nov Payment', 'Friday', '2026-11-20', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  -- ===== Weekends =====

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('จัดการมรดก', 'Weekends', '2026-03-31', '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Rerun Longtunman', 'Weekends', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('But book of elon', 'Weekends', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('วัน Confirm House Pub', 'Weekends', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('ติดลิฟท์ตรงไหนได้', 'Weekends', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Plan inheritance investment', 'Weekends', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('ซื้อรองเท้ากีฬาห้วยขวาง', 'Weekends', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('ซื้อโต๊ะข้างเตียง', 'Weekends', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('ของบ้านห้วยขวาง', 'Weekends', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  -- ===== Business Notes =====

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Sek Talk Summary', 'Business Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Company Financial', 'Business Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Office Rental Business', 'Business Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Create checklist for creating new successful products', 'Business Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('1 on 1 List end of 2025', 'Business Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('1 on 1 question', 'Business Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Follow up Port Amp JD', 'Business Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Founder Meeting', 'Business Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('AI Course', 'Business Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Aug 2025 1 on 1 Notes', 'Business Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('onest success formula', 'Business Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CORO FIELD Closing down steps', 'Business Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Onest ideas', 'Business Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Mistine China', 'Business Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Yanhee', 'Business Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  -- ===== Personal Notes =====

  -- จัดกระเป๋า USA Trip (with 14 subtasks)
  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('จัดกระเป๋า USA Trip 11 วัน 10 คืน', 'Personal Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx)
  RETURNING id INTO task_id;
  sort_idx := sort_idx + 1;
  INSERT INTO public.subtasks (task_id, title, done, sort_order) VALUES
    (task_id, 'Passport & Driver license of everyone', false, 0),
    (task_id, 'Computer & all chargers', false, 1),
    (task_id, 'กระเป๋าครีม', false, 2),
    (task_id, 'ถุงเท้า 10', false, 3),
    (task_id, 'เสื้อ 11', false, 4),
    (task_id, 'กางเกง 3', false, 5),
    (task_id, 'กางเกงใน 10 (9)', false, 6),
    (task_id, 'เสื้อหนาว x 1', false, 7),
    (task_id, 'เสื้อ sweater x 2', false, 8),
    (task_id, 'Heat tech เสื้อ กางเกง x 3', false, 9),
    (task_id, 'ชุดนอน 1', false, 10),
    (task_id, 'ยา', false, 11),
    (task_id, 'Book 1', false, 12),
    (task_id, 'Shoe 1', false, 13);

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('บทสวดม๊าแอม', 'Personal Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('โครงสร้างผู้ถือหุ้นบริษัททั้งหมด', 'Personal Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('New Year list', 'Personal Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Nanny Interview Question', 'Personal Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('ผลตรวจสุขภาพ 21 June 2025', 'Personal Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('How to prevent p pink', 'Personal Notes', NULL, 'Medium', 'High', 'High effort', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('เอกสารสัญญาซื้อขายบ้านนาราสิริ + โฉนด', 'Personal Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('โฉนดสวนผึ้งชื่อป๊า', 'Personal Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('ต่อเติมบ้านนาราสิริ', 'Personal Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('สวดบทน้าชา', 'Personal Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Mita Stem Cell', 'Personal Notes', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  -- ===== Books note =====

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Designing your life', 'Books note', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Jo thana', 'Books note', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('CFO', 'Books note', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('การบินไทย', 'Books note', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Slow productivity', 'Books note', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Health work play love', 'Books note', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  -- ===== Do later =====

  INSERT INTO public.tasks (title, section, due, priority, value, effort, progress, notes, project_id, created_by, sort_order)
  VALUES ('Pinetree spa', 'Do later', NULL, '', '', '', '', '', NULL, user_id, sort_idx);
  sort_idx := sort_idx + 1;

  RAISE NOTICE 'Successfully imported % tasks!', sort_idx;
END $$;
