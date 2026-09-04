"""
Abitda: Autonomous Options Agent Test Harness & Institutional Desk
Package version: 2.0.0
"""

from core.engine import AbitdaEngine, ThetaHawkEngine
from harness.protocol import (
    OptionsAgentProtocol,
    ProposedAction,
    AgentMetadata,
    CommitteeAgentAdapter,
    VibeAgentAdapter,
    NaiveMomentumAgent,
    PassiveThetaFarmer
)
from harness.scenarios import (
    StressScenario,
    ScenarioBar,
    ScenarioRegistry
)
from harness.evaluator import (
    HarnessEvaluator,
    HarnessScorecard,
    BenchmarkReport
)

__version__ = "2.0.0"
__all__ = [
    "__version__",
    "AbitdaEngine",
    "ThetaHawkEngine",
    "OptionsAgentProtocol",
    "ProposedAction",
    "AgentMetadata",
    "CommitteeAgentAdapter",
    "VibeAgentAdapter",
    "NaiveMomentumAgent",
    "PassiveThetaFarmer",
    "StressScenario",
    "ScenarioBar",
    "ScenarioRegistry",
    "HarnessEvaluator",
    "HarnessScorecard",
    "BenchmarkReport",
]
