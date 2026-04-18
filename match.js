const fs = require('fs');$
const content = fs.readFileSync('src/components/AdminVotingDetail.tsx', 'utf8');$
const lines = content.split('\n');$
for(let i=1370; i<1380; i++) {$
  console.log(i+1, JSON.stringify(lines[i]));$
}$
