from bootstrap import ROOT
import json,sys
if __name__=='__main__':
    path=ROOT/'.bob/mcp.json'
    config=json.loads(path.read_text()) if path.exists() else {}
    config.setdefault('mcpServers',{})['gridwatch']={'command':sys.executable,'args':[str(ROOT/'src/mcp_server.py')],'cwd':str(ROOT),'disabled':False}
    path.parent.mkdir(exist_ok=True);path.write_text(json.dumps(config,indent=2))
    print(f'Wrote {path}. Enable GridWatch in IBM Bob MCP settings.')
