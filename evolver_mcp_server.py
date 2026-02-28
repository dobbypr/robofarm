import subprocess
import sys
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("darwinian-evolver")

@mcp.tool()
def run_evolution(problem_name: str, num_iterations: int = 10, output_dir: str = "/tmp/evolver_output") -> str:
    """Run the Darwinian Evolver on a named problem for a given number of iterations."""
    result = subprocess.run(
        ["uv", "run", "darwinian_evolver", problem_name,
         "--num_iterations", str(num_iterations),
         "--output_dir", output_dir],
        cwd="/home/casentrischman/workGIT/darwinian_evolver",
        capture_output=True,
        text=True,
        timeout=600
    )
    return result.stdout if result.returncode == 0 else f"Error: {result.stderr}"

if __name__ == "__main__":
    mcp.run()
