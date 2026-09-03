import math
from typing import Dict, Any, List

SQRT_2 = math.sqrt(2.0)
ONE_OVER_SQRT_2PI = 1.0 / math.sqrt(2.0 * math.pi)

def _norm_cdf(x: float) -> float:
    """Cumulative distribution function for standard normal distribution."""
    return 0.5 * (1.0 + math.erf(x / SQRT_2))

def _norm_pdf(x: float) -> float:
    """Probability density function for standard normal distribution."""
    return ONE_OVER_SQRT_2PI * math.exp(-0.5 * x * x)

def calculate_greeks(
    option_type: str, # "call" or "put"
    underlying_price: float, # S
    strike_price: float, # K
    time_to_expiry_years: float, # T (e.g. days / 365.0)
    risk_free_rate: float, # r (e.g. 0.045 for 4.5%)
    implied_volatility: float # sigma (e.g. 0.20 for 20%)
) -> Dict[str, float]:
    """
    Computes Black-Scholes Price and analytical Greeks (Delta, Gamma, Vega, Theta).
    Zero external C dependencies, pure python, instant & exact.
    """
    S = float(underlying_price)
    K = float(strike_price)
    T = max(float(time_to_expiry_years), 1e-6)
    r = float(risk_free_rate)
    sigma = max(float(implied_volatility), 1e-6)
    opt = option_type.lower().strip()

    sqrt_t = math.sqrt(T)
    d1 = (math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrt_t)
    d2 = d1 - sigma * sqrt_t

    exp_rt = math.exp(-r * T)
    pdf_d1 = _norm_pdf(d1)

    # Gamma (identical for Call and Put)
    gamma = pdf_d1 / (S * sigma * sqrt_t)

    # Vega (per 1% change in vol, identical for Call and Put)
    vega = (S * sqrt_t * pdf_d1) / 100.0

    if opt in ("call", "c"):
        price = S * _norm_cdf(d1) - K * exp_rt * _norm_cdf(d2)
        delta = _norm_cdf(d1)
        theta_annual = -(S * pdf_d1 * sigma) / (2.0 * sqrt_t) - r * K * exp_rt * _norm_cdf(d2)
        theta = theta_annual / 365.0
    elif opt in ("put", "p"):
        price = K * exp_rt * _norm_cdf(-d2) - S * _norm_cdf(-d1)
        delta = _norm_cdf(d1) - 1.0
        theta_annual = -(S * pdf_d1 * sigma) / (2.0 * sqrt_t) + r * K * exp_rt * _norm_cdf(-d2)
        theta = theta_annual / 365.0
    else:
        raise ValueError(f"Unknown option_type: {option_type}")

    return {
        "price": max(round(price, 4), 0.0),
        "delta": round(delta, 4),
        "gamma": round(gamma, 5),
        "vega": round(vega, 4),
        "theta": round(theta, 4)
    }

def calculate_spread_greeks(legs: List[Dict[str, Any]], underlying_price: float, risk_free_rate: float = 0.045) -> Dict[str, float]:
    """
    Aggregates Greeks for a multi-leg options strategy.
    Each leg dict must have:
      - 'option_type': 'call' or 'put'
      - 'strike': float
      - 'tte_years': float (days/365)
      - 'iv': float (e.g. 0.20)
      - 'quantity': int (positive for long, negative for short)
    """
    total_delta = 0.0
    total_gamma = 0.0
    total_vega = 0.0
    total_theta = 0.0
    net_credit_debit = 0.0

    for leg in legs:
        g = calculate_greeks(
            option_type=leg["option_type"],
            underlying_price=underlying_price,
            strike_price=leg["strike"],
            time_to_expiry_years=leg["tte_years"],
            risk_free_rate=risk_free_rate,
            implied_volatility=leg["iv"]
        )
        qty = leg["quantity"]
        total_delta += g["delta"] * qty
        total_gamma += g["gamma"] * qty
        total_vega += g["vega"] * qty
        total_theta += g["theta"] * qty
        # negative quantity means sold (credit), positive means bought (debit)
        net_credit_debit -= g["price"] * qty

    return {
        "net_delta": round(total_delta, 4),
        "net_gamma": round(total_gamma, 5),
        "net_vega": round(total_vega, 4),
        "net_theta": round(total_theta, 4),
        "net_premium": round(net_credit_debit, 4)
    }
