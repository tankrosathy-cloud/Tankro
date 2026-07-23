import re

# 1. AppointmentsModule.tsx
with open('src/components/AppointmentsModule.tsx', 'r') as f:
    content = f.read()

content = content.replace("const ALL_STAFF = ['Althaf', 'Nafees', 'Prabhu'];", "const ALL_STAFF = settings.staffList || ['Althaf', 'Nafees', 'Prabhu'];")
content = content.replace("setStaffAssigned(appt.staffAssigned || ['Althaf']);", "setStaffAssigned(appt.staffAssigned || [(settings.staffList || ['Althaf'])[0]]);")
content = content.replace("setStaffAssigned(['Althaf']);", "setStaffAssigned([(settings.staffList || ['Althaf'])[0]]);")

with open('src/components/AppointmentsModule.tsx', 'w') as f:
    f.write(content)

# 2. JobForm.tsx
with open('src/components/JobForm.tsx', 'r') as f:
    content = f.read()

content = content.replace("const ALL_STAFF = ['Althaf', 'Nafees', 'Prabhu'];", "const ALL_STAFF = settings.staffList || ['Althaf', 'Nafees', 'Prabhu'];")

with open('src/components/JobForm.tsx', 'w') as f:
    f.write(content)

# 3. ReportsPage.tsx
with open('src/components/ReportsPage.tsx', 'r') as f:
    content = f.read()

content = content.replace("const staffJobsMap: Record<string, number> = { Althaf: 0, Nafees: 0, Prabhu: 0 };", """const staffJobsMap: Record<string, number> = {};
  (settings.staffList || ['Althaf', 'Nafees', 'Prabhu']).forEach(s => staffJobsMap[s] = 0);""")

with open('src/components/ReportsPage.tsx', 'w') as f:
    f.write(content)

# 4. App.tsx (CSV export headers)
with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("const headers = ['Date', 'Althaf Status', 'Althaf Wage', 'Nafees Status', 'Nafees Wage', 'Prabhu Status', 'Prabhu Wage'];", """
    const staff = settings.staffList || ['Althaf', 'Nafees', 'Prabhu'];
    const headers = ['Date', ...staff.flatMap(s => [`${s} Status`, `${s} Wage`])];""")
content = content.replace("""    const rows = attendance.map(a => [
      a.date,
      a.records.Althaf || 'Absent',
      a.wages.Althaf || 0,
      a.records.Nafees || 'Absent',
      a.wages.Nafees || 0,
      a.records.Prabhu || 'Absent',
      a.wages.Prabhu || 0
    ]);""", """    const rows = attendance.map(a => [
      a.date,
      ...staff.flatMap(s => [a.records[s] || 'Absent', a.wages[s] || 0])
    ]);""")

with open('src/App.tsx', 'w') as f:
    f.write(content)

