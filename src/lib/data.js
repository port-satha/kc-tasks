export const SECTIONS = [
  '2025 Big Rocks',
  'Recently assigned',
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
]

export const PRIORITIES = ['High', 'Medium', 'Low']
export const VALUES = ['High', 'Medium', 'Low']
export const EFFORT_LEVELS = ['Low effort', 'Medium effort', 'High effort', 'Need to scope']
export const TASK_PROGRESS = ['Not Started', 'In Progress', 'Waiting', 'Deferred', 'Done']

export const PRIORITY_COLORS = {
  High: 'bg-red-100 text-red-800',
  Medium: 'bg-amber-100 text-amber-800',
  Low: 'bg-blue-100 text-blue-600',
}

export const VALUE_COLORS = {
  High: 'bg-emerald-100 text-emerald-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-gray-100 text-gray-600',
}

export const EFFORT_COLORS = {
  'Low effort': 'bg-green-100 text-green-700',
  'Medium effort': 'bg-orange-100 text-orange-700',
  'High effort': 'bg-red-100 text-red-700',
  'Need to scope': 'bg-purple-100 text-purple-700',
}

export const PROGRESS_COLORS = {
  'Not Started': 'bg-gray-200 text-gray-600',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Waiting': 'bg-amber-100 text-amber-700',
  'Deferred': 'bg-slate-100 text-slate-600',
  'Done': 'bg-green-100 text-green-700',
}

export const PROGRESS_DOT = {
  'Not Started': 'bg-gray-400',
  'In Progress': 'bg-blue-500',
  'Waiting': 'bg-amber-500',
  'Deferred': 'bg-slate-400',
  'Done': 'bg-green-500',
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export const DEFAULT_TASKS = [
  // Recently assigned
  { id: uid(), title: 'พี่หนึ่งคืนเงิน 5k ถึง 1 July 26 (10 เดือน)', section: 'Recently assigned', due: '2026-05-01', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'จัดการเรื่องเครื่องสติกเกอร์', section: 'Recently assigned', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Send ever pine satin veil set to j and bank', section: 'Recently assigned', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Scan โฉนดอนุบาลให้อะตอม', section: 'Recently assigned', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'ดู secret sauce', section: 'Recently assigned', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Concert for employee?', section: 'Recently assigned', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Put scientific in usp both sv and onest', section: 'Recently assigned', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Something related to sleep for onest anti dust mite', section: 'Recently assigned', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'ม่านดาดฟ้า', section: 'Recently assigned', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },

  // Most Important Lists
  { id: uid(), title: 'SV Business Plan & NPD 2026', section: 'Most Important Lists', due: '', priority: '', value: '', effort: '', progress: 'In Progress', notes: '' },
  { id: uid(), title: 'onest Business Plan & NPD 2026', section: 'Most Important Lists', due: '', priority: '', value: '', effort: '', progress: 'In Progress', notes: '' },
  { id: uid(), title: 'CEO Budget Approve', section: 'Most Important Lists', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'NEW OFFICE', section: 'Most Important Lists', due: '', priority: '', value: '', effort: '', progress: 'Done', notes: '' },

  // Monday
  { id: uid(), title: '(onest) Update haircare NPD', section: 'Monday', due: '2026-04-06', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: '(onest) Final Hair Shampoo & Condi (25.7) Spec', section: 'Monday', due: '2026-04-06', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Monthly Cashflow updates (3 months)', section: 'Monday', due: '2026-04-06', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Talk with Sa', section: 'Monday', due: '2026-04-06', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Update Salary Cash Flow by Finance', section: 'Monday', due: '2026-04-20', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Think about export (onest)', section: 'Monday', due: '2026-05-04', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'CEO Approve for 30 June Payment', section: 'Monday', due: '2026-06-22', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'CEO Approve for 15 Sep Payment', section: 'Monday', due: '2026-09-07', priority: '', value: '', effort: '', progress: '', notes: '' },

  // Tuesday
  { id: uid(), title: 'Recheck Monthly Income Statement', section: 'Tuesday', due: '2026-04-28', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'CEO Approve for 15 July Payment', section: 'Tuesday', due: '2026-07-07', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'ล้างแอร์บ้าน', section: 'Tuesday', due: '2026-08-11', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'CEO Approve for 30 Sep Payment', section: 'Tuesday', due: '2026-09-22', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'CEO Approve for 15 Oct Payment', section: 'Tuesday', due: '2026-10-06', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'CEO Approve for 30 Dec Payment', section: 'Tuesday', due: '2026-12-22', priority: '', value: '', effort: '', progress: '', notes: '' },

  // Wednesday
  { id: uid(), title: 'Recheck forecast', section: 'Wednesday', due: '2026-04-01', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'ทำฟันรอบ 6 เดือน', section: 'Wednesday', due: '2026-04-01', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'How to turn kind collective into something that solves real value like i love you restaurant', section: 'Wednesday', due: '2026-04-01', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Final NPD 9.9 (Pet)', section: 'Wednesday', due: '2026-04-08', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Final NPD 11.11', section: 'Wednesday', due: '2026-04-08', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'CEO Approve for 30 April Payment', section: 'Wednesday', due: '2026-04-22', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'CEO Approve for 30 July Payment', section: 'Wednesday', due: '2026-07-22', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'CEO Approve for 30 Oct Payment', section: 'Wednesday', due: '2026-10-21', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Ai youtube', section: 'Wednesday', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },

  // Thursday
  { id: uid(), title: 'Follow up on the mall emporium', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: '(onest) Update เรื่อง New Location Plan', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Confirm OKR Noon with Amp', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: '(onest) Final Product Spec Summary', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Plan recheck รอบ Dead Stock', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'ค่าเดินทาง หรือค่าใช้จ่ายต่างๆที่ไม่ผ่าน PO ตอนนี้ จะทำยังไง', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: '(onest) Process Details Final all NPD', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: '(onest) Final Dry Knit Wash (25.11) Spec', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Award for onest', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'ทำเครื่องพ่นกลิ่นเอง for B2B model?', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Onest website', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Recheck grubby product spec', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Cafe on 2nd floor talat noi', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Update Future File', section: 'Thursday', due: '2026-04-02', priority: 'Low', value: 'High', effort: 'Low effort', progress: '', notes: '' },
  { id: uid(), title: 'CEO Approve for 16 April Payment', section: 'Thursday', due: '2026-04-02', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Follow up on Procurement Protocol in monthly', section: 'Thursday', due: '2026-04-23', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'โอนเงินบ้านประจำเดือน', section: 'Thursday', due: '2026-04-30', priority: 'Low', value: 'Low', effort: 'Low effort', progress: '', notes: '' },
  { id: uid(), title: 'CEO Approve for 15 May Payment', section: 'Thursday', due: '2026-05-07', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'CEO Approve for 29 May Payment', section: 'Thursday', due: '2026-05-21', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'CEO Approve for 14 August Payment', section: 'Thursday', due: '2026-08-06', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Be careful น้ำขึ้น Talat noi', section: 'Thursday', due: '2026-10-01', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'CEO Approve for 15 Dec Payment', section: 'Thursday', due: '2026-12-03', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Try claude financial', section: 'Thursday', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },

  // Friday
  { id: uid(), title: 'Stock SV ตรงหรือไม่?', section: 'Friday', due: '2026-04-03', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Stock onest ตรงหรือไม่?', section: 'Friday', due: '2026-04-03', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: '(onest) Follow up on Scan และติด Barcode ผิด prevention', section: 'Friday', due: '2026-04-03', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: '(onest) Follow up on Online Stock หน้าร้าน Daily', section: 'Friday', due: '2026-04-03', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Plan next week + Clear ตารางให้ว่างอาทิตย์ละวัน', section: 'Friday', due: '2026-04-03', priority: 'Low', value: 'High', effort: 'Low effort', progress: '', notes: '' },
  { id: uid(), title: 'Hr โรงงานร้องทุกข์ system', section: 'Friday', due: '2026-04-03', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Recheck KPI', section: 'Friday', due: '2026-04-03', priority: 'High', value: 'High', effort: 'Low effort', progress: '', notes: '' },
  { id: uid(), title: 'Empowering life 2', section: 'Friday', due: '2026-04-03', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'New Position for everyone', section: 'Friday', due: '2026-04-03', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Family finance', section: 'Friday', due: '2026-04-03', priority: 'Low', value: 'Medium', effort: 'Medium effort', progress: '', notes: '' },
  { id: uid(), title: 'Work & Personal Finance + บิล at Office', section: 'Friday', due: '2026-04-03', priority: 'Low', value: 'Medium', effort: 'Medium effort', progress: '', notes: '' },
  { id: uid(), title: 'Update Mid Month Cash Flow (1 Day after Port approve)', section: 'Friday', due: '2026-04-11', priority: '', value: 'High', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'จ่ายค่าน้ำ', section: 'Friday', due: '2026-04-25', priority: 'Low', value: 'Low', effort: 'Low effort', progress: '', notes: '' },
  { id: uid(), title: 'Pay all Credit card', section: 'Friday', due: '2026-04-25', priority: 'Medium', value: 'Low', effort: 'Medium effort', progress: '', notes: '' },
  { id: uid(), title: 'Update End of month Cash Flow (1 วันหลัง Port Approve)', section: 'Friday', due: '2026-04-26', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Ellie Lead Promotion', section: 'Friday', due: '2026-05-01', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Renew US Passport (Port)', section: 'Friday', due: '2026-05-01', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Kind Collectives Activation (1 June)', section: 'Friday', due: '2026-05-22', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: '(Narasiri) ติดตั้งรางระบายน้ำ', section: 'Friday', due: '2026-05-22', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'CEO Approve for 15 June Payment', section: 'Friday', due: '2026-06-05', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Pay SSF/RMF', section: 'Friday', due: '2026-06-26', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'CEO Approve for 31 August Payment', section: 'Friday', due: '2026-08-21', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'CEO Approve for 16 Nov Payment', section: 'Friday', due: '2026-11-06', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'CEO Approve for 30 Nov Payment', section: 'Friday', due: '2026-11-20', priority: '', value: '', effort: '', progress: '', notes: '' },

  // Weekends
  { id: uid(), title: 'จัดการมรดก', section: 'Weekends', due: '2026-03-31', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Rerun Longtunman', section: 'Weekends', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'But book of elon', section: 'Weekends', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'วัน Confirm House Pub', section: 'Weekends', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'ติดลิฟท์ตรงไหนได้', section: 'Weekends', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Plan inheritance investment', section: 'Weekends', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'ซื้อรองเท้ากีฬาห้วยขวาง', section: 'Weekends', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'ซื้อโต๊ะข้างเตียง', section: 'Weekends', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'ของบ้านห้วยขวาง', section: 'Weekends', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },

  // Business Notes
  { id: uid(), title: 'Sek Talk Summary', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Company Financial', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Office Rental Business', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'Create checklist for creating new successful products', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: '1 on 1 List end of 2025', section: 'Business Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },

  // Personal Notes
  { id: uid(), title: 'จัดกระเป๋า USA Trip 11 วัน 10 คืน', section: 'Personal Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'บทสวดม๊าแอม', section: 'Personal Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
  { id: uid(), title: 'โครงสร้างผู้ถือหุ้นบริษัททั้งหมด', section: 'Personal Notes', due: '', priority: '', value: '', effort: '', progress: '', notes: '' },
]
