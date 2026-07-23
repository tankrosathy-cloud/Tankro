import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("<JobForm ", "<JobForm settings={settings} ")
content = content.replace("<ReportsPage ", "<ReportsPage settings={settings} ")
content = content.replace("<AppointmentsModule ", "<AppointmentsModule settings={settings} ")

with open('src/App.tsx', 'w') as f:
    f.write(content)
