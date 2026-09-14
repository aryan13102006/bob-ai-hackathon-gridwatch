from bootstrap import ROOT
import asyncio,sys,json
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    params=StdioServerParameters(command=sys.executable,args=[str(ROOT/'src/mcp_server.py')],cwd=str(ROOT))
    async with stdio_client(params) as (read,write):
        async with ClientSession(read,write) as session:
            await session.initialize()
            tools=await session.list_tools()
            assert {t.name for t in tools.tools}=={'assess_grid_risk','get_model_evaluation'}
            for name,args in [('get_model_evaluation',{}),('assess_grid_risk',{'wind_kmh':85,'rain_mm':65,'crews':3})]:
                result=await session.call_tool(name,args)
                assert not result.isError,result
                text=next(c.text for c in result.content if c.type=='text')
                data=json.loads(text)
                assert ('failure' in data) if name=='get_model_evaluation' else len(data['assets'])==12
            bad=await session.call_tool('assess_grid_risk',{'wind_kmh':-1})
            assert bad.isError
            print('PASS: MCP handshake, discovery, both real tool calls and invalid-input handling. IBM Bob UI connection remains separate.')

if __name__=='__main__':asyncio.run(main())
