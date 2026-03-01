"""
Darwinian Evolver MCP Server for Robo Farm.

Tools:
  run_evolution        — Original blocking tool (requires ANTHROPIC_API_KEY)
  evolution_start      — Begin step-by-step evolution; Claude Code acts as the LLM
  evolution_step       — Apply Claude's mutation, evaluate, return next prompt
"""

import json
import subprocess
import textwrap
import uuid
from pathlib import Path

import jinja2
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("darwinian-evolver")

_EVOLVER_DIR   = "/home/casentrischman/workGIT/darwinian_evolver"
_SIM_PATH      = "/home/casentrischman/Projects/robofarm/headless_sim.js"
_STATE_DIR     = Path("/tmp/robofarm_evo_states")


# ─── Shared sim / parsing helpers ─────────────────────────────────────────────

def _run_sim_js(settings: dict, mode: str, num_days: int = 60) -> dict:
    script = textwrap.dedent(f"""
        const sim = require({json.dumps(_SIM_PATH)});
        const settings = {json.dumps(settings)};
        let result;
        if ({json.dumps(mode)} === 'world') {{
            result = sim.scoreWorld(settings);
        }} else {{
            result = sim.scoreEconomy(settings, {num_days});
            delete result.stats.dayLog;
            delete result.stats.priceHistory;
        }}
        console.log(JSON.stringify(result));
    """).strip()
    proc = subprocess.run(["node", "-e", script], capture_output=True, text=True, timeout=60)
    if proc.returncode != 0:
        raise RuntimeError(f"Node.js error:\n{proc.stderr[:1000]}")
    return json.loads(proc.stdout.strip())


def _extract_json_block(text: str):
    parts = text.split("```")
    for block in reversed(parts):
        block = block.strip()
        if block.startswith("json"):
            block = block[4:].strip()
        try:
            return json.loads(block)
        except json.JSONDecodeError:
            continue
    return json.loads(text)


# ─── World problem ─────────────────────────────────────────────────────────────

_WORLD_SEEDS = [42069, 99999, 12345, 55555, 31415, 77777, 2718, 11111, 66666, 88888]

_WORLD_INITIAL = {
    "treeFrequency":   0.10,
    "rockFrequency":   0.015,
    "flowerFrequency": 0.06,
    "riverCount":      2,
    "pondCount":       4,
    "clearingW":       24,
    "clearingH":       18,
}

_WORLD_PROMPT = """\
You are tuning world-generation parameters for a top-down 2D farming game called Robo Farm.
The world is procedurally generated using value-noise (for forests), BFS rivers, and circular ponds.
The player starts near a cleared "farm zone" and must farm it for income.

## Current world parameters
```json
{{ world_params }}
```

## Parameter reference
- treeFrequency: 0.0–0.25  — fraction of tiles that become forest (higher = denser trees)
- rockFrequency: 0.0–0.08  — fraction of grass tiles that become rocks
- flowerFrequency: 0.0–0.15 — fraction of grass tiles that become wildflowers (walkable, tillable)
- riverCount: 0–5           — number of rivers that snake across the map
- pondCount: 0–8            — number of circular ponds scattered across the map
- clearingW, clearingH: 10–40 — dimensions of the cleared farm zone

## Evaluation failures detected (from {{ num_failures }} test seeds)
{% for f in failures %}
- [{{ f.metric }} = {{ "%.3f"|format(f.value) }}] {{ f.description }}
{% endfor %}

## Your task
Analyze why these failures occur given the parameters.
Then propose an improved parameter set that avoids these failures.
Keep parameters in realistic ranges (listed above).
Do NOT change the seed or world width/height.

Respond with a brief diagnosis, then a ```json block containing ONLY the world
parameter fields you want to change (e.g. {"treeFrequency": 0.12, "pondCount": 3}).
"""


def _eval_world(params: dict) -> dict:
    failures, score_total = [], 0.0
    for seed in _WORLD_SEEDS:
        settings = {"world": dict(params, seed=seed)}
        result = _run_sim_js(settings, "world")
        score_total += result["score"]
        for f in result["failures"]:
            failures.append(f)
    avg = score_total / len(_WORLD_SEEDS)
    return {"score": avg, "is_viable": avg > 0.2, "failures": failures[:6]}


def _world_prompt(params: dict, failures: list) -> str:
    return jinja2.Template(_WORLD_PROMPT.strip()).render(
        world_params=json.dumps(params, indent=2),
        failures=[type("F", (), f)() for f in failures],
        num_failures=len(failures),
    )


def _world_apply(params: dict, response: str) -> dict:
    patch = _extract_json_block(response)
    w = {**params, **patch}
    w["treeFrequency"]   = max(0.0, min(0.25, float(w.get("treeFrequency",   0.10))))
    w["rockFrequency"]   = max(0.0, min(0.08, float(w.get("rockFrequency",   0.015))))
    w["flowerFrequency"] = max(0.0, min(0.15, float(w.get("flowerFrequency", 0.06))))
    w["riverCount"]      = max(0,   min(5,    int(  w.get("riverCount",      2))))
    w["pondCount"]       = max(0,   min(8,    int(  w.get("pondCount",       4))))
    w["clearingW"]       = max(10,  min(40,   int(  w.get("clearingW",       24))))
    w["clearingH"]       = max(8,   min(32,   int(  w.get("clearingH",       18))))
    return w


# ─── Economy problem ───────────────────────────────────────────────────────────

_ECON_TRAIN_SEEDS   = [42069, 99999, 12345, 55555, 31415]
_ECON_HOLDOUT_SEEDS = [77777, 2718, 11111]

_ECON_INITIAL = {
    "economy": {"robotCost": 250, "bulkBonus": 1.08, "fluctuationAmount": 0.18},
    "crops": {
        "wheat":     {"growDays": 3,  "stages": 4, "waterNeeded": 1, "seedCost": 4,  "sellPrice": 12},
        "carrot":    {"growDays": 4,  "stages": 4, "waterNeeded": 1, "seedCost": 8,  "sellPrice": 22},
        "tomato":    {"growDays": 6,  "stages": 5, "waterNeeded": 2, "seedCost": 14, "sellPrice": 38},
        "blueberry": {"growDays": 8,  "stages": 4, "waterNeeded": 1, "seedCost": 22, "sellPrice": 55},
        "pumpkin":   {"growDays": 14, "stages": 5, "waterNeeded": 2, "seedCost": 35, "sellPrice": 90},
    },
    "player": {"startCoins": 500, "startSeeds": {"wheat": 10, "carrot": 5}},
}

_ECON_PROMPT = """\
You are balancing the economy for a relaxing farming game called Robo Farm.
The player farms crops for 60 in-game days, buying seeds, harvesting, and purchasing robots.
A well-balanced economy should give the player meaningful choices throughout the run:
  - Multiple crops feel worth planting (not just the single highest-price one)
  - The player sometimes feels coin-constrained but never hopelessly stuck
  - Robots are a worthwhile investment that clearly pays off over time
  - Income grows as the player expands — slow start, steady mid, satisfying late game

## Current economy parameters
```json
{{ economy_params }}
```

## Current crop definitions (growDays, seedCost, sellPrice, waterNeeded)
```json
{{ crop_params }}
```

## Starting player state
```json
{{ player_params }}
```

## Balance failures detected (from multiple simulation runs)
{% for f in failures %}
- [{{ f.metric }} = {{ "%.3f"|format(f.value) }}] {{ f.description }}
{% endfor %}

## Your task
Diagnose the balance issues and propose specific parameter changes.
You may adjust: crop sellPrice, seedCost, growDays; economy.robotCost,
economy.bulkBonus, economy.fluctuationAmount; player.startCoins.

Rules:
- Keep sellPrice > seedCost/5 for all crops (selling should always profit)
- Keep growDays in range [2, 21]
- Keep robotCost in range [100, 800]
- Keep startCoins in range [200, 1000]
- Keep bulkBonus in range [1.0, 1.3]

Respond with a diagnosis, then a ```json block with ONLY the fields you want
to change in the format:
{
  "economy": { "robotCost": 250, "bulkBonus": 1.1 },
  "crops": {
    "wheat":  { "sellPrice": 14, "seedCost": 3 },
    "carrot": { "growDays": 5 }
  },
  "player": { "startCoins": 400 }
}
Omit any top-level key (economy/crops/player) if you're not changing it.
"""


def _eval_economy(params: dict) -> dict:
    failures, score_total = [], 0.0
    seeds = _ECON_TRAIN_SEEDS + _ECON_HOLDOUT_SEEDS
    for seed in seeds:
        settings = {**params, "world": {"seed": seed}}
        result = _run_sim_js(settings, "economy", 60)
        score_total += result["score"]
        for f in result["failures"]:
            failures.append(f)
    avg = score_total / len(seeds)
    return {"score": avg, "is_viable": avg > 0.15, "failures": failures}


def _econ_prompt(params: dict, failures: list) -> str:
    return jinja2.Template(_ECON_PROMPT.strip()).render(
        economy_params=json.dumps(params["economy"], indent=2),
        crop_params=json.dumps(params["crops"], indent=2),
        player_params=json.dumps(params["player"], indent=2),
        failures=[type("F", (), f)() for f in failures],
    )


def _econ_apply(params: dict, response: str) -> dict:
    patch = _extract_json_block(response)
    e = {**params["economy"], **patch.get("economy", {})}
    p = {**params["player"],  **patch.get("player",  {})}
    c = {k: {**v} for k, v in params["crops"].items()}
    for ck, cp in patch.get("crops", {}).items():
        if ck in c:
            c[ck] = {**c[ck], **cp}
    e["robotCost"]         = max(100, min(800,  float(e.get("robotCost", 250))))
    e["bulkBonus"]         = max(1.0, min(1.3,  float(e.get("bulkBonus", 1.08))))
    e["fluctuationAmount"] = max(0.0, min(0.4,  float(e.get("fluctuationAmount", 0.18))))
    p["startCoins"]        = max(200, min(1000, int(  p.get("startCoins", 500))))
    for cfg in c.values():
        cfg["sellPrice"] = max(1, int(cfg.get("sellPrice", 10)))
        cfg["seedCost"]  = max(1, int(cfg.get("seedCost", 5)))
        cfg["growDays"]  = max(2, min(21, int(cfg.get("growDays", 4))))
        if cfg["sellPrice"] <= cfg["seedCost"] / 5:
            cfg["sellPrice"] = int(cfg["seedCost"] / 5) + 2
    return {"economy": e, "crops": c, "player": p}


# ─── Problem dispatch ──────────────────────────────────────────────────────────

_PROBLEMS = {
    "robo_farm_world":   (_WORLD_INITIAL, _eval_world,   _world_prompt, _world_apply),
    "robo_farm_economy": (_ECON_INITIAL,  _eval_economy, _econ_prompt,  _econ_apply),
}


# ─── MCP tools ────────────────────────────────────────────────────────────────

@mcp.tool()
def run_evolution(problem_name: str, num_iterations: int = 10, output_dir: str = "/tmp/evolver_output") -> str:
    """Run the Darwinian Evolver on a named problem. Requires ANTHROPIC_API_KEY in environment."""
    result = subprocess.run(
        ["uv", "run", "darwinian_evolver", problem_name,
         "--num_iterations", str(num_iterations),
         "--output_dir", output_dir],
        cwd=_EVOLVER_DIR,
        capture_output=True, text=True, timeout=600,
    )
    return result.stdout if result.returncode == 0 else f"Error: {result.stderr}"


@mcp.tool()
def evolution_start(problem_name: str, output_dir: str = "/tmp/evolver_output") -> str:
    """
    Start a step-by-step evolution run where Claude Code acts as the mutation LLM.
    No ANTHROPIC_API_KEY needed — you (Claude) will suggest parameter mutations.

    Evaluates the initial organism and returns a mutation prompt for Claude to respond to.
    Pass the returned state_id and your mutation response to evolution_step() to continue.

    problem_name: 'robo_farm_world' or 'robo_farm_economy'
    Returns JSON: {state_id, prompt, score, failures, iteration: 0}
    """
    if problem_name not in _PROBLEMS:
        return json.dumps({"error": f"Unknown problem '{problem_name}'. Choose from: {list(_PROBLEMS)}"})

    _STATE_DIR.mkdir(parents=True, exist_ok=True)
    initial, eval_fn, prompt_fn, _ = _PROBLEMS[problem_name]

    result = eval_fn(initial)
    prompt = prompt_fn(initial, result["failures"][:6])

    state_id = str(uuid.uuid4())[:8]
    state = {
        "state_id":    state_id,
        "problem":     problem_name,
        "output_dir":  output_dir,
        "iteration":   0,
        "best_score":  result["score"],
        "best_params": initial,
        "history":     [{"iteration": 0, "score": result["score"]}],
    }
    (_STATE_DIR / f"{state_id}.json").write_text(json.dumps(state, indent=2))

    return json.dumps({
        "state_id":   state_id,
        "prompt":     prompt,
        "score":      result["score"],
        "is_viable":  result["is_viable"],
        "failures":   result["failures"][:6],
        "iteration":  0,
    }, indent=2)


@mcp.tool()
def evolution_step(state_id: str, llm_response: str, max_iterations: int = 10) -> str:
    """
    Apply Claude's mutation response, evaluate the result, return the next prompt.

    state_id:     from evolution_start or a previous evolution_step call
    llm_response: your diagnosis + a ```json block of parameter changes
    max_iterations: finish after this many mutation steps (default 10)

    Returns JSON: next {state_id, prompt, score, failures, iteration}
               or {done: true, final_score, best_params, history} when complete.
    """
    state_file = _STATE_DIR / f"{state_id}.json"
    if not state_file.exists():
        return json.dumps({"error": f"State '{state_id}' not found. Call evolution_start first."})

    state = json.loads(state_file.read_text())
    problem_name = state["problem"]

    if problem_name not in _PROBLEMS:
        return json.dumps({"error": f"Unknown problem in state: {problem_name}"})

    _, eval_fn, prompt_fn, apply_fn = _PROBLEMS[problem_name]

    try:
        new_params = apply_fn(state["best_params"], llm_response)
    except Exception as e:
        return json.dumps({
            "error": f"Could not parse mutation: {e}",
            "state_id": state_id,
            "hint": "Include a ```json block with your parameter changes.",
        })

    result = eval_fn(new_params)
    iteration = state["iteration"] + 1

    if result["score"] >= state["best_score"]:
        state["best_params"] = new_params
        state["best_score"]  = result["score"]

    state["iteration"] = iteration
    state["history"].append({"iteration": iteration, "score": result["score"]})
    state_file.write_text(json.dumps(state, indent=2))

    if iteration >= max_iterations:
        return json.dumps({
            "done":           True,
            "state_id":       state_id,
            "final_score":    state["best_score"],
            "best_params":    state["best_params"],
            "history":        state["history"],
            "iterations_run": iteration,
        }, indent=2)

    failures = result["failures"][:6]
    prompt = prompt_fn(state["best_params"], failures)

    return json.dumps({
        "state_id":   state_id,
        "prompt":     prompt,
        "score":      result["score"],
        "best_score": state["best_score"],
        "is_viable":  result["is_viable"],
        "failures":   failures,
        "iteration":  iteration,
    }, indent=2)


if __name__ == "__main__":
    mcp.run()
