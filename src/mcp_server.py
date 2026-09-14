from bootstrap import ROOT
from mcp.server.fastmcp import FastMCP
from engine import Advisor

mcp=FastMCP('GridWatch')
advisor=Advisor()

@mcp.tool()
def assess_grid_risk(wind_kmh:float=45,rain_mm:float=25,crews:int=3)->dict:
    """Calculate 24-hour SYNTHETIC outage risks, evidence and capacity-constrained crew proposals. Weather is a scenario, never a live forecast. No actions are dispatched."""
    return advisor.analyze(wind_kmh,rain_mm,crews)

@mcp.tool()
def get_model_evaluation()->dict:
    """Read measured holdout metrics for real ETT temperature forecasting and the separate synthetic failure classifier. Do not equate temperature accuracy with outage accuracy."""
    return advisor.metrics

@mcp.prompt()
def operator_brief()->str:
    return 'Use assess_grid_risk and get_model_evaluation. Write an operator brief naming the scenario, top risks and evidence, crew staging, unassigned jobs and model limitations. Distinguish real ETT temperature results from synthetic outage predictions. Do not invent measured savings or say crews were dispatched.'

if __name__=='__main__': mcp.run(transport='stdio')
