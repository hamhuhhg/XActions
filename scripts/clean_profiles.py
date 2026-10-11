#!/usr/bin/env python3
"""
XActions Browser Profile Cleaner & Optimizer
Safely purges volatile cache, V8 code caches, shader caches, and Chromium ML models
across all browser profile folders in solver/browser_profiles/.

CRITICAL: Preserves all session cookies (Network/Cookies*), LocalStorage,
SessionStorage, and login preferences so NO accounts are logged out.
"""

import os
import shutil
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROFILES_DIR = os.path.join(BASE_DIR, "solver", "browser_profiles")

BLOAT_NAMES = {
    "Cache",
    "Code Cache",
    "GPUCache",
    "DawnGraphiteCache",
    "DawnWebGPUCache",
    "CacheStorage",
    "optimization_guide_model_store",
    "BrowserMetrics",
    "DeferredBrowserMetrics",
    "Crashpad",
    "GrShaderCache",
    "ShaderCache",
    "GPUPersistentCache",
    "component_crx_cache",
    "extensions_crx_cache",
}

def get_dir_size(path):
    total = 0
    try:
        for root, dirs, files in os.walk(path):
            for f in files:
                fp = os.path.join(root, f)
                try:
                    total += os.path.getsize(fp)
                except OSError:
                    pass
    except OSError:
        pass
    return total

def clean_profile(profile_path):
    freed = 0
    if not os.path.isdir(profile_path):
        return 0

    # 1. Direct bloat subdirectories under profile root
    for item in os.listdir(profile_path):
        item_path = os.path.join(profile_path, item)
        if item in BLOAT_NAMES and os.path.isdir(item_path):
            size = get_dir_size(item_path)
            shutil.rmtree(item_path, ignore_errors=True)
            freed += size
        elif item.endswith(".pma") and os.path.isfile(item_path):
            try:
                size = os.path.getsize(item_path)
                os.remove(item_path)
                freed += size
            except OSError:
                pass

    # 2. Bloat subdirectories under Default
    default_dir = os.path.join(profile_path, "Default")
    if os.path.isdir(default_dir):
        for item in os.listdir(default_dir):
            item_path = os.path.join(default_dir, item)
            if item in BLOAT_NAMES and os.path.isdir(item_path):
                size = get_dir_size(item_path)
                shutil.rmtree(item_path, ignore_errors=True)
                freed += size

        # Service Worker cache storage
        sw_cache = os.path.join(default_dir, "Service Worker", "CacheStorage")
        if os.path.isdir(sw_cache):
            size = get_dir_size(sw_cache)
            shutil.rmtree(sw_cache, ignore_errors=True)
            freed += size

    return freed

def main():
    if not os.path.isdir(PROFILES_DIR):
        print(f"Profiles directory not found at: {PROFILES_DIR}")
        return

    print("=" * 60)
    print("🧹 XActions Browser Profile Safe Cleaner")
    print("=" * 60)
    print(f"Target directory: {PROFILES_DIR}\n")

    initial_total = get_dir_size(PROFILES_DIR)
    total_freed = 0
    cleaned_count = 0

    profiles = [d for d in os.listdir(PROFILES_DIR) if os.path.isdir(os.path.join(PROFILES_DIR, d))]
    for profile_name in profiles:
        profile_path = os.path.join(PROFILES_DIR, profile_name)
        freed = clean_profile(profile_path)
        if freed > 0:
            cleaned_count += 1
            print(f"  ✓ Cleaned {profile_name}: freed {freed / (1024 * 1024):.2f} MB")
        else:
            print(f"  - {profile_name}: already clean")
        total_freed += freed

    final_total = get_dir_size(PROFILES_DIR)

    print("\n" + "=" * 60)
    print(f"📊 Results Summary:")
    print(f"  • Profiles processed: {len(profiles)}")
    print(f"  • Profiles optimized: {cleaned_count}")
    print(f"  • Space before:       {initial_total / (1024 * 1024):.2f} MB ({initial_total / (1024**3):.2f} GB)")
    print(f"  • Total space freed:  {total_freed / (1024 * 1024):.2f} MB ({total_freed / (1024**3):.2f} GB)")
    print(f"  • Space remaining:    {final_total / (1024 * 1024):.2f} MB")
    print("=" * 60)
    print("✅ All cookies, sessions, and credentials were fully preserved.")

if __name__ == "__main__":
    main()
