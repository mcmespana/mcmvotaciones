import re

with open('src/components/AdminVotingList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add new icons or just Search and Filter
if 'import { Search, Filter } from "lucide-react";' not in content:
    content = content.replace('import { ArrowRight, Plus, Vote, Users, Trash2 } from "lucide-react";', 'import { ArrowRight, Plus, Vote, Users, Trash2, Search, Filter } from "lucide-react";')
    content = content.replace('import { ArrowRight, Plus, Vote, Users } from "lucide-react";', 'import { ArrowRight, Plus, Vote, Users, Trash2, Search, Filter } from "lucide-react";')

# Inject State
if 'const [searchTerm, setSearchTerm]' not in content:
    state_injection = '''  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState("ALL");'''
    content = content.replace('const [rounds, setRounds] = useState<RoundListItem[]>([]);', 'const [rounds, setRounds] = useState<RoundListItem[]>([]);\n' + state_injection)

# Filter logic before return
filter_logic = '''
  const filteredRounds = rounds.filter((round) => {
    const matchesSearch = round.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (round.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesTeam = teamFilter === "ALL" || round.team === teamFilter;
    return matchesSearch && matchesTeam;
  });

  return ('''
if 'const filteredRounds = rounds.filter' not in content:
    content = content.replace('  return (\n    <div className="space-y-6">', filter_logic + '\n    <div className="space-y-6">')

# Modify Header: remove stats, add inputs
old_header = r'''\<div className="flex flex-wrap items-center justify-between gap-3"\>\s*\<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"\>\s*\<span className="admin-chip inline-flex items-center gap-2"\>\s*\<Vote className="w-4 h-4" /\>\s*\{rounds\.length\} votaciones\s*\</span\>\s*\<span className="admin-chip inline-flex items-center gap-2"\>\s*\<Users className="w-4 h-4" /\>\s*\{totalActive\} activas\s*\</span\>\s*\</div\>'''
new_header = '''<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex w-full flex-col sm:w-auto sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar votación..." 
                  className="pl-8 bg-surface-container-lowest/50" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-surface-container-lowest/50">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <span>{teamFilter === "ALL" ? "Todos los grupos" : teamFilter}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los grupos</SelectItem>
                  <SelectItem value="ECE">ECE</SelectItem>
                  <SelectItem value="ECL">ECL</SelectItem>
                </SelectContent>
              </Select>
            </div>'''
content = re.sub(old_header, new_header, content)

# Use filteredRounds for empty check
content = content.replace('{rounds.length === 0 ? (', '{filteredRounds.length === 0 ? (')
content = content.replace('{rounds.map((round) => {', '{filteredRounds.map((round) => {')


with open('src/components/AdminVotingList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
