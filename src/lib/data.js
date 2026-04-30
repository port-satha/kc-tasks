export const DEFAULT_SECTIONS = [
  '2025 Big Rocks',
  'Most Important Lists',
  'Past Deadline',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Weekends',
  'Business Notes',
  'Personal Notes',
  'Books note',
  'Do later',
]

// SECTIONS is kept for backward compat — components now use useSections() hook
export const SECTIONS = DEFAULT_SECTIONS

export const RECURRENCE_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const PRIORITIES = ['High', 'Medium', 'Low']
export const VALUES = ['High', 'Medium', 'Low']
export const EFFORT_LEVELS = ['Low effort', 'Medium effort', 'High effort', 'Need to scope']
export const TASK_PROGRESS = ['Not Started', 'In Progress', 'Waiting', 'Deferred', 'Done']

export const PRIORITY_COLORS = {
  High: 'bg-[rgba(226,75,74,0.08)] text-[#A32D2D]',
  Medium: 'bg-[rgba(186,117,23,0.08)] text-[#854F0B]',
  Low: 'bg-[rgba(44,44,42,0.06)] text-[#5F5E5A]',
}

export const VALUE_COLORS = {
  High: 'bg-[rgba(45,80,22,0.08)] text-[#2D5016]',
  Medium: 'bg-[rgba(186,117,23,0.08)] text-[#854F0B]',
  Low: 'bg-[rgba(44,44,42,0.06)] text-[#5F5E5A]',
}

export const EFFORT_COLORS = {
  'Low effort': 'bg-[rgba(99,153,34,0.08)] text-[#4A7A12]',
  'Medium effort': 'bg-[rgba(186,117,23,0.08)] text-[#854F0B]',
  'High effort': 'bg-[rgba(226,75,74,0.08)] text-[#A32D2D]',
  'Need to scope': 'bg-[rgba(83,74,183,0.08)] text-[#534AB7]',
}

export const PROGRESS_COLORS = {
  'Not Started': 'bg-[rgba(44,44,42,0.06)] text-[#888780]',
  'In Progress': 'bg-[rgba(55,138,221,0.08)] text-[#2367A8]',
  'Waiting': 'bg-[rgba(186,117,23,0.08)] text-[#854F0B]',
  'Deferred': 'bg-[rgba(44,44,42,0.06)] text-[#5F5E5A]',
  'Done': 'bg-[rgba(99,153,34,0.08)] text-[#4A7A12]',
}

export const PROGRESS_DOT = {
  'Not Started': 'bg-[#B4B2A9]',
  'In Progress': 'bg-[#378ADD]',
  'Waiting': 'bg-[#BA7517]',
  'Deferred': 'bg-[#888780]',
  'Done': 'bg-[#639922]',
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export const DEFAULT_TASKS = [
  // ===== 2025 Big Rocks =====
  { id: uid(), title: 'Business 100M -> SV & onest Focus (only 2 things)', section: '2025 Big Rocks', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Healthy: น้ำหนัก 70 และฟิต', section: '2025 Big Rocks', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Focus: ใจเย็นๆทำทีละอย่าง ทีละไตรมาส อยู่กับปัจจุบัน', section: '2025 Big Rocks', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Join HOW', section: '2025 Big Rocks', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Enjoy moment with family', section: '2025 Big Rocks', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },

  // ===== Recently assigned =====
  { id: uid(), title: 'Check รากฟันเทียม', section: 'Recently assigned', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'พี่หนึ่งคืนเงิน 5k ถึง 1 July 26 (10 เดือน)', section: 'Recently assigned', due: '2026-05-01', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'จัดการเรื่องเครื่องสติกเกอร์', section: 'Recently assigned', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Send ever pine satin veil set to j and bank', section: 'Recently assigned', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Scan โฉนดอนุบาลให้อะตอม', section: 'Recently assigned', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'ดู secret sauce', section: 'Recently assigned', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Concert for employee?', section: 'Recently assigned', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Put scientific in usp both sv and onest', section: 'Recently assigned', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Something related to sleep for onest anti dust mite', section: 'Recently assigned', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'ม่านดาดฟ้า', section: 'Recently assigned', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },

  // ===== Most Important Lists =====
  { id: uid(), title: 'SV Business Plan & NPD 2026', section: 'Most Important Lists', due: '', priority: '', value: '', effort: '', progress: 'In Progress', notes: '', subtasks: [
    { id: uid(), title: 'Groom all products pricing again', done: false },
    { id: uid(), title: 'Set up SV Roadmap in Y26', done: false },
    { id: uid(), title: 'Brand & Product Ref by Design Team', done: false },
    { id: uid(), title: 'Options for new brand name, Plants & Pets', done: false },
    { id: uid(), title: 'Final NPD for 3.3', done: false },
    { id: uid(), title: 'Final NPD 6.6 (Goal: Max 3 SKUs/round)', done: false },
    { id: uid(), title: 'Branding Structure', done: false },
    { id: uid(), title: 'Prepare SV NPD Plan by Port', done: false },
    { id: uid(), title: 'Re organize Category & Category Naming + Consolidate SKU ซ้ำซ้อน', done: false },
    { id: uid(), title: 'Port SV 2026 Plan & Budget & Goal & Output KPI', done: false },
    { id: uid(), title: '(SV) Final Product Category & Product Naming & Category Packaging Design', done: false },
    { id: uid(), title: 'Follow up Logo & Brand CI Final Draft', done: false },
    { id: uid(), title: '(SV) Share 2026 Plan with Team', done: false },
    { id: uid(), title: '(SV) Team Objective', done: false },
    { id: uid(), title: '(SV) 2026 Budget Plan', done: false },
    { id: uid(), title: '(SV) KPI&OKR 2026 Final in Townhall', done: false },
    { id: uid(), title: 'Final NPD วิตามินใบ 3.3 Spec', done: false },
    { id: uid(), title: 'Final NPD วิตามินบำรุงดิน 4.4 Spec', done: false },
    { id: uid(), title: 'Final NPD วิตามินราก 5.5 Spec', done: false },
    { id: uid(), title: 'Final NPD Ever Bloom 6.6 Spec', done: false },
    { id: uid(), title: 'Final NPD 9.9 (Pet)', done: false },
    { id: uid(), title: 'Final NPD 11.11', done: false },
    { id: uid(), title: 'Final NPD Pet\'s Home Cat USP & Spec', done: false },
  ]},
  { id: uid(), title: 'onest Business Plan & NPD 2026', section: 'Most Important Lists', due: '', priority: '', value: '', effort: '', progress: 'In Progress', notes: '', subtasks: [
    { id: uid(), title: '(onest) 2026 Business Plan & Company Objective', done: false },
    { id: uid(), title: 'Consolidate NPD from 1st draft for Amp', done: false },
    { id: uid(), title: 'Amp presents 2nd Draft', done: false },
    { id: uid(), title: '(onest NPD) Update 1st Draft from Peem', done: false },
    { id: uid(), title: '(onest NPD) Update 2nd Draft from Peem', done: false },
    { id: uid(), title: '(onest NPD) Feedback 1st draft from MKT Team', done: false },
    { id: uid(), title: '(onest) Share 2026 Plan & Budget with Team', done: false },
    { id: uid(), title: '(onest) 2026 Recheck Company KPI', done: false },
    { id: uid(), title: '(onest) Team Objective', done: false },
    { id: uid(), title: '(onest) Set up roadmap in Y26', done: false },
    { id: uid(), title: '(onest) 2026 Budget Final', done: false },
    { id: uid(), title: '(onest) 2026 KPI&OKR', done: false },
    { id: uid(), title: '(onest) Set up product Spec Timeline', done: false },
    { id: uid(), title: '(onest) Final Hand cream (3.3) Spec', done: false },
    { id: uid(), title: '(onest) Final Body & Hair Fragrance Mist (25.4) Spec', done: false },
    { id: uid(), title: '(onest) Final Wood Cleanser (6.6) Spec', done: false },
    { id: uid(), title: '(onest) Final Wood Oil (6.6) Spec', done: false },
    { id: uid(), title: '(onest) Final Hair Shampoo & Condi (25.7) Spec', done: false },
    { id: uid(), title: '(onest) Final Anti-Mite Pillow spray (25.9) Spec', done: false },
    { id: uid(), title: '(onest) Final Fabric Fragrance Athleisure (25.10) Spec', done: false },
    { id: uid(), title: '(onest) Final Dry Knit Wash (25.11) Spec', done: false },
  ]},
  { id: uid(), title: 'CEO Budget Approve', section: 'Most Important Lists', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [
    { id: uid(), title: 'CEO Approve for 16 March Payment', done: false },
    { id: uid(), title: 'CEO Approve for 31 March Payment', done: false },
    { id: uid(), title: 'CEO Approve for 16 April Payment', done: false },
    { id: uid(), title: 'CEO Approve for 30 April Payment', done: false },
    { id: uid(), title: 'CEO Approve for 15 May Payment', done: false },
    { id: uid(), title: 'CEO Approve for 29 May Payment', done: false },
    { id: uid(), title: 'CEO Approve for 15 June Payment', done: false },
    { id: uid(), title: 'CEO Approve for 30 June Payment', done: false },
    { id: uid(), title: 'CEO Approve for 15 July Payment', done: false },
    { id: uid(), title: 'CEO Approve for 30 July Payment', done: false },
    { id: uid(), title: 'CEO Approve for 14 August Payment', done: false },
    { id: uid(), title: 'CEO Approve for 31 August Payment', done: false },
    { id: uid(), title: 'CEO Approve for 15 Sep Payment', done: false },
    { id: uid(), title: 'CEO Approve for 30 Sep Payment', done: false },
    { id: uid(), title: 'CEO Approve for 15 Oct Payment', done: false },
    { id: uid(), title: 'CEO Approve for 30 Oct Payment', done: false },
    { id: uid(), title: 'CEO Approve for 16 Nov Payment', done: false },
    { id: uid(), title: 'CEO Approve for 30 Nov Payment', done: false },
    { id: uid(), title: 'CEO Approve for 15 Dec Payment', done: false },
    { id: uid(), title: 'CEO Approve for 30 Dec Payment', done: false },
  ]},
  { id: uid(), title: 'NEW OFFICE', section: 'Most Important Lists', due: '', priority: '', value: '', effort: '', progress: 'Done', notes: '', subtasks: [
    { id: uid(), title: 'Plan office Investment', done: false },
  ]},
  { id: uid(), title: '(Cancel) Soul Songwat 20 Feb 2026', section: 'Most Important Lists', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [
    { id: uid(), title: 'Confirm Soul Song Wat postpone date', done: false },
    { id: uid(), title: 'DESIGN & DEVELOP', done: false },
    { id: uid(), title: 'ส่งแบบ Design', done: false },
    { id: uid(), title: 'ส่งแบบ ก่อสร้าง และระบบ ให้ผู้รับเหมา', done: false },
    { id: uid(), title: 'Final Quotation from ผู้รับเหมา', done: false },
    { id: uid(), title: 'CONSTRUCTION', done: false },
    { id: uid(), title: 'VISUAL MERCHANDISING', done: false },
    { id: uid(), title: 'OPERATION', done: false },
    { id: uid(), title: 'ADD ON SYSTEM', done: false },
    { id: uid(), title: 'SOFT OPENING', done: false },
  ]},
  { id: uid(), title: 'Security at Factory', section: 'Most Important Lists', due: '', priority: '', value: '', effort: '', progress: 'Done', notes: '', subtasks: [
    { id: uid(), title: 'Update เรื่องความปลอดภัย และงบลงทุนย้ายคลังด้านหน้า', done: false },
  ]},
  { id: uid(), title: 'SV ทะเบียนสินค้าทั้งหมด', section: 'Most Important Lists', due: '', priority: '', value: 'High', effort: '', progress: '', notes: '', subtasks: [] },

  // ===== Monday =====
  { id: uid(), title: '(onest) Update haircare NPD', section: 'Monday', due: '2026-04-06', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: '(onest) Final Hair Shampoo & Condi (25.7) Spec', section: 'Monday', due: '2026-04-06', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Monthly Cashflow updates (3 months)', section: 'Monday', due: '2026-04-06', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Talk with Sa', section: 'Monday', due: '2026-04-06', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Update Salary Cash Flow by Finance', section: 'Monday', due: '2026-04-20', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Think about export (onest)', section: 'Monday', due: '2026-05-04', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CEO Approve for 30 June Payment', section: 'Monday', due: '2026-06-22', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CEO Approve for 15 Sep Payment', section: 'Monday', due: '2026-09-07', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },

  // ===== Tuesday =====
  { id: uid(), title: 'Recheck Monthly Income Statement', section: 'Tuesday', due: '2026-04-28', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CEO Approve for 15 July Payment', section: 'Tuesday', due: '2026-07-07', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'ล้างแอร์บ้าน', section: 'Tuesday', due: '2026-08-11', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CEO Approve for 30 Sep Payment', section: 'Tuesday', due: '2026-09-22', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CEO Approve for 15 Oct Payment', section: 'Tuesday', due: '2026-10-06', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CEO Approve for 30 Dec Payment', section: 'Tuesday', due: '2026-12-22', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },

  // ===== Wednesday =====
  { id: uid(), title: 'Recheck forecast', section: 'Wednesday', due: '2026-04-01', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'ทำฟันรอบ 6 เดือน', section: 'Wednesday', due: '2026-04-01', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'How to turn kind collective into something that solves real value like i love you restaurant', section: 'Wednesday', due: '2026-04-01', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Final NPD 9.9 (Pet)', section: 'Wednesday', due: '2026-04-08', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Final NPD 11.11', section: 'Wednesday', due: '2026-04-08', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CEO Approve for 30 April Payment', section: 'Wednesday', due: '2026-04-22', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CEO Approve for 30 July Payment', section: 'Wednesday', due: '2026-07-22', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CEO Approve for 30 Oct Payment', section: 'Wednesday', due: '2026-10-21', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Ai youtube', section: 'Wednesday', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },

  // ===== Thursday =====
  { id: uid(), title: 'Follow up on the mall emporium', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: '(onest) Update เรื่อง New Location Plan', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Confirm OKR Noon with Amp', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: '(onest) Final Product Spec Summary', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Plan recheck รอบ Dead Stock', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'ค่าเดินทาง หรือค่าใช้จ่ายต่างๆที่ไม่ผ่าน PO ตอนนี้ จะทำยังไง', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: '(onest) Process Details Final all NPD', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: '(onest) Final Dry Knit Wash (25.11) Spec', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Award for onest', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'ทำเครื่องพ่นกลิ่นเอง for B2B model?', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Onest website', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Recheck grubby product spec', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Cafe on 2nd floor talat noi', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Update Future File', section: 'Thursday', due: '2026-04-02', priority: 'Low', value: 'High', effort: 'Low effort', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CEO Approve for 16 April Payment', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Follow up on Procurement Protocol in monthly', section: 'Thursday', due: '2026-04-23', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'โอนเงินบ้านประจำเดือน', section: 'Thursday', due: '2026-04-30', priority: 'Low', value: 'Low', effort: 'Low effort', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CEO Approve for 15 May Payment', section: 'Thursday', due: '2026-05-07', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CEO Approve for 29 May Payment', section: 'Thursday', due: '2026-05-21', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CEO Approve for 14 August Payment', section: 'Thursday', due: '2026-08-06', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Be careful น้ำขึ้น Talat noi', section: 'Thursday', due: '2026-10-01', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CEO Approve for 15 Dec Payment', section: 'Thursday', due: '2026-12-03', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Try claude financial', section: 'Thursday', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },

  // ===== Friday =====
  { id: uid(), title: 'Stock SV ตรงหรือไม่?', section: 'Friday', due: '2026-04-03', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Stock onest ตรงหรือไม่?', section: 'Friday', due: '2026-04-03', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: '(onest) Follow up on Scan และติด Barcode ผิด prevention', section: 'Friday', due: '2026-04-03', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: '(onest) Follow up on Online Stock หน้าร้าน Daily', section: 'Friday', due: '2026-04-03', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Plan next week + Clear ตารางให้ว่างอาทิตย์ละวัน', section: 'Friday', due: '2026-04-03', priority: 'Low', value: 'High', effort: 'Low effort', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Hr โรงงานร้องทุกข์ system', section: 'Friday', due: '2026-04-03', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Recheck KPI', section: 'Friday', due: '2026-04-03', priority: 'High', value: 'High', effort: 'Low effort', progress: '', notes: '', subtasks: [
    { id: uid(), title: 'SV - KPI', done: false },
    { id: uid(), title: 'onest - KPI', done: false },
  ]},
  { id: uid(), title: 'Empowering life 2', section: 'Friday', due: '2026-04-03', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'New Position for everyone', section: 'Friday', due: '2026-04-03', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Family finance', section: 'Friday', due: '2026-04-03', priority: 'Low', value: 'Medium', effort: 'Medium effort', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Work & Personal Finance + บิล at Office', section: 'Friday', due: '2026-04-03', priority: 'Low', value: 'Medium', effort: 'Medium effort', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Update Mid Month Cash Flow (1 Day after Port approve)', section: 'Friday', due: '2026-04-11', priority: '', value: 'High', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'จ่ายค่าน้ำ', section: 'Friday', due: '2026-04-25', priority: 'Low', value: 'Low', effort: 'Low effort', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Pay all Credit card', section: 'Friday', due: '2026-04-25', priority: 'Medium', value: 'Low', effort: 'Medium effort', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Update End of month Cash Flow (1 วันหลัง Port Approve)', section: 'Friday', due: '2026-04-26', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Ellie Lead Promotion', section: 'Friday', due: '2026-05-01', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Renew US Passport (Port)', section: 'Friday', due: '2026-05-01', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Kind Collectives Activation (1 June)', section: 'Friday', due: '2026-05-22', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: '(Narasiri) ติดตั้งรางระบายน้ำ', section: 'Friday', due: '2026-05-22', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CEO Approve for 15 June Payment', section: 'Friday', due: '2026-06-05', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Pay SSF/RMF', section: 'Friday', due: '2026-06-26', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CEO Approve for 31 August Payment', section: 'Friday', due: '2026-08-21', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CEO Approve for 16 Nov Payment', section: 'Friday', due: '2026-11-06', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CEO Approve for 30 Nov Payment', section: 'Friday', due: '2026-11-20', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },

  // ===== Weekends =====
  { id: uid(), title: 'จัดการมรดก', section: 'Weekends', due: '2026-03-31', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Rerun Longtunman', section: 'Weekends', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'But book of elon', section: 'Weekends', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'วัน Confirm House Pub', section: 'Weekends', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'ติดลิฟท์ตรงไหนได้', section: 'Weekends', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Plan inheritance investment', section: 'Weekends', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'ซื้อรองเท้ากีฬาห้วยขวาง', section: 'Weekends', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'ซื้อโต๊ะข้างเตียง', section: 'Weekends', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'ของบ้านห้วยขวาง', section: 'Weekends', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },

  // ===== Business Notes =====
  { id: uid(), title: 'Sek Talk Summary', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Company Financial', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Office Rental Business', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Create checklist for creating new successful products', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: '1 on 1 List end of 2025', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: '1 on 1 question', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Follow up Port Amp JD', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Founder Meeting', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'AI Course', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Aug 2025 1 on 1 Notes', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'onest success formula', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CORO FIELD Closing down steps', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Onest ideas', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Mistine China', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Yanhee', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },

  // ===== Personal Notes =====
  { id: uid(), title: 'จัดกระเป๋า USA Trip 11 วัน 10 คืน', section: 'Personal Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [
    { id: uid(), title: 'Passport & Driver license of everyone', done: false },
    { id: uid(), title: 'Computer & all chargers', done: false },
    { id: uid(), title: 'กระเป๋าครีม', done: false },
    { id: uid(), title: 'ถุงเท้า 10', done: false },
    { id: uid(), title: 'เสื้อ 11', done: false },
    { id: uid(), title: 'กางเกง 3', done: false },
    { id: uid(), title: 'กางเกงใน 10 (9)', done: false },
    { id: uid(), title: 'เสื้อหนาว x 1', done: false },
    { id: uid(), title: 'เสื้อ sweater x 2', done: false },
    { id: uid(), title: 'Heat tech เสื้อ กางเกง x 3', done: false },
    { id: uid(), title: 'ชุดนอน 1', done: false },
    { id: uid(), title: 'ยา', done: false },
    { id: uid(), title: 'Book 1', done: false },
    { id: uid(), title: 'Shoe 1', done: false },
  ]},
  { id: uid(), title: 'บทสวดม๊าแอม', section: 'Personal Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'โครงสร้างผู้ถือหุ้นบริษัททั้งหมด', section: 'Personal Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'New Year list', section: 'Personal Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Nanny Interview Question', section: 'Personal Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'ผลตรวจสุขภาพ 21 June 2025', section: 'Personal Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'How to prevent p pink', section: 'Personal Notes', due: '', priority: 'Medium', value: 'High', effort: 'High effort', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'เอกสารสัญญาซื้อขายบ้านนาราสิริ + โฉนด', section: 'Personal Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'โฉนดสวนผึ้งชื่อป๊า', section: 'Personal Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'ต่อเติมบ้านนาราสิริ', section: 'Personal Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'สวดบทน้าชา', section: 'Personal Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Mita Stem Cell', section: 'Personal Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },

  // ===== Books note =====
  { id: uid(), title: 'Designing your life', section: 'Books note', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Jo thana', section: 'Books note', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'CFO', section: 'Books note', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'การบินไทย', section: 'Books note', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Slow productivity', section: 'Books note', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
  { id: uid(), title: 'Health work play love', section: 'Books note', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },

  // ===== Do later =====
  { id: uid(), title: 'Pinetree spa', section: 'Do later', due: '', priority: '', value: '', effort: '', progress: '', notes: '', subtasks: [] },
]
