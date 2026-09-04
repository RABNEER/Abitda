import os
import sys
import time
import asyncio
import subprocess
import edge_tts
from playwright.sync_api import sync_playwright

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)

VOICE = "en-US-ChristopherNeural"

# Tightly paced scripts with phonetic tuning: "AY-bit-dah" and "Black-Shoals"
SECTIONS = [
    {
        "id": "sec0",
        "target_start": 0.8,
        "text": "Welcome to AY-bit-dah — the Autonomous Options Agent Test Harness and Institutional Risk Desk, verified live on Alpaca Paper Trading with Level 3 options clearance."
    },
    {
        "id": "sec1",
        "target_start": 12.0,
        "text": "Here on the trading desk, we monitor real-time SPY telemetry and regime classification. AY-bit-dah strictly enforces portfolio Black-Shoals Greeks: capping net delta within a 0.25 barrier, limiting vega to 150 dollars, and deploying three autonomous safety layers — the Greeks gatekeeper, a regime-flip exit, and a statistical win-rate guardian."
    },
    {
        "id": "sec2",
        "target_start": 38.0,
        "text": "Next is the Black Swan Stress Crucible. We subject candidate agents to historical market crashes, including the August 5th, 2024 Yen Carry Crash where the VIX spiked 181%. As the replay runs bar-by-bar, AY-bit-dah preserves 99.44% of capital with zero delta breaches, earning a Grade A-Plus Fiduciary Certification — while naive bots are completely liquidated."
    },
    {
        "id": "sec3",
        "target_start": 70.0,
        "text": "In the Floor Committee room, four specialized agents powered by Google Gemini deliberate in real-time. The Macro Scout, Tech Scout, Alpha Trader, and Risk Governor debate market conditions to build a unanimous, defined-risk consensus playbook."
    },
    {
        "id": "sec4",
        "target_start": 88.0,
        "text": "The Vibe Desk allows traders to express conversational intents. AY-bit-dah's NLP compiler automatically structures compliant defined-risk credit spreads and iron condors with exact strikes, breakevens, and bounded risk parameters."
    },
    {
        "id": "sec5",
        "target_start": 105.0,
        "text": "External AI agents can connect through the Agent Gateway. Featuring a live REST API with sub-second health checks and a FastMCP server, agents in Claude Desktop, Cursor, or external swarms can query market regimes, run cycles, and audit portfolio Greeks programmatically."
    },
    {
        "id": "sec6",
        "target_start": 125.0,
        "text": "Finally, our Desk Dossier generates comprehensive audit reports for every cycle. AY-bit-dah is open source, published on PyPI via pip install abitda, and live on Alpaca. Thank you for watching."
    }
]

def record_tight_video(raw_video_dir):
    os.makedirs(raw_video_dir, exist_ok=True)
    print("Step 1: Recording tightly paced video with extended closing buffer...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            record_video_dir=raw_video_dir,
            record_video_size={"width": 1440, "height": 900}
        )
        page = context.new_page()
        
        # 0. INTRO (0:00 - 0:11.5)
        print("  [0:00 - 0:12] Hero Desk & Account HUD...")
        page.goto("https://abitda.up.railway.app/", wait_until="networkidle", timeout=35000)
        time.sleep(3)
        page.mouse.move(250, 40)
        time.sleep(3)
        page.mouse.move(700, 40)
        time.sleep(3)
        page.mouse.move(1200, 40)
        time.sleep(2.5)
        
        # 1. OVERVIEW & GREEKS (0:12 - 0:37.5)
        print("  [0:12 - 0:37] Overview Desk & Greeks Barometer...")
        page.evaluate("window.scrollBy({top: 360, behavior: 'smooth'})")
        time.sleep(2.5)
        page.mouse.move(500, 320)
        time.sleep(3)
        page.mouse.move(900, 320)
        time.sleep(3)
        # Scroll down to Greeks Barometer & Risk Pillars
        page.evaluate("window.scrollBy({top: 480, behavior: 'smooth'})")
        time.sleep(2.5)
        page.mouse.move(400, 450) # Delta/Gamma
        time.sleep(3.5)
        page.mouse.move(850, 450) # Vega/Theta
        time.sleep(3.5)
        page.mouse.move(600, 700) # Risk Pillars
        time.sleep(4)
        
        # 2. TEST HARNESS (0:37.5 - 0:69.5)
        print("  [0:37 - 0:70] Test Harness & Black Swan Replay...")
        harness_tab = page.locator(".nav-item").filter(has_text="Test Harness").first
        harness_tab.click()
        time.sleep(2)
        page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        time.sleep(2)
        
        # Trigger Benchmark
        benchmark_btn = page.locator("button").filter(has_text="Benchmark").first
        if benchmark_btn.count() > 0 and benchmark_btn.is_visible():
            benchmark_btn.click()
            time.sleep(3)
            
        page.evaluate("window.scrollBy({top: 420, behavior: 'smooth'})")
        time.sleep(3)
        page.mouse.move(350, 380) # Grade A+
        time.sleep(3)
        page.mouse.move(700, 380) # 99.44% capital preserved
        time.sleep(3)
        page.evaluate("window.scrollBy({top: 450, behavior: 'smooth'})")
        time.sleep(3)
        page.mouse.move(400, 500) # Committee A+
        time.sleep(4)
        page.mouse.move(400, 680) # Naive Bot F
        time.sleep(5)
        
        # 3. FLOOR COMMITTEE (0:70 - 0:87.5)
        print("  [0:70 - 0:88] Floor Committee Deliberation...")
        committee_tab = page.locator(".nav-item").filter(has_text="Committee").first
        committee_tab.click()
        time.sleep(2)
        page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        time.sleep(2.5)
        page.mouse.move(400, 320) # Macro Scout
        time.sleep(3)
        page.mouse.move(900, 320) # Tech Scout
        time.sleep(3)
        page.evaluate("window.scrollBy({top: 420, behavior: 'smooth'})")
        time.sleep(2.5)
        page.mouse.move(400, 380) # Alpha Trader
        time.sleep(2.5)
        page.mouse.move(900, 380) # Risk Governor
        time.sleep(2.5)
        
        # 4. VIBE DESK (0:88 - 1:04.5)
        print("  [0:88 - 1:05] Vibe Desk NLP Compiler...")
        vibe_tab = page.locator(".nav-item").filter(has_text="Vibe Desk").first
        vibe_tab.click()
        time.sleep(2)
        page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        time.sleep(3)
        page.mouse.move(400, 300)
        time.sleep(3)
        page.evaluate("window.scrollBy({top: 380, behavior: 'smooth'})")
        time.sleep(3)
        page.mouse.move(500, 450)
        time.sleep(3.5)
        page.mouse.move(850, 450)
        time.sleep(2.5)
        
        # 5. AGENT GATEWAY (1:05 - 1:24.5)
        print("  [1:05 - 1:25] Agent Gateway & REST API...")
        gateway_tab = page.locator(".nav-item").filter(has_text="Agent Gateway").first
        gateway_tab.click()
        time.sleep(2)
        page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        time.sleep(2)
        
        ping_btn = page.locator("button").filter(has_text="Ping Endpoint").first
        if ping_btn.count() > 0 and ping_btn.is_visible():
            page.mouse.move(918, 371)
            time.sleep(1.5)
            ping_btn.click()
            time.sleep(3)
            
        page.evaluate("window.scrollBy({top: 450, behavior: 'smooth'})")
        time.sleep(3)
        page.mouse.move(400, 450)
        time.sleep(3.5)
        page.mouse.move(900, 450)
        time.sleep(4)
        
        # 6. REPORTS & FINALE (1:25 - 1:47) - EXTENDED BUFFER SO SPEECH COMPLETES 100%!
        print("  [1:25 - 1:47] Desk Dossier & Final Hero Shot with Full Audio Buffer...")
        reports_tab = page.locator(".nav-item").filter(has_text="Desk Dossier").first
        reports_tab.click()
        time.sleep(2)
        page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        time.sleep(3.5)
        page.evaluate("window.scrollBy({top: 350, behavior: 'smooth'})")
        time.sleep(3)
        
        overview_tab = page.locator(".nav-item").filter(has_text="Overview").first
        overview_tab.click()
        time.sleep(1.5)
        page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        # Extended hold on the Overview hero shot so speech finishes naturally + 5s quiet hero hold
        time.sleep(9.5)
        
        print("Finalizing video...")
        page.close()
        raw_video = page.video.path()
        context.close()
        browser.close()
        
    return raw_video

def get_audio_duration(file_path):
    cmd = ["ffprobe", "-i", file_path, "-show_entries", "format=duration", "-v", "quiet", "-of", "csv=p=0"]
    return float(subprocess.check_output(cmd).decode().strip())

def make_silence(duration, out_path):
    cmd = [
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", "anullsrc=r=24000:cl=mono",
        "-t", f"{duration:.3f}",
        "-q:a", "9",
        out_path
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

async def build_audio_track(work_dir, total_video_dur):
    os.makedirs(work_dir, exist_ok=True)
    print("Step 2: Synthesizing voiceover with phonetic tuning (AY-bit-dah, Black-Shoals)...")
    clips = []
    for sec in SECTIONS:
        clip_path = os.path.join(work_dir, f"{sec['id']}.mp3")
        comm = edge_tts.Communicate(sec["text"], VOICE, rate="-1%", pitch="-1Hz")
        await comm.save(clip_path)
        dur = get_audio_duration(clip_path)
        print(f"   {sec['id']}: start {sec['target_start']}s | duration: {dur:.2f}s (ends at {sec['target_start'] + dur:.1f}s)")
        clips.append((sec['id'], sec['target_start'], clip_path, dur))
        
    concat_list_path = os.path.join(work_dir, "concat_list.txt")
    concat_lines = []
    current_time = 0.0
    
    for i, (sec_id, target_start, clip_path, dur) in enumerate(clips):
        if target_start > current_time:
            silence_dur = target_start - current_time
            silence_file = os.path.join(work_dir, f"silence_{i}.mp3")
            make_silence(silence_dur, silence_file)
            concat_lines.append(f"file '{silence_file.replace(os.sep, '/')}'")
            current_time += silence_dur
            
        concat_lines.append(f"file '{clip_path.replace(os.sep, '/')}'")
        current_time += dur
        
    if current_time < total_video_dur:
        final_silence_dur = total_video_dur - current_time
        final_silence_file = os.path.join(work_dir, "silence_final.mp3")
        make_silence(final_silence_dur, final_silence_file)
        concat_lines.append(f"file '{final_silence_file.replace(os.sep, '/')}'")
        
    with open(concat_list_path, "w", encoding="utf-8") as f:
        f.write("\n".join(concat_lines) + "\n")
        
    master_audio = os.path.join(work_dir, "master_audio.aac")
    print("Step 3: Concatenating single master audio track...")
    concat_cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", concat_list_path,
        "-c:a", "aac", "-b:a", "192k",
        master_audio
    ]
    subprocess.run(concat_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return master_audio

def merge_final(raw_video, master_audio, output_mp4):
    print(f"Step 4: Multiplexing into final master MP4 {output_mp4}...")
    cmd = [
        "ffmpeg", "-y",
        "-i", raw_video,
        "-i", master_audio,
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-preset", "medium", "-crf", "19",
        "-r", "30",
        "-c:a", "copy",
        "-shortest",
        output_mp4
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"SUCCESS: Tightly synced demo created at {output_mp4}")

def main():
    raw_video_dir = os.path.join(os.getcwd(), "temp_tight_raw")
    work_audio_dir = os.path.join(os.getcwd(), "temp_tight_audio")
    output_mp4 = os.path.join(os.getcwd(), "abitda_demo.mp4")
    
    raw_video = record_tight_video(raw_video_dir)
    total_dur = get_audio_duration(raw_video)
    print(f"Raw video duration: {total_dur:.2f} seconds ({total_dur/60:.2f} minutes)")
    
    master_audio = asyncio.run(build_audio_track(work_audio_dir, total_dur))
    merge_final(raw_video, master_audio, output_mp4)
    
    # Also update abitda_demo_with_voiceover.mp4
    copy_path = os.path.join(os.getcwd(), "abitda_demo_with_voiceover.mp4")
    import shutil
    shutil.copy2(output_mp4, copy_path)
    
    print("Done! Both abitda_demo.mp4 and abitda_demo_with_voiceover.mp4 are polished and ready!")

if __name__ == "__main__":
    main()
