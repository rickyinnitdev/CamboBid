"""Scan publishable Git content without printing matched credential values."""
import argparse,base64,json,re,subprocess,sys
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--history',action='store_true');parser.add_argument('--staged',action='store_true');args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
def git(*parts):return subprocess.check_output(['git',*parts],cwd=root)
patterns={
 'hardcoded privileged credential':r"(?:VITE_)?(?:INTEGRATION_ENCRYPTION_KEY|BAKONG_API_TOKEN|SUPABASE_SERVICE_ROLE_KEY|GEMINI_API_KEY|RESEND_API_KEY)[\"']?\s*[:=]\s*[\"']?[A-Za-z0-9_+/=.-]{16,}",
 'private key':r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
 'GitHub token':r'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b',
 'Supabase secret':r'\bsb_secret_[A-Za-z0-9_-]{20,}',
 'live payment key':r'\bsk_live_[A-Za-z0-9]{16,}',
 'AWS key':r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b',
 'email provider key':r'\bre_[A-Za-z0-9]{24,}',
 'database URL with password':r'postgres(?:ql)?://[^\s:/]+:[^\s@]{4,}@',
}
def private_path(path):
 parts=Path(path).parts;name=Path(path).name
 return (name.startswith('.env') and name!='.env.example') or any(p in ('.vercel','.verification','backups') for p in parts) or Path(path).suffix in ('.dump','.backup','.pem','.p12','.pfx','.key')
def scan(path,data):
 findings=[]
 if private_path(path):findings.append((path,'private file tracked'))
 text=data.decode('utf-8',errors='ignore')
 for kind,pattern in patterns.items():
  for match in re.finditer(pattern,text):
   if kind=='hardcoded privileged credential' and re.search(r"[:=,]\s*[\"']?(?:your[-_]|replace[-_]|example[-_])",match.group(),re.I):continue
   findings.append((path,kind))
 for match in re.finditer(r'\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',text):
  try:
   payload=json.loads(base64.urlsafe_b64decode(match.group().split('.')[1]+'==='))
   if payload.get('role')!='anon':findings.append((path,'non-public JWT'))
  except (ValueError,UnicodeError):findings.append((path,'unrecognized JWT'))
 return findings
findings=[]
if args.staged:
 files=git('diff','--cached','--name-only','--diff-filter=ACMR','-z').decode().split('\0');files=[p for p in files if p]
 for path in files:findings+=scan(path,git('show',':'+path))
else:
 files=git('ls-files','--cached','--others','--exclude-standard','-z').decode().split('\0');files=[p for p in files if p and (root/p).is_file()]
 for path in files:findings+=scan(path,(root/path).read_bytes())
if args.history:
 rows=[line.split(' ',1) for line in git('rev-list','--objects','--all').decode().splitlines()]
 objects=[(oid,path) for item in rows if len(item)==2 for oid,path in [item]]
 process=subprocess.Popen(['git','cat-file','--batch'],cwd=root,stdin=subprocess.PIPE,stdout=subprocess.PIPE)
 for oid,path in objects:
  process.stdin.write((oid+'\n').encode());process.stdin.flush();header=process.stdout.readline().decode().split()
  data=process.stdout.read(int(header[2]));process.stdout.read(1)
  if header[1]=='blob':findings+=scan(path,data)
 process.stdin.close();process.wait()
for path,kind in sorted(set(findings)):print('BLOCKED:',path,'('+kind+')')
print('Secret scan:',len(files),'current files;',len(set(findings)),'findings. Matched values are never printed.')
sys.exit(1 if findings else 0)
