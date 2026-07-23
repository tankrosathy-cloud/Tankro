import re

with open('src/components/AttendanceModule.tsx', 'r') as f:
    content = f.read()

# Replace hardcoded states with dynamic ones
replacements = {
"""  const [althafMonthly, setAlthafMonthly] = useState<number | ''>(((settings.dailyWages?.Althaf) || 300) * 30);
  const [nafeesMonthly, setNafeesMonthly] = useState<number | ''>(((settings.dailyWages?.Nafees) || 400) * 30);
  const [prabhuMonthly, setPrabhuMonthly] = useState<number | ''>(((settings.dailyWages?.Prabhu) || 500) * 30);""": """  const [staffListStr, setStaffListStr] = useState<string>((settings.staffList || ['Althaf', 'Nafees', 'Prabhu']).join(', '));
  const [monthlyWagesInput, setMonthlyWagesInput] = useState<Record<string, number | ''>>(() => {
    const list = settings.staffList || ['Althaf', 'Nafees', 'Prabhu'];
    const init: Record<string, number | ''> = {};
    list.forEach(s => {
      init[s] = ((settings.dailyWages?.[s]) || 300) * 30;
    });
    return init;
  });""",

"""  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({
    Althaf: 'Present',
    Nafees: 'Present',
    Prabhu: 'Present',
  });
  const [wages, setWages] = useState<Record<string, number | ''>>({
    Althaf: (settings.dailyWages?.Althaf) || 300,
    Nafees: (settings.dailyWages?.Nafees) || 400,
    Prabhu: (settings.dailyWages?.Prabhu) || 500,
  });""": """  const currentStaff = settings.staffList || ['Althaf', 'Nafees', 'Prabhu'];
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>(() => {
    const init: Record<string, AttendanceStatus> = {};
    currentStaff.forEach(s => init[s] = 'Present');
    return init;
  });
  const [wages, setWages] = useState<Record<string, number | ''>>(() => {
    const init: Record<string, number | ''> = {};
    currentStaff.forEach(s => init[s] = settings.dailyWages?.[s] || 300);
    return init;
  });""",

"""      const defaultRecords: Record<string, AttendanceStatus> = {
        Althaf: 'Present',
        Nafees: 'Present',
        Prabhu: 'Present',
      };
      const defaultWages: Record<string, number> = {
        Althaf: (settings.dailyWages?.Althaf) || 300,
        Nafees: (settings.dailyWages?.Nafees) || 400,
        Prabhu: (settings.dailyWages?.Prabhu) || 500,
      };""": """      const currentStaff = settings.staffList || ['Althaf', 'Nafees', 'Prabhu'];
      const defaultRecords: Record<string, AttendanceStatus> = {};
      const defaultWages: Record<string, number> = {};
      currentStaff.forEach(s => {
        defaultRecords[s] = 'Present';
        defaultWages[s] = settings.dailyWages?.[s] || 300;
      });""",

"""  useEffect(() => {
    setAlthafMonthly(((settings.dailyWages?.Althaf) || 300) * 30);
    setNafeesMonthly(((settings.dailyWages?.Nafees) || 400) * 30);
    setPrabhuMonthly(((settings.dailyWages?.Prabhu) || 500) * 30);""": """  useEffect(() => {
    const currentStaff = settings.staffList || ['Althaf', 'Nafees', 'Prabhu'];
    setStaffListStr(currentStaff.join(', '));
    setMonthlyWagesInput(prev => {
      const next = { ...prev };
      currentStaff.forEach(s => {
        next[s] = ((settings.dailyWages?.[s]) || 300) * 30;
      });
      return next;
    });""",

"""      dailyWages: {
        Althaf: Math.round(Number(althafMonthly) / 30),
        Nafees: Math.round(Number(nafeesMonthly) / 30),
        Prabhu: Math.round(Number(prabhuMonthly) / 30),
      },""": """      staffList: staffListStr.split(',').map(s => s.trim()).filter(Boolean),
      dailyWages: Object.fromEntries(
        staffListStr.split(',').map(s => s.trim()).filter(Boolean).map(s => [s, Math.round(Number(monthlyWagesInput[s] || 0) / 30)])
      ),""",
      
"""    setWages({
      Althaf: Math.round(Number(althafMonthly) / 30),
      Nafees: Math.round(Number(nafeesMonthly) / 30),
      Prabhu: Math.round(Number(prabhuMonthly) / 30),
    });""": """    const currentStaff = staffListStr.split(',').map(s => s.trim()).filter(Boolean);
    const newWages: Record<string, number> = {};
    currentStaff.forEach(s => {
      newWages[s] = Math.round(Number(monthlyWagesInput[s] || 0) / 30);
    });
    setWages(newWages);""",

"""    const standardWage = (settings.dailyWages?.[staff]) || (staff === 'Prabhu' ? 500 : staff === 'Nafees' ? 400 : 300);""": """    const standardWage = (settings.dailyWages?.[staff]) || 300;""",
"""const dailyRate = (settings.dailyWages?.[staff]) || (staff === 'Prabhu' ? 500 : staff === 'Nafees' ? 400 : 300);""": """const dailyRate = (settings.dailyWages?.[staff]) || 300;""",

"""  const staffStats = ['Althaf', 'Nafees', 'Prabhu'].map((staff) => {""": """  const currentStaffListStats = settings.staffList || ['Althaf', 'Nafees', 'Prabhu'];
  const staffStats = currentStaffListStats.map((staff) => {""",

"""{['Althaf', 'Nafees', 'Prabhu'].map((staff) => {""": """{(settings.staffList || ['Althaf', 'Nafees', 'Prabhu']).map((staff) => {"""
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open('src/components/AttendanceModule.tsx', 'w') as f:
    f.write(content)
