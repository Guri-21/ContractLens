@echo off
echo ============================================
echo  ContractLens Benchmark — Starting...
echo  Minimise this window and come back in 40 min
echo ============================================
cd /d "%~dp0"
python scripts/benchmark/run_benchmark_full.py
echo.
echo ============================================
echo  DONE. Results saved to:
echo  scripts\benchmark\benchmark_results.json
echo  scripts\benchmark\benchmark_log.txt
echo ============================================
pause
