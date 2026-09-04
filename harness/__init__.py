"""
Abitda: Autonomous Options Agent Test Harness & Institutional Desk
"""

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

__all__ = [
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
