import re

with open('src/components/AdminVotingList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

team_helper = '''
function getTeamColor(team: string) {
  switch (team) {
    case "ECE": return "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400";
    case "ECL": return "bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/30 dark:text-fuchsia-400";
    default: return "bg-slate-500/10 text-slate-700 border-slate-500/30 dark:text-slate-400";
  }
}
'''
if 'function getTeamColor' not in content:
    content = content.replace('function getRoundTone(round: RoundListItem) {', team_helper + '\nfunction getRoundTone(round: RoundListItem) {')


# Update tags logic
content = content.replace('<span className="border border-primary/30 bg-primary/5 text-primary px-2.5 py-0.5 rounded-md shadow-sm font-bold">{round.team}</span>', '<span className={`border px-2.5 py-0.5 rounded-md shadow-sm font-bold ${getTeamColor(round.team)}`}>{round.team}</span>')

# Update Entrada section
old_entrada = r'''\<div className=\{\`admin-soft p-2 rounded-xl border shadow-inner flex flex-col items-center justify-center text-center \$\{tone\.metric\}\`\}\>\s*\<span className="text-muted-foreground mb-1 leading-none text-\[10px\] uppercase tracking-wider font-semibold"\>Entrada\</span\>\s*\<span className=\{\`font-bold text-base leading-none \$\{round\.join_locked \? \'text-destructive/90\' : \'text-emerald-500/90\'\}\`\}\>\s*\{round\.join_locked \? "Cerrada" : "Abierta"\}\s*\</span\>\s*\</div\>'''
new_entrada = '''<div className={`admin-soft p-2 rounded-xl border shadow-inner flex flex-col items-center justify-center text-center ${tone.metric}`}>
                      <span className="text-muted-foreground mb-1.5 leading-none text-[10px] uppercase tracking-wider font-semibold">Entrada</span>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold leading-none ${
                        !round.is_active && !round.is_closed 
                          ? "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                          : round.join_locked || round.is_closed 
                            ? "bg-destructive/15 text-destructive border border-destructive/30" 
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      }`}>
                        {!round.is_active && !round.is_closed ? "En espera" : (round.join_locked || round.is_closed) ? "Cerrada" : "Abierta"}
                      </span>
                    </div>'''

content = re.sub(old_entrada, new_entrada, content)

with open('src/components/AdminVotingList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
