from setuptools import setup, find_packages

setup(
    name="abitda",
    version="2.0.0",
    description="Abitda: Autonomous Options Agent Test Harness & Institutional Desk for Alpaca",
    author="Abitda Contributors",
    packages=find_packages(exclude=["frontend*", "tests*"]),
    py_modules=["abitda", "main", "server", "mcp_server", "test_suite"],
    install_requires=[
        "alpaca-py>=0.21.0",
        "pandas>=2.1.0",
        "numpy>=1.26.0",
        "scipy>=1.11.0",
        "yfinance>=0.2.36",
        "streamlit>=1.32.0",
        "python-dotenv>=1.0.0",
        "apscheduler>=3.10.4",
        "google-genai>=0.1.0",
        "rich>=13.7.0",
        "fastapi>=0.110.0",
        "uvicorn>=0.28.0",
        "plotly>=5.19.0",
        "mcp>=1.0.0"
    ],
    entry_points={
        "console_scripts": [
            "abitda=main:main",
            "abitda-mcp=mcp_server:main",
            "thetahawk=main:main",
            "thetahawk-mcp=mcp_server:main",
        ],
    },
    python_requires=">=3.10",
)
