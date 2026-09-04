"""
Abitda Stress-Test Scenario Suite
Standardized historical black swan datasets and liquidity shock episodes for agent stress-testing.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class ScenarioBar:
    label: str
    spy_price: float
    vix: float
    iv_percentile: float
    regime: str
    trend: str
    narrative: str
    shock_factor: float = 1.0  # multiplier on option spread losses if unhedged

@dataclass
class StressScenario:
    scenario_id: str
    name: str
    category: str  # "VOLATILITY_SPIKE", "LIQUIDITY_FREEZE", "INVERSE_VOL_CRASH", "NORMAL_HARVEST"
    historical_date: str
    description: str
    starting_equity: float
    bars: List[ScenarioBar]

class ScenarioRegistry:
    """Repository of calibrated stress scenarios for benchmarking options agents."""

    @staticmethod
    def get_aug5_2024() -> StressScenario:
        """August 5, 2024: Bank of Japan interest rate hike triggers global Yen carry-trade unwind."""
        bars = [
            ScenarioBar(
                label="Aug 2 Close",
                spy_price=534.20,
                vix=23.39,
                iv_percentile=65.0,
                regime="HIGH_VOL_REGIME",
                trend="DOWN",
                narrative="Jobs data triggers US growth fears. Nikkei drops -5.8%. Volatility climbs.",
                shock_factor=1.1
            ),
            ScenarioBar(
                label="Aug 5 09:30 Pre-Market",
                spy_price=518.50,
                vix=53.40,
                iv_percentile=95.0,
                regime="CRISIS_VOL_SPIKE",
                trend="DOWN",
                narrative="Nikkei plunges -12.4% overnight (worst drop since 1987). US futures halted limit down.",
                shock_factor=2.8
            ),
            ScenarioBar(
                label="Aug 5 10:15 Peak Panic",
                spy_price=511.80,
                vix=65.73,
                iv_percentile=99.9,
                regime="CRISIS_VOL_SPIKE",
                trend="DOWN",
                narrative="VIX surges to 65.73 (highest since March 2020). Severe liquidity vacuum, options spreads widen 10x.",
                shock_factor=4.5
            ),
            ScenarioBar(
                label="Aug 5 12:30 Liquidity Rebound",
                spy_price=520.10,
                vix=38.57,
                iv_percentile=85.0,
                regime="HIGH_VOL_REGIME",
                trend="NEUTRAL",
                narrative="Dip buyers and systematic funds step in. VIX collapses from 65 back to 38.",
                shock_factor=2.0
            ),
            ScenarioBar(
                label="Aug 5 16:00 Market Close",
                spy_price=523.64,
                vix=38.57,
                iv_percentile=82.0,
                regime="HIGH_VOL_REGIME",
                trend="NEUTRAL",
                narrative="S&P closes -3.0%. Historic 1-day intraday range; unhedged put sellers decimated.",
                shock_factor=1.8
            )
        ]
        return StressScenario(
            scenario_id="aug5_2024",
            name="August 5, 2024 Yen Carry Crash",
            category="VOLATILITY_SPIKE",
            historical_date="2024-08-05",
            description="Global carry-trade unwind causing VIX to spike from 23 to 65.73 with massive gap downs.",
            starting_equity=100000.0,
            bars=bars
        )

    @staticmethod
    def get_svb_march_2023() -> StressScenario:
        """March 8-13, 2023: Silicon Valley Bank collapse triggers regional banking panic and flight to safety."""
        bars = [
            ScenarioBar(
                label="March 8 16:00",
                spy_price=398.92,
                vix=19.11,
                iv_percentile=42.0,
                regime="NORMAL",
                trend="NEUTRAL",
                narrative="SVB announces sudden $1.75B capital raise to cover bond portfolio losses.",
                shock_factor=1.0
            ),
            ScenarioBar(
                label="March 9 14:00 Bank Run",
                spy_price=391.56,
                vix=22.68,
                iv_percentile=68.0,
                regime="HIGH_VOL_REGIME",
                trend="DOWN",
                narrative="Depositors withdraw $42B in a single day. Tech founders advised to pull all funds.",
                shock_factor=1.5
            ),
            ScenarioBar(
                label="March 10 11:30 FDIC Takeover",
                spy_price=386.11,
                vix=24.80,
                iv_percentile=75.0,
                regime="CRISIS_VOL_SPIKE",
                trend="DOWN",
                narrative="California regulators close SVB; FDIC appointed receiver. Regional bank stocks halted.",
                shock_factor=2.4
            ),
            ScenarioBar(
                label="March 13 09:30 BTFP Bailout",
                spy_price=385.20,
                vix=26.52,
                iv_percentile=80.0,
                regime="CRISIS_VOL_SPIKE",
                trend="DOWN",
                narrative="Fed announces Bank Term Funding Program backstop; Treasury guarantees all deposits.",
                shock_factor=2.1
            ),
            ScenarioBar(
                label="March 14 16:00 Stabilization",
                spy_price=391.73,
                vix=23.73,
                iv_percentile=69.0,
                regime="HIGH_VOL_REGIME",
                trend="UP",
                narrative="Systemic fears ease as emergency liquidity prevents contagion to major money-center banks.",
                shock_factor=1.3
            )
        ]
        return StressScenario(
            scenario_id="svb_march_2023",
            name="March 2023 SVB Bank Run Contagion",
            category="LIQUIDITY_FREEZE",
            historical_date="2023-03-10",
            description="Sudden bank run causing sharp equity drops and extreme skew inversion on financial sector.",
            starting_equity=100000.0,
            bars=bars
        )

    @staticmethod
    def get_volmageddon_2018() -> StressScenario:
        """February 5, 2018: Inverse volatility ETPs (XIV) collapse; VIX records highest 1-day point jump in history."""
        bars = [
            ScenarioBar(
                label="Feb 2 16:00 Pre-Shock",
                spy_price=275.45,
                vix=17.31,
                iv_percentile=38.0,
                regime="NORMAL",
                trend="DOWN",
                narrative="Strong wage growth report triggers inflation fears and mild Treasury selloff.",
                shock_factor=1.0
            ),
            ScenarioBar(
                label="Feb 5 14:00 Cascade Starts",
                spy_price=268.20,
                vix=25.50,
                iv_percentile=74.0,
                regime="HIGH_VOL_REGIME",
                trend="DOWN",
                narrative="Selling accelerates in the afternoon as systematic risk-parity funds trim equity exposure.",
                shock_factor=1.8
            ),
            ScenarioBar(
                label="Feb 5 15:30 ETP Rebalance Panic",
                spy_price=263.80,
                vix=37.32,
                iv_percentile=94.0,
                regime="CRISIS_VOL_SPIKE",
                trend="DOWN",
                narrative="XIV and SVXY inverse VIX notes face mandatory end-of-day rebalancing, forcing massive VIX futures buying.",
                shock_factor=3.5
            ),
            ScenarioBar(
                label="Feb 5 16:15 After-Hours Implosion",
                spy_price=259.00,
                vix=50.30,
                iv_percentile=99.0,
                regime="CRISIS_VOL_SPIKE",
                trend="DOWN",
                narrative="XIV loses 95% of its value in after-hours trading; Credit Suisse announces termination of the note.",
                shock_factor=5.0
            ),
            ScenarioBar(
                label="Feb 6 16:00 Aftermath",
                spy_price=269.10,
                vix=29.98,
                iv_percentile=83.0,
                regime="HIGH_VOL_REGIME",
                trend="UP",
                narrative="Extreme volatility settles into high-range choppy regime as short-volatility trade is permanently erased.",
                shock_factor=2.2
            )
        ]
        return StressScenario(
            scenario_id="volmageddon_2018",
            name="February 2018 Volmageddon (XIV Termination)",
            category="INVERSE_VOL_CRASH",
            historical_date="2018-02-05",
            description="Inverse volatility blowup causing VIX to jump 115% in a single day, bankrupting unhedged option sellers.",
            starting_equity=100000.0,
            bars=bars
        )

    @staticmethod
    def get_flash_crash_intraday() -> StressScenario:
        """Synthetic Intraday Liquidity Flash Crash: High-frequency market-maker withdrawal."""
        bars = [
            ScenarioBar(
                label="14:00 Normal Flow",
                spy_price=550.00,
                vix=14.50,
                iv_percentile=25.0,
                regime="NORMAL",
                trend="UP",
                narrative="Order book depth is healthy. Bid-ask spreads on SPY options are $0.01 to $0.03.",
                shock_factor=1.0
            ),
            ScenarioBar(
                label="14:15 Spread Blowout",
                spy_price=543.20,
                vix=26.40,
                iv_percentile=72.0,
                regime="HIGH_VOL_REGIME",
                trend="DOWN",
                narrative="Automated market makers withdraw quotes. Spreads blow out from $0.02 to $1.80.",
                shock_factor=2.5
            ),
            ScenarioBar(
                label="14:24 Instant Flush",
                spy_price=532.50,
                vix=39.80,
                iv_percentile=91.0,
                regime="CRISIS_VOL_SPIKE",
                trend="DOWN",
                narrative="Cascade of algorithmic market stop-loss orders hits empty order books; SPY drops -3.2% in 9 minutes.",
                shock_factor=3.8
            ),
            ScenarioBar(
                label="14:40 Mean Reversion",
                spy_price=546.10,
                vix=18.90,
                iv_percentile=48.0,
                regime="NORMAL",
                trend="UP",
                narrative="Human traders step in; prices snap back +2.5% as liquidity normalizes.",
                shock_factor=1.4
            )
        ]
        return StressScenario(
            scenario_id="flash_crash_intraday",
            name="Intraday Liquidity Flash Crash",
            category="LIQUIDITY_FREEZE",
            historical_date="2024-Synthetic",
            description="Rapid 15-minute liquidity vacuum testing instantaneous stop-loss response and slippage handling.",
            starting_equity=100000.0,
            bars=bars
        )

    @staticmethod
    def get_calm_bull_grind() -> StressScenario:
        """30-Day Calm Bull Grind: Low volatility theta harvesting baseline."""
        bars = [
            ScenarioBar(
                label="Day 1",
                spy_price=540.00,
                vix=12.80,
                iv_percentile=15.0,
                regime="RANGE_BOUND",
                trend="UP",
                narrative="Low volatility summer grind. Premium decays smoothly.",
                shock_factor=0.8
            ),
            ScenarioBar(
                label="Day 7",
                spy_price=542.50,
                vix=13.10,
                iv_percentile=18.0,
                regime="RANGE_BOUND",
                trend="UP",
                narrative="Underlying grinds up +0.46%. Delta stays within +/-0.05 bounds.",
                shock_factor=0.8
            ),
            ScenarioBar(
                label="Day 15",
                spy_price=544.80,
                vix=12.40,
                iv_percentile=12.0,
                regime="RANGE_BOUND",
                trend="UP",
                narrative="Time decay reaches 50% target. Iron condor wings safely OTM.",
                shock_factor=0.8
            ),
            ScenarioBar(
                label="Day 22",
                spy_price=546.20,
                vix=13.50,
                iv_percentile=20.0,
                regime="RANGE_BOUND",
                trend="UP",
                narrative="Slight IV uptick, but position locked in 72% max profit.",
                shock_factor=0.9
            ),
            ScenarioBar(
                label="Day 30",
                spy_price=548.00,
                vix=12.20,
                iv_percentile=10.0,
                regime="RANGE_BOUND",
                trend="UP",
                narrative="Cycle expiration. Full credit premium harvested without assignment.",
                shock_factor=0.7
            )
        ]
        return StressScenario(
            scenario_id="calm_bull_grind",
            name="Calm Bull Grind (Theta Harvest Baseline)",
            category="NORMAL_HARVEST",
            historical_date="2024-Baseline",
            description="Baseline low-volatility environment measuring theta capture efficiency and Delta neutrality maintenance.",
            starting_equity=100000.0,
            bars=bars
        )

    @classmethod
    def get_scenario(cls, scenario_id: str) -> Optional[StressScenario]:
        registry = {
            "aug5_2024": cls.get_aug5_2024,
            "svb_march_2023": cls.get_svb_march_2023,
            "volmageddon_2018": cls.get_volmageddon_2018,
            "flash_crash_intraday": cls.get_flash_crash_intraday,
            "calm_bull_grind": cls.get_calm_bull_grind,
        }
        creator = registry.get(scenario_id.lower())
        return creator() if creator else None

    @classmethod
    def list_all(cls) -> List[Dict[str, Any]]:
        scenarios = [
            cls.get_aug5_2024(),
            cls.get_svb_march_2023(),
            cls.get_volmageddon_2018(),
            cls.get_flash_crash_intraday(),
            cls.get_calm_bull_grind(),
        ]
        return [
            {
                "id": s.scenario_id,
                "name": s.name,
                "category": s.category,
                "historical_date": s.historical_date,
                "description": s.description,
                "bars_count": len(s.bars),
                "peak_vix": max(b.vix for b in s.bars)
            }
            for s in scenarios
        ]
