const fs = require('fs');
const stdin = fs.readFileSync(0, 'utf-8');
if (!stdin) {
  console.log(JSON.stringify({ decision: 'allow' }));
  process.exit(0);
}
try {
  const payload = JSON.parse(stdin);
  if (payload.toolCall && payload.toolCall.name === 'run_command') {
    const cmd = payload.toolCall.args.CommandLine || '';
    const lowerCmd = cmd.toLowerCase();
    
    // 차단할 키워드 목록
    const blockList = ['grep ', 'findstr ', 'cat ', 'ls ', 'dir ', 'node -e', 'npm run db:'];
    
    const isBlocked = blockList.some(keyword => lowerCmd.includes(keyword) || lowerCmd.startsWith(keyword.trim()));
    
    if (isBlocked) {
      console.log(JSON.stringify({
        decision: 'deny',
        reason: '[SYSTEM BLOCK] 금지된 터미널 탐색 명령(grep, cat, dir, node 등)이 감지되었습니다. 터미널 대신 반드시 내장 전용 도구(grep_search, view_file, list_dir 등)를 사용하세요.'
      }));
      process.exit(0);
    }
  }
} catch(e) {}
console.log(JSON.stringify({ decision: 'allow' }));
